/**
 * Gruppo di opzioni a scelta singola (radiogroup accessibile):
 * frecce per spostarsi, la selezione segue il focus, una sola voce nel Tab.
 * Varianti grafiche: campioni tondi (colori), schede (legni, forme), segmenti.
 */
import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { useLingua } from './hooks';

export interface VoceOpzione {
  id: string;
  etichetta: string;
  /** testo secondario (es. misure) */
  dettaglio?: string;
  disabilitata?: boolean;
  /** contenuto grafico del campione */
  anteprima?: ReactNode;
  stile?: CSSProperties;
}

interface Props {
  etichetta: string;
  voci: VoceOpzione[];
  valore: string;
  onScegli: (id: string) => void;
  variante: 'campioni' | 'schede' | 'segmenti';
  /** nome dell'opzione scelta mostrato accanto all'etichetta */
  mostraScelta?: boolean;
}

export function GruppoOpzioni({ etichetta, voci, valore, onScegli, variante, mostraScelta = false }: Props) {
  const { t } = useLingua();
  const rif = useRef<HTMLDivElement>(null);
  const scelta = voci.find((v) => v.id === valore);

  const sposta = (e: KeyboardEvent, i: number) => {
    const avanti = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const indietro = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    if (!avanti && !indietro && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const attive = voci.map((v, k) => ({ v, k })).filter(({ v }) => !v.disabilitata);
    let pos = attive.findIndex(({ k }) => k === i);
    if (e.key === 'Home') pos = 0;
    else if (e.key === 'End') pos = attive.length - 1;
    else pos = (pos + (avanti ? 1 : -1) + attive.length) % attive.length;
    const prossima = attive[pos];
    onScegli(prossima.v.id);
    rif.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[prossima.k]?.focus();
  };

  return (
    <fieldset className={`cfg-gruppo cfg-gruppo--${variante}`}>
      <legend className="cfg-gruppo__titolo">
        <span>{etichetta}</span>
        {mostraScelta && scelta && <span className="cfg-gruppo__scelta">{scelta.etichetta}</span>}
      </legend>
      <div className="cfg-gruppo__voci" role="radiogroup" aria-label={etichetta} ref={rif}>
        {voci.map((v, i) => {
          const attiva = v.id === valore;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={attiva}
              aria-disabled={v.disabilitata || undefined}
              tabIndex={attiva ? 0 : -1}
              className={`cfg-voce${attiva ? ' is-attiva' : ''}${v.disabilitata ? ' is-disabilitata' : ''}`}
              onClick={() => !v.disabilitata && onScegli(v.id)}
              onKeyDown={(e) => sposta(e, i)}
              title={variante === 'campioni' ? v.etichetta : undefined}
              data-opzione={v.id}
            >
              {v.anteprima !== undefined && (
                <span className="cfg-voce__anteprima" style={v.stile} aria-hidden="true">
                  {v.anteprima}
                </span>
              )}
              <span className={variante === 'campioni' ? 'sr-only' : 'cfg-voce__testo'}>
                <span className="cfg-voce__nome">{v.etichetta}</span>
                {v.dettaglio && <span className="cfg-voce__dettaglio">{v.dettaglio}</span>}
                {attiva && variante === 'campioni' && <span className="sr-only">, {t.selezionato}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
