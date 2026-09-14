const { loadProductByAsin } = require('../lib/amazon');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function slugify(value = '') {
  return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}

function page(product) {
  const title = `${product.title} – Preis & Produktdetails | Haustier Technik`;
  const description = `${product.brand ? `${product.brand}: ` : ''}${product.title}. Aktueller Amazon-Preis, Verfügbarkeit, Bilder und Produkteigenschaften.`.slice(0, 158);
  const canonical = `https://haustier-technik.de/produkt/${product.asin}-${slugify(product.title)}`;
  const features = product.features.map(value => `<li>${escapeHtml(value)}</li>`).join('');
  const details = [
    ['Marke', product.brand], ['Modell', product.model], ['ASIN', product.asin],
    ...product.details.map(detail => [detail.label, detail.value])
  ].filter(([, value]) => value).slice(0, 12).map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('');
  const gallery = product.images.slice(0, 8).map((url, index) => `<img src="${escapeHtml(url)}" alt="${escapeHtml(product.title)} – Produktbild ${index + 1}" loading="${index ? 'lazy' : 'eager'}">`).join('');
  const schema = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Product', name: product.title, image: product.images,
    sku: product.asin, brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    model: product.model || undefined,
    description: product.features.join(' ').slice(0, 500),
    offers: { '@type': 'Offer', url: product.url, priceCurrency: 'EUR', price: product.price.amount, availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition' }
  }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#07192b"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="product"><meta property="og:title" content="${escapeHtml(product.title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:image" content="${escapeHtml(product.image)}"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/product-page.css"><script type="application/ld+json">${schema}</script></head><body class="product-page"><header class="legal-header"><a class="brand" href="/"><span class="brand-mark">HT</span><span>haustier<span>technik</span></span></a><a class="legal-back" href="/#produkte">Top 100 <span>→</span></a></header><main><nav class="product-breadcrumb" aria-label="Brotkrumen"><a href="/">Startseite</a><span>›</span><a href="/#produkte">Top 100</a><span>›</span><span>${escapeHtml(product.brand || 'Produkt')}</span></nav><article class="seo-product"><div class="seo-gallery"><div class="seo-main-image"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}"></div><div class="seo-thumbnails">${gallery}</div><small>Produktbilder: Amazon · gezeigtes Modell</small></div><div class="seo-product-copy"><p class="kicker">Aktuelles Amazon-Angebot</p><p class="seo-brand">${escapeHtml(product.brand || 'Haustiertechnik')}</p><h1>${escapeHtml(product.title)}</h1><strong class="seo-price">${escapeHtml(product.price.display)}</strong><p class="seo-availability">✓ ${escapeHtml(product.availability.message || 'Bei Amazon verfügbar')}</p><div class="seo-benefits"><h2>Produkteigenschaften</h2><ul>${features}</ul></div><a class="seo-amazon" href="${escapeHtml(product.url)}" target="_blank" rel="nofollow sponsored noopener">Jetzt bei Amazon ansehen* <span>↗</span></a><p class="seo-notice">* Werbelink. Preise und Verfügbarkeit können sich ändern. Maßgeblich ist das Angebot bei Amazon zum Kaufzeitpunkt.</p></div></article><section class="seo-details"><p class="kicker">Produkt im Überblick</p><h2>Angaben zum Modell</h2><dl>${details}</dl></section><section class="seo-guide"><p class="kicker">Kaufentscheidung</p><h2>Worauf du bei diesem Produkt achten solltest</h2><p>Prüfe vor dem Kauf, ob die genannten Eigenschaften zu deinem Tier und eurem Alltag passen. Achte besonders auf Maße, Stromversorgung, Reinigung und mögliche Folgekosten. Die verbindlichen Angaben sowie die aktuell lieferbare Ausführung findest du auf der verlinkten Amazon-Produktseite.</p></section></main><footer class="legal-footer"><div class="section-shell"><span>© 2026 Haustier Technik</span><nav class="legal-links"><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a></nav></div></footer></body></html>`;
}

module.exports = async function handler(request, response) {
  const slug = String(request.query?.slug || '');
  const asin = (slug.match(/^[A-Z0-9]{10}/i) || [])[0];
  if (!asin) return response.status(404).send('Produkt nicht gefunden.');
  try {
    const product = await loadProductByAsin(asin);
    if (!product) return response.status(404).send('Dieses Produkt ist derzeit nicht verfügbar.');
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
