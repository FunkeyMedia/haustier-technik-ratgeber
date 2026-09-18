const categories = require('./categories');
const amazon = require('./amazon');
function parseRequest(query = {}) {
 const category=query.category ?? categories[0].id;
 const page=query.page ?? '1';
 const pet=query.pet ?? 'all';
 if(typeof category!=='string'||!categories.some(c=>c.id===category)||typeof page!=='string'||!/^[1-5]$/.test(page)||typeof pet!=='string'||!['all','cat','dog'].includes(pet)) throw new Error('Ungültige Kategorie, Tierauswahl oder Seite.');
 return {category,page:Number(page),pet};
}
function loadCategory(deps = {}) {
 const cache=new Map();
 const token=deps.token||amazon.getAccessToken;
 const search=deps.search||amazon.searchProducts;
 return async ({category,page,pet}) => {
  const selected=categories.find(c=>c.id===category);
  if(!selected||!Number.isInteger(page)||page<1||page>5||!['all','cat','dog'].includes(pet)) throw new Error('Ungültige Anfrage');
  if(pet!=='all'&&selected.pet!=='both'&&selected.pet!==pet) return {products:[],count:0,page,hasMore:false,category};
  const key=`${category}:${page}`;
  const found=cache.get(key);
  if(found&&found.expires>Date.now()) return found.promise;
  const promise=(async()=>{
   const result=await search({keywords:selected.keywords,pet:selected.pet,category:selected.title},await token(),undefined,page);
   const products=amazon.deduplicateVariants(result);
   return {products,count:products.length,page,category,hasMore:page<5&&(result.hasMore ?? products.length>0),fetchedAt:new Date().toISOString()};
  })();
  cache.set(key,{promise,expires:Date.now()+1800000});
  try { return await promise; } catch(error) { cache.delete(key); throw error; }
 };
}
module.exports={parseRequest,loadCategory};
