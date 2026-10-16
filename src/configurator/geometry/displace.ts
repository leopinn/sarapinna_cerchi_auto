/**
 * Deforma la faccia piatta (estrusa lungo Z) per darle la forma reale:
 *  - campanatura: dall'anello esterno la faccia scende verso il mozzo
 *    (le razze delle hypercar sono concave), con raccordo morbido al mozzo
 *  - nervatura: un leggero rilievo parabolico lungo l'asse di steli e bracci,
 *    solo sulla faccia superiore (è quello che fa "correre" i riflessi)
 */
import type { BufferGeometry } from 'three';
import type { ParametriFaccia } from '../data/dimensions';
import { distanzaSegmento, type Razza } from './face';
import type { V2 } from './fillet';

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Profilo della campanatura: 0 sull'anello, −profondità al mozzo. Vicino al
 * mozzo la pendenza va a zero (rampa "addolcita"), così non resta uno spigolo.
 */
export const campanatura = (r: number, f: ParametriFaccia) => {
  const s = Math.max(0, Math.min(1, (r - f.rMozzo) / (f.rAnello - f.rMozzo)));
  const eps = 0.15;
  const sEff = s < eps ? (s * s) / (2 * eps) : s - eps / 2;
  const g = Math.max(0, 1 - sEff / (1 - eps / 2));
  return -f.campanatura.profondita * Math.pow(g, f.campanatura.esponente);
};

interface Segmento {
  a: V2;
  b: V2;
  /** semilarghezza all'inizio e alla fine */
  wa: number;
  wb: number;
  /** altezza del rilievo all'inizio e alla fine */
  ha: number;
  hb: number;
}

export function deformaFaccia(g: BufferGeometry, f: ParametriFaccia, razze: Razza[]) {
  const segmenti: Segmento[] = [];
  for (const R of razze) {
    const base: V2 = [R.u[0] * f.rMozzo, R.u[1] * f.rMozzo];
    segmenti.push({ a: base, b: R.S, wa: R.semiLarghezzaMozzo, wb: R.semiLarghezzaBiforcazione, ha: 0, hb: f.nervatura.stelo });
    segmenti.push({ a: R.S, b: R.Ep, wa: R.semiLarghezzaBraccio, wb: R.semiLarghezzaBraccio, ha: f.nervatura.stelo, hb: f.nervatura.braccio });
    segmenti.push({ a: R.S, b: R.Em, wa: R.semiLarghezzaBraccio, wb: R.semiLarghezzaBraccio, ha: f.nervatura.stelo, hb: f.nervatura.braccio });
  }

  const pos = g.getAttribute('position');
  const zMeta = f.spessore / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, y);

    let rilievo = 0;
    const sopra = smoothstep(zMeta, f.spessore, z);
    if (sopra > 0) {
      for (const s of segmenti) {
        const { d, t } = distanzaSegmento([x, y], s.a, s.b);
        const w = s.wa + (s.wb - s.wa) * t;
        if (d >= w) continue;
        // lo stelo nasce piatto dal mozzo e cresce nel primo terzo; i bracci sfumano verso l'anello
        const h = s.ha === 0 ? s.hb * smoothstep(0, 0.35, t) : s.ha + (s.hb - s.ha) * smoothstep(0, 1, t);
        rilievo = Math.max(rilievo, h * (1 - (d / w) ** 2));
      }
    }
    pos.setZ(i, z + campanatura(r, f) + sopra * rilievo);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
}
