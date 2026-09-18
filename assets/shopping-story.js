(() => {
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n};
 for(const section of document.querySelectorAll('[data-shopping-category]')){
  const grid=section.querySelector('.shopping-products');let started=false;let expires=0;
  const clear=()=>{if(expires&&Date.now()>=expires){grid.replaceChildren(el('p','','Produktdaten sind abgelaufen. Lade die Seite neu für aktuelle Angebote.'));expires=0}};
  const load=async()=>{if(started)return;started=true;try{
   const r=await fetch('/api/products?category='+encodeURIComponent(section.dataset.shoppingCategory)+'&pet=all&page=1');if(!r.ok)throw Error();const d=await r.json();
   const products=d.products.slice(0,3);if(!products.length)throw Error();
   expires=Math.min(...products.map(p=>Date.parse(p.fetchedAt||d.fetchedAt)+3600000));if(!Number.isFinite(expires)||expires<=Date.now())throw Error();
   grid.replaceChildren(...products.map(p=>{const card=el('article','shopping-product');const photo=el('a','shopping-photo');photo.href='/produkt/'+p.asin;const img=el('img','');img.src=p.image;img.alt=p.title;img.loading='lazy';photo.append(img);const body=el('div','shopping-product-body');const title=el('h4','');const detail=el('a','',p.title);detail.href=photo.href;title.append(detail);const price=el('strong','shopping-price',p.price.display);const note=el('small','','inkl. MwSt., ggf. zzgl. Versand · Stand: '+new Date(p.fetchedAt||d.fetchedAt).toLocaleString('de-DE'));const cta=el('a','shopping-amazon','Jetzt auf Amazon ansehen ↗');cta.href=p.url;cta.target='_blank';cta.rel='sponsored nofollow noopener noreferrer';const details=el('a','shopping-details','Bilder & Produktdetails →');details.href=photo.href;body.append(title,el('p','shopping-benefit','Ausführung und Ausstattung für euren Alltag vergleichen.'),price,note,cta,el('small','','Partnerlink · Kauf bei Amazon'),details);card.append(photo,body);return card}));
   setTimeout(clear,Math.max(0,expires-Date.now()));
  }catch{const button=el('button','shopping-retry','Angebote erneut laden');button.onclick=()=>{started=false;void load()};grid.replaceChildren(el('p','','Amazon-Angebote sind gerade nicht erreichbar.'),button)}};
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){void load();observer.disconnect()}},{rootMargin:'250px'});observer.observe(section);document.addEventListener('visibilitychange',clear);
 }
})();
