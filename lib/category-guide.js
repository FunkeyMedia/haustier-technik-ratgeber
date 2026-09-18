const guides = require('./category-guides.json');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function renderGuide(id) {
  const guide = guides[id];
  if (!guide) return '';
  const { comparison, sections, sources, links } = guide;
  return `<section id="kaufhilfe" class="section-shell detailed-guide" aria-label="Ausführliche Kaufhilfe">
    <p class="kicker">Gut entscheiden · Redaktionell recherchiert</p><h2>Welche Lösung passt zu euch?</h2>
    <p class="guide-meta">Haustier Technik Redaktion · Aktualisiert am 18. September 2026 · Herstellerquellen geprüft, kein eigener Produkttest</p>
    <div class="guide-table-wrap" role="region" aria-label="${escape(comparison.caption)}" tabindex="0"><table><caption>${escape(comparison.caption)}</caption><thead><tr>${comparison.headers.map(h => `<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${comparison.rows.map(row => `<tr>${row.map((cell, i) => i === 0 ? `<th scope="row">${escape(cell)}</th>` : `<td data-label="${escape(comparison.headers[i])}">${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <nav class="guide-toc" aria-label="Fragen in dieser Kaufhilfe"><strong>Direkt zu deiner Frage</strong><ul>${sections.map(s => `<li><a href="#${s.id}">${escape(s.title)}</a></li>`).join('')}</ul></nav>
    ${sections.map(s => `<section id="${s.id}" class="guide-answer"><h2>${escape(s.title)}</h2>${s.paragraphs.map(p => `<p>${escape(p).replaceAll('\n', '<br>')}</p>`).join('')}${Number.isInteger(s.source) ? `<p class="guide-source">Quelle: <a href="${escape(sources[s.source][1])}">${escape(sources[s.source][0])} ↗</a></p>` : ''}</section>`).join('')}
    <aside class="guide-related"><h2>Passend dazu</h2>${links.map(([href, label]) => `<p><a href="${escape(href)}">${escape(label)} →</a></p>`).join('')}</aside>
    <details class="guide-sources"><summary>Quellen und redaktionelle Einordnung</summary><p>Herstellerangaben beschreiben das jeweilige Modell, keine allgemeine Leistungsgarantie. Auswahlkriterien und Rechenbeispiele stammen aus unserer Redaktion. Wir vergeben keine Testsieger oder erfundenen Bewertungen.</p><ul>${sources.map(([label, href]) => `<li><a href="${escape(href)}">${escape(label)} ↗</a></li>`).join('')}</ul></details>
    <a class="button primary" href="#produkte">Jetzt Modelle und aktuelle Angebote vergleichen ↓</a>
  </section>`;
}
module.exports = { guides, renderGuide };
