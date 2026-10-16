/**
 * Genera dist/api/opzioni.json: il PHP del form lo legge per trasformare il
 * codice configurazione (es. 1-A1-NR-LU-AB-NA-RO-AN) in un riepilogo leggibile
 * nelle email. Così il server non si fida di etichette mandate dal browser.
 */
import { ELENCHI, ETICHETTE_CAMPI, ORDINE_CAMPI } from '../../configurator/data/options';
import { VERSIONE } from '../../configurator/state/urlState';

export const GET = () => {
  const campi = Object.fromEntries(
    ORDINE_CAMPI.map((campo) => [
      campo,
      Object.fromEntries(ELENCHI[campo].map((o) => [o.code, o.name])),
    ]),
  );
  return new Response(
    JSON.stringify({ versione: VERSIONE, ordine: ORDINE_CAMPI, etichette: ETICHETTE_CAMPI, campi }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
