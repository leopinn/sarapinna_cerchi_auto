/**
 * Stato del configuratore (zustand).
 *  - config: le scelte del cliente (sincronizzate con ?c= nell'indirizzo)
 *  - passo:  lo step attivo (decide la vista della camera e il pannello)
 *  - vista:  una vista scelta a mano con i pulsanti (null = quella dello step)
 *  - ui:     stato dell'interfaccia (pannello mobile, scena pronta, …)
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { PREDEFINITA, normalizza, type Configurazione } from '../data/options';
import type { NomeVista } from '../data/views';

export const PASSI = ['modello', 'colore', 'base', 'vetro', 'logo', 'riepilogo'] as const;
export type Passo = (typeof PASSI)[number];

export type Livello = 'alto' | 'basso';

interface Stato {
  config: Configurazione;
  passo: Passo;
  vista: NomeVista | null;
  livello: Livello;
  /** la scena ha disegnato i primi frame con tutto caricato */
  pronta: boolean;
  /** avanzamento del caricamento 0..1 */
  avanzamento: number;
  /** bottom sheet espanso (solo mobile) */
  pannelloAperto: boolean;
  /** WebGL non disponibile o contesto perso */
  erroreGrafica: 'nessuno' | 'noWebgl' | 'contestoPerso' | 'errore';
  /** la scena ha rallentato: effetti alleggeriti (solo se si era partiti dal livello alto) */
  declassato: boolean;
  /** spazio occupato dall'interfaccia sopra il canvas (px): la camera centra il tavolino nel resto */
  ingombro: { alto: number; destra: number; basso: number };
  /** il cliente sta trascinando la vista */
  interazione: boolean;

  imposta: <K extends keyof Configurazione>(campo: K, valore: Configurazione[K]) => void;
  caricaConfig: (c: Configurazione) => void;
  vaiA: (p: Passo) => void;
  avanti: () => void;
  indietro: () => void;
  impostaVista: (v: NomeVista | null) => void;
  impostaLivello: (l: Livello) => void;
  segnaPronta: () => void;
  impostaAvanzamento: (v: number) => void;
  impostaPannello: (aperto: boolean) => void;
  impostaErrore: (e: Stato['erroreGrafica']) => void;
  declassa: () => void;
  impostaIngombro: (i: Partial<Stato['ingombro']>) => void;
  impostaInterazione: (v: boolean) => void;
}

export const useConfiguratore = create<Stato>()(
  subscribeWithSelector((set, get) => ({
    config: { ...PREDEFINITA },
    passo: 'modello',
    vista: null,
    livello: 'alto',
    pronta: false,
    avanzamento: 0,
    pannelloAperto: true,
    erroreGrafica: 'nessuno',
    declassato: false,
    ingombro: { alto: 0, destra: 0, basso: 0 },
    interazione: false,

    imposta: (campo, valore) => set({ config: normalizza({ ...get().config, [campo]: valore }) }),
    caricaConfig: (c) => set({ config: normalizza(c) }),
    vaiA: (passo) => set({ passo, vista: null }),
    avanti: () => {
      const i = PASSI.indexOf(get().passo);
      if (i < PASSI.length - 1) set({ passo: PASSI[i + 1], vista: null });
    },
    indietro: () => {
      const i = PASSI.indexOf(get().passo);
      if (i > 0) set({ passo: PASSI[i - 1], vista: null });
    },
    impostaVista: (vista) => set({ vista }),
    impostaLivello: (livello) => set({ livello }),
    segnaPronta: () => set({ pronta: true, avanzamento: 1 }),
    impostaAvanzamento: (avanzamento) => set({ avanzamento: Math.max(get().avanzamento, avanzamento) }),
    impostaPannello: (pannelloAperto) => set({ pannelloAperto }),
    impostaErrore: (erroreGrafica) => set({ erroreGrafica }),
    declassa: () => set({ declassato: true }),
    impostaIngombro: (i) => {
      const attuale = get().ingombro;
      const nuovo = { ...attuale, ...i };
      if (nuovo.alto !== attuale.alto || nuovo.destra !== attuale.destra || nuovo.basso !== attuale.basso) set({ ingombro: nuovo });
    },
    impostaInterazione: (interazione) => set({ interazione }),
  })),
);
