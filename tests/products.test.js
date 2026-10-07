const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  ALLOWED_IMAGE_HOSTS,
  AVAILABLE_TYPES,
  PARTNER_TAG,
  affiliateUrl,
  deduplicateVariants,
  isAmazonImage,
  mapItem,
  resetCaches
} = require('../lib/amazon');
const handler = require('../api/products');
const productPage = require('../api/product-page');

const search = { pet: 'cat', category: 'Trinkbrunnen' };

function apiItem(overrides = {}) {
  return {
    asin: 'B012345678',
    parentASIN: 'B087654321',
    detailPageURL: 'https://www.amazon.de/dp/B012345678?tag=Onlinestarkei-21',
    images: { primary: { large: { url: 'https://m.media-amazon.com/images/I/example.jpg' } } },
    itemInfo: {
      title: { displayValue: 'Amazon API Testprodukt' },
      byLineInfo: { brand: { displayValue: 'Testmarke' } },
      manufactureInfo: { model: { displayValue: 'Modell X' } },
      features: { displayValues: ['Leise Pumpe', 'Einfache Reinigung', 'Großer Wassertank'] }
    },
    offersV2: {
      listings: [{
        availability: { type: 'IN_STOCK', message: 'Auf Lager' },
        condition: { value: 'New' },
        price: { money: { amount: 39.99, currency: 'EUR', displayAmount: '39,99 €' } }
      }]
    },
    ...overrides
  };
}

test('1–4: nur echte ASINs, Amazon-Bilder, API-Europreise und verfügbare Angebote', () => {
  const product = mapItem(apiItem(), search);
  assert.match(product.asin, /^[A-Z0-9]{10}$/);
  assert.equal(isAmazonImage(product.image), true);
  assert.equal(ALLOWED_IMAGE_HOSTS.has(new URL(product.image).hostname), true);
  assert.equal(product.price.source, 'amazon-creators-api');
  assert.equal(product.price.currency, 'EUR');
  assert.equal(AVAILABLE_TYPES.has(product.availability.type), true);
  assert.equal(product.features.length, 3);
  assert.equal(product.images[0], product.image);

  assert.equal(mapItem(apiItem({ asin: 'falsch' }), search), null);
  assert.equal(mapItem(apiItem({ images: { primary: { large: { url: 'https://example.org/image.jpg' } } } }), search), null);
  assert.equal(mapItem(apiItem({ offersV2: { listings: [{ availability: { type: 'OUTOFSTOCK' }, price: { money: { amount: 1, currency: 'EUR' } } }] } }), search), null);
  assert.equal(mapItem(apiItem({ offersV2: { listings: [{ availability: { type: 'IN_STOCK' }, price: { money: { amount: 1, currency: 'USD' } } }] } }), search), null);
});

test('5: Farbvarianten mit derselben Eltern-ASIN werden zusammengefasst', () => {
  const first = mapItem(apiItem(), search);
  const second = { ...first, asin: 'B012345679', title: 'Testprodukt in Blau', features: [] };
  const grouped = deduplicateVariants([first, second]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].parentAsin, 'B087654321');
});

test('6 und 9: jeder Link führt zur ASIN auf Amazon.de und enthält exakt die festgelegte Partner-ID', () => {
  const url = new URL(affiliateUrl('B012345678'));
  assert.equal(url.hostname, 'www.amazon.de');
  assert.equal(url.pathname, '/dp/B012345678');
  assert.deepEqual(url.searchParams.getAll('tag'), [PARTNER_TAG]);
  assert.equal(PARTNER_TAG, 'Onlinestarkei-21');
});

function projectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (['.git', '.vercel', 'node_modules'].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? projectFiles(full) : [full];
  });
}

test('7 und 8: keine andere Partner-ID und keine Zugangsdaten im Browser-Code', () => {
  const root = path.resolve(__dirname, '..');
  const textExtensions = new Set(['.js', '.json', '.html', '.css', '.md', '.yml', '.yaml', '.example', '']);
  const files = projectFiles(root).filter(file => !file.endsWith('.env.local') && textExtensions.has(path.extname(file)));
  const browserFiles = files.filter(file => file.endsWith('.html') || file.includes(`${path.sep}assets${path.sep}`));
  const browserText = browserFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(browserText, /AMAZON_CREATORS_(CLIENT_ID|CLIENT_SECRET)/);
  assert.doesNotMatch(browserText, /client_secret|creatorsapi::default/);

  const productionFiles = files.filter(file => !file.includes(`${path.sep}tests${path.sep}`));
  const projectText = productionFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  const tagValues = [...projectText.matchAll(/(?:tag=|PARTNER_TAG\s*=\s*['"])([A-Za-z0-9-]+)/g)].map(match => match[1]);
  assert.equal(tagValues.every(value => value === PARTNER_TAG), true);
  assert.equal(tagValues.length > 0, true);
  assert.doesNotMatch(projectText, /NEXT_PUBLIC_AMAZON/);
});

test('10: API-Ausfall liefert eine transparente, preisfreie Ersatzdarstellung', async () => {
  const oldId = process.env.AMAZON_CREATORS_CLIENT_ID;
  const oldSecret = process.env.AMAZON_CREATORS_CLIENT_SECRET;
  delete process.env.AMAZON_CREATORS_CLIENT_ID;
  delete process.env.AMAZON_CREATORS_CLIENT_SECRET;
  resetCaches();

  let statusCode;
  let body;
  const response = {
    setHeader() {},
    status(code) { statusCode = code; return this; },
    json(value) { body = value; return this; }
  };
  await handler({ method: 'GET' }, response);
  assert.equal(statusCode, 503);
  assert.deepEqual(body.products, []);
  assert.equal(body.count, 0);
  assert.doesNotMatch(JSON.stringify(body), /(?:\d+[.,]\d{2}\s?€|"price")/i);
  assert.match(body.notice, /nicht verfügbar/i);

  if (oldId) process.env.AMAZON_CREATORS_CLIENT_ID = oldId;
  if (oldSecret) process.env.AMAZON_CREATORS_CLIENT_SECRET = oldSecret;
});

test('Partnerlinks tragen die vorgeschriebenen rel-Werte', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../assets/app.js'), 'utf8');
  assert.match(script, /nofollow sponsored noopener/);
});

test('Kategorieauswahl ersetzt unbewiesene Ranglisten', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const script = fs.readFileSync(path.resolve(__dirname, '../assets/app.js'), 'utf8');
  assert.match(html, /id="product-category"/);
  assert.doesNotMatch(html + script, /Top 100|von 500|data-product-view|[0-5][.,]\d\s*(?:Sterne|★)/i);
});

test('Top-Produkte verlinken individuelle SEO-Produktseiten', () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../assets/app.js'), 'utf8');
  const vercel = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../vercel.json'), 'utf8'));
  assert.match(script, /Ausführliche Produktseite/);
  assert.match(script, /`\/produkt\/\$\{product\.asin\}`/);
  assert.equal(vercel.rewrites[0].source, '/produkt/:slug');
});

test('SEO-Produktseite enthält strukturierte Live-Produktdaten und sichere Werbelinks', () => {
  const product = mapItem(apiItem(), search);
  const html = productPage.page(product);
  assert.match(html, /<title>Amazon API Testprodukt/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /39,99 €/);
  assert.match(html, /tag=Onlinestarkei-21/);
  assert.match(html, /rel="nofollow sponsored noopener"/);
  assert.doesNotMatch(html, /Bewertung|Sterne|ratingValue/i);
});

test('Das Premium-Logo ist auf allen Seitentypen eingebunden', () => {
  const home = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const imprint = fs.readFileSync(path.resolve(__dirname, '../impressum.html'), 'utf8');
  const privacy = fs.readFileSync(path.resolve(__dirname, '../datenschutz.html'), 'utf8');
  const productTemplate = fs.readFileSync(path.resolve(__dirname, '../api/product-page.js'), 'utf8');
  for (const content of [home, imprint, privacy, productTemplate]) {
    assert.match(content, /haustier-technik-logo-premium\.png/);
  }
  assert.equal(fs.statSync(path.resolve(__dirname, '../assets/haustier-technik-logo-premium.png')).size > 1000, true);
  assert.equal(fs.statSync(path.resolve(__dirname, '../assets/haustier-technik-logo-favicon.png')).size > 1000, true);
});
test('LEADTIME does not claim in-stock or preorder availability in product schema',()=>{
 const product=mapItem(apiItem(),search);
 product.availability.type='LEADTIME';
 const html=productPage.page(product);
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
 assert.equal(schema.offers.availability,undefined);
 product.availability.type='IN_STOCK';
 assert.match(productPage.page(product),/https:\/\/schema.org\/InStock/);
});

test('temporary item throttling retries once, while empty item data can recover immediately', async () => {
  const amazon = require('../lib/amazon');
  const previousId = process.env.AMAZON_CREATORS_CLIENT_ID;
  const previousSecret = process.env.AMAZON_CREATORS_CLIENT_SECRET;
  const previousTag = process.env.AMAZON_CREATORS_PARTNER_TAG;
  process.env.AMAZON_CREATORS_CLIENT_ID = 'synthetic-test-id';
  process.env.AMAZON_CREATORS_CLIENT_SECRET = 'synthetic-test-secret';
  process.env.AMAZON_CREATORS_PARTNER_TAG = 'Onlinestarkei-21';
  resetCaches();
  let calls = 0;
  const fakeFetch = async (url) => {
    if (url.includes('/auth/')) return {ok: true, json: async () => ({access_token: 'synthetic-token', expires_in: 3600})};
    calls++;
    if (calls === 1) return {ok: false, status: 429};
    return {ok: true, status: 200, json: async () => ({itemsResult: {items: calls === 2 ? [] : [apiItem()]}})};
  };
  try {
    assert.equal(await amazon.loadProductByAsin('B012345678', fakeFetch), null);
    assert.equal(calls, 2);
    assert.equal((await amazon.loadProductByAsin('B012345678', fakeFetch)).asin, 'B012345678');
    assert.equal(calls, 3);
    assert.equal((await amazon.loadProductByAsin('B012345678', fakeFetch)).asin, 'B012345678');
    assert.equal(calls, 3);
  } finally {
    if (previousId === undefined) delete process.env.AMAZON_CREATORS_CLIENT_ID; else process.env.AMAZON_CREATORS_CLIENT_ID = previousId;
    if (previousSecret === undefined) delete process.env.AMAZON_CREATORS_CLIENT_SECRET; else process.env.AMAZON_CREATORS_CLIENT_SECRET = previousSecret;
    if (previousTag === undefined) delete process.env.AMAZON_CREATORS_PARTNER_TAG; else process.env.AMAZON_CREATORS_PARTNER_TAG = previousTag;
    resetCaches();
  }
});

test('a valid product alias redirects to its canonical ASIN URL', async () => {
  const amazon = require('../lib/amazon');
  const originalLoader = amazon.loadProductByAsin;
  const pagePath = require.resolve('../api/product-page');
  const originalModule = require.cache[pagePath];
  amazon.loadProductByAsin = async () => mapItem(apiItem(), search);
  delete require.cache[pagePath];
  try {
    const route = require('../api/product-page');
    let status;
    const headers = {};
    await route({query: {slug: 'b012345678-product-name'}}, {setHeader(k,v) {headers[k]=v;}, status(code) {status=code;return this;}, send() {}});
    assert.equal(status, 308);
    assert.equal(headers.Location, '/produkt/B012345678');
  } finally {
    amazon.loadProductByAsin = originalLoader;
    require.cache[pagePath] = originalModule;
  }
});
