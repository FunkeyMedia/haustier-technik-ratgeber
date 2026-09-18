(() => {
 const expiry = offersExpireAt(document.body.dataset.fetchedAt);
 function check() {
  if (Date.now() < expiry) return;
  document.querySelector('.seo-gallery')?.replaceChildren();
  document.querySelector('.seo-price')?.replaceChildren();
  document.querySelector('.seo-availability')?.replaceChildren();
  const notice = document.querySelector('.seo-notice');
  if (!notice || notice.dataset.expired) return;
  notice.dataset.expired = 'true';
  notice.textContent = 'Preise und Bilder sind nicht mehr aktuell. ';
  const reload = document.createElement('button');
  reload.type = 'button';
  reload.className = 'button primary';
  reload.textContent = 'Aktuelle Produktdaten laden';
  reload.addEventListener('click', () => location.reload());
  notice.append(reload);
 }
 setTimeout(check, Math.max(0, expiry - Date.now()));
 document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
})();
