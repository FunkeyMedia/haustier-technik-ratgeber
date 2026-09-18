(function(root){
 function selectProducts(products,pet='all',sort='relevance') {
  const result=products.filter(p=>pet==='all'||p.pet==='both'||p.pet===pet);
  if(sort==='price-asc') result.sort((a,b)=>a.price.amount-b.price.amount);
  if(sort==='price-desc') result.sort((a,b)=>b.price.amount-a.price.amount);
  return result;
 }
 function offersExpireAt(fetchedAt) {
  const stamp = typeof fetchedAt === 'string' ? Date.parse(fetchedAt) : NaN;
  return Number.isFinite(stamp) ? stamp + 60 * 60 * 1000 : 0;
 }
 if(typeof module!=='undefined'&&module.exports) module.exports={selectProducts,offersExpireAt};
 else {root.selectProducts=selectProducts;root.offersExpireAt=offersExpireAt;}
})(typeof window!=='undefined'?window:globalThis);
