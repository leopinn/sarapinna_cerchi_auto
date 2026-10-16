/**
 * Righe di riepilogo di una configurazione, nella lingua richiesta.
 * Modulo PURO: lo usano il configuratore, la pagina contatti e opzioni.json.
 */
import {
  COLORI,
  ETICHETTE_CAMPI,
  FINITURE,
  LEGNI,
  MODELLI,
  POSIZIONI_LOGO,
  TINTE,
  VETRI,
  trova,
  type Configurazione,
  type Lingua,
} from '../data/options';

export interface Riga {
  chiave: 'modello' | 'colore' | 'base' | 'vetro' | 'logo';
  etichetta: string;
  valore: string;
}

export const righeRiepilogo = (c: Configurazione, lingua: Lingua): Riga[] => {
  const modello = trova(MODELLI, c.modello);
  const colore = trova(COLORI, c.colore);
  const finitura = trova(FINITURE, c.finitura);
  const legno = trova(LEGNI, c.legno);
  const tinta = trova(TINTE, c.tinta);
  // con una tinta sola (frassino tinto nero) il nome dell'essenza basta
  const base = legno.tinte.length > 1 ? `${legno.name[lingua]} · ${tinta.name[lingua]}` : legno.name[lingua];

  return [
    { chiave: 'modello', etichetta: ETICHETTE_CAMPI.modello[lingua], valore: `${modello.marchio} ${modello.name[lingua]} · ${modello.misura}` },
    { chiave: 'colore', etichetta: ETICHETTE_CAMPI.colore[lingua], valore: `${colore.name[lingua]} · ${finitura.name[lingua]}` },
    { chiave: 'base', etichetta: ETICHETTE_CAMPI.legno[lingua], valore: base },
    { chiave: 'vetro', etichetta: ETICHETTE_CAMPI.vetro[lingua], valore: trova(VETRI, c.vetro).name[lingua] },
    { chiave: 'logo', etichetta: ETICHETTE_CAMPI.logo[lingua], valore: trova(POSIZIONI_LOGO, c.logo).name[lingua] },
  ];
};
