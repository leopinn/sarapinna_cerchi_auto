/**
 * Dati dell'azienda. Un campo a `null` non viene mostrato sul sito.
 *
 * TODO: Instagram e sede non sono ancora stati forniti. Non vanno inventati:
 * si compilano qui quando arrivano e compaiono da soli nella pagina contatti
 * e nel footer.
 */
export const site = {
  nome: 'SP Design',
  email: 'info@sarapinna.it' as string | null,
  telefono: '+39 377 140 6220' as string | null,
  /** solo cifre e +, per il link tel: */
  telefonoRaw: '+393771406220' as string | null,
  instagram: null as string | null,
  sede: null as string | null,
};
