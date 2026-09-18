function toggleComparison(selected, product) {
  if (selected.some(item => item.asin === product.asin)) return selected.filter(item => item.asin !== product.asin);
  return selected.length < 3 ? [...selected, product] : selected;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { toggleComparison };
} else {
const filters = document.querySelectorAll('[data-filter]');
const cards = document.querySelectorAll('.guide-card');
const filterButtons = document.querySelectorAll('.filter button');
const guideSection = document.querySelector('.guides');

function setFilter(value, shouldScroll = false) {
  cards.forEach(card => card.classList.toggle('hidden', value !== 'all' && !card.dataset.pet.includes(value)));
  filterButtons.forEach(button => {
    const active = button.dataset.filter === value;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (shouldScroll) guideSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

filters.forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter, button.classList.contains('filter-trigger'))));

const header = document.querySelector('.site-header');
const menu = document.querySelector('.menu-button');
menu?.addEventListener('click', () => {
  const open = header.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('#main-nav a').forEach(link => link.addEventListener('click', () => {
  header.classList.remove('open');
  menu.setAttribute('aria-expanded', 'false');
}));

const productGrid = document.querySelector('#amazon-products');
const productStatus = document.querySelector('#product-status');
const productCount = document.querySelector('#product-count');
const amazonNotice = document.querySelector('#amazon-notice');
const productDialog = document.querySelector('#product-dialog');
let allProducts = [];
let galleryImages = [];
let galleryIndex = 0;
let comparedProducts = [];
const comparisonPanel = element('section', 'comparison-panel-products');
comparisonPanel.setAttribute('aria-label', 'Produktvergleich');
const comparisonStatus = element('p', 'comparison-status', 'Wähle bis zu drei Produkte zum Vergleich aus.');
comparisonStatus.setAttribute('role', 'status');
const comparisonTable = element('div', 'comparison-table-wrap');
comparisonPanel.append(comparisonStatus, comparisonTable);
productGrid.before(comparisonPanel);
function renderComparison() {
  comparisonStatus.textContent = comparedProducts.length ? `${comparedProducts.length} von 3 Produkten ausgewählt. Verglichen werden nur die angegebenen Produktdaten.` : 'Wähle bis zu drei Produkte zum Vergleich aus.';
  comparisonTable.replaceChildren();
  productGrid.querySelectorAll('.compare-product').forEach(button => {
    const selected = comparedProducts.some(p => p.asin === button.dataset.asin);
    button.setAttribute('aria-pressed', String(selected));
    button.textContent = selected ? 'Aus Vergleich entfernen' : 'Zum Vergleich hinzufügen';
    button.disabled = !selected && comparedProducts.length >= 3;
  });
  if (!comparedProducts.length) return;
  const table = element('table');
  const caption = element('caption', '', 'Produktdaten im Vergleich');
  table.append(caption);
  const head = element('thead');
  const heading = element('tr');
  const field = element('th', '', 'Merkmal');
  field.scope = 'col';
  heading.append(field);
  comparedProducts.forEach(product => {
    const th = element('th');
    th.scope = 'col';
    const link = element('a', '', product.title);
    link.href = productPageUrl(product);
    const remove = element('button', 'comparison-remove', 'Entfernen');
    remove.type = 'button';
    remove.setAttribute('aria-label', `${product.title} aus Vergleich entfernen`);
    remove.addEventListener('click', () => {
      comparedProducts = toggleComparison(comparedProducts, product);
      renderComparison();
      comparisonStatus.focus();
    });
    th.append(link, remove);
    heading.append(th);
  });
  head.append(heading);table.append(head);
  const body = element('tbody');
  for (const [label, value] of [['Preis', p => p.price?.display], ['Marke', p => p.brand], ['Modell', p => p.model]]) {
    const row = element('tr');
    const th = element('th', '', label);th.scope = 'row';row.append(th);
    comparedProducts.forEach(product => row.append(element('td', '', value(product) || 'Nicht angegeben')));
    body.append(row);
  }
  table.append(body);comparisonTable.append(table);
}
comparisonStatus.tabIndex = -1;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function renderProduct(product, rank = null) {
  const article = element('article', 'amazon-product-card');
  article.dataset.asin = product.asin;
  const imageFrame = element('a', 'amazon-card-image');
  imageFrame.href = productPageUrl(product);
  imageFrame.setAttribute('aria-label', `${product.title}: Produktdetails öffnen`);
  const image = document.createElement('img');
  image.src = product.image;
  image.alt = product.title;
  image.loading = 'lazy';
  image.width = 500;
  image.height = 500;
  if (rank) imageFrame.append(element('span', 'product-rank', `#${rank}`));
  imageFrame.append(image, element('span', 'amazon-card-detail-hint', 'Details ansehen'));
  article.append(imageFrame);

  const body = element('div', 'amazon-product-body');
  const meta = element('p', 'amazon-product-meta', [product.brand, product.model].filter(Boolean).join(' · ') || product.category);
  const title = element('h3');
  const titleLink = element('a', '', product.title);
  titleLink.href = productPageUrl(product);
  title.append(titleLink);
  const category = element('span', 'amazon-category', product.category);
  const features = element('ul', 'amazon-features');
  product.features.slice(0, 3).forEach(value => features.append(element('li', '', shortFeature(value, 76))));
  const detailPage = element('a', 'product-detail-page', 'Ausführliche Produktseite →');
  detailPage.href = productPageUrl(product);
  detailPage.addEventListener('click', event => event.stopPropagation());
  const footer = element('div', 'amazon-product-footer');
  const price = element('strong', 'amazon-price', product.price.display);
  const link = element('a', 'amazon-button', 'Jetzt bei Amazon ansehen ↗');
  link.href = product.url;
  link.target = '_blank';
  link.rel = 'nofollow sponsored noopener';
  link.setAttribute('aria-label', `${product.title} bei Amazon ansehen (Werbelink)`);
  link.addEventListener('click', event => event.stopPropagation());
  footer.append(price, link);
  body.append(category, meta, title);
  if (product.features.length) body.append(features);
  const compare = element('button', 'compare-product', comparedProducts.some(p => p.asin === product.asin) ? 'Aus Vergleich entfernen' : 'Zum Vergleich hinzufügen');
  compare.type = 'button';
  compare.dataset.asin = product.asin;
  compare.setAttribute('aria-label', `${product.title}: zum Vergleich auswählen`);
  compare.setAttribute('aria-pressed', String(comparedProducts.some(p => p.asin === product.asin)));
  compare.addEventListener('click', event => {
    event.stopPropagation();
    if (expireOffers()) return;
    comparedProducts = toggleComparison(comparedProducts, product);
    renderComparison();
  });
  body.append(detailPage, compare);
  body.append(footer);
  article.append(body);
  const preview = element('button', 'product-preview', 'Bilder & Kurzansicht');
  preview.type = 'button';
  preview.addEventListener('click', () => openProductDialog(product));
  body.insertBefore(preview, detailPage);
  return article;
}

const categoryControl = document.querySelector('#product-category');
const petControl = document.querySelector('#product-pet');
const sortControl = document.querySelector('#product-sort');
const moreButton = document.querySelector('#load-more');
let currentPage = 0;
let generation = 0;
let requestController;
let expiryTimer;
let expiresAt = Infinity;
let needsRefresh = false;
function expireOffers() {
  if (Date.now() < expiresAt) return false;
  requestController?.abort();
  generation += 1;
  allProducts = [];
  comparedProducts = [];
  currentPage = 0;
  needsRefresh = true;
  productDialog.close();
  document.querySelector('#product-dialog-image').removeAttribute('src');
  document.querySelector('#product-dialog-thumbnails').replaceChildren();
  document.querySelector('#product-dialog-price').textContent = '';
  renderProductView();
  productStatus.hidden = false;
  productStatus.textContent = 'Diese Angebote sind nicht mehr aktuell. Lade Preise und Bilder erneut, um weiter zu vergleichen.';
  moreButton.hidden = false;
  moreButton.disabled = false;
  moreButton.textContent = 'Aktuelle Angebote laden';
  productGrid.setAttribute('aria-busy', 'false');
  return true;
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && allProducts.length) expireOffers();
});
function renderProductView() {
  const visible = selectProducts(allProducts, petControl.value, sortControl.value);
  productGrid.replaceChildren(...visible.map(product => renderProduct(product)));
  productCount.textContent = `${visible.length} Angebote angezeigt · ${allProducts.length} geladen`;
  renderComparison();
}
categoryControl.addEventListener('change', () => loadAmazonProducts(true));
petControl.addEventListener('change', () => loadAmazonProducts(true));
sortControl.addEventListener('change', renderProductView);
moreButton.addEventListener('click', () => loadAmazonProducts(needsRefresh));

function shortFeature(value, maximumLength = 118) {
  const firstSentence = value.split(/(?<=[.!?])\s/)[0];
  return firstSentence.length > maximumLength ? `${firstSentence.slice(0, maximumLength - 1).trim()}…` : firstSentence;
}

function productPageUrl(product) {
  return `/produkt/${product.asin}`;
}

function showGalleryImage(index) {
  if (!galleryImages.length) return;
  galleryIndex = (index + galleryImages.length) % galleryImages.length;
  const main = document.querySelector('#product-dialog-image');
  main.src = galleryImages[galleryIndex];
  document.querySelectorAll('.product-thumbnail').forEach((button, buttonIndex) => {
    button.classList.toggle('active', buttonIndex === galleryIndex);
    button.setAttribute('aria-current', buttonIndex === galleryIndex ? 'true' : 'false');
  });
}

function openProductDialog(product) {
  if (expireOffers()) return;
  galleryImages = (product.images?.length ? product.images : [product.image]).slice(0, 8);
  galleryIndex = 0;
  document.querySelector('#product-dialog-brand').textContent = product.brand || 'Haustier Technik';
  document.querySelector('#product-dialog-category').textContent = product.category;
  document.querySelector('#product-dialog-title').textContent = product.title;
  document.querySelector('#product-dialog-price').textContent = product.price.display;
  document.querySelector('#product-dialog-availability').textContent = `✓ ${product.availability.message || 'Bei Amazon verfügbar'}`;
  const featureList = document.querySelector('#product-dialog-features');
  featureList.replaceChildren(...product.features.slice(0, 3).map(value => element('li', '', shortFeature(value))));

  const facts = [
    ['Marke', product.brand],
    ['Modell', product.model],
    ['ASIN', product.asin],
    ['Eltern-ASIN', product.parentAsin],
    ...(product.details || []).map(detail => [detail.label, detail.value])
  ].filter(([, value]) => value).slice(0, 7);
  const factList = document.querySelector('#product-dialog-facts');
  factList.replaceChildren(...facts.flatMap(([label, value]) => [element('dt', '', label), element('dd', '', value)]));

  const amazonLink = document.querySelector('#product-dialog-amazon');
  amazonLink.href = product.url;
  amazonLink.setAttribute('aria-label', `${product.title} jetzt bei Amazon ansehen (Werbelink)`);
  const thumbnails = document.querySelector('#product-dialog-thumbnails');
  thumbnails.replaceChildren(...galleryImages.slice(0, 8).map((url, index) => {
    const button = element('button', 'product-thumbnail');
    button.type = 'button';
    button.setAttribute('aria-label', `Produktbild ${index + 1} anzeigen`);
    const thumb = document.createElement('img');
    thumb.src = url;
    thumb.alt = '';
    button.append(thumb);
    button.addEventListener('click', () => showGalleryImage(index));
    return button;
  }));
  document.querySelector('.gallery-arrow.previous').hidden = galleryImages.length < 2;
  document.querySelector('.gallery-arrow.next').hidden = galleryImages.length < 2;
  showGalleryImage(0);
  productDialog.showModal();
}

document.querySelector('.product-dialog-close').addEventListener('click', () => productDialog.close());
document.querySelector('.gallery-arrow.previous').addEventListener('click', () => showGalleryImage(galleryIndex - 1));
document.querySelector('.gallery-arrow.next').addEventListener('click', () => showGalleryImage(galleryIndex + 1));
productDialog.addEventListener('click', event => { if (event.target === productDialog) productDialog.close(); });

async function loadAmazonProducts(reset = true) {
  if (!productGrid) return;
  if (reset) {
    clearTimeout(expiryTimer);
    expiresAt = Infinity;
    needsRefresh = false;
    requestController?.abort();
    generation += 1;
    currentPage = 0;
    allProducts = [];
    comparedProducts = [];
    renderProductView();
  }
  const ownGeneration = generation;
  const nextPage = currentPage + 1;
  requestController = new AbortController();
  moreButton.disabled = true;
  productGrid.setAttribute('aria-busy', 'true');
  productStatus.hidden = false;
  productStatus.className = 'product-status';
  productStatus.textContent = 'Passende Angebote werden geladen …';
  try {
    const query = new URLSearchParams({category: categoryControl.value, pet: petControl.value, page: String(nextPage)});
    const response = await fetch(`/api/products?${query}`, {headers:{accept:'application/json'},signal:requestController.signal});
    const data = await response.json();
    if (ownGeneration !== generation) return;
    if (!response.ok || data.status !== 'live' || !Array.isArray(data.products)) throw new Error('unavailable');
    const products = new Map(allProducts.map(p => [p.parentAsin || p.asin,p]));
    data.products.forEach(p => { if(!products.has(p.parentAsin || p.asin)) products.set(p.parentAsin || p.asin,p); });
    allProducts = [...products.values()];
    expiresAt = Math.min(expiresAt, offersExpireAt(data.fetchedAt));
    if (allProducts.length && expireOffers()) return;
    clearTimeout(expiryTimer);
    if (allProducts.length) expiryTimer = setTimeout(expireOffers, Math.max(0, expiresAt - Date.now()));
    currentPage = nextPage;
    renderProductView();
    const visible = selectProducts(allProducts, petControl.value, sortControl.value);
    productStatus.hidden = data.products.length > 0 && visible.length > 0;
    productStatus.textContent = visible.length ? 'Auf dieser Ergebnisseite sind keine weiteren passenden Angebote verfügbar.' : 'Für diese Auswahl sind derzeit keine passenden Angebote verfügbar. Wähle eine andere Kategorie oder Tierauswahl.';
    moreButton.hidden = !data.hasMore;
    moreButton.textContent = 'Weitere Angebote laden';
    amazonNotice.textContent = data.notice + (data.fetchedAt ? ` Stand: ${new Date(data.fetchedAt).toLocaleString('de-DE')}.` : '');
  } catch (error) {
    if (error.name === 'AbortError' || ownGeneration !== generation) return;
    productStatus.className = 'product-status unavailable';
    productStatus.textContent = 'Die Angebote konnten gerade nicht geladen werden. Bitte versuche es erneut oder wähle eine andere Kategorie.';
    moreButton.hidden = false;
    moreButton.textContent = 'Erneut versuchen';
  } finally {
    if (ownGeneration === generation) {
      moreButton.disabled = false;
      productGrid.setAttribute('aria-busy', 'false');
    }
  }
}
loadAmazonProducts();

}
