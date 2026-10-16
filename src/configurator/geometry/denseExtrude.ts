/**
 * Estrusione "densa" di una forma 2D con fori (millimetri).
 *
 * ExtrudeGeometry di three.js triangola le facce senza vertici interni: una
 * volta incurvata (campanatura del cerchio) la superficie si spezza in
 * triangoli lunghi e sul nero lucido si vedono le cuciture. Qui le facce
 * vengono riempite con una griglia esagonale di punti e triangolate con
 * Delaunay vincolato ai contorni, così la deformazione resta liscia.
 *
 * Struttura dei vertici (tutti condivisi, niente crepe):
 *  - per ogni contorno: anelli dello smusso superiore, parete, smusso inferiore
 *  - faccia superiore e inferiore: anello più interno dello smusso + punti interni
 *
 * Convenzioni: contorno esterno antiorario, fori orari (materiale a sinistra).
 * Spessore lungo +Z, da z = 0 a z = spessore.
 */
import Delaunator from 'delaunator';
import Constrainautor from '@kninnug/constrainautor';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { left, norm, pointInLoop, sub, type V2 } from './fillet';

export interface OpzioniEstrusione {
  spessore: number;
  smusso: number;
  segmentiSmusso: number;
  /** distanza tra i punti interni delle facce */
  passoInterno: number;
}

/** Normale "a mitra" verso il materiale, limitata per gli spigoli acuti. */
const mitre = (loop: V2[], i: number): V2 => {
  const n = loop.length;
  const a = loop[(i - 1 + n) % n];
  const b = loop[i];
  const c = loop[(i + 1) % n];
  const n1 = left(norm(sub(b, a)));
  const n2 = left(norm(sub(c, b)));
  const m = norm([n1[0] + n2[0], n1[1] + n2[1]]);
  const cos = Math.max(0.5, m[0] * n1[0] + m[1] * n1[1]);
  return [m[0] / cos, m[1] / cos];
};

/** Griglia spaziale per trovare in fretta il punto di contorno più vicino. */
class Griglia {
  private celle = new Map<string, V2[]>();
  constructor(private lato: number) {}
  private chiave(x: number, y: number) {
    return `${Math.floor(x / this.lato)},${Math.floor(y / this.lato)}`;
  }
  aggiungi(p: V2) {
    const k = this.chiave(p[0], p[1]);
    const c = this.celle.get(k);
    if (c) c.push(p);
    else this.celle.set(k, [p]);
  }
  /** vero se c'è un punto più vicino di `r` (r ≤ lato) */
  vicino(p: V2, r: number) {
    const cx = Math.floor(p[0] / this.lato);
    const cy = Math.floor(p[1] / this.lato);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        const c = this.celle.get(`${cx + dx},${cy + dy}`);
        if (c) for (const q of c) if ((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 < r * r) return true;
      }
    return false;
  }
}

export function denseExtrude(esterno: V2[], fori: V2[][], o: OpzioniEstrusione): BufferGeometry {
  const contorni = [esterno, ...fori];
  const S = o.segmentiSmusso;
  const pos: number[] = [];
  const indici: number[] = [];
  const vertice = (x: number, y: number, z: number) => {
    pos.push(x, y, z);
    return pos.length / 3 - 1;
  };

  // --- anelli di ogni contorno ------------------------------------------------
  // per ogni contorno: anelliSup[i] (i = 0 bordo parete … S faccia), anelliInf[i], anello di metà parete
  const capBordo: V2[][] = [];
  const anelli = contorni.map((loop) => {
    const mitri = loop.map((_, i) => mitre(loop, i));
    const anello = (rientro: number, z: number) =>
      loop.map((p, i) => vertice(p[0] + mitri[i][0] * rientro, p[1] + mitri[i][1] * rientro, z));
    const sup: number[][] = [];
    const inf: number[][] = [];
    for (let i = 0; i <= S; i++) {
      const th = (i / S) * (Math.PI / 2);
      const rientro = o.smusso * (1 - Math.cos(th));
      sup.push(anello(rientro, o.spessore - o.smusso + o.smusso * Math.sin(th)));
      inf.push(anello(rientro, o.smusso - o.smusso * Math.sin(th)));
    }
    const meta = anello(0, o.spessore / 2);
    capBordo.push(loop.map((p, i) => [p[0] + mitri[i][0] * o.smusso, p[1] + mitri[i][1] * o.smusso] as V2));
    return { sup, inf, meta, n: loop.length };
  });

  // fasce tra due anelli: "basso" e "alto" in ordine di quota → normali verso l'esterno
  const fascia = (basso: number[], alto: number[]) => {
    const n = basso.length;
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      indici.push(basso[j], basso[k], alto[k], basso[j], alto[k], alto[j]);
    }
  };
  for (const a of anelli) {
    for (let i = 0; i < S; i++) fascia(a.sup[i], a.sup[i + 1]);
    for (let i = 0; i < S; i++) fascia(a.inf[i + 1], a.inf[i]);
    fascia(a.inf[0], a.meta);
    fascia(a.meta, a.sup[0]);
  }

  // --- facce piene: contorni rientrati + punti interni, Delaunay vincolato -----
  const punti2d: V2[] = [];
  const vSup: number[] = [];
  const vInf: number[] = [];
  const vincoli: [number, number][] = [];
  const griglia = new Griglia(o.passoInterno);
  capBordo.forEach((loop, c) => {
    const inizio = punti2d.length;
    loop.forEach((p, i) => {
      punti2d.push(p);
      griglia.aggiungi(p);
      vSup.push(anelli[c].sup[S][i]);
      vInf.push(anelli[c].inf[S][i]);
      vincoli.push([inizio + i, inizio + ((i + 1) % loop.length)]);
    });
  });

  const dentro = (p: V2) => pointInLoop(p, capBordo[0]) && !capBordo.slice(1).some((l) => pointInLoop(p, l));
  // riquadri dei fori per scartare in fretta i test
  const riquadri = capBordo.map((l) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of l) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    return [x0, y0, x1, y1];
  });
  const dentroVeloce = (p: V2) => {
    const [ex0, ey0, ex1, ey1] = riquadri[0];
    if (p[0] < ex0 || p[0] > ex1 || p[1] < ey0 || p[1] > ey1 || !pointInLoop(p, capBordo[0])) return false;
    for (let c = 1; c < capBordo.length; c++) {
      const [x0, y0, x1, y1] = riquadri[c];
      if (p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1 && pointInLoop(p, capBordo[c])) return false;
    }
    return true;
  };

  const h = o.passoInterno;
  const [bx0, by0, bx1, by1] = riquadri[0];
  for (let y = by0, riga = 0; y <= by1; y += h * 0.866, riga++) {
    for (let x = bx0 + (riga % 2 ? h / 2 : 0); x <= bx1; x += h) {
      const p: V2 = [x, y];
      if (!dentroVeloce(p) || griglia.vicino(p, h * 0.6)) continue;
      punti2d.push(p);
      vSup.push(vertice(x, y, o.spessore));
      vInf.push(vertice(x, y, 0));
    }
  }

  const coord = new Float64Array(punti2d.length * 2);
  punti2d.forEach((p, i) => {
    coord[2 * i] = p[0];
    coord[2 * i + 1] = p[1];
  });
  const del = new Delaunator(coord);
  new Constrainautor(del).constrainAll(vincoli);

  const t = del.triangles;
  for (let i = 0; i < t.length; i += 3) {
    const a = punti2d[t[i]], b = punti2d[t[i + 1]], c = punti2d[t[i + 2]];
    const centro: V2 = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
    if (!dentro(centro)) continue;
    // faccia superiore antioraria vista da +Z, inferiore al contrario
    const ccw = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0;
    const [i0, i1, i2] = ccw ? [t[i], t[i + 1], t[i + 2]] : [t[i], t[i + 2], t[i + 1]];
    indici.push(vSup[i0], vSup[i1], vSup[i2]);
    indici.push(vInf[i0], vInf[i2], vInf[i1]);
  }

  const g = new BufferGeometry();
  g.setIndex(indici);
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}
