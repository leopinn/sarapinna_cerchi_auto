/**
 * Dove sta il logo sul vetro, per ogni forma e posizione predefinita.
 * Il logo è un rettangolo largo LOGO.larghezza, sempre orizzontale (leggibile
 * dalla vista frontale), a LOGO.margine dal bordo del vetro. Per ogni forma si
 * calcola la posizione più vicina al bordo in cui il rettangolo sta tutto.
 * Risultato in metri sul piano XZ (z positivo = verso chi guarda).
 */
import { LOGO, VETRO, mm, type FormaVetroGeom } from '../data/dimensions';

export interface PosizioneLogoScena {
  x: number;
  z: number;
  larghezza: number;
  altezza: number;
}

/** Quanto ci si può spostare dal centro lungo un asse prima di uscire dal vetro (mm). */
const sporgenza = (f: FormaVetroGeom, asse: 'x' | 'z', w: number, h: number): number => {
  const m = LOGO.margine;
  // semi-dimensioni del rettangolo: lungo l'asse di spostamento e di traverso
  const lungo = asse === 'z' ? h / 2 : w / 2;
  const traverso = asse === 'z' ? w / 2 : h / 2;
  switch (f.tipo) {
    case 'cerchio': {
      const R = f.diametro / 2 - m;
      return Math.sqrt(R * R - traverso * traverso) - lungo;
    }
    case 'ellisse': {
      const a = (asse === 'z' ? f.profondita : f.larghezza) / 2 - m;
      const b = (asse === 'z' ? f.larghezza : f.profondita) / 2 - m;
      return a * Math.sqrt(1 - (traverso * traverso) / (b * b)) - lungo;
    }
    case 'rettangolo':
      return (asse === 'z' ? f.profondita : f.larghezza) / 2 - m - lungo;
    case 'poligono': {
      if (asse === 'z') return f.apotema - m - lungo;
      // verso destra/sinistra c'è un vertice: il bordo arretra di tan(30°) per unità di altezza
      const R = f.apotema / Math.cos(Math.PI / f.lati);
      const pend = Math.tan(Math.PI / f.lati);
      return R - pend * traverso - m / Math.cos(Math.PI / f.lati) - lungo;
    }
  }
};

export const posizioneLogo = (vetro: keyof typeof VETRO.forme, posizione: string, proporzioni: number): PosizioneLogoScena => {
  const f: FormaVetroGeom = VETRO.forme[vetro];
  const w = LOGO.larghezza;
  const h = w / proporzioni;
  let x = 0;
  let z = 0;
  if (posizione === 'anteriore') z = sporgenza(f, 'z', w, h);
  if (posizione === 'posteriore') z = -sporgenza(f, 'z', w, h);
  if (posizione === 'destro') x = sporgenza(f, 'x', w, h);
  if (posizione === 'sinistro') x = -sporgenza(f, 'x', w, h);
  return { x: mm(x), z: mm(z), larghezza: mm(w), altezza: mm(h) };
};
