const categories = require('../lib/categories');
const registry = require('../data/product-registry.json');
const {loadProductsByAsins} = require('../lib/amazon');
let cache;
let pending;
async function loadMedia() {
  if (cache && cache.expires > Date.now()) return cache.value;
  if (pending) return pending;
  pending = (async () => {
    const selected = categories.map(category => registry.find(p => p.category === category.id)).filter(Boolean);
    const asins = [...new Set(selected.map(p => p.asin))];
    const products = [];
    for (let i = 0; i < asins.length; i += 10) products.push(...await loadProductsByAsins(asins.slice(i, i + 10)));
    const value = {fetchedAt:new Date().toISOString(), images:selected.flatMap(entry => {
      const product = products.find(p => p.asin === entry.asin);
      return product ? [{category:entry.category, asin:product.asin, image:product.image, title:product.title}] : [];
    })};
    cache = {expires:Date.now()+1800000,value};
    return value;
  })();
  try {return await pending;} finally {pending = null;}
}
module.exports = async function handler(request,response) {
  if (request.method !== 'GET') {response.setHeader('Allow','GET');return response.status(405).json({error:'Nur GET ist erlaubt.'});}
  try {const value=await loadMedia();response.setHeader('Cache-Control','public, s-maxage=1800, max-age=0');return response.status(200).json(value);}
  catch {response.setHeader('Cache-Control','no-store');return response.status(503).json({images:[]});}
};
