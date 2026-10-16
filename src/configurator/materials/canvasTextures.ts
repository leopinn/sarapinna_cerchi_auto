/**
 * Texture disegnate o caricate a parte:
 *  - logo inciso sul vetro (logo ufficiale verticale, da src/assets/logo)
 *  - coprimozzo: stemma ritagliato dalle foto del prodotto
 */
import { LOGO_VERTICALE_BIANCO, PROPORZIONI_VERTICALE } from '../../assets/logo/index';
import { CanvasTexture, LinearMipmapLinearFilter, NoColorSpace, SRGBColorSpace, TextureLoader, type Texture } from 'three';

/** proporzioni del logo inciso (larghezza / altezza): servono anche alla camera */
export const PROPORZIONI_LOGO = PROPORZIONI_VERTICALE;

export interface TextureLogo {
  texture: CanvasTexture;
  /** larghezza / altezza del logo, per dimensionare il piano */
  proporzioni: number;
}

let logo: Promise<TextureLogo> | null = null;

/**
 * Maschera del logo inciso: il logo ufficiale (verticale) bianco su nero.
 * Si usa come alphaMap, che legge il canale verde: per questo niente
 * trasparenza nel canvas.
 */
export const caricaTextureLogo = (anisotropia: number) =>
  (logo ??= (async () => {
    const W = 2048;
    const H = Math.round(W / PROPORZIONI_LOGO);
    const img = new Image();
    // dimensioni esplicite: con il solo viewBox il browser lo rasterizza piccolo e poi lo stira
    const svg = LOGO_VERTICALE_BIANCO.replace('<svg ', `<svg width="${W}" height="${H}" `);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = NoColorSpace;
    texture.anisotropy = anisotropia;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.needsUpdate = true;
    return { texture, proporzioni: PROPORZIONI_LOGO };
  })());

const loader = new TextureLoader();
let coprimozzo: Promise<{ map: Texture; orm: Texture }> | null = null;

/** Stemma del coprimozzo: colore + mappa rugosità (G) / metallo (B). */
export const caricaCoprimozzo = (anisotropia: number) =>
  (coprimozzo ??= Promise.all([
    loader.loadAsync('/configurator/textures/coprimozzo.webp'),
    loader.loadAsync('/configurator/textures/coprimozzo-orm.webp'),
  ]).then(([map, orm]) => {
    map.colorSpace = SRGBColorSpace;
    orm.colorSpace = NoColorSpace;
    map.anisotropy = orm.anisotropy = anisotropia;
    return { map, orm };
  }));
