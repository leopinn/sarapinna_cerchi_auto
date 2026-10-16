/**
 * Geometria 2D di supporto: vettori, rette, raccordi esatti (retta-retta e
 * retta-cerchio), archi campionati e arrotondamento di polilinee chiuse.
 * Tutto in millimetri, senza three.js.
 */

export type V2 = [number, number];

export const add = (a: V2, b: V2): V2 => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: V2, s: number): V2 => [a[0] * s, a[1] * s];
export const dot = (a: V2, b: V2) => a[0] * b[0] + a[1] * b[1];
export const cross = (a: V2, b: V2) => a[0] * b[1] - a[1] * b[0];
export const len = (a: V2) => Math.hypot(a[0], a[1]);
export const dist = (a: V2, b: V2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const norm = (a: V2): V2 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
/** normale sinistra (rotazione di +90°) */
export const left = (a: V2): V2 => [-a[1], a[0]];
export const polar = (r: number, a: number): V2 => [r * Math.cos(a), r * Math.sin(a)];
export const angle = (a: V2) => Math.atan2(a[1], a[0]);

/** Retta per un punto con direzione normalizzata. */
export interface Line {
  p: V2;
  d: V2;
}
export const lineThrough = (a: V2, b: V2): Line => ({ p: a, d: norm(sub(b, a)) });
export const offsetLine = (l: Line, n: V2, s: number): Line => ({ p: add(l.p, mul(n, s)), d: l.d });
export const project = (q: V2, l: Line): V2 => add(l.p, mul(l.d, dot(sub(q, l.p), l.d)));
/** parametro di q lungo la retta (distanza con segno da l.p) */
export const along = (q: V2, l: Line) => dot(sub(q, l.p), l.d);

export const intersectLines = (a: Line, b: Line): V2 => {
  const den = cross(a.d, b.d);
  if (Math.abs(den) < 1e-12) throw new Error('rette parallele');
  const t = cross(sub(b.p, a.p), b.d) / den;
  return add(a.p, mul(a.d, t));
};

/** Intersezioni di una retta con il cerchio di raggio R centrato nell'origine. */
export const intersectCircle = (l: Line, R: number): V2[] => {
  // |p + t d|² = R²  →  t² + 2 (p·d) t + |p|² − R² = 0
  const b = dot(l.p, l.d);
  const c = dot(l.p, l.p) - R * R;
  const disc = b * b - c;
  if (disc < 0) return [];
  const s = Math.sqrt(disc);
  return [add(l.p, mul(l.d, -b - s)), add(l.p, mul(l.d, -b + s))];
};

export interface Raccordo {
  /** centro e raggio dell'arco */
  c: V2;
  r: number;
  /** punto di tangenza sul primo elemento e sul secondo */
  t1: V2;
  t2: V2;
}

/**
 * Raccordo tra due rette. n1 e n2 sono le normali delle rette rivolte verso il
 * lato dove sta il raccordo (l'interno della finestra).
 */
export const filletLines = (l1: Line, n1: V2, l2: Line, n2: V2, r: number): Raccordo => {
  const c = intersectLines(offsetLine(l1, n1, r), offsetLine(l2, n2, r));
  return { c, r, t1: project(c, l1), t2: project(c, l2) };
};

/**
 * Raccordo tra una retta e il cerchio di raggio R centrato nell'origine.
 * `fuori`: il raccordo sta fuori dal cerchio (mozzo); altrimenti dentro (anello).
 * Tra le due soluzioni si sceglie quella più avanti lungo `verso`.
 * t1 è sulla retta, t2 sul cerchio.
 */
export const filletLineCircle = (l: Line, n: V2, R: number, r: number, fuori: boolean, verso: V2): Raccordo => {
  const cands = intersectCircle(offsetLine(l, n, r), fuori ? R + r : R - r);
  if (cands.length === 0) throw new Error('raccordo retta-cerchio impossibile');
  const c = cands.reduce((m, q) => (dot(q, verso) > dot(m, verso) ? q : m));
  return { c, r, t1: project(c, l), t2: mul(norm(c), R) };
};

/** Numero di segmenti per un arco: abbastanza fitti sia per lunghezza sia per angolo. */
const segmentiArco = (r: number, sweep: number, passo: number) =>
  Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 18)), Math.ceil((Math.abs(sweep) * r) / passo));

/**
 * Punti di un arco di centro c da `da` ad `a` (esclusi gli estremi se richiesto).
 * verso: 'corto' sceglie l'arco minore, 'ccw'/'cw' forzano il senso.
 */
export const arcPoints = (
  c: V2,
  r: number,
  da: V2,
  a: V2,
  passo: number,
  verso: 'corto' | 'ccw' | 'cw' = 'corto',
  conEstremi = false,
): V2[] => {
  const a0 = angle(sub(da, c));
  let sweep = angle(sub(a, c)) - a0;
  if (verso === 'corto') {
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;
  } else if (verso === 'ccw') {
    while (sweep <= 0) sweep += 2 * Math.PI;
  } else {
    while (sweep >= 0) sweep -= 2 * Math.PI;
  }
  const n = segmentiArco(r, sweep, passo);
  const out: V2[] = [];
  for (let i = conEstremi ? 0 : 1; i <= (conEstremi ? n : n - 1); i++) {
    out.push(add(c, polar(r, a0 + (sweep * i) / n)));
  }
  return out;
};

/** Suddivide i segmenti di un anello chiuso perché nessuno superi `passo`. */
export const resampleLoop = (loop: V2[], passo: number): V2[] => {
  const out: V2[] = [];
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    const n = Math.max(1, Math.ceil(dist(a, b) / passo));
    for (let k = 0; k < n; k++) out.push(add(a, mul(sub(b, a), k / n)));
  }
  // toglie i punti quasi coincidenti (raccordi tangenti consecutivi)
  return out.filter((p, i) => dist(p, out[(i + 1) % out.length]) > passo * 0.05);
};

/** Area con segno (positiva se antioraria). */
export const signedArea = (loop: V2[]) => {
  let a = 0;
  for (let i = 0; i < loop.length; i++) a += cross(loop[i], loop[(i + 1) % loop.length]);
  return a / 2;
};

export const pointInLoop = (p: V2, loop: V2[]) => {
  let dentro = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const [xi, yi] = loop[i];
    const [xj, yj] = loop[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
};

/**
 * Arrotonda una polilinea CHIUSA: ogni vertice ha il suo raggio di raccordo
 * (0 = spigolo vivo). Il raggio si riduce da solo se non c'è spazio.
 * Restituisce i punti densi, senza ripetere il primo in fondo.
 */
export const roundClosedPolyline = (pts: { p: V2; r: number }[], passo: number): V2[] => {
  const out: V2[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n].p;
    const { p, r } = pts[i];
    const next = pts[(i + 1) % n].p;
    const d1 = norm(sub(p, prev));
    const d2 = norm(sub(next, p));
    const turn = Math.atan2(cross(d1, d2), dot(d1, d2));
    if (r <= 0 || Math.abs(turn) < 1e-4) {
      out.push(p);
      continue;
    }
    // distanza del punto di tangenza dallo spigolo, limitata a metà dei lati
    let t = r * Math.tan(Math.abs(turn) / 2);
    const tMax = 0.5 * Math.min(dist(prev, p), dist(p, next));
    const rr = t > tMax ? (r * tMax) / t : r;
    t = Math.min(t, tMax);
    const t1 = sub(p, mul(d1, t));
    const nIn = turn > 0 ? left(d1) : mul(left(d1), -1);
    const c = add(t1, mul(nIn, rr));
    const t2 = add(p, mul(d2, t));
    out.push(t1, ...arcPoints(c, rr, t1, t2, passo, 'corto'), t2);
  }
  return out.filter((q, i) => dist(q, out[(i + 1) % out.length]) > 1e-3);
};
