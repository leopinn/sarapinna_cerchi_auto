/**
 * Interfaccia del configuratore, sopra il canvas (ispirata al configuratore
 * Lamborghini): barra in alto, viste a sinistra, pannello delle opzioni a
 * destra (su mobile un bottom sheet trascinabile), step in basso.
 * Misura lo spazio che occupa e lo passa alla camera (ingombro).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { MODELLI, trova } from '../data/options';
import { VISTA_DEL_PASSO, VISTE_PULSANTI } from '../data/views';
import { precaricaLegni } from '../materials/wood';
import { PASSI, useConfiguratore } from '../state/store';
import { codifica } from '../state/urlState';
import { CONTENUTO_PASSO } from './Passi';
import { riduciMovimento, useLingua, useMobile } from './hooks';

gsap.registerPlugin(Draggable);

const num = (i: number) => String(i + 1).padStart(2, '0');

/* ---------------------------------------------------------------------------- */

function Marchio() {
  return (
    <span className="cfg-wordmark" aria-hidden="true">
      <span className="cfg-wordmark__sp">SP</span>
      <span className="cfg-wordmark__filo" />
      <span className="cfg-wordmark__design">Design</span>
    </span>
  );
}

function BarraAlta({ rif }: { rif: React.RefObject<HTMLElement | null> }) {
  const { t, link } = useLingua();
  const modello = useConfiguratore((s) => trova(MODELLI, s.config.modello));
  // il cambio lingua porta con sé la configurazione
  const conConfig = (href: string) => `${href}?c=${codifica(useConfiguratore.getState().config)}`;
  return (
    <header className="cfg-top" ref={rif}>
      <a className="cfg-top__marchio" href={link.home} aria-label="SP Design — Home">
        <Marchio />
      </a>
      <p className="cfg-top__modello">
        <span className="cfg-top__auto">{modello.marchio}</span>
        <span className="cfg-top__nome">{modello.auto}</span>
      </p>
      <nav className="cfg-top__azioni">
        <a
          className="cfg-top__link cfg-top__lingua"
          href={link.altraLingua}
          aria-label={link.etichettaAltraLingua}
          onClick={(e) => {
            e.preventDefault();
            location.href = conConfig(link.altraLingua);
          }}
        >
          {link.siglaAltraLingua}
        </a>
        <a className="cfg-top__link cfg-top__contatti" href={link.contatti}>
          {t.riepilogo.preventivo}
        </a>
        <a className="cfg-chiudi" href={link.home} aria-label={t.chiudi}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </a>
      </nav>
    </header>
  );
}

const ICONE_VISTE: Record<(typeof VISTE_PULSANTI)[number], React.ReactElement> = {
  treQuarti: <path d="M4 15l8 4 8-4M4 9l8 4 8-4-8-4z" />,
  alto: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" /></>,
  lato: <><rect x="3" y="10" width="18" height="4" rx="1" /><path d="M5 18h14" /></>,
  mozzo: <><circle cx="11" cy="11" r="6" /><path d="M15.5 15.5L20 20" /></>,
};

function Viste() {
  const { t } = useLingua();
  const passo = useConfiguratore((s) => s.passo);
  const vista = useConfiguratore((s) => s.vista);
  const impostaVista = useConfiguratore((s) => s.impostaVista);
  const attiva = vista ?? VISTA_DEL_PASSO[passo];
  return (
    <div className="cfg-viste" role="group" aria-label={t.viste.titolo}>
      {VISTE_PULSANTI.map((v) => (
        <button
          key={v}
          type="button"
          className={`cfg-vista${attiva === v ? ' is-attiva' : ''}`}
          aria-pressed={attiva === v}
          onClick={() => impostaVista(v)}
          data-vista={v}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
            {ICONE_VISTE[v]}
          </svg>
          <span className="cfg-vista__testo">{t.viste[v]}</span>
        </button>
      ))}
    </div>
  );
}

/** Intestazione, contenuto e navigazione di uno step (uguale su desktop e mobile). */
function ContenutoPannello({ corpoRif }: { corpoRif: React.RefObject<HTMLDivElement | null> }) {
  const { t } = useLingua();
  const passo = useConfiguratore((s) => s.passo);
  const avanti = useConfiguratore((s) => s.avanti);
  const indietro = useConfiguratore((s) => s.indietro);
  const i = PASSI.indexOf(passo);
  const Contenuto = CONTENUTO_PASSO[passo];
  const prossimo = PASSI[i + 1];

  return (
    <>
      <div className="cfg-pannello__testata">
        <p className="cfg-pannello__passo">
          {t.passo} <strong>{num(i)}</strong> {t.di} {num(PASSI.length - 1)}
        </p>
        <h2 className="cfg-pannello__titolo" id="cfg-titolo-passo">{t.passi[passo]}</h2>
        <p className="cfg-pannello__descrizione">{t.descrizioni[passo]}</p>
      </div>
      <div className="cfg-pannello__corpo" ref={corpoRif} key={passo}>
        <Contenuto />
      </div>
      <div className="cfg-pannello__piede">
        <button type="button" className="cfg-bottone-testo" onClick={indietro} disabled={i === 0}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
          {t.indietro}
        </button>
        {prossimo && (
          <button type="button" className="btn" onClick={avanti} data-avanti>
            {prossimo === 'riepilogo' ? t.vediRiepilogo : t.avanti}
            <svg className="btn__freccia" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" /></svg>
          </button>
        )}
      </div>
    </>
  );
}

function BarraPassi({ rif, compatta = false }: { rif?: React.RefObject<HTMLElement | null>; compatta?: boolean }) {
  const { t } = useLingua();
  const passo = useConfiguratore((s) => s.passo);
  const vaiA = useConfiguratore((s) => s.vaiA);
  const lista = useRef<HTMLOListElement>(null);

  // su mobile lo step attivo resta visibile nella fila scorrevole
  useEffect(() => {
    if (!compatta) return;
    lista.current?.querySelector<HTMLElement>('.is-attivo')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: riduciMovimento() ? 'auto' : 'smooth' });
  }, [passo, compatta]);

  return (
    <nav className={`cfg-passi${compatta ? ' cfg-passi--compatta' : ''}`} aria-label={t.passo} ref={rif}>
      <ol ref={lista}>
        {PASSI.map((p, i) => (
          <li key={p}>
            <button
              type="button"
              className={`cfg-passi__voce${p === passo ? ' is-attivo' : ''}`}
              aria-current={p === passo ? 'step' : undefined}
              onClick={() => vaiA(p)}
              data-passo={p}
            >
              <span className="cfg-passi__num">{num(i)}</span>
              <span className="cfg-passi__nome">{t.passi[p]}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ---------------------------------------------------------------------------- */
/* bottom sheet (mobile)                                                          */
/* ---------------------------------------------------------------------------- */

function Foglio({ corpoRif }: { corpoRif: React.RefObject<HTMLDivElement | null> }) {
  const { t } = useLingua();
  const aperto = useConfiguratore((s) => s.pannelloAperto);
  const impostaPannello = useConfiguratore((s) => s.impostaPannello);
  const impostaIngombro = useConfiguratore((s) => s.impostaIngombro);
  const foglio = useRef<HTMLDivElement>(null);
  const testata = useRef<HTMLDivElement>(null);
  const corsa = useRef(0);

  // geometria del foglio: alto al massimo 62% dello schermo; chiuso mostra solo la testata
  const misura = () => {
    const f = foglio.current;
    const h = testata.current;
    if (!f || !h) return { chiuso: 0, aperto: 0 };
    const aperto = f.offsetHeight;
    const chiuso = h.offsetHeight;
    corsa.current = aperto - chiuso;
    return { chiuso, aperto };
  };

  const vai = (apri: boolean, istantaneo = false) => {
    const { chiuso, aperto: altezza } = misura();
    gsap.to(foglio.current, { y: apri ? 0 : corsa.current, duration: istantaneo || riduciMovimento() ? 0 : 0.55, ease: 'power3.out' });
    impostaIngombro({ basso: apri ? altezza : chiuso });
  };

  useLayoutEffect(() => {
    vai(aperto, true);
    const ro = new ResizeObserver(() => vai(useConfiguratore.getState().pannelloAperto, true));
    if (foglio.current) ro.observe(foglio.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => vai(aperto), [aperto]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const [d] = Draggable.create(foglio.current, {
      type: 'y',
      trigger: testata.current,
      bounds: { minY: 0, maxY: corsa.current },
      allowContextMenu: true,
      minimumMovement: 6,
      onPress() {
        this.applyBounds({ minY: 0, maxY: corsa.current });
      },
      onDragEnd() {
        const verso = this.getDirection('y');
        const apri = verso === 'up' ? true : verso === 'down' ? false : this.y < corsa.current / 2;
        if (apri === useConfiguratore.getState().pannelloAperto) vai(apri);
        else impostaPannello(apri);
      },
    });
    return () => void d.kill();
  }, [impostaPannello]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className={`cfg-foglio${aperto ? ' is-aperto' : ''}`} ref={foglio} aria-labelledby="cfg-titolo-passo">
      <div className="cfg-foglio__testata" ref={testata}>
        <button
          type="button"
          className="cfg-foglio__maniglia"
          aria-expanded={aperto}
          aria-label={aperto ? t.pannello.chiudi : t.pannello.apri}
          onClick={() => impostaPannello(!aperto)}
        >
          <span />
        </button>
        <BarraPassi compatta />
      </div>
      <div className="cfg-foglio__contenuto">
        <ContenutoPannello corpoRif={corpoRif} />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------- */

function Avvisi() {
  const { t } = useLingua();
  const errore = useConfiguratore((s) => s.erroreGrafica);
  if (errore === 'nessuno') return null;
  const testo = errore === 'noWebgl' ? t.noWebgl : errore === 'contestoPerso' ? t.contestoPerso : t.errore;
  return (
    <div className="cfg-avviso" role="alert">
      <p>{testo}</p>
      {errore !== 'noWebgl' && (
        <button type="button" className="btn btn--scuro" onClick={() => location.reload()}>
          {t.ricarica}
        </button>
      )}
    </div>
  );
}

function Suggerimento() {
  const { t } = useLingua();
  const pronta = useConfiguratore((s) => s.pronta);
  const interazione = useConfiguratore((s) => s.interazione);
  const [visibile, setVisibile] = useState(false);
  const rif = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!pronta) return;
    setVisibile(true);
    const timer = setTimeout(() => setVisibile(false), 4200);
    return () => clearTimeout(timer);
  }, [pronta]);
  useEffect(() => {
    if (interazione) setVisibile(false);
  }, [interazione]);
  useEffect(() => {
    if (!rif.current) return;
    gsap.to(rif.current, { opacity: visibile ? 1 : 0, y: visibile ? 0 : 8, duration: 0.5, ease: 'power2.out' });
  }, [visibile]);
  return (
    <p className="cfg-suggerimento" ref={rif} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 12h18M3 12l4-4M3 12l4 4M21 12l-4-4M21 12l-4 4" /></svg>
      {t.trascina}
    </p>
  );
}

/* ---------------------------------------------------------------------------- */

export function Interfaccia() {
  const mobile = useMobile();
  const passo = useConfiguratore((s) => s.passo);
  const pronta = useConfiguratore((s) => s.pronta);
  const livello = useConfiguratore((s) => s.livello);
  const impostaIngombro = useConfiguratore((s) => s.impostaIngombro);
  const ingombro = useConfiguratore((s) => s.ingombro);

  const top = useRef<HTMLElement>(null);
  const pannello = useRef<HTMLElement>(null);
  const barra = useRef<HTMLElement>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const radice = useRef<HTMLDivElement>(null);

  // spazio occupato dall'interfaccia → la camera centra il tavolino nel resto
  useLayoutEffect(() => {
    const misura = () => {
      const alto = top.current?.offsetHeight ?? 0;
      if (mobile) {
        impostaIngombro({ alto, destra: 0 });
        return;
      }
      const p = pannello.current?.getBoundingClientRect();
      impostaIngombro({
        alto,
        destra: p ? window.innerWidth - p.left : 0,
        basso: barra.current?.offsetHeight ?? 0,
      });
    };
    misura();
    const ro = new ResizeObserver(misura);
    [top.current, pannello.current, barra.current].forEach((el) => el && ro.observe(el));
    window.addEventListener('resize', misura);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', misura);
    };
  }, [mobile, impostaIngombro]);

  // aprendo lo step Base si scaricano in anticipo tutte le essenze
  useEffect(() => {
    if (passo === 'base') precaricaLegni(livello, 8);
  }, [passo, livello]);

  // ingresso dell'interfaccia quando la scena è pronta
  useLayoutEffect(() => {
    if (!pronta || riduciMovimento() || !radice.current) return;
    const q = gsap.utils.selector(radice.current);
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.35 });
    tl.from(q('.cfg-top'), { y: -16, opacity: 0, duration: 0.8 })
      .from(q('.cfg-pannello, .cfg-foglio__testata'), { x: mobile ? 0 : 32, y: mobile ? 24 : 0, opacity: 0, duration: 0.9 }, 0.1)
      .from(q('.cfg-passi:not(.cfg-passi--compatta) li'), { y: 12, opacity: 0, stagger: 0.05, duration: 0.6 }, 0.25)
      .from(q('.cfg-vista'), { x: -12, opacity: 0, stagger: 0.05, duration: 0.6 }, 0.3);
    return () => void tl.revert();
  }, [pronta, mobile]);

  // cambio step: il contenuto del pannello entra in sequenza
  useLayoutEffect(() => {
    if (!corpo.current || riduciMovimento()) return;
    const figli = corpo.current.querySelectorAll(':scope > *, .cfg-gruppo__voci > *');
    const tween = gsap.from(figli, { opacity: 0, y: 10, duration: 0.5, stagger: 0.025, ease: 'power2.out', clearProps: 'transform,opacity' });
    return () => void tween.revert();
  }, [passo]);

  return (
    <div
      className={`cfg-ui${pronta ? ' is-pronta' : ''}`}
      ref={radice}
      style={{ '--cfg-alto': `${ingombro.alto}px`, '--cfg-destra': `${ingombro.destra}px`, '--cfg-basso': `${ingombro.basso}px` } as React.CSSProperties}
    >
      <BarraAlta rif={top} />
      <Viste />
      <Suggerimento />
      {mobile ? (
        <Foglio corpoRif={corpo} />
      ) : (
        <>
          <aside className="cfg-pannello" ref={pannello} aria-labelledby="cfg-titolo-passo">
            <ContenutoPannello corpoRif={corpo} />
          </aside>
          <BarraPassi rif={barra} />
        </>
      )}
      <Avvisi />
    </div>
  );
}
