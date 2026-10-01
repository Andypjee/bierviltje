# Bierviltje

Drankspel voor op je telefoon, als web-app die je op je beginscherm kunt zetten.

- **Eén telefoon**: leg hem in het midden en geef hem door. Werkt ook zonder internet.
- **Online met code**: de host maakt een spel en kiest de instellingen. De rest doet mee met de code van vier letters, de QR-code of de uitnodigingslink. Iedereen ziet hetzelfde viltje op de eigen telefoon.

## Lokaal starten

```
npm install
npm start
```

Open daarna http://localhost:3000.

## Online zetten op Render (gratis)

1. Zet deze map op GitHub als een nieuwe repository.
2. Ga naar https://dashboard.render.com, kies **New → Blueprint** en selecteer de repository.
   Render leest `render.yaml` en maakt de webservice `bierviltje` aan.
3. Na een paar minuten staat het spel op `https://bierviltje.onrender.com` (of een vergelijkbaar adres).

Op het gratis plan slaapt de server na een kwartier zonder bezoekers. Het eerste bezoek daarna duurt dan ongeveer een minuut.
Lopende online spellen staan alleen in het geheugen; als de server slaapt of opnieuw start, zijn ze weg.

## Bestanden

- `shared/core.js`: alle viltjes en spelregels. Draait op de server én in de browser.
- `server/server.js`: webserver en de online kamers (WebSockets).
- `public/`: de app zelf (`index.html`, `app.js`, `style.css`), manifest, service worker en iconen.
