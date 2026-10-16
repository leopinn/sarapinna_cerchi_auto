/**
 * TUTTE le misure del tavolino, in millimetri. Si correggono solo qui.
 *
 * Misure fornite dal cliente:
 *   cerchio Aventador LP 700-4 anteriore 20" × 9J (Ø calettamento 508 mm),
 *   base 60 mm, vetro ~10 mm.
 * Misure ricavate dalle foto (docs/foto); quelle dei vetri sono confermate dal cliente:
 *   profilo del canale, disegno delle razze, Ø base 570, perno Ø90,
 *   staffe, dimensioni dei vetri.
 *
 * Convenzioni della scena: 1 unità = 1 metro, asse Y verso l'alto,
 * y = 0 è il pavimento. Il cerchio sta a faccia in su sopra la base.
 * Modulo PURO: niente three.js (lo legge anche il riepilogo).
 */

export const mm = (v: number) => v / 1000;

/** Punto del profilo: [raggio, altezza, raggio di raccordo] in mm. */
export type PuntoProfilo = [r: number, y: number, raccordo: number];

export interface ParametriFaccia {
  razze: number;
  /** angolo della prima razza, gradi (0 = asse +X della scena) */
  angoloIniziale: number;
  rForoCoprimozzo: number;
  rMozzo: number;
  /** raggio dove finiscono le finestre (bordo interno dell'anello della faccia) */
  rAnello: number;
  /** raggio esterno della faccia (entra nella parete del canale) */
  rFaccia: number;
  stelo: { larghezzaMozzo: number; larghezzaBiforcazione: number; rBiforcazione: number };
  braccio: { semiAngolo: number; larghezza: number; oltre: number };
  raccordi: { mozzo: number; spalla: number; anello: number; forcella: number };
  /** finestrella triangolare tra i due bracci della Y */
  finestraInterna: boolean;
  spessore: number;
  smusso: number;
  segmentiSmusso: number;
  /** quota (sistema cerchio) della faccia superiore dell'anello esterno */
  quotaAnello: number;
  /** campanatura: quanto scende il mozzo rispetto all'anello, ed esponente della curva */
  campanatura: { profondita: number; esponente: number };
  /** nervatura in rilievo lungo l'asse di steli e bracci */
  nervatura: { stelo: number; braccio: number };
}

export interface Cerchio {
  /** Ø di calettamento (bead seat) e larghezza in pollici J */
  diametroCalettamento: number;
  larghezzaJ: number;
  /** altezza totale del cerchio appoggiato (flangia-flangia) */
  altezza: number;
  rFlangia: number;
  /** profilo chiuso del canale, ordine: esterno dal basso all'alto, poi interno dall'alto al basso */
  profilo: PuntoProfilo[];
  faccia: ParametriFaccia;
  bulloni: { numero: number; pcd: number; sfasamento: number; rSede: number; profonditaSede: number; rTappo: number };
  coprimozzo: { r: number; altezza: number };
  valvola: { r: number; angolo: number };
  /** massa piena sotto il mozzo e quota della sua base (sistema cerchio) */
  mozzo: { r: number; altezza: number };
}

export const CERCHI: Record<string, Cerchio> = {
  'aventador-lp700-4-front-20': {
    diametroCalettamento: 508,
    larghezzaJ: 9,
    altezza: 254.6,
    rFlangia: 271.5,
    profilo: [
      // superficie esterna, dal basso (flangia interna, appoggiata alla base) verso l'alto
      [258, 0, 0],
      [268.5, 0, 3],
      [271.5, 6, 5],
      [268, 12.6, 4],
      [257.5, 13, 9.5],
      [254, 22, 2],
      [253, 33, 2],
      [254.3, 37, 2],
      [250, 43, 4],
      [250, 168, 6],
      [237, 178, 5],
      [237, 204, 5],
      [250, 213, 4],
      [254.3, 217.6, 2],
      [253, 221.6, 2],
      [254, 232.6, 2],
      [257.5, 241.6, 9.5],
      [268, 242, 4],
      [271.5, 248.6, 5],
      [268.5, 254.6, 3],
      [256, 254.6, 3],
      // superficie interna, dall'alto verso il basso (parete ~7 mm)
      [252, 250, 4],
      [247, 236, 4],
      [243, 213, 4],
      [230, 204, 4],
      [230, 178, 4],
      [243, 168, 4],
      [243, 43, 4],
      [247, 22, 4],
      [252, 6, 3],
    ],
    faccia: {
      razze: 5,
      angoloIniziale: 90,
      rForoCoprimozzo: 31,
      rMozzo: 88,
      rAnello: 236,
      rFaccia: 252,
      stelo: { larghezzaMozzo: 46, larghezzaBiforcazione: 52, rBiforcazione: 186 },
      braccio: { semiAngolo: 16, larghezza: 30, oltre: 10 },
      raccordi: { mozzo: 10, spalla: 16, anello: 7, forcella: 4 },
      finestraInterna: true,
      spessore: 28,
      smusso: 2.5,
      segmentiSmusso: 3,
      quotaAnello: 246,
      campanatura: { profondita: 55, esponente: 1.7 },
      nervatura: { stelo: 4, braccio: 2 },
    },
    bulloni: { numero: 5, pcd: 120, sfasamento: 36, rSede: 14, profonditaSede: 18, rTappo: 12 },
    coprimozzo: { r: 30, altezza: 6 },
    valvola: { r: 244, angolo: 198 },
    mozzo: { r: 80, altezza: 30 },
  },
};

/** Base in legno (stima dalle foto: poco più larga del cerchio). */
export const BASE = { diametro: 570, altezza: 60, smusso: 3 };

/** Perno in acciaio tra base e mozzo (visibile attraverso le razze). */
export const PERNO = { r: 45 };

/**
 * Staffe nere che reggono il vetro, agganciate al bordo del cerchio.
 * Profilo nel piano raggio/altezza, quote relative alla cima della flangia.
 */
export const STAFFE = {
  numero: 6,
  angoloIniziale: 0,
  larghezza: 22,
  /** spessore del ponte su cui appoggia il vetro */
  ponte: 8,
  rInterno: 248,
  rEsterno: 284,
  gambaInterna: 15,
  gambaEsterna: 12,
  spessoreGamba: 6,
};

/** Piano in vetro. Dimensioni confermate dal cliente (16/10/2026). */
export type FormaVetroGeom =
  | { tipo: 'cerchio'; diametro: number }
  | { tipo: 'rettangolo'; larghezza: number; profondita: number; raggio: number }
  | { tipo: 'ellisse'; larghezza: number; profondita: number }
  | { tipo: 'poligono'; lati: number; apotema: number; raggio: number };

export const VETRO = {
  spessore: 10,
  smusso: 1,
  forme: {
    rotondo: { tipo: 'cerchio', diametro: 700 },
    quadrato: { tipo: 'rettangolo', larghezza: 650, profondita: 650, raggio: 60 },
    ovale: { tipo: 'ellisse', larghezza: 800, profondita: 640 },
    esagonale: { tipo: 'poligono', lati: 6, apotema: 330, raggio: 20 },
  } satisfies Record<string, FormaVetroGeom>,
};

/** Logo inciso al laser: larghezza della scritta e margine dal bordo del vetro. */
export const LOGO = { larghezza: 160, margine: 30 };

/** Quote verticali assolute (mm dal pavimento), calcolate dalle misure sopra. */
export const quote = (rim: Cerchio) => {
  const cimaBase = BASE.altezza;
  const cimaCerchio = cimaBase + rim.altezza;
  const fondoVetro = cimaCerchio + STAFFE.ponte;
  const cimaVetro = fondoVetro + VETRO.spessore;
  return { cimaBase, cimaCerchio, fondoVetro, cimaVetro };
};

/** Ingombro in pianta del vetro (mm), per il riepilogo e l'inquadratura. */
export const ingombroVetro = (id: keyof typeof VETRO.forme) => {
  const f: FormaVetroGeom = VETRO.forme[id];
  switch (f.tipo) {
    case 'cerchio':
      return { larghezza: f.diametro, profondita: f.diametro };
    case 'rettangolo':
    case 'ellisse':
      return { larghezza: f.larghezza, profondita: f.profondita };
    case 'poligono': {
      // lati piatti davanti e dietro: in profondità l'apotema, in larghezza il raggio circoscritto
      const circoscritto = f.apotema / Math.cos(Math.PI / f.lati);
      return { larghezza: 2 * circoscritto, profondita: 2 * f.apotema };
    }
  }
};
