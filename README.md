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

Die Werte gehören ausschließlich in geschützte Vercel-Umgebungsvariablen oder eine lokal ignorierte `.env.local`. Ohne gültige Zugangsdaten liefert der Endpunkt eine preisfreie Ersatzdarstellung.
