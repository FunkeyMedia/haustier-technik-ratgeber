const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRequest, loadCategory } = require('../lib/catalog');
const { selectProducts } = require('../assets/product-selection');
test('category and pagination reject unknown, malformed and repeated inputs', () => {
  for (const query of [{category:'bad'}, {page:'0'}, {page:'6'}, {page:'1x'}, {page:['1','2']}, {category:['gps-hund']}, {pet:'bird'}]) assert.throws(() => parseRequest(query));
  assert.deepEqual(parseRequest({category:'gps-hund',page:'2',pet:'dog'}), {category:'gps-hund',page:2,pet:'dog'});
});
test('one category page uses one search, shares cached result, and keeps variants unique', async () => {
  let calls=0;
  const load=loadCategory({token:async()=> 'token',search:async (search,token,fetch,page)=>{calls++; assert.equal(page,2); assert.match(search.keywords,/GPS/); return [{asin:'A',parentAsin:'P',features:[]},{asin:'B',parentAsin:'P',features:[]}];}});
  const query={category:'gps-hund',page:2,pet:'dog'};
  const results=await Promise.all([load(query),load(query)]);
  assert.equal(calls,1); assert.equal(results[0].products.length,1);
  await load(query); assert.equal(calls,1);
});
test('pet filtering preserves both and price ordering does not mutate source',()=> {
 const products=[{asin:'A',pet:'cat',price:{amount:20}},{asin:'B',pet:'both',price:{amount:10}},{asin:'C',pet:'dog',price:{amount:5}}];
 assert.deepEqual(selectProducts(products,'cat','price-asc').map(p=>p.asin),['B','A']);
 assert.deepEqual(selectProducts(products,'all','price-desc').map(p=>p.asin),['A','B','C']);
 assert.deepEqual(products.map(p=>p.asin),['A','B','C']);
});
test('endpoint rejects invalid input without credentials and forbids writes', async()=>{
 const handler=require('../api/products');
 for(const [request,expected] of [[{method:'POST'},405],[{method:'GET',query:{category:'unknown'}},400],[{method:'GET',query:{page:'1.5'}},400]]) {
  let status;let headers={};let payload;
  await handler(request,{setHeader(k,v){headers[k]=v;},status(s){status=s;return this;},json(p){payload=p;}});
  assert.equal(status,expected);assert.equal(typeof payload.error,'string');
  if(expected===400) assert.equal(headers['Cache-Control'],'no-store');
 }
});
test('failed search is not cached and incompatible pet does not trigger a call',async()=>{
 let count=0;
 const load=loadCategory({token:async()=>'',search:async()=>{count++;throw new Error('offline');}});
 const query={category:'gps-hund',page:1,pet:'cat'};
 assert.equal((await load(query)).count,0);assert.equal(count,0);
 query.pet='dog';
 await assert.rejects(load(query));await assert.rejects(load(query));assert.equal(count,2);
});
test('all categories have built canonical pages, crawlable criteria and sitemap entries',()=>{
 const fs=require('node:fs');const categories=require('../lib/categories');
 const map=fs.readFileSync('sitemap.xml','utf8');
 assert.equal(categories.length,12);
 for(const category of categories){
  const page=fs.readFileSync(`kategorien/${category.id}.html`,'utf8');
  assert.ok(page.includes(`rel="canonical" href="https://haustier-technik.de/kategorien/${category.id}"`));
  assert.ok(page.includes(category.criteria[0]));
  assert.ok(page.includes('BreadcrumbList'));
  assert.ok(map.includes(`/kategorien/${category.id}</loc>`));
 }
});
test('offer expiry uses original fetchedAt and rejects missing or invalid timestamps',()=>{
 const {offersExpireAt}=require('../assets/product-selection');
 assert.equal(offersExpireAt('2026-09-18T10:00:00Z'),Date.parse('2026-09-18T11:00:00Z'));
 assert.equal(offersExpireAt(undefined),0);
 assert.equal(offersExpireAt('invalid'),0);
});
test('empty category pages stop pagination',async()=>{
 const load=loadCategory({token:async()=>'',search:async()=>[]});
 assert.equal((await load({category:'gps-hund',page:1,pet:'dog'})).hasMore,false);
});
test('comparison toggles unique products, caps at three, and never invents missing fields',()=>{
 const {toggleComparison}=require('../assets/app');
 let selected=[];
 for(const asin of ['A','B','C','D']) selected=toggleComparison(selected,{asin});
 assert.deepEqual(selected.map(p=>p.asin),['A','B','C']);
 selected=toggleComparison(selected,{asin:'B'});
 assert.deepEqual(selected.map(p=>p.asin),['A','C']);
 assert.equal(selected[0].brand,undefined);
});
test('registry has real-shaped identities only and makes every model crawlable',()=>{
 const fs=require('fs');const registry=require('../data/product-registry.json');
 const sitemap=fs.readFileSync('sitemap.xml','utf8');
 assert.ok(registry.length>50);
 for(const entry of registry){
  assert.deepEqual(Object.keys(entry).sort(),['asin','category']);
  assert.match(entry.asin,/^[A-Z0-9]{10}$/);
  assert.ok(sitemap.includes(`/produkt/${entry.asin}</loc>`));
  assert.ok(fs.readFileSync(`kategorien/${entry.category}.html`,'utf8').includes(`href="/produkt/${entry.asin}"`));
 }
});
test('category media refuses write requests before touching Amazon',async()=>{
 const handler=require('../api/category-media');let status;
 await handler({method:'POST'},{setHeader(){},status(code){status=code;return this;},json(){}});
 assert.equal(status,405);
});
test('sitemap retains all legacy product identities and legal routes',()=>{
 const fs=require('fs');const legacy=require('../data/legacy-product-asins.json');
 const sitemap=fs.readFileSync('sitemap.xml','utf8');
 assert.equal(legacy.length,100);
 for(const asin of legacy)assert.ok(sitemap.includes(`/produkt/${asin}</loc>`));
 for(const route of ['impressum','datenschutz'])assert.ok(sitemap.includes(`/${route}</loc>`));
});
