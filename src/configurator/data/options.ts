/**
 * Tutte le opzioni del configuratore. Modulo PURO: niente three.js, perché lo
 * importano anche le pagine Astro (contatti) e l'endpoint opzioni.json letto
 * dal PHP. È l'unica fonte di verità: etichette, codici e vincoli stanno qui.
 *
 * Ogni opzione ha:
 *  - id    identificatore interno (stabile, usato nel codice)
 *  - code  2 caratteri, usato nel codice configurazione dell'URL (?c=…)
 *  - name  etichetta in italiano e inglese
 *
 * Palette colori e tinte del legno confermate dal cliente (16/10/2026).
 */

export type Lingua = 'it' | 'en';
export type Testo = Record<Lingua, string>;

interface Opzione {
  id: string;
  code: string;
  name: Testo;
}

/* -------------------------------------------------------------------------- */
/* Modello cerchio                                                             */
/* -------------------------------------------------------------------------- */
export interface Modello extends Opzione {
  /** chiave del registro geometrico in dimensions.ts */
  rim: string;
  marchio: string;
  auto: string;
  posizione: Testo;
  misura: string;
}

export const MODELLI: Modello[] = [
  {
    id: 'aventador-anteriore',
    code: 'A1',
    name: { it: 'Aventador LP 700-4 · anteriore', en: 'Aventador LP 700-4 · front' },
    rim: 'aventador-lp700-4-front-20',
    marchio: 'Lamborghini',
    auto: 'Aventador LP 700-4',
    posizione: { it: 'Anteriore', en: 'Front' },
    misura: '20" × 9J',
  },
];

/* -------------------------------------------------------------------------- */
/* Colore e finitura del cerchio                                               */
/* -------------------------------------------------------------------------- */
export interface Finitura extends Opzione {}

export const FINITURE: Finitura[] = [
  { id: 'lucido', code: 'LU', name: { it: 'Lucido', en: 'Gloss' } },
  { id: 'satinato', code: 'SA', name: { it: 'Satinato', en: 'Satin' } },
  { id: 'opaco', code: 'OP', name: { it: 'Opaco', en: 'Matte' } },
];

export interface Colore extends Opzione {
  hex: string;
  metallizzato: boolean;
  /** finiture ammesse (id) */
  finiture: string[];
}

const TUTTE = ['lucido', 'satinato', 'opaco'];
const METALLO = ['lucido', 'satinato'];

// Nomi generici: niente nomi ufficiali delle vernici Lamborghini (marchi).
export const COLORI: Colore[] = [
  { id: 'nero', code: 'NR', name: { it: 'Nero', en: 'Black' }, hex: '#0B0B0C', metallizzato: false, finiture: TUTTE },
  { id: 'grafite', code: 'GF', name: { it: 'Grafite', en: 'Graphite' }, hex: '#3A3C40', metallizzato: false, finiture: TUTTE },
  { id: 'argento', code: 'AR', name: { it: 'Argento', en: 'Silver' }, hex: '#B8BBBF', metallizzato: true, finiture: METALLO },
  { id: 'bianco', code: 'BI', name: { it: 'Bianco', en: 'White' }, hex: '#E9E8E4', metallizzato: false, finiture: TUTTE },
  { id: 'oro', code: 'OR', name: { it: 'Oro', en: 'Gold' }, hex: '#B8913F', metallizzato: true, finiture: METALLO },
  { id: 'bronzo', code: 'BZ', name: { it: 'Bronzo', en: 'Bronze' }, hex: '#6E5236', metallizzato: true, finiture: METALLO },
  { id: 'rosso', code: 'RS', name: { it: 'Rosso', en: 'Red' }, hex: '#A3121B', metallizzato: false, finiture: TUTTE },
  { id: 'giallo', code: 'GI', name: { it: 'Giallo', en: 'Yellow' }, hex: '#E6B800', metallizzato: false, finiture: TUTTE },
  { id: 'verde', code: 'VE', name: { it: 'Verde', en: 'Green' }, hex: '#6BBE1E', metallizzato: false, finiture: TUTTE },
  { id: 'arancio', code: 'AN', name: { it: 'Arancio', en: 'Orange' }, hex: '#E8641B', metallizzato: false, finiture: TUTTE },
  { id: 'blu', code: 'BL', name: { it: 'Blu', en: 'Blue' }, hex: '#1E4FA8', metallizzato: false, finiture: TUTTE },
];

/* -------------------------------------------------------------------------- */
/* Base in legno: essenza + tinta                                              */
/* -------------------------------------------------------------------------- */
export interface Tinta extends Opzione {
  /** colore moltiplicato sulla texture (lineare, dopo la desaturazione) */
  tint: string;
  /** 0 = colore originale del legno, 1 = scala di grigi */
  desat: number;
}

export const TINTE: Tinta[] = [
  { id: 'naturale', code: 'NA', name: { it: 'Naturale', en: 'Natural' }, tint: '#FFFFFF', desat: 0 },
  { id: 'miele', code: 'MI', name: { it: 'Miele', en: 'Honey' }, tint: '#F0C27E', desat: 0.15 },
  { id: 'tabacco', code: 'TB', name: { it: 'Tabacco', en: 'Tobacco' }, tint: '#8E5E3C', desat: 0.25 },
  { id: 'grigio', code: 'GR', name: { it: 'Grigio', en: 'Grey' }, tint: '#C9C6C0', desat: 0.85 },
  { id: 'ebano', code: 'EB', name: { it: 'Ebano', en: 'Ebony' }, tint: '#5E4A3E', desat: 0.4 },
  // tinta unica del frassino tinto nero: non selezionabile sulle altre essenze
  { id: 'nero', code: 'NE', name: { it: 'Nero', en: 'Black' }, tint: '#2B2826', desat: 0.7 },
];

export interface Legno extends Opzione {
  /** cartella delle texture in /public/configurator/textures/wood/ */
  texture: string;
  /** colore medio, per il campione nell'interfaccia */
  campione: string;
  tinte: string[];
}

const TINTE_LIBERE = ['naturale', 'miele', 'tabacco', 'grigio', 'ebano'];

export const LEGNI: Legno[] = [
  { id: 'abete', code: 'AB', name: { it: 'Abete naturale', en: 'Natural spruce' }, texture: 'abete', campione: '#D9B98C', tinte: TINTE_LIBERE },
  { id: 'rovere', code: 'RV', name: { it: 'Rovere', en: 'Oak' }, texture: 'rovere', campione: '#B48C5E', tinte: TINTE_LIBERE },
  { id: 'noce', code: 'NO', name: { it: 'Noce', en: 'Walnut' }, texture: 'noce', campione: '#5C3F2C', tinte: TINTE_LIBERE },
  { id: 'frassino-nero', code: 'FN', name: { it: 'Frassino tinto nero', en: 'Black-stained ash' }, texture: 'frassino', campione: '#55504B', tinte: ['nero'] },
];

/* -------------------------------------------------------------------------- */
/* Vetro e logo                                                                */
/* -------------------------------------------------------------------------- */
export interface FormaVetro extends Opzione {}

export const VETRI: FormaVetro[] = [
  { id: 'rotondo', code: 'RO', name: { it: 'Rotondo', en: 'Round' } },
  { id: 'quadrato', code: 'QU', name: { it: 'Quadrato arrotondato', en: 'Rounded square' } },
  { id: 'ovale', code: 'OV', name: { it: 'Ovale', en: 'Oval' } },
  { id: 'esagonale', code: 'ES', name: { it: 'Esagonale', en: 'Hexagonal' } },
];

export interface PosizioneLogo extends Opzione {}

export const POSIZIONI_LOGO: PosizioneLogo[] = [
  { id: 'anteriore', code: 'AN', name: { it: 'Bordo anteriore', en: 'Front edge' } },
  { id: 'centro', code: 'CE', name: { it: 'Centro', en: 'Centre' } },
  { id: 'posteriore', code: 'PO', name: { it: 'Bordo posteriore', en: 'Back edge' } },
  { id: 'destro', code: 'DX', name: { it: 'Bordo destro', en: 'Right edge' } },
  { id: 'sinistro', code: 'SX', name: { it: 'Bordo sinistro', en: 'Left edge' } },
];

/* -------------------------------------------------------------------------- */
/* Configurazione                                                              */
/* -------------------------------------------------------------------------- */
export interface Configurazione {
  modello: string;
  colore: string;
  finitura: string;
  legno: string;
  tinta: string;
  vetro: string;
  logo: string;
}

export type Campo = keyof Configurazione;

/** Ordine dei campi nel codice configurazione: NON cambiarlo (rompe i link già condivisi). */
export const ORDINE_CAMPI: Campo[] = ['modello', 'colore', 'finitura', 'legno', 'tinta', 'vetro', 'logo'];

export const ELENCHI: Record<Campo, Opzione[]> = {
  modello: MODELLI,
  colore: COLORI,
  finitura: FINITURE,
  legno: LEGNI,
  tinta: TINTE,
  vetro: VETRI,
  logo: POSIZIONI_LOGO,
};

export const ETICHETTE_CAMPI: Record<Campo, Testo> = {
  modello: { it: 'Modello', en: 'Model' },
  colore: { it: 'Colore', en: 'Colour' },
  finitura: { it: 'Finitura', en: 'Finish' },
  legno: { it: 'Base', en: 'Base' },
  tinta: { it: 'Tinta', en: 'Stain' },
  vetro: { it: 'Vetro', en: 'Glass' },
  logo: { it: 'Logo laser', en: 'Laser logo' },
};

/** La configurazione delle foto: cerchio nero lucido, base in abete, vetro tondo. */
export const PREDEFINITA: Configurazione = {
  modello: 'aventador-anteriore',
  colore: 'nero',
  finitura: 'lucido',
  legno: 'abete',
  tinta: 'naturale',
  vetro: 'rotondo',
  logo: 'anteriore',
};

export const trova = <T extends Opzione>(elenco: T[], id: string): T =>
  elenco.find((o) => o.id === id) ?? elenco[0];

/**
 * Applica i vincoli tra campi. Restituisce sempre una configurazione valida:
 * - colore metallizzato → niente finitura opaca
 * - tinta non disponibile per l'essenza → prima tinta ammessa
 */
export const normalizza = (c: Configurazione): Configurazione => {
  const out = { ...c };
  for (const campo of ORDINE_CAMPI) {
    if (!ELENCHI[campo].some((o) => o.id === out[campo])) out[campo] = PREDEFINITA[campo];
  }
  const colore = trova(COLORI, out.colore);
  if (!colore.finiture.includes(out.finitura)) out.finitura = colore.finiture[0];
  const legno = trova(LEGNI, out.legno);
  if (!legno.tinte.includes(out.tinta)) out.tinta = legno.tinte[0];
  return out;
};
