/**
 * Disegno 2D della faccia del cerchio a 5 razze "a Y" (millimetri, piano XY).
 *
 * Ogni razza è uno stelo che parte dal mozzo e, oltre `rBiforcazione`, si
 * divide in due bracci che arrivano all'anello esterno. Le finestre sono il
 * vuoto tra le razze: si costruiscono in modo analitico dai bordi delle razze
 * (rette) e dai cerchi del mozzo e dell'anello, con raccordi esatti.
 *
 * Risultato: contorno esterno + fori (coprimozzo, sedi dei bulloni, finestre
 * grandi, finestrelle interne alle Y), già campionati con passo massimo dato.
 */
import type { ParametriFaccia } from '../data/dimensions';
import {
  add,
  along,
  arcPoints,
  dot,
  filletLineCircle,
  filletLines,
  left,
  len,
  lineThrough,
  mul,
  norm,
  polar,
  resampleLoop,
  signedArea,
  sub,
  intersectLines,
  type Line,
  type Raccordo,
  type V2,
} from './fillet';

const RAD = Math.PI / 180;

export interface Razza {
  alfa: number;
  u: V2;
  n: V2;
  S: V2;
  /** fine dei bracci (dentro l'anello, oltre rAnello) */
  Ep: V2;
  Em: V2;
  dp: V2;
  dm: V2;
  mp: V2;
  mm: V2;
  steloPiu: Line;
  steloMeno: Line;
  braccioPiuEsterno: Line;
  braccioPiuInterno: Line;
  braccioMenoEsterno: Line;
  braccioMenoInterno: Line;
  semiLarghezzaMozzo: number;
  semiLarghezzaBiforcazione: number;
  semiLarghezzaBraccio: number;
}

export const costruisciRazza = (f: ParametriFaccia, k: number): Razza => {
  const alfa = (f.angoloIniziale * RAD) + (k * 2 * Math.PI) / f.razze;
  const u = polar(1, alfa);
  const n = left(u);
  const S = mul(u, f.stelo.rBiforcazione);
  const rFine = f.rAnello + f.braccio.oltre;
  const Ep = polar(rFine, alfa + f.braccio.semiAngolo * RAD);
  const Em = polar(rFine, alfa - f.braccio.semiAngolo * RAD);
  const dp = norm(sub(Ep, S));
  const dm = norm(sub(Em, S));
  const mp = left(dp);
  const mmn = left(dm);
  const wH = f.stelo.larghezzaMozzo / 2;
  const wS = f.stelo.larghezzaBiforcazione / 2;
  const wA = f.braccio.larghezza / 2;
  const base = mul(u, f.rMozzo);
  return {
    alfa,
    u,
    n,
    S,
    Ep,
    Em,
    dp,
    dm,
    mp,
    mm: mmn,
    steloPiu: lineThrough(add(base, mul(n, wH)), add(S, mul(n, wS))),
    steloMeno: lineThrough(add(base, mul(n, -wH)), add(S, mul(n, -wS))),
    // braccio verso gli angoli crescenti: lato esterno = +mp, interno = −mp
    braccioPiuEsterno: { p: add(S, mul(mp, wA)), d: dp },
    braccioPiuInterno: { p: add(S, mul(mp, -wA)), d: dp },
    // braccio verso gli angoli decrescenti: lato esterno = −mm, interno = +mm
    braccioMenoEsterno: { p: add(S, mul(mmn, -wA)), d: dm },
    braccioMenoInterno: { p: add(S, mul(mmn, wA)), d: dm },
    semiLarghezzaMozzo: wH,
    semiLarghezzaBiforcazione: wS,
    semiLarghezzaBraccio: wA,
  };
};

/** Controlla che i punti di tangenza su una retta siano nell'ordine atteso. */
const inOrdine = (l: Line, ...punti: V2[]) => {
  for (let i = 1; i < punti.length; i++) if (along(punti[i], l) < along(punti[i - 1], l) - 1e-6) return false;
  return true;
};

/** Finestra grande tra la razza A e la successiva B. */
const finestraGrande = (f: ParametriFaccia, A: Razza, B: Razza, scala: number, passo: number): V2[] => {
  const r = {
    mozzo: f.raccordi.mozzo * scala,
    spalla: f.raccordi.spalla * scala,
    anello: f.raccordi.anello * scala,
  };
  const nB = mul(B.n, -1);
  const mB = mul(B.mm, -1);

  const mozzoA = filletLineCircle(A.steloPiu, A.n, f.rMozzo, r.mozzo, true, A.u);
  const spallaA = filletLines(A.steloPiu, A.n, A.braccioPiuEsterno, A.mp, r.spalla);
  const anelloA = filletLineCircle(A.braccioPiuEsterno, A.mp, f.rAnello, r.anello, false, A.dp);
  const anelloB = filletLineCircle(B.braccioMenoEsterno, mB, f.rAnello, r.anello, false, B.dm);
  const spallaB = filletLines(B.steloMeno, nB, B.braccioMenoEsterno, mB, r.spalla);
  const mozzoB = filletLineCircle(B.steloMeno, nB, f.rMozzo, r.mozzo, true, B.u);

  if (
    !inOrdine(A.steloPiu, mozzoA.t1, spallaA.t1) ||
    !inOrdine(A.braccioPiuEsterno, spallaA.t2, anelloA.t1) ||
    !inOrdine(B.braccioMenoEsterno, spallaB.t2, anelloB.t1) ||
    !inOrdine(B.steloMeno, mozzoB.t1, spallaB.t1)
  ) {
    throw new Error('raccordi troppo grandi');
  }

  const arco = (q: Raccordo, da: V2, a: V2) => [da, ...arcPoints(q.c, q.r, da, a, passo, 'corto'), a];
  const loop: V2[] = [
    ...arco(mozzoA, mozzoA.t2, mozzoA.t1),
    ...arco(spallaA, spallaA.t1, spallaA.t2),
    ...arco(anelloA, anelloA.t1, anelloA.t2),
    ...arcPoints([0, 0], f.rAnello, anelloA.t2, anelloB.t2, passo, 'ccw'),
    ...arco(anelloB, anelloB.t2, anelloB.t1),
    ...arco(spallaB, spallaB.t2, spallaB.t1),
    ...arco(mozzoB, mozzoB.t1, mozzoB.t2),
    ...arcPoints([0, 0], f.rMozzo, mozzoB.t2, mozzoA.t2, passo, 'cw'),
  ];
  return loop;
};

/** Finestrella triangolare tra i due bracci della stessa razza (null se non c'è spazio). */
const finestraInterna = (f: ParametriFaccia, R: Razza, scala: number, passo: number): V2[] | null => {
  const rForcella = f.raccordi.forcella * scala;
  const rAnello = f.raccordi.anello * scala;
  const vertice = intersectLines(R.braccioPiuInterno, R.braccioMenoInterno);
  if (len(vertice) > f.rAnello - 2 * rAnello - 4) return null;

  const forcella = filletLines(R.braccioMenoInterno, R.mm, R.braccioPiuInterno, mul(R.mp, -1), rForcella);
  const anelloP = filletLineCircle(R.braccioPiuInterno, mul(R.mp, -1), f.rAnello, rAnello, false, R.dp);
  const anelloM = filletLineCircle(R.braccioMenoInterno, R.mm, f.rAnello, rAnello, false, R.dm);
  if (!inOrdine(R.braccioPiuInterno, forcella.t2, anelloP.t1) || !inOrdine(R.braccioMenoInterno, forcella.t1, anelloM.t1)) {
    throw new Error('raccordi troppo grandi');
  }
  const arco = (q: Raccordo, da: V2, a: V2) => [da, ...arcPoints(q.c, q.r, da, a, passo, 'corto'), a];
  return [
    ...arco(forcella, forcella.t1, forcella.t2),
    ...arco(anelloP, anelloP.t1, anelloP.t2),
    ...arcPoints([0, 0], f.rAnello, anelloP.t2, anelloM.t2, passo, 'cw'),
    ...arco(anelloM, anelloM.t2, anelloM.t1),
  ];
};

const cerchio = (c: V2, r: number, passo: number): V2[] => {
  const n = Math.max(24, Math.ceil((2 * Math.PI * r) / passo));
  return Array.from({ length: n }, (_, i) => add(c, polar(r, (i / n) * Math.PI * 2)));
};

/** Orienta un anello: antiorario per il contorno esterno, orario per i fori. */
const orienta = (loop: V2[], antiorario: boolean) => ((signedArea(loop) > 0) === antiorario ? loop : [...loop].reverse());

export interface DisegnoFaccia {
  esterno: V2[];
  fori: V2[][];
  razze: Razza[];
  sediBulloni: V2[];
}

export interface ParametriBulloni {
  numero: number;
  pcd: number;
  sfasamento: number;
  rSede: number;
}

export function disegnaFaccia(f: ParametriFaccia, bulloni: ParametriBulloni, passo: number): DisegnoFaccia {
  const razze = Array.from({ length: f.razze }, (_, k) => costruisciRazza(f, k));

  // se i raccordi non stanno nei lati, si riducono e si riprova
  let scala = 1;
  for (let tentativo = 0; ; tentativo++) {
    try {
      const fori: V2[][] = [];
      for (let k = 0; k < f.razze; k++) {
        fori.push(finestraGrande(f, razze[k], razze[(k + 1) % f.razze], scala, passo));
        if (f.finestraInterna) {
          const fi = finestraInterna(f, razze[k], scala, passo);
          if (fi) fori.push(fi);
        }
      }
      fori.push(cerchio([0, 0], f.rForoCoprimozzo, passo));
      const sediBulloni: V2[] = [];
      for (let k = 0; k < bulloni.numero; k++) {
        const c = polar(bulloni.pcd / 2, f.angoloIniziale * RAD + (bulloni.sfasamento * RAD) + (k * 2 * Math.PI) / bulloni.numero);
        sediBulloni.push(c);
        fori.push(cerchio(c, bulloni.rSede, passo));
      }
      return {
        esterno: orienta(resampleLoop(cerchio([0, 0], f.rFaccia, passo), passo), true),
        fori: fori.map((l) => orienta(resampleLoop(l, passo), false)),
        razze,
        sediBulloni,
      };
    } catch (e) {
      if (tentativo >= 6) throw e;
      scala *= 0.8;
    }
  }
}

/** Distanza di un punto dal segmento ab e parametro (0..1) del punto più vicino. */
export const distanzaSegmento = (p: V2, a: V2, b: V2) => {
  const ab = sub(b, a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1)));
  const q = add(a, mul(ab, t));
  return { d: Math.hypot(p[0] - q[0], p[1] - q[1]), t };
};
