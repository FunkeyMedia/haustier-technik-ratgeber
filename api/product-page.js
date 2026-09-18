const registry = require('../data/product-registry.json');
const legacyAsins = require('../data/legacy-product-asins.json');
const categories = require('../lib/categories');
const stories = require('../lib/category-stories');
const { loadProductByAsin } = require('../lib/amazon');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function slugify(value = '') {
  return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}

function page(product) {
  const category = categories.find(c => c.id === registry.find(p => p.asin === product.asin)?.category);
  const context = category ? `<section class="seo-guide"><p class="kicker">${escapeHtml(category.title)}</p><h2>${escapeHtml(stories[category.id][0])}</h2><p>${escapeHtml(category.intro)}</p><ul>${category.criteria.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul><a href="/kategorien/${category.id}">Weitere ${escapeHtml(category.title)} vergleichen →</a></section>` : '';
  const title = `${product.title} – Preis & Produktdetails | Haustier Technik`;
  const description = `${product.brand ? `${product.brand}: ` : ''}${product.title}. Aktueller Amazon-Preis, Verfügbarkeit, Bilder und Produkteigenschaften.`.slice(0, 158);
  const canonical = `https://haustier-technik.de/produkt/${product.asin}`;
  const features = product.features.map(value => `<li>${escapeHtml(value)}</li>`).join('');
  const details = [
    ['Marke', product.brand], ['Modell', product.model], ['ASIN', product.asin],
    ...product.details.map(detail => [detail.label, detail.value])
  ].filter(([, value]) => value).slice(0, 12).map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('');
  const gallery = product.images.slice(0, 8).map((url, index) => `<button type="button" class="seo-thumbnail" aria-label="Produktbild ${index + 1} anzeigen" aria-pressed="${index === 0}"><img src="${escapeHtml(url)}" alt="${escapeHtml(product.title)} – Produktbild ${index + 1}" loading="${index ? 'lazy' : 'eager'}"></button>`).join('');
  const schema = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Product', name: product.title, image: product.images, url: canonical,
    sku: product.asin, brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    model: product.model || undefined,
    description: product.features.join(' ').slice(0, 500),
    offers: { '@type': 'Offer', url: product.url, priceCurrency: 'EUR', price: product.price.amount, availability: ['IN_STOCK', 'INSTOCK', 'INSTOCKSCARCE'].includes(product.availability.type) ? 'https://schema.org/InStock' : undefined, itemCondition: 'https://schema.org/NewCondition' }
  }).replace(/</g, '\\u003c');
  const breadcrumbs = JSON.stringify({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Startseite',item:'https://haustier-technik.de/'},...(category ? [{'@type':'ListItem',position:2,name:category.title,item:`https://haustier-technik.de/kategorien/${category.id}`}] : []),{'@type':'ListItem',position:category ? 3 : 2,name:product.title,item:canonical}]}).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#07192b"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${canonical}"><link rel="icon" type="image/png" href="/assets/haustier-technik-logo-favicon.png"><meta property="og:type" content="product"><meta property="og:title" content="${escapeHtml(product.title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:image" content="${escapeHtml(product.image)}"><meta property="og:url" content="${canonical}"><link rel="stylesheet" href="/assets/styles.css?v=20260918b"><link rel="stylesheet" href="/assets/product-page.css?v=20260918b"><script type="application/ld+json">${schema}</script><script type="application/ld+json">${breadcrumbs}</script></head><body class="product-page" data-fetched-at="${escapeHtml(product.fetchedAt || '')}"><header class="legal-header"><a class="brand" href="/"><img class="brand-mark" src="/assets/haustier-technik-logo-premium.png" alt="" width="48" height="48"><span>haustier<span>technik</span></span></a><a class="legal-back" href="/#kategorien">Kategorien <span>→</span></a></header><main><nav class="product-breadcrumb" aria-label="Brotkrumen"><a href="/">Startseite</a><span>›</span><a href="${category ? `/kategorien/${category.id}` : '/#kategorien'}">${category ? escapeHtml(category.title) : 'Kategorien'}</a><span>›</span><span>${escapeHtml(product.brand || 'Produkt')}</span></nav><article class="seo-product"><div class="seo-gallery"><div class="seo-main-image"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}"></div><div class="seo-thumbnails">${gallery}</div><small>Produktbilder: Amazon · gezeigtes Modell</small></div><div class="seo-product-copy"><p class="kicker">Aktuelles Amazon-Angebot</p><p class="seo-brand">${escapeHtml(product.brand || 'Haustiertechnik')}</p><h1>${escapeHtml(product.title)}</h1><strong class="seo-price">${escapeHtml(product.price.display)}</strong><p class="seo-availability">✓ ${escapeHtml(product.availability.message || 'Bei Amazon verfügbar')}</p><div class="seo-benefits"><h2>Produkteigenschaften</h2><ul>${features}</ul></div><a class="seo-amazon" href="${escapeHtml(product.url)}" target="_blank" rel="nofollow sponsored noopener">Jetzt bei Amazon ansehen* <span>↗</span></a><p class="seo-notice">* Werbelink. Preise und Verfügbarkeit können sich ändern. Maßgeblich ist das Angebot bei Amazon zum Kaufzeitpunkt.</p></div></article>${context}<section class="seo-details"><p class="kicker">Produkt im Überblick</p><h2>Angaben zum Modell</h2><dl>${details}</dl></section><section class="seo-guide"><p class="kicker">Kaufentscheidung</p><h2>Worauf du bei diesem Produkt achten solltest</h2><p>Prüfe vor dem Kauf, ob die genannten Eigenschaften zu deinem Tier und eurem Alltag passen. Achte besonders auf Maße, Stromversorgung, Reinigung und mögliche Folgekosten. Die verbindlichen Angaben sowie die aktuell lieferbare Ausführung findest du auf der verlinkten Amazon-Produktseite.</p></section></main><footer class="legal-footer"><div class="section-shell"><span>© 2026 Haustier Technik</span><nav class="legal-links"><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a></nav></div></footer><script src="/assets/product-gallery.js?v=20260918b"></script><script src="/assets/product-selection.js?v=20260918b"></script><script src="/assets/product-expiry.js?v=20260918b"></script></body></html>`;
}

module.exports = async function handler(request, response) {
  const slug = String(request.query?.slug || '');
  const asin = (slug.match(/^[A-Z0-9]{10}(?=-|$)/i) || [])[0];
  if (!asin) return response.status(404).send('Produkt nicht gefunden.');
  try {
    const product = await loadProductByAsin(asin);
    if (!product) {
      const known = legacyAsins.includes(asin.toUpperCase()) || registry.some(p => p.asin === asin.toUpperCase());
      response.setHeader('Cache-Control', 'no-store');
      if (known) response.setHeader('Retry-After', '1800');
      return response.status(known ? 503 : 404).send('Für dieses Modell sind momentan keine vollständigen Produktdaten verfügbar. Bitte versuche es später erneut.');
    }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=300');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return response.status(200).send(page(product));
  } catch {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(503).send('Die aktuellen Amazon-Produktdaten sind momentan nicht verfügbar. Bitte versuche es später erneut.');
  }
};

module.exports.escapeHtml = escapeHtml;
module.exports.page = page;
module.exports.slugify = slugify;
