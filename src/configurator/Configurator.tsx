/**
 * Radice dell'isola React del configuratore.
 * Riceve dalla pagina Astro la lingua, i testi e i link (niente fetch: tutto
 * è già nell'HTML). Tiene sincronizzati stato e indirizzo (?c=…).
 */
import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useConfiguratore } from './state/store';
import { codifica, leggiDaUrl, scriviInUrl } from './state/urlState';
import { LinguaContext, type Collegamenti } from './ui/hooks';
import { Stage, livelloIniziale } from './scene/Stage';
import { Interfaccia } from './ui/Interfaccia';
import { Caricamento } from './ui/Caricamento';
import type { Lingua, Testo } from './data/options';
import type { Testi } from '../i18n/index';

interface Props {
  lingua: Lingua;
  t: Testi['configuratore'];
  link: Collegamenti;
}

class ConfiniErrore extends Component<{ children: ReactNode; onErrore: () => void }, { errore: boolean }> {
  state = { errore: false };
  static getDerivedStateFromError() {
    return { errore: true };
  }
  componentDidCatch(e: unknown) {
    console.error(e);
    this.props.onErrore();
  }
  render() {
    return this.state.errore ? null : this.props.children;
  }
}

const supportaWebgl2 = () => {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
};

export default function Configurator({ lingua, t, link }: Props) {
  const caricaConfig = useConfiguratore((s) => s.caricaConfig);
  const impostaLivello = useConfiguratore((s) => s.impostaLivello);
  const impostaErrore = useConfiguratore((s) => s.impostaErrore);
  const errore = useConfiguratore((s) => s.erroreGrafica);
  const [avviato, setAvviato] = useState(false);

  // una sola volta: configurazione dall'indirizzo, livello di qualità, WebGL
  useEffect(() => {
    const { config, valido } = leggiDaUrl();
    caricaConfig(config);
    if (!valido) scriviInUrl(config);
    impostaLivello(livelloIniziale());
    if (!supportaWebgl2()) impostaErrore('noWebgl');
    setAvviato(true);
  }, [caricaConfig, impostaLivello, impostaErrore]);

  // indirizzo sempre aggiornato (senza riempire la cronologia)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const stop = useConfiguratore.subscribe(
      (s) => s.config,
      (c) => {
        clearTimeout(timer);
        timer = setTimeout(() => scriviInUrl(c), 200);
      },
    );
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, []);

  const contesto = useMemo(() => ({ lingua, t, link, L: (x: Testo) => x[lingua] }), [lingua, t, link]);

  // per test e video: il codice corrente sempre leggibile
  useEffect(() => {
    (window as Window & { __spCodice?: () => string }).__spCodice = () => codifica(useConfiguratore.getState().config);
  }, []);

  return (
    <LinguaContext.Provider value={contesto}>
      <div className="cfg">
        {avviato && errore === 'nessuno' && (
          <ConfiniErrore onErrore={() => impostaErrore('errore')}>
            <Stage />
          </ConfiniErrore>
        )}
        {avviato && <Interfaccia />}
        <Caricamento />
      </div>
    </LinguaContext.Provider>
  );
}
