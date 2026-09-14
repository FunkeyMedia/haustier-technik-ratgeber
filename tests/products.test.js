const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  ALLOWED_IMAGE_HOSTS,
  AVAILABLE_TYPES,
  PARTNER_TAG,
  MAX_PRODUCTS,
  REQUEST_PLAN,
  affiliateUrl,
  deduplicateVariants,
  isAmazonImage,
  mapItem,
  resetCaches
} = require('../lib/amazon');
const handler = require('../api/products');

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

test('Der Serverkatalog ist für 500 echte Produkte mit paginierten Suchen ausgelegt', () => {
  assert.equal(MAX_PRODUCTS, 500);
  assert.equal(REQUEST_PLAN.length >= 200, true);
  assert.equal(REQUEST_PLAN.some(request => request.page > 1), true);
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
