/**
 * Piccoli aiuti condivisi dall'interfaccia e dalla scena.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import type { Lingua, Testo } from '../data/options';
import type { Testi } from '../../i18n/index';

let mqRidotto: MediaQueryList | null = null;
/** prefers-reduced-motion, letto al volo (va bene anche dentro useFrame). */
export const riduciMovimento = () => {
  if (typeof window === 'undefined') return false;
  mqRidotto ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  return mqRidotto.matches;
};

export interface Collegamenti {
  home: string;
  contatti: string;
  altraLingua: string;
  siglaAltraLingua: string;
  etichettaAltraLingua: string;
}

export interface ContestoLingua {
  lingua: Lingua;
  t: Testi['configuratore'];
  link: Collegamenti;
  /** testo di un'opzione nella lingua corrente */
  L: (x: Testo) => string;
}

export const LinguaContext = createContext<ContestoLingua | null>(null);

export const useLingua = () => {
  const c = useContext(LinguaContext);
  if (!c) throw new Error('LinguaContext mancante');
  return c;
};

/** Vero sotto i 760 px: il pannello diventa un bottom sheet. */
export const useMobile = () => {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const aggiorna = () => setMobile(mq.matches);
    mq.addEventListener('change', aggiorna);
    return () => mq.removeEventListener('change', aggiorna);
  }, []);
  return mobile;
};
