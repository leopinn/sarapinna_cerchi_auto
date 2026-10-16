/**
 * Codice configurazione: la configurazione intera in una stringa corta,
 * leggibile e sicura per URL ed email.
 *
 *   1-A1-NR-LU-AB-NA-RO-AN
 *   │ │  │  │  │  │  │  └ logo
 *   │ │  │  │  │  │  └ vetro
 *   │ │  │  │  │  └ tinta
 *   │ │  │  │  └ legno
 *   │ │  │  └ finitura
 *   │ │  └ colore
 *   │ └ modello
 *   └ versione dello schema
 *
 * Modulo PURO (niente three): lo usano anche la pagina contatti e il build.
 */
import { ELENCHI, ORDINE_CAMPI, PREDEFINITA, normalizza, type Configurazione } from '../data/options';

export const VERSIONE = '1';
export const PARAMETRO = 'c';

/** Stessa regola del PHP: lettere, cifre e trattini, da 3 a 64 caratteri. */
export const FORMATO_CODICE = /^[A-Za-z0-9-]{3,64}$/;

export const codifica = (c: Configurazione): string =>
  [VERSIONE, ...ORDINE_CAMPI.map((campo) => ELENCHI[campo].find((o) => o.id === c[campo])?.code ?? '??')].join('-');

/**
 * Decodifica un codice. Ogni segmento sconosciuto ricade sul valore
 * predefinito: un link vecchio o rovinato apre comunque un tavolino valido.
 * `valido` è falso se il codice era assente o malformato.
 */
export const decodifica = (codice: string | null | undefined): { config: Configurazione; valido: boolean } => {
  if (!codice || !FORMATO_CODICE.test(codice)) return { config: { ...PREDEFINITA }, valido: false };
  const [versione, ...segmenti] = codice.toUpperCase().split('-');
  if (versione !== VERSIONE) return { config: { ...PREDEFINITA }, valido: false };

  const config = { ...PREDEFINITA };
  let valido = segmenti.length === ORDINE_CAMPI.length;
  ORDINE_CAMPI.forEach((campo, i) => {
    const opzione = ELENCHI[campo].find((o) => o.code === segmenti[i]);
    if (opzione) config[campo] = opzione.id;
    else valido = false;
  });
  return { config: normalizza(config), valido };
};

/** Legge la configurazione dall'indirizzo corrente (solo nel browser). */
export const leggiDaUrl = () => decodifica(new URLSearchParams(location.search).get(PARAMETRO));

/** Sostituisce ?c= nell'indirizzo senza aggiungere voci alla cronologia. */
export const scriviInUrl = (c: Configurazione) => {
  const url = new URL(location.href);
  url.searchParams.set(PARAMETRO, codifica(c));
  history.replaceState(history.state, '', url);
};
