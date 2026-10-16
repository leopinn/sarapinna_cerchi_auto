/**
 * Loghi ufficiali (SVG in questa cartella), pronti da inserire nell'HTML.
 * Il colore segue `currentColor`; nel logo verticale il primo gruppo è il
 * monogramma e il secondo la scritta, così il CSS può colorarli separatamente.
 * Sono decorativi (aria-hidden): il nome lo dà il link o il testo che li contiene.
 */
import monogrammaRaw from './monogramma.svg?raw';
import verticaleRaw from './logo-verticale.svg?raw';

const pulisci = (svg: string, classe: string) =>
  svg
    .replace(/<title>.*?<\/title>/s, '')
    .replace(/\s(role|aria-label)="[^"]*"/g, '')
    .replace('<svg ', `<svg class="${classe}" aria-hidden="true" focusable="false" `)
    .trim();

export const LOGO_MONOGRAMMA = pulisci(monogrammaRaw, 'logo logo--monogramma');
export const LOGO_VERTICALE = pulisci(verticaleRaw, 'logo logo--verticale');

/** proporzioni larghezza / altezza (dal viewBox) */
export const PROPORZIONI_MONOGRAMMA = 968 / 1524;
export const PROPORZIONI_VERTICALE = 1000 / 715.41;

/** Logo verticale in bianco puro, per disegnarlo su canvas (incisione sul vetro). */
export const LOGO_VERTICALE_BIANCO = verticaleRaw.replace('fill="currentColor"', 'fill="#ffffff"');
