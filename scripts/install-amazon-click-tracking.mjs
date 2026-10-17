import {readFile,writeFile,copyFile,readdir,mkdir} from 'node:fs/promises';
import path from 'node:path';
const output=path.resolve(process.argv[2]);
await mkdir(output,{recursive:true});
const runtime=path.resolve('tracking/affiliate-amazon-tracking.js');
const target=path.join(output,'affiliate-amazon-tracking.js');
if(runtime!==target)await copyFile(runtime,target);
for(const name of ['amazon-klickstatistik.html','amazon-klickstatistik-settings.js'])await copyFile(path.resolve('tracking',name),path.join(output,name));
const tag='<aside class="affiliate-tracking-note" style="text-align:center;padding:12px;font:inherit;font-size:12px"><a href="/amazon-klickstatistik.html">Amazon-Klickstatistik / Click measurement</a></aside><script defer src="/affiliate-amazon-tracking.js"></script>';
let count=0;
async function walk(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())await walk(file);else if(entry.isFile()&&file.endsWith('.html')){const html=await readFile(file,'utf8');if(!/<\/body\s*>/i.test(html))continue;if(!html.includes('src="/affiliate-amazon-tracking.js"'))await writeFile(file,html.replace(/<\/body\s*>/i,tag+'</body>'));count++;}}}
await walk(output);
if(!count)throw Error('No built HTML pages found in '+output);
console.log('Amazon click tracking installed on '+count+' HTML pages');
