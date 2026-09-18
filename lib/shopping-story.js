const categories=require('./categories');
const stories=require('./category-stories');
module.exports=function shoppingStory(category='nassfutterautomaten',heading='Passend zu eurem Alltag'){
 const c=categories.find(c=>c.id===category)||categories[0];
 return `<section class="shopping-story" data-shopping-category="${c.id}"><div class="shopping-scene"><img src="/assets/alltagshelfer-moment.png" alt="Katze und Hund mit Futterautomat und Trinkbrunnen – illustratives Wohnmotiv" loading="lazy"><div><p class="shopping-kicker">${heading}</p><h2>${stories[c.id][0]}</h2><p>${stories[c.id][1]}</p></div><small>Illustratives Motiv</small></div><div class="shopping-selection"><div class="shopping-heading"><h3>Drei ${c.title} entdecken</h3><a href="/kategorien/${c.id}">Alle ansehen →</a></div><div class="shopping-products" aria-live="polite"><p>Aktuelle Produktbilder und Angebote werden geladen …</p></div><p class="shopping-disclosure">Zubehörideen für euren Alltag. Eignung und Maße am konkreten Modell prüfen. Partnerlinks: Als Amazon-Partner verdienen wir an qualifizierten Verkäufen. Maßgeblich ist das Angebot bei Amazon.</p></div></section>`;
};
