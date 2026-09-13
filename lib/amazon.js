const PARTNER_TAG = 'Onlinestarkei-21';
const MARKETPLACE = 'www.amazon.de';
const TOKEN_URL = 'https://api.amazon.co.uk/auth/o2/token';
const SEARCH_URL = 'https://creatorsapi.amazon/catalog/v1/searchItems';
const PRODUCT_CACHE_MS = 30 * 60 * 1000;
const TOKEN_SAFETY_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 6500;

const SEARCHES = [
  { keywords: 'Katzenklo selbstreinigend', pet: 'cat', category: 'Katzenklo-Roboter' },
  { keywords: 'Trinkbrunnen Katze', pet: 'cat', category: 'Trinkbrunnen' },
  { keywords: 'Futterautomat Katze Hund', pet: 'both', category: 'Futterautomaten' },
  { keywords: 'Mikrochip Katzenklappe', pet: 'cat', category: 'Mikrochip-Katzenklappen' },
  { keywords: 'GPS Tracker Hund', pet: 'dog', category: 'GPS-Tracker' },
  { keywords: 'Hundekamera Haustierkamera', pet: 'dog', category: 'Tierkameras' },
  { keywords: 'Fellpflege Staubsauger Hund', pet: 'dog', category: 'Fellpflege-Systeme' },
  { keywords: 'Automatischer Ballwerfer Hund', pet: 'dog', category: 'Ballwerfer' }
];

const ALLOWED_IMAGE_HOSTS = new Set([
  'm.media-amazon.com',
  'images-eu.ssl-images-amazon.com',
  'images-na.ssl-images-amazon.com',
  'images.amazon.com'
]);
const AVAILABLE_TYPES = new Set(['IN_STOCK', 'INSTOCK', 'INSTOCKSCARCE', 'LEADTIME']);

let tokenCache = null;
let productCache = null;

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

function mapItem(item, search) {
  const asin = typeof item.asin === 'string' ? item.asin.trim().toUpperCase() : '';
  if (!/^[A-Z0-9]{10}$/.test(asin)) return null;

  const image = item.images?.primary?.large?.url || item.images?.primary?.medium?.url || '';
  if (!isAmazonImage(image)) return null;

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
    ? item.itemInfo.features.displayValues.filter(value => typeof value === 'string').slice(0, 4)
    : [];

  return {
    asin,
    parentAsin: /^[A-Z0-9]{10}$/.test(item.parentASIN || '') ? item.parentASIN : null,
    brand: displayValue(item.itemInfo?.byLineInfo?.brand),
    model: pickModel(item),
    title: displayValue(item.itemInfo?.title),
    image,
    price,
    availability: {
      type: String(listing.availability.type).toUpperCase(),
      message: listing.availability.message || 'Bei Amazon verfügbar'
    },
    features,
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

async function searchProducts(search, accessToken, fetchImpl = fetch) {
  const response = await withTimeout(fetchImpl, SEARCH_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'x-marketplace': MARKETPLACE
    },
    body: JSON.stringify({
      marketplace: MARKETPLACE,
      partnerTag: PARTNER_TAG,
      keywords: search.keywords,
      availability: 'Available',
      condition: 'New',
      currencyOfPreference: 'EUR',
      itemCount: 6,
      resources: [
        'images.primary.large',
        'images.primary.medium',
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
  if (!response.ok) throw new Error(`Amazon-Produktsuche fehlgeschlagen (${response.status}).`);
  const data = await response.json();
  return (data.searchResult?.items || []).map(item => mapItem(item, search)).filter(Boolean);
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next++;
      results[index] = await mapper(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

async function loadProducts(fetchImpl = fetch) {
  if (productCache && productCache.expiresAt > Date.now()) {
    return { ...productCache.payload, cached: true };
  }
  const accessToken = await getAccessToken(fetchImpl);
  const batches = await mapWithConcurrency(SEARCHES, 2, search => searchProducts(search, accessToken, fetchImpl));
  const products = deduplicateVariants(batches.flat());
  const payload = { products, count: products.length, fetchedAt: new Date().toISOString() };
  productCache = { payload, expiresAt: Date.now() + PRODUCT_CACHE_MS };
  return { ...payload, cached: false };
}

function resetCaches() {
  tokenCache = null;
  productCache = null;
}

module.exports = {
  ALLOWED_IMAGE_HOSTS,
  AVAILABLE_TYPES,
  MARKETPLACE,
  PARTNER_TAG,
  SEARCHES,
  affiliateUrl,
  deduplicateVariants,
  isAmazonImage,
  loadProducts,
  mapItem,
  resetCaches
};
