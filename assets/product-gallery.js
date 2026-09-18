(() => {
  const main = document.querySelector('.seo-main-image img');
  const buttons = [...document.querySelectorAll('.seo-thumbnail')];
  buttons.forEach(button => button.addEventListener('click', () => {
    if (!main || !button.querySelector('img')) return;
    main.src = button.querySelector('img').src;
    main.alt = button.querySelector('img').alt;
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));
})();
