/**
 * Texture disegnate o caricate a parte:
 *  - logo "SP DESIGN" inciso sul vetro (provvisorio: scritta nel font del sito;
 *    quando arriva il logo SVG ufficiale si disegna quello, stessa pipeline)
 *  - coprimozzo: stemma ritagliato dalle foto del prodotto
 */
import { CanvasTexture, LinearMipmapLinearFilter, NoColorSpace, SRGBColorSpace, TextureLoader, type Texture } from 'three';

/** proporzioni del canvas del logo (larghezza / altezza): servono anche alla camera */
export const PROPORZIONI_LOGO = 2048 / 360;

export interface TextureLogo {
  texture: CanvasTexture;
  /** larghezza / altezza della scritta, per dimensionare il piano */
  proporzioni: number;
}

let logo: Promise<TextureLogo> | null = null;

/**
 * Maschera del logo: bianco su nero. Si usa come alphaMap, che legge il
 * canale verde: per questo niente trasparenza nel canvas.
 */
export const caricaTextureLogo = (anisotropia: number) =>
  (logo ??= (async () => {
    const famiglia = '"Archivo Variable"';
    try {
      await document.fonts.load(`800 120px ${famiglia}`);
    } catch {
      /* si usa il font di ripiego */
    }
    const W = 2048;
    const H = 360;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    // fontStretch e letterSpacing non esistono ovunque (Safari): si controlla a runtime
    const ctx = canvas.getContext('2d')! as CanvasRenderingContext2D & { fontStretch?: string; letterSpacing?: string };
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // "SP" largo e pieno, filetto obliquo, "DESIGN" spaziato: come il marchio del sito
    const largo = typeof ctx.fontStretch === 'string';
    const spaziatura = typeof ctx.letterSpacing === 'string';
    if (largo) ctx.fontStretch = 'expanded';
    ctx.font = `800 230px ${famiglia}, system-ui, sans-serif`;
    const sp = ctx.measureText('SP').width * (largo ? 1 : 1.25);
    ctx.font = `500 120px ${famiglia}, system-ui, sans-serif`;
    if (spaziatura) ctx.letterSpacing = '48px';
    const design = ctx.measureText('DESIGN').width;
    const gap = 70;
    const totale = sp + gap * 2 + design;
    let x = (W - totale) / 2;

    ctx.save();
    ctx.font = `800 230px ${famiglia}, system-ui, sans-serif`;
    if (spaziatura) ctx.letterSpacing = '0px';
    ctx.translate(x + sp / 2, H / 2 + 8);
    if (!largo) ctx.scale(1.25, 1);
    ctx.fillText('SP', 0, 0);
    ctx.restore();

    x += sp + gap;
    ctx.save();
    ctx.translate(x, H / 2);
    ctx.transform(1, 0, -0.32, 1, 0, 0);
    ctx.fillRect(-4, -95, 8, 190);
    ctx.restore();

    x += gap;
    ctx.font = `500 120px ${famiglia}, system-ui, sans-serif`;
    if (spaziatura) ctx.letterSpacing = '48px';
    ctx.textAlign = 'left';
    ctx.fillText('DESIGN', x, H / 2 + 6);

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = NoColorSpace;
    texture.anisotropy = anisotropia;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.needsUpdate = true;
    return { texture, proporzioni: W / H };
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
