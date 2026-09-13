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

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function renderProduct(product) {
  const article = element('article', 'amazon-product-card');
  const image = document.createElement('img');
  image.src = product.image;
  image.alt = product.title;
  image.loading = 'lazy';
  image.width = 500;
  image.height = 500;
  article.append(image);

  const body = element('div', 'amazon-product-body');
  const meta = element('p', 'amazon-product-meta', [product.brand, product.model].filter(Boolean).join(' · ') || product.category);
  const title = element('h3', '', product.title);
  const category = element('span', 'amazon-category', product.category);
  const features = element('ul', 'amazon-features');
  product.features.slice(0, 3).forEach(value => features.append(element('li', '', value)));
  const footer = element('div', 'amazon-product-footer');
  const price = element('strong', 'amazon-price', product.price.display);
  const link = element('a', 'amazon-button', 'Bei Amazon ansehen ↗');
  link.href = product.url;
  link.target = '_blank';
  link.rel = 'nofollow sponsored noopener';
  link.setAttribute('aria-label', `${product.title} bei Amazon ansehen (Werbelink)`);
  footer.append(price, link);
  body.append(category, meta, title);
  if (product.features.length) body.append(features);
  body.append(footer);
  article.append(body);
  return article;
}

async function loadAmazonProducts() {
  if (!productGrid) return;
  try {
    const response = await fetch('/api/products', { headers: { accept: 'application/json' } });
    const data = await response.json();
    if (!response.ok || data.status !== 'live' || !Array.isArray(data.products) || data.products.length === 0) {
      throw new Error(data.notice || 'Keine Live-Produkte verfügbar.');
    }
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
