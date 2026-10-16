/**
 * Contenuto del pannello per ogni step.
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { COLORI, FINITURE, LEGNI, MODELLI, POSIZIONI_LOGO, TINTE, VETRI, trova } from '../data/options';
import { CERCHI, VETRO, ingombroVetro, quote } from '../data/dimensions';
import { disegnaFaccia } from '../geometry/face';
import { posizioneLogo } from '../geometry/logoPlacement';
import { PROPORZIONI_LOGO } from '../materials/canvasTextures';
import { useConfiguratore, type Passo } from '../state/store';
import { codifica } from '../state/urlState';
import { righeRiepilogo } from '../state/summary';
import { GruppoOpzioni, type VoceOpzione } from './Opzioni';
import { useLingua } from './hooks';

type IdVetro = keyof typeof VETRO.forme;

/* ---------------------------------------------------------------------------- */
/* aiuti grafici                                                                 */
/* ---------------------------------------------------------------------------- */

/** Sagoma vera della faccia del cerchio in SVG (stessa geometria del 3D). */
const pathFaccia = (idCerchio: string) => {
  const rim = CERCHI[idCerchio];
  const d = disegnaFaccia(rim.faccia, rim.bulloni, 8);
  const anello = (l: [number, number][]) => 'M' + l.map(([x, y]) => `${x.toFixed(1)},${(-y).toFixed(1)}`).join('L') + 'Z';
  const lip = rim.rFlangia;
  return { d: anello(d.esterno) + d.fori.map(anello).join(''), r: lip };
};

const IconaCerchio = ({ idCerchio }: { idCerchio: string }) => {
  const { d, r } = useMemo(() => pathFaccia(idCerchio), [idCerchio]);
  return (
    <svg viewBox={`${-r - 4} ${-r - 4} ${2 * r + 8} ${2 * r + 8}`} className="cfg-icona-cerchio">
      <circle r={r} fill="none" stroke="currentColor" strokeWidth="10" opacity="0.5" />
      <path d={d} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
};

const FORME_SVG: Record<IdVetro, ReactElement> = {
  rotondo: <circle cx="24" cy="24" r="20" />,
  quadrato: <rect x="5" y="5" width="38" height="38" rx="6" />,
  ovale: <ellipse cx="24" cy="24" rx="22" ry="17.6" />,
  esagonale: <polygon points="46,24 35,5 13,5 2,24 13,43 35,43" />,
};

const IconaVetro = ({ id, logo }: { id: IdVetro; logo?: string }) => {
  let segno = null;
  if (logo) {
    const p = posizioneLogo(id, logo, PROPORZIONI_LOGO);
    const { larghezza } = ingombroVetro(id);
    const s = 44 / (larghezza / 1000);
    segno = <rect x={24 + p.x * s - (p.larghezza * s) / 2} y={24 + p.z * s - (p.altezza * s) / 2} width={p.larghezza * s} height={p.altezza * s} rx="1" className="cfg-icona-vetro__logo" />;
  }
  return (
    <svg viewBox="0 0 48 48" className="cfg-icona-vetro">
      <g className="cfg-icona-vetro__forma">{FORME_SVG[id]}</g>
      {segno}
    </svg>
  );
};

/** Colore di anteprima di una tinta su un'essenza (approssimazione in sRGB). */
const coloreTinta = (campione: string, tint: string, desat: number) => {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const [r, g, b] = rgb(campione);
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const t = rgb(tint);
  const out = [r, g, b].map((c, i) => (c + (l - c) * desat) * t[i]);
  return '#' + out.map((c) => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('');
};

const cm = (mm: number) => Math.round(mm / 10);

/* ---------------------------------------------------------------------------- */
/* step                                                                          */
/* ---------------------------------------------------------------------------- */

function PassoModello() {
  const { t, L } = useLingua();
  const config = useConfiguratore((s) => s.config);
  const imposta = useConfiguratore((s) => s.imposta);
  const voci: VoceOpzione[] = MODELLI.map((m) => ({
    id: m.id,
    etichetta: `${m.marchio} ${m.auto}`,
    dettaglio: `${L(m.posizione)} · ${m.misura}`,
    anteprima: <IconaCerchio idCerchio={m.rim} />,
  }));
  return (
    <>
      <GruppoOpzioni etichetta={t.etichette.modello} voci={voci} valore={config.modello} onScegli={(id) => imposta('modello', id)} variante="schede" />
      {MODELLI.length === 1 && <p className="cfg-nota">{t.note.unicoModello}</p>}
    </>
  );
}

function PassoColore() {
  const { t, L } = useLingua();
  const config = useConfiguratore((s) => s.config);
  const imposta = useConfiguratore((s) => s.imposta);
  const colore = trova(COLORI, config.colore);
  const colori: VoceOpzione[] = COLORI.map((c) => ({
    id: c.id,
    etichetta: L(c.name),
    anteprima: <span className={`cfg-campione${c.metallizzato ? ' cfg-campione--metallo' : ''}`} style={{ background: c.hex }} />,
  }));
  const finiture: VoceOpzione[] = FINITURE.map((f) => ({ id: f.id, etichetta: L(f.name), disabilitata: !colore.finiture.includes(f.id) }));
  return (
    <>
      <GruppoOpzioni etichetta={t.etichette.colore} voci={colori} valore={config.colore} onScegli={(id) => imposta('colore', id)} variante="campioni" mostraScelta />
      <GruppoOpzioni etichetta={t.etichette.finitura} voci={finiture} valore={config.finitura} onScegli={(id) => imposta('finitura', id)} variante="segmenti" />
      {colore.metallizzato && <p className="cfg-nota">{t.note.soloLucidoSatinato}</p>}
    </>
  );
}

function PassoBase() {
  const { t, L } = useLingua();
  const config = useConfiguratore((s) => s.config);
  const imposta = useConfiguratore((s) => s.imposta);
  const legno = trova(LEGNI, config.legno);
  const texture = (cartella: string) => `url(/configurator/textures/wood/${cartella}/color_1k.webp)`;
  const essenze: VoceOpzione[] = LEGNI.map((l) => ({
    id: l.id,
    etichetta: L(l.name),
    anteprima: <span className="cfg-legno" />,
    // la scheda dell'essenza mostra il legno al naturale (il frassino già scurito)
    stile: { backgroundColor: l.campione, backgroundImage: texture(l.texture) },
  }));
  const tinte: VoceOpzione[] = TINTE.filter((x) => legno.tinte.includes(x.id)).map((x) => ({
    id: x.id,
    etichetta: L(x.name),
    anteprima: <span className="cfg-legno" />,
    stile: { backgroundColor: coloreTinta(legno.campione, x.tint, x.desat), backgroundImage: texture(legno.texture) },
  }));
  return (
    <>
      <GruppoOpzioni etichetta={t.etichette.essenza} voci={essenze} valore={config.legno} onScegli={(id) => imposta('legno', id)} variante="schede" />
      {tinte.length > 1 ? (
        <GruppoOpzioni etichetta={t.etichette.tinta} voci={tinte} valore={config.tinta} onScegli={(id) => imposta('tinta', id)} variante="campioni" mostraScelta />
      ) : (
        <p className="cfg-nota">{t.note.tintaFissa}</p>
      )}
    </>
  );
}

function PassoVetro() {
  const { t, L } = useLingua();
  const config = useConfiguratore((s) => s.config);
  const imposta = useConfiguratore((s) => s.imposta);
  const voci: VoceOpzione[] = VETRI.map((v) => {
    const f = VETRO.forme[v.id as IdVetro];
    const { larghezza, profondita } = ingombroVetro(v.id as IdVetro);
    return {
      id: v.id,
      etichetta: L(v.name),
      dettaglio: f.tipo === 'cerchio' ? `Ø ${cm(f.diametro)} cm` : `${cm(larghezza)} × ${cm(profondita)} cm`,
      anteprima: <IconaVetro id={v.id as IdVetro} />,
    };
  });
  return <GruppoOpzioni etichetta={t.etichette.forma} voci={voci} valore={config.vetro} onScegli={(id) => imposta('vetro', id)} variante="schede" />;
}

function PassoLogo() {
  const { t, L } = useLingua();
  const config = useConfiguratore((s) => s.config);
  const imposta = useConfiguratore((s) => s.imposta);
  const voci: VoceOpzione[] = POSIZIONI_LOGO.map((p) => ({
    id: p.id,
    etichetta: L(p.name),
    anteprima: <IconaVetro id={config.vetro as IdVetro} logo={p.id} />,
  }));
  return <GruppoOpzioni etichetta={t.etichette.posizione} voci={voci} valore={config.logo} onScegli={(id) => imposta('logo', id)} variante="schede" />;
}

function PassoRiepilogo() {
  const { t, lingua, link } = useLingua();
  const config = useConfiguratore((s) => s.config);
  const vaiA = useConfiguratore((s) => s.vaiA);
  const [copiato, setCopiato] = useState(false);
  const [puoCondividere, setPuoCondividere] = useState(false);
  useEffect(() => setPuoCondividere(typeof navigator.share === 'function'), []);

  const codice = codifica(config);
  const rim = CERCHI[trova(MODELLI, config.modello).rim];
  const { cimaVetro } = quote(rim);
  const f = VETRO.forme[config.vetro as IdVetro];
  const ingombro = ingombroVetro(config.vetro as IdVetro);
  const misuraPiano = f.tipo === 'cerchio' ? `Ø ${cm(f.diametro)} cm` : `${cm(ingombro.larghezza)} × ${cm(ingombro.profondita)} cm`;
  const passoDiRiga: Record<string, Passo> = { modello: 'modello', colore: 'colore', base: 'base', vetro: 'vetro', logo: 'logo' };

  const url = () => `${location.origin}${location.pathname}?c=${codice}`;
  const copia = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2200);
    } catch {
      /* appunti non disponibili */
    }
  };
  const condividi = () => void navigator.share?.({ title: t.riepilogo.condivisione, url: url() }).catch(() => {});

  return (
    <div className="cfg-riepilogo">
      <dl className="cfg-riepilogo__righe">
        {righeRiepilogo(config, lingua).map((r) => (
          <div key={r.chiave} className="cfg-riepilogo__riga">
            <dt>{r.etichetta}</dt>
            <dd>{r.valore}</dd>
            <button type="button" className="cfg-link" onClick={() => vaiA(passoDiRiga[r.chiave])} aria-label={`${t.riepilogo.modifica}: ${r.etichetta}`}>
              {t.riepilogo.modifica}
            </button>
          </div>
        ))}
      </dl>

      <div className="cfg-riepilogo__misure">
        <p className="cfg-gruppo__titolo"><span>{t.riepilogo.misure}</span></p>
        <p>
          {t.riepilogo.altezza} ≈ {cm(cimaVetro)} cm · {t.riepilogo.ingombro} {misuraPiano}
        </p>
      </div>

      <p className="cfg-riepilogo__codice">
        <span>{t.riepilogo.codice}</span>
        <code data-codice>{codice}</code>
      </p>

      <a className="btn cfg-riepilogo__cta" href={`${link.contatti}?c=${codice}#form-contatti`}>
        {t.riepilogo.preventivo}
        <svg className="btn__freccia" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M4 12h15M13 6l6 6-6 6" />
        </svg>
      </a>
      <p className="cfg-riepilogo__prezzo">{t.riepilogo.prezzo}</p>
      <div className="cfg-riepilogo__azioni">
        <button type="button" className="cfg-bottone-testo" onClick={copia} aria-live="polite">
          {copiato ? t.riepilogo.copiato : t.riepilogo.copia}
        </button>
        {puoCondividere && (
          <button type="button" className="cfg-bottone-testo" onClick={condividi}>
            {t.riepilogo.condividi}
          </button>
        )}
      </div>
    </div>
  );
}

export const CONTENUTO_PASSO: Record<Passo, () => ReactElement> = {
  modello: PassoModello,
  colore: PassoColore,
  base: PassoBase,
  vetro: PassoVetro,
  logo: PassoLogo,
  riepilogo: PassoRiepilogo,
};
