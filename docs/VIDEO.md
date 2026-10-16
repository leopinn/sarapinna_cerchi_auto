# Video della home

Il video di sfondo della home **non è girato**: è renderizzato fotogramma per fotogramma dalla
stessa scena 3D del configuratore. Si rigenera quando cambia il tavolino (misure, materiali…).

## Regia (`src/configurator/dev/shots.ts`)

Loop di 14 secondi a 30 fps:

| Tempo | Ambiente | Movimento |
|---|---|---|
| 0 – 4,6 s | showroom scuro | orbita bassa, una striscia di luce scorre su cerchio e vetro |
| 4,6 – 8 s | showroom | la camera sale fin quasi a piombo, dissolvenza al nero |
| 8 – 14 s | salotto (villa vista mare) | arrivo dal nero, lento avvicinamento, dissolvenza al nero |

Il tavolino è a destra (desktop) o in alto (mobile) per lasciare spazio al titolo.

## Asset del salotto (solo in locale, non vanno pubblicati)

In `dev-assets/hdri/` (cartella esclusa da Git), tutti CC0 da Poly Haven:

- `cayley_interior_2k.hdr` — luce e sfondo (sfocato) della villa
- `parquet/color.jpg`, `normal.jpg`, `rough.jpg` — parquet a spina di pesce (herringbone_parquet, 2k)

## Come si rigenera

1. `npm run dev`
2. Apri `http://localhost:4321/dev/video?w=1920&h=1080&t=10` per vedere un fotogramma
   (`t` = secondi). `?az=…&pol=…&k=…` provano altre inquadrature nel salotto.
3. Registrazione: uno script Puppeteer apre la pagina, chiama
   `window.__spVideo.renderFrame(t)` per ogni fotogramma (`t = i / 30`) e salva il canvas in PNG
   (`canvas.toDataURL`). Formati: 1920×1080 (desktop) e 1080×1920 (mobile).
4. Codifica con ffmpeg (es. il pacchetto npm `ffmpeg-static`):

```bash
ffmpeg -framerate 30 -i orizzontale/f%04d.png -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart -an public/media/sp-hero-1080.mp4
ffmpeg -framerate 30 -i orizzontale/f%04d.png -c:v libvpx-vp9 -b:v 0 -crf 32 -row-mt 1 -pix_fmt yuv420p -an public/media/sp-hero-1080.webm
ffmpeg -framerate 30 -i verticale/f%04d.png -vf scale=720:1280 -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart -an public/media/sp-hero-720x1280.mp4
ffmpeg -framerate 30 -i verticale/f%04d.png -vf scale=720:1280 -c:v libvpx-vp9 -b:v 0 -crf 34 -row-mt 1 -pix_fmt yuv420p -an public/media/sp-hero-720x1280.webm
```

5. Poster: un fotogramma (es. il 45°) esportato come `sp-hero-poster.{jpg,webp}` e
   `sp-hero-poster-mobile.{jpg,webp}` (720×1280).

`Hero.astro` inserisce da solo le sorgenti che trova in `public/media/`.

## In futuro: la parte "Aventador in autodromo"

Richiede materiale che la scena 3D non ha (auto, pista): girato reale, video generato con AI
(Veo, Runway, Kling) o un modello 3D dell'auto con licenza. Il nuovo spezzone si monta prima
di quello attuale.
