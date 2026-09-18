# Haustier Technik

Ein deutschsprachiges Ratgeberportal für smarte Technik rund um Katzen und Hunde.

Die Website bietet:

- getrennte Einstiege für Katzen- und Hundetechnik
- filterbare Produktkategorien
- kurze, interaktive Kaufchecklisten
- einen visuellen Marktvergleich
- Quellenangaben zu den verwendeten Marktdaten

Die Oberfläche ist als schnelle statische Website umgesetzt und für Desktop und Mobilgeräte optimiert. Live-Produkte lädt der serverseitige Endpunkt `/api/products` aus der Amazon Creators API für Amazon.de.

Für den Live-Betrieb müssen diese geheimen Variablen im Vercel-Projekt hinterlegt sein:

- `AMAZON_CREATORS_CLIENT_ID`
- `AMAZON_CREATORS_CLIENT_SECRET`
- `AMAZON_CREATORS_PARTNER_TAG`

Die Werte gehören ausschließlich in geschützte Vercel-Umgebungsvariablen oder eine lokal ignorierte `.env.local`. Ohne gültige Zugangsdaten liefert der Endpunkt eine preisfreie Ersatzdarstellung.

## Kategorien und lokaler Review

`npm run build` erzeugt die zwölf statischen Kategorieseiten und aktualisiert deren interne Links und Sitemap-Einträge. Die Kategorie-Kaufkriterien liegen in `lib/categories.js`. Seiten und Metadaten sind ohne JavaScript lesbar; Angebote werden anschließend aus Amazon geladen.

`npm run dev` startet den Review-Server auf `http://127.0.0.1:4174`. Er lädt keine Zugangsdaten automatisch. Ohne Zugangsdaten lassen sich Layout, Navigation und der ehrliche Fehlerzustand prüfen. Für einen ausdrücklich gewünschten Live-Test: `node --env-file=.env.local scripts/serve.js` (Zugangsdaten niemals ausgeben). `npm test` verwendet ausschließlich lokale Testdaten.

Der Endpunkt akzeptiert ausschließlich `category` aus dem Katalog, `pet=all|cat|dog` und `page=1..5`. Pro angeforderter Seite wird eine gezielte Suche ausgeführt; weitere Seiten nur durch Nutzeraktion. Amazon kann bei vorübergehenden Fehlern begrenzt erneut angefragt werden. Ergebnisse und laufende gleiche Anfragen werden 30 Minuten zwischengespeichert. Tierfilter sind Kategorienzuordnungen und keine zugesicherte Eignung eines Modells. Preis-Sortierung bezieht sich auf die tatsächlich geladenen Angebote. Es gibt keine Testnoten, Qualitätsrangliste oder zugesicherte Gesamtzahl.
