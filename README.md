# SP Design — sito e configuratore 3D

Sito di **SP Design**: tavolini da salotto realizzati con cerchi di hypercar.
Tre pagine, in italiano (radice) e inglese (`/en`):

| Pagina | IT | EN |
|---|---|---|
| Home con video | `/` | `/en` |
| Configuratore 3D | `/configuratore` | `/en/configurator` |
| Contatti / preventivo | `/contatti` | `/en/contact` |

Stack: **Astro 5** (sito statico) + **GSAP** per le animazioni del sito. Il configuratore è
un'isola **React Three Fiber** (three.js) caricata solo nella sua pagina.

## Avvio

```bash
npm install
npm run dev        # http://localhost:4321
npm run check      # controllo dei tipi (anche parità dei testi IT/EN)
npm run build      # sito statico in dist/
```

## Dove si cambia cosa

| Cosa | File |
|---|---|
| Testi del sito (IT + EN) | `src/i18n/index.ts` |
| Contatti dell'azienda (email, telefono, Instagram, sede) | `src/data/site.ts` |
| Colori, finiture, legni, tinte, vetri, posizioni del logo | `src/configurator/data/options.ts` |
| **Tutte le misure** del tavolino e del cerchio (mm) | `src/configurator/data/dimensions.ts` |
| Inquadrature della camera per ogni step | `src/configurator/data/views.ts` |
| Colori e font del sito | `src/styles/global.css` |
| Interfaccia del configuratore | `src/styles/configurator.css` |

Un campo a `null` in `site.ts` non compare sul sito: i dati mancanti non vengono inventati.

## Il configuratore

```
src/configurator/
  Configurator.tsx        radice dell'isola React, sincronizza lo stato con l'indirizzo (?c=…)
  data/                   opzioni, misure, viste — moduli puri, senza three.js
  state/                  store (zustand), codice configurazione, riepilogo
  geometry/               il cerchio generato in codice: profilo del canale, faccia a Y,
                          estrusione densa (Delaunay vincolato), campanatura, vetri, logo
  materials/              vernice con trasparente, legno con tinta, vetro, texture
  scene/                  Canvas, luci da studio, camera, post-produzione, tavolino
  ui/                     barra in alto, pannello / bottom sheet, step, riepilogo
  dev/                    scena del video e pagina di calibrazione (solo sviluppo)
```

- **Codice configurazione**: `1-A1-NR-LU-AB-NA-RO-AN` (versione, modello, colore, finitura,
  legno, tinta, vetro, logo). Sta nell'indirizzo, si condivide, arriva nel form contatti e il
  PHP lo traduce in un riepilogo leggibile con `dist/api/opzioni.json`. Non cambiare i codici
  a due lettere già usati: i link condivisi smetterebbero di funzionare.
- **Qualità**: su telefoni e PC modesti parte il livello "basso" (niente post-produzione,
  texture 1k). Per provare: `?q=low` o `?q=high`. `?debug` espone `window.__spInfo`.
- **Aggiungere un modello di cerchio**: una voce in `CERCHI` (`dimensions.ts`) e una in
  `MODELLI` (`options.ts`). Il disegno della faccia è parametrico (razze a Y); per altri
  disegni serve un nuovo generatore in `geometry/` oppure un modello `.glb`.

### Pagine solo di sviluppo

Esistono solo con `npm run dev`, non finiscono nel build:

- `/dev/calibrazione` — il tavolino dall'alto con la foto del prodotto sovrapposta e i
  cursori per il disegno delle razze; "Copia JSON" restituisce i valori da incollare in
  `dimensions.ts`.
- `/dev/video` — la scena da cui si registra il video della home (vedi `docs/VIDEO.md`).

In sviluppo il form contatti non usa PHP: `integrations/dev-tools.mjs` risponde al suo posto
e stampa il messaggio nel terminale.

## Asset

- Texture del legno: Poly Haven, CC0 — `public/configurator/textures/CREDITS.md`.
- Coprimozzo: ritagliato dalle foto del prodotto (`docs/foto`).
- Video della home: renderizzato dalla scena 3D (`public/media/`).
- Font: Archivo e Inter, ospitati dal sito (`@fontsource-variable`), niente Google Fonts.

## Da completare (dati del cliente)

- Instagram e sede → `src/data/site.ts` (email e telefono già inseriti)
- Dominio → `site` in `astro.config.mjs` e `SITE_URL` in `smtp-config.php`
- Logo SP Design in SVG (oggi è un marchio tipografico provvisorio: `Wordmark.astro`,
  `favicon.svg`, scritta incisa sul vetro in `materials/canvasTextures.ts`)
- Informativa privacy per il form
- Nuovo repository Git e casella email (vedi `DEPLOY.md`)
