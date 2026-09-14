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

const guides = {
  litter: ['Katzenklo-Roboter', 'Achte zuerst darauf, dass deine Katze bequem hineinpasst und das Gerät sie beim Reinigen zuverlässig erkennt.', ['Innenmaß und Einstiegshöhe', 'Sicherheits-Sensoren und manueller Stopp', 'Reinigung der Trommel und Geruchsfilter', 'Geeignete Streu und laufende Kosten']],
  gps: ['GPS-Tracker', 'Im Ernstfall zählen eine präzise Ortung und eine stabile Verbindung mehr als eine lange Liste von Extras.', ['Live-Ortung und Aktualisierungsintervall', 'Mobilfunk-Abdeckung und Abo-Kosten', 'Akkulaufzeit im realen Gebrauch', 'Gewicht, Wasserdichtigkeit und Befestigung']],
  feeder: ['Futterautomaten', 'Die passende Portionierung und ein hygienischer Aufbau sind wichtiger als App-Spielereien.', ['Fachgröße und Portionsgenauigkeit', 'Ausfallsicherung bei Stromunterbrechung', 'Leicht entnehmbare, spülbare Teile', 'Chip-Erkennung bei mehreren Tieren']],
  fountain: ['Trinkbrunnen', 'Ein guter Brunnen ist leise, leicht zu reinigen und hat gut verfügbare Ersatzfilter.', ['Lautstärke der Pumpe', 'Material und spülbare Bauteile', 'Filterpreis und Verfügbarkeit', 'Füllstandsanzeige und Trockenlaufschutz']],
  camera: ['Tierkameras', 'Eine Kamera sollte klare Bilder liefern, ohne deine Privatsphäre oder Ruhe mit unnötigen Meldungen zu belasten.', ['Nachtsicht und Bildwinkel', 'Lokale Speicherung oder sichere Cloud', 'Gezielte Bewegungs- und Geräuscherkennung', 'Abschaltbarer Kameramodus zu Hause']],
  flap: ['Mikrochip-Katzenklappen', 'Prüfe vor dem Kauf Chip-Kompatibilität, Einbauort und die Zahl speicherbarer Tiere.', ['Kompatible Mikrochip-Standards', 'Wand-, Glas- oder Türeinbau', 'Selektive Ein- und Ausgangsregeln', 'Batterielaufzeit und Warnanzeige']],
  care: ['Fellpflege-Systeme', 'Geräusch, Saugstärke und ein passender Aufsatz entscheiden, ob dein Hund die Pflege entspannt akzeptiert.', ['Lautstärke auf niedriger Stufe', 'Aufsätze passend zu Felltyp und Größe', 'Regelbare Saugkraft', 'Reinigung und Ersatzfilter']],
  ball: ['Automatische Ballwerfer', 'Das Gerät sollte kontrolliertes gemeinsames Spiel unterstützen und sichere Pausen ermöglichen.', ['Passende Ballgröße ohne Verschluckrisiko', 'Einstellbare, sichere Wurfdistanz', 'Pausenfunktion gegen Überforderung', 'Standfestigkeit und leichte Reinigung']]
};
const dialog = document.querySelector('#guide-dialog');
document.querySelectorAll('[data-guide]').forEach(button => button.addEventListener('click', () => {
  const [title, intro, items] = guides[button.dataset.guide];
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-intro').textContent = intro;
  document.querySelector('#dialog-list').innerHTML = items.map(item => `<li>${item}</li>`).join('');
  dialog.showModal();
}));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('.dialog-done').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

const header = document.querySelector('.site-header');
const menu = document.querySelector('.menu-button');
menu.addEventListener('click', () => {
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
let productByAsin = new Map();
let galleryImages = [];
let galleryIndex = 0;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function renderProduct(product) {
  const article = element('article', 'amazon-product-card');
  article.tabIndex = 0;
  article.setAttribute('role', 'button');
  article.setAttribute('aria-label', `${product.title}: Produktdetails öffnen`);
  article.dataset.asin = product.asin;
  const imageFrame = element('div', 'amazon-card-image');
  const image = document.createElement('img');
  image.src = product.image;
  image.alt = product.title;
  image.loading = 'lazy';
  image.width = 500;
  image.height = 500;
  imageFrame.append(image, element('span', 'amazon-card-detail-hint', 'Details ansehen'));
  article.append(imageFrame);

  const body = element('div', 'amazon-product-body');
  const meta = element('p', 'amazon-product-meta', [product.brand, product.model].filter(Boolean).join(' · ') || product.category);
  const title = element('h3', '', product.title);
  const category = element('span', 'amazon-category', product.category);
  const features = element('ul', 'amazon-features');
  product.features.slice(0, 3).forEach(value => features.append(element('li', '', value)));
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
  body.append(footer);
  article.append(body);
  article.addEventListener('click', () => openProductDialog(product));
  article.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openProductDialog(product);
    }
  });
  return article;
}

function shortFeature(value) {
  const firstSentence = value.split(/(?<=[.!?])\s/)[0];
  return firstSentence.length > 125 ? `${firstSentence.slice(0, 122).trim()}…` : firstSentence;
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
  galleryImages = product.images?.length ? product.images : [product.image];
  galleryIndex = 0;
  document.querySelector('#product-dialog-brand').textContent = product.brand || 'Haustier Technik';
  document.querySelector('#product-dialog-category').textContent = product.category;
  document.querySelector('#product-dialog-title').textContent = product.title;
  document.querySelector('#product-dialog-price').textContent = product.price.display;
  document.querySelector('#product-dialog-availability').textContent = `✓ ${product.availability.message || 'Bei Amazon verfügbar'}`;
  const featureList = document.querySelector('#product-dialog-features');
  featureList.replaceChildren(...product.features.map(value => element('li', '', value)));

  const facts = [
    ['Marke', product.brand],
    ['Modell', product.model],
    ['ASIN', product.asin],
    ['Eltern-ASIN', product.parentAsin],
    ...product.details.map(detail => [detail.label, detail.value])
  ].filter(([, value]) => value);
  const factList = document.querySelector('#product-dialog-facts');
  factList.replaceChildren(...facts.flatMap(([label, value]) => [element('dt', '', label), element('dd', '', value)]));

  const amazonLink = document.querySelector('#product-dialog-amazon');
  amazonLink.href = product.url;
  amazonLink.setAttribute('aria-label', `${product.title} jetzt bei Amazon ansehen (Werbelink)`);
  const thumbnails = document.querySelector('#product-dialog-thumbnails');
  thumbnails.replaceChildren(...galleryImages.map((url, index) => {
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

async function loadAmazonProducts() {
  if (!productGrid) return;
  try {
    const response = await fetch('/api/products', { headers: { accept: 'application/json' } });
    const data = await response.json();
    if (!response.ok || data.status !== 'live' || !Array.isArray(data.products) || data.products.length === 0) {
      throw new Error(data.notice || 'Keine Live-Produkte verfügbar.');
    }
    productByAsin = new Map(data.products.map(product => [product.asin, product]));
    productGrid.replaceChildren(...data.products.map(renderProduct));
    productStatus.hidden = true;
    productCount.textContent = `${data.count} Live-Produkte`;
    amazonNotice.textContent = data.notice;
  } catch (error) {
    productGrid.replaceChildren();
    productStatus.className = 'product-status unavailable';
    productStatus.textContent = 'Live-Produkte sind momentan nicht verfügbar. Es werden keine Preise aus einem früheren Abruf angezeigt.';
    productCount.textContent = 'Live-Abruf nicht verfügbar';
  }
}

loadAmazonProducts();
