/**
 * Regia del video della home: funzioni pure del tempo t (secondi).
 * Niente animazioni "a orologio": ogni fotogramma si ricostruisce da t, così
 * il rendering è deterministico e il loop si chiude pulito.
 *
 *  0.0 – 4.6  showroom: orbita bassa, una striscia di luce scorre sul cerchio
 *  4.6 – 8.0  showroom: la camera sale fin quasi a piombo, dissolvenza al nero
 *  8.0 – 14.0 salotto (villa vista mare): arrivo dal nero, lento avvicinamento,
 *             dissolvenza al nero per chiudere il loop
 */

export const DURATA = 14;
export const TAGLIO = 8;

export type Ambiente = 'studio' | 'salotto';

export interface Inquadratura {
  ambiente: Ambiente;
  azimut: number;
  polare: number;
  /** distanza relativa, come nelle viste del configuratore */
  k: number;
  mira: [number, number, number];
  /** 0 = immagine piena, 1 = nero */
  nero: number;
  /** posizione X della striscia di luce che scorre (solo studio) */
  striscia: number;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** morbida all'inizio e alla fine (movimento di camera "da gru") */
const morbido = (t: number) => {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const tratto = (t: number, da: number, a: number) => clamp01((t - da) / (a - da));

export function inquadratura(tt: number): Inquadratura {
  const t = ((tt % DURATA) + DURATA) % DURATA;

  if (t < 4.6) {
    const u = morbido(tratto(t, 0, 4.6));
    return {
      ambiente: 'studio',
      azimut: lerp(-58, -18, u),
      polare: lerp(77, 66, u),
      k: lerp(1.12, 0.92, u),
      mira: [0, lerp(0.15, 0.17, u), 0],
      nero: 1 - morbido(tratto(t, 0, 0.6)),
      striscia: lerp(-3.4, 3.4, morbido(tratto(t, 0.4, 4.4))),
    };
  }
  if (t < TAGLIO) {
    const u = morbido(tratto(t, 4.6, TAGLIO));
    return {
      ambiente: 'studio',
      azimut: lerp(-18, 28, u),
      polare: lerp(66, 9, u),
      k: lerp(0.92, 0.78, u),
      mira: [0, lerp(0.17, 0.24, u), 0],
      nero: morbido(tratto(t, 7.4, TAGLIO)),
      // finito il passaggio la striscia esce di scena (altrimenti le razze restano grigie)
      striscia: 99,
    };
  }
  const u = morbido(tratto(t, TAGLIO, DURATA));
  return {
    ambiente: 'salotto',
    // la villa: si guarda verso la parte calda della stanza, le vetrate stanno
    // di lato (luce radente sul nero lucido, riflessi sul parquet)
    azimut: lerp(14, 52, u),
    polare: lerp(74, 68, u),
    k: lerp(1.3, 0.98, u),
    mira: [0, lerp(0.18, 0.17, u), 0],
    nero: Math.max(1 - morbido(tratto(t, TAGLIO, TAGLIO + 0.7)), morbido(tratto(t, DURATA - 0.6, DURATA))),
    striscia: 0,
  };
}
