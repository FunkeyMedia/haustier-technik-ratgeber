(async () => {
  const slots = [...document.querySelectorAll('[data-category-image]')];
  if (!slots.length) return;
  try {
    const response = await fetch('/api/category-media');
    if (!response.ok) return;
    const data = await response.json();
    const expires = Date.parse(data.fetchedAt) + 3600000;
    if (!Number.isFinite(expires) || expires <= Date.now()) return;
    for (const slot of slots) {
      const product = data.images.find(p => p.category === slot.dataset.categoryImage);
      if (!product) continue;
      const image = document.createElement('img');
      image.src = product.image;image.alt = product.title;image.loading = 'lazy';image.width = 320;image.height = 240;
      const note = document.createElement('small');note.textContent = 'Beispielmodell · Amazon';
      const link = document.createElement('a');
      link.href = `/produkt/${product.asin}`;
      link.setAttribute('aria-label', `${product.title}: Produktseite öffnen`);
      link.append(image);
      slot.replaceChildren(link, note);slot.classList.add('has-product');
    }
    const clear = () => {if(Date.now() >= expires) slots.forEach(slot => {slot.replaceChildren();slot.classList.remove('has-product');});};
    setTimeout(clear, Math.max(0, expires-Date.now()));
    document.addEventListener('visibilitychange', () => {if(!document.hidden) clear();});
  } catch {}
})();
