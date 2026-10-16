/**
 * Viste della camera. Coordinate sferiche attorno a un punto mirato:
 *  - azimut: gradi attorno all'asse verticale (0 = di fronte, +90 = da destra)
 *  - polare: gradi dalla verticale (0 = dall'alto, 90 = orizzontale)
 *  - k: distanza relativa (1 = il tavolino intero riempie l'inquadratura)
 *  - mira: punto guardato, in metri (y = 0 pavimento)
 * Modulo puro: la distanza vera la calcola CameraRig in base allo schermo.
 */
import type { Passo } from '../state/store';

export type NomeVista = 'treQuarti' | 'alto' | 'lato' | 'mozzo' | 'cerchio' | 'base' | 'vetro' | 'logo';

export interface Vista {
  azimut: number;
  polare: number;
  k: number;
  mira: [number, number, number];
}

export const VISTE: Record<Exclude<NomeVista, 'logo'>, Vista> = {
  treQuarti: { azimut: 32, polare: 64, k: 1, mira: [0, 0.16, 0] },
  alto: { azimut: 0, polare: 0.5, k: 0.98, mira: [0, 0.2, 0] },
  lato: { azimut: 90, polare: 84, k: 0.98, mira: [0, 0.17, 0] },
  mozzo: { azimut: 18, polare: 34, k: 0.46, mira: [0, 0.26, 0.02] },
  /** il cerchio intero da vicino: per scegliere colore e finitura */
  cerchio: { azimut: 28, polare: 52, k: 0.92, mira: [0, 0.18, 0] },
  base: { azimut: 34, polare: 74, k: 0.95, mira: [0, 0.13, 0.04] },
  vetro: { azimut: 24, polare: 46, k: 0.95, mira: [0, 0.24, 0] },
};

/** La vista del logo si calcola dalla sua posizione sul vetro. */
export const vistaLogo = (x: number, z: number, quotaVetro: number): Vista => ({
  azimut: Math.abs(x) > 0.01 ? Math.sign(x) * 30 : 6,
  polare: 44,
  k: 0.9,
  mira: [x * 0.55, quotaVetro - 0.08, z * 0.55],
});

export const VISTA_DEL_PASSO: Record<Passo, NomeVista> = {
  modello: 'treQuarti',
  colore: 'cerchio',
  base: 'base',
  vetro: 'vetro',
  logo: 'logo',
  riepilogo: 'treQuarti',
};

/** Viste offerte dai pulsanti dell'interfaccia. */
export const VISTE_PULSANTI = ['treQuarti', 'alto', 'lato', 'mozzo'] as const;

/** Raggio della sfera che contiene il tavolino (m), per l'inquadratura. */
export const RAGGIO_INQUADRATURA = 0.42;
