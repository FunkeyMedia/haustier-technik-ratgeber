const PARTNER_TAG = 'Onlinestarkei-21';
const MARKETPLACE = 'www.amazon.de';
const TOKEN_URL = 'https://api.amazon.co.uk/auth/o2/token';
const SEARCH_URL = 'https://creatorsapi.amazon/catalog/v1/searchItems';
const ITEMS_URL = 'https://creatorsapi.amazon/catalog/v1/getItems';
const PRODUCT_CACHE_MS = 30 * 60 * 1000;
const TOKEN_SAFETY_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 6500;
const ALLOWED_IMAGE_HOSTS = new Set([
  'm.media-amazon.com',
  'images-eu.ssl-images-amazon.com',
  'images-na.ssl-images-amazon.com',
  'images.amazon.com'
]);
const AVAILABLE_TYPES = new Set(['IN_STOCK', 'INSTOCK', 'INSTOCKSCARCE', 'LEADTIME']);

let tokenCache = null;
const itemCache = new Map();

function withTimeout(fetchImpl, url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetchImpl(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function getAccessToken(fetchImpl = fetch) {
  if (tokenCache && tokenCache.expiresAt > Date.now() + TOKEN_SAFETY_MS) return tokenCache.value;
  const clientId = process.env.AMAZON_CREATORS_CLIENT_ID;
  const clientSecret = process.env.AMAZON_CREATORS_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Amazon Creators API ist noch nicht konfiguriert.');

  const response = await withTimeout(fetchImpl, TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'creatorsapi::default'
    })
  });
  if (!response.ok) throw new Error(`Amazon-Authentifizierung fehlgeschlagen (${response.status}).`);
  const data = await response.json();
  if (!data.access_token) throw new Error('Amazon hat kein Zugriffstoken geliefert.');
  tokenCache = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in) || 3600) * 1000
  };
  return tokenCache.value;
}

function isAmazonImage(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_IMAGE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function affiliateUrl(asin) {
  return `https://www.amazon.de/dp/${asin}?tag=${PARTNER_TAG}`;
}

function apiPartnerTag() {
  const value = process.env.AMAZON_CREATORS_PARTNER_TAG;
  if (!value) throw new Error('Amazon Partner-Tag für die Creators API fehlt.');
  return value;
}

function displayValue(value) {
  return typeof value?.displayValue === 'string' ? value.displayValue.trim() : '';
}

function pickModel(item) {
  const manufacture = item.itemInfo?.manufactureInfo || {};
  const product = item.itemInfo?.productInfo || {};
  const technical = item.itemInfo?.technicalInfo || {};
  return displayValue(manufacture.model)
    || displayValue(manufacture.partNumber)
    || displayValue(product.model)
    || displayValue(technical.model)
    || '';
}

function attributeValue(attribute) {
  if (typeof attribute?.displayValue === 'string') return attribute.displayValue.trim();
  if (Array.isArray(attribute?.displayValues)) return attribute.displayValues.filter(value => typeof value === 'string').join(', ');
  return '';
}

function itemDetails(item) {
  const details = [];
  const seen = new Set();
  for (const container of [item.itemInfo?.manufactureInfo, item.itemInfo?.productInfo, item.itemInfo?.technicalInfo]) {
    for (const [key, attribute] of Object.entries(container || {})) {
      const value = attributeValue(attribute);
      const label = typeof attribute?.label === 'string'
        ? attribute.label.trim()
        : key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, character => character.toUpperCase());
      const signature = `${label}:${value}`;
      if (value && !seen.has(signature)) {
        details.push({ label, value });
        seen.add(signature);
      }
    }
  }
  return details;
}

function mapItem(item, search) {
  const asin = typeof item.asin === 'string' ? item.asin.trim().toUpperCase() : '';
  if (!/^[A-Z0-9]{10}$/.test(asin)) return null;

  const image = item.images?.primary?.large?.url || item.images?.primary?.medium?.url || '';
  if (!isAmazonImage(image)) return null;
  const images = [
    image,
    ...(item.images?.variants || []).map(variant => variant.large?.url || variant.medium?.url)
  ].filter((url, index, values) => isAmazonImage(url) && values.indexOf(url) === index);

  const listing = (item.offersV2?.listings || []).find(offer => {
    const type = String(offer.availability?.type || '').toUpperCase();
    const money = offer.price?.money;
    return AVAILABLE_TYPES.has(type) && money?.currency === 'EUR' && Number.isFinite(Number(money.amount)) && Number(money.amount) > 0;
  });
  if (!listing) return null;

  const money = listing.price.money;
  const price = {
    amount: Number(money.amount),
    currency: 'EUR',
    display: typeof money.displayAmount === 'string'
      ? money.displayAmount
      : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(money.amount)),
    source: 'amazon-creators-api'
  };
  const features = Array.isArray(item.itemInfo?.features?.displayValues)
    ? item.itemInfo.features.displayValues.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim())
    : [];
  if (features.length < 3) return null;

  return {
    asin,
    parentAsin: /^[A-Z0-9]{10}$/.test(item.parentASIN || '') ? item.parentASIN : null,
    brand: displayValue(item.itemInfo?.byLineInfo?.brand),
    model: pickModel(item),
    title: displayValue(item.itemInfo?.title),
    image,
    images,
    price,
    availability: {
      type: String(listing.availability.type).toUpperCase(),
      message: listing.availability.message || 'Bei Amazon verfügbar'
    },
    features,
    details: itemDetails(item),
    pet: search.pet,
    category: search.category,
    url: affiliateUrl(asin)
  };
}

function deduplicateVariants(products) {
  const groups = new Map();
  for (const product of products) {
    const key = product.parentAsin || product.asin;
    const existing = groups.get(key);
    if (!existing || product.features.length > existing.features.length) groups.set(key, product);
  }
  return [...groups.values()];
}

async function searchProducts(search, accessToken, fetchImpl = fetch, page = 1, attempt = 0) {
  const response = await withTimeout(fetchImpl, SEARCH_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'x-marketplace': MARKETPLACE
    },
    body: JSON.stringify({
      marketplace: MARKETPLACE,
      partnerTag: apiPartnerTag(),
      keywords: search.keywords,
      availability: 'Available',
      condition: 'New',
      currencyOfPreference: 'EUR',
      itemCount: 10,
      itemPage: page,
      resources: [
        'images.primary.large',
        'images.primary.medium',
        'images.variants.large',
        'images.variants.medium',
        'itemInfo.title',
        'itemInfo.byLineInfo',
        'itemInfo.features',
        'itemInfo.manufactureInfo',
        'itemInfo.productInfo',
        'itemInfo.technicalInfo',
        'offersV2.listings.availability',
        'offersV2.listings.condition',
        'offersV2.listings.price',
        'parentASIN'
      ]
    })
  });
  if ((response.status === 429 || response.status >= 500) && attempt < 3) {
    await delay(1500 * (2 ** attempt));
    return searchProducts(search, accessToken, fetchImpl, page, attempt + 1);
  }
  if (!response.ok) throw new Error(`Amazon-Produktsuche fehlgeschlagen (${response.status}).`);
  const data = await response.json();
  const rawItems = data.searchResult?.items || [];
  const products = rawItems.map(item => mapItem(item, search)).filter(Boolean);
  products.hasMore = rawItems.length >= 10 && page < 5;
  return products;
}

async function loadProductsByAsins(asins, fetchImpl = fetch) {
  if (!Array.isArray(asins) || asins.length > 10 || !asins.every(asin => /^[A-Z0-9]{10}$/.test(asin))) throw new Error('Invalid ASIN batch');
  const accessToken = await getAccessToken(fetchImpl);
  const response = await withTimeout(fetchImpl, ITEMS_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'x-marketplace': MARKETPLACE
    },
    body: JSON.stringify({
      marketplace: MARKETPLACE,
      partnerTag: apiPartnerTag(),
      itemIds: asins,
      itemIdType: 'ASIN',
      currencyOfPreference: 'EUR',
      resources: [
        'images.primary.large', 'images.primary.medium', 'images.variants.large', 'images.variants.medium',
        'itemInfo.title', 'itemInfo.byLineInfo', 'itemInfo.features', 'itemInfo.manufactureInfo',
        'itemInfo.productInfo', 'itemInfo.technicalInfo', 'offersV2.listings.availability',
        'offersV2.listings.condition', 'offersV2.listings.price', 'parentASIN'
      ]
    })
  });
  if (!response.ok) throw new Error(`Amazon-Produktabruf fehlgeschlagen (${response.status}).`);
  const data = await response.json();
  const fetchedAt = new Date().toISOString();
  return (data.itemsResult?.items || []).map(item => mapItem(item, {pet:'both',category:'Haustiertechnik'})).filter(Boolean).map(product => ({...product, fetchedAt}));
}
async function loadProductByAsin(asin, fetchImpl = fetch) {
  const normalized = String(asin || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{10}$/.test(normalized)) return null;
  const cached = itemCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) return cached.product;
  const product = (await loadProductsByAsins([normalized], fetchImpl)).find(p => p.asin === normalized) || null;
  itemCache.set(normalized, {product, expiresAt: Date.now() + PRODUCT_CACHE_MS});
  return product;
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function resetCaches() {
  tokenCache = null;
  itemCache.clear();
}

module.exports = {
  ALLOWED_IMAGE_HOSTS,
  AVAILABLE_TYPES,
  MARKETPLACE,
  PARTNER_TAG,
  affiliateUrl,
  deduplicateVariants,
  isAmazonImage,
  getAccessToken,
  searchProducts,
  loadProductByAsin,
  loadProductsByAsins,
  mapItem,
  resetCaches
};
