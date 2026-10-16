/**
 * Geometrie di base in legno, perno e piano in vetro (metri, y = 0 pavimento).
 */
import { BufferGeometry, ExtrudeGeometry, Shape } from 'three';
import { BASE, PERNO, VETRO, ingombroVetro, mm, type FormaVetroGeom } from '../data/dimensions';
import { roundClosedPolyline, type V2 } from './fillet';
import { lathe } from './lathe';

const cache = new Map<string, BufferGeometry>();
const memo = (chiave: string, crea: () => BufferGeometry) => {
  let g = cache.get(chiave);
  if (!g) cache.set(chiave, (g = crea()));
  return g;
};

/** Disco di legno con lo spigolo superiore e inferiore arrotondati. */
export const geometriaBase = (alto: boolean) =>
  memo(`base:${alto}`, () => {
    const R = BASE.diametro / 2;
    const H = BASE.altezza;
    const profilo = roundClosedPolyline(
      [
        { p: [0, 0], r: 0 },
        { p: [R, 0], r: BASE.smusso },
        { p: [R, H], r: BASE.smusso },
        { p: [0, H], r: 0 },
      ],
      0.6,
    );
    return lathe(profilo, { segmenti: alto ? 160 : 96, uv: 'legno' });
  });

/** Perno in acciaio dalla base al mozzo (altezze in metri). */
export const geometriaPerno = (da: number, a: number) =>
  memo(`perno:${da}:${a}`, () =>
    lathe(
      [
        [0, da * 1000],
        [PERNO.r, da * 1000],
        [PERNO.r, a * 1000],
        [0, a * 1000],
      ],
      { segmenti: 48 },
    ),
  );

/** Contorno 2D del vetro in metri (piano XY: x = larghezza, y = profondità). */
export const formaVetro = (id: keyof typeof VETRO.forme): Shape => {
  const f: FormaVetroGeom = VETRO.forme[id];
  const s = new Shape();
  switch (f.tipo) {
    case 'cerchio':
      s.absarc(0, 0, mm(f.diametro / 2), 0, Math.PI * 2, false);
      break;
    case 'ellisse':
      s.absellipse(0, 0, mm(f.larghezza / 2), mm(f.profondita / 2), 0, Math.PI * 2, false, 0);
      break;
    case 'rettangolo': {
      const w = f.larghezza / 2;
      const d = f.profondita / 2;
      const punti = roundClosedPolyline(
        [
          { p: [-w, -d], r: f.raggio },
          { p: [w, -d], r: f.raggio },
          { p: [w, d], r: f.raggio },
          { p: [-w, d], r: f.raggio },
        ],
        4,
      );
      s.setFromPoints(punti.map(([x, y]) => ({ x: mm(x), y: mm(y) }) as never));
      break;
    }
    case 'poligono': {
      // vertici a sinistra e a destra, lati piatti davanti e dietro
      const R = f.apotema / Math.cos(Math.PI / f.lati);
      const vertici = Array.from({ length: f.lati }, (_, i) => {
        const a = (i / f.lati) * Math.PI * 2;
        return { p: [R * Math.cos(a), R * Math.sin(a)] as V2, r: f.raggio };
      });
      s.setFromPoints(roundClosedPolyline(vertici, 3).map(([x, y]) => ({ x: mm(x), y: mm(y) }) as never));
      break;
    }
  }
  return s;
};

/**
 * Piano in vetro: estrusione con filo lucido arrotondato. Gruppi di materiale:
 * 0 = facce (sopra/sotto), 1 = bordo (parete + smusso), che si vede verde.
 * Restituisce la geometria con il fondo a y = 0.
 */
export const geometriaVetro = (id: keyof typeof VETRO.forme, alto: boolean) =>
  memo(`vetro:${id}:${alto}`, () => {
    const t = mm(VETRO.spessore);
    const b = mm(VETRO.smusso);
    const g = new ExtrudeGeometry(formaVetro(id), {
      depth: t - 2 * b,
      bevelEnabled: true,
      bevelThickness: b,
      bevelSize: b,
      bevelOffset: -b,
      bevelSegments: alto ? 3 : 2,
      curveSegments: alto ? 128 : 64,
    });
    // estrusione lungo +Z → la si porta in orizzontale, con il fondo a y = 0
    g.rotateX(-Math.PI / 2);
    g.translate(0, b, 0);
    g.computeBoundingBox();
    return g;
  });

/** Metà ingombro del vetro in metri. */
export const semiIngombroVetro = (id: keyof typeof VETRO.forme) => {
  const { larghezza, profondita } = ingombroVetro(id);
  return { x: mm(larghezza / 2), z: mm(profondita / 2) };
};
