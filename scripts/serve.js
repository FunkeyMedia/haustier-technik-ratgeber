// Local review server. Credentials are intentionally not loaded automatically.
const http=require('node:http');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/products'||url.pathname==='/api/category-media'||url.pathname.startsWith('/produkt/')){
  const handler=require(url.pathname==='/api/products'?'../api/products':url.pathname==='/api/category-media'?'../api/category-media':'../api/product-page');
  req.query=Object.fromEntries(url.searchParams); if(url.pathname.startsWith('/produkt/'))req.query.slug=url.pathname.slice(9);
  res.status=code=>{res.statusCode=code;return res;};res.json=data=>res.end(JSON.stringify(data));res.send=body=>res.end(body);
  try{await handler(req,res);}catch{res.statusCode=500;res.end('Nicht verfügbar');}return;
 }
 let name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);
 if(name.split('/').some(part=>part.startsWith('.'))||name.startsWith('lib/')||name.startsWith('scripts/')||name.startsWith('tests/')){res.statusCode=404;return res.end();}
 if(!path.extname(name))name+='.html';const file=path.resolve(root,name);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end('Nicht gefunden');}
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.xml':'application/xml'};
 res.setHeader('Content-Type',types[path.extname(file)]||'text/plain');fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT)||4174,'127.0.0.1',()=>console.log('Local review: http://127.0.0.1:'+(process.env.PORT||4174)));
