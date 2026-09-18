const fs = require('node:fs');
fs.mkdirSync('public', { recursive: true });
for (const name of ['index.html', 'impressum.html', 'datenschutz.html', 'robots.txt', 'sitemap.xml']) {
  fs.copyFileSync(name, `public/${name}`);
}
for (const name of ['assets', 'kategorien']) fs.cpSync(name, `public/${name}`, { recursive: true });
