/**
 * Gestione delle due lingue del sito.
 *
 * L'italiano sta in radice (/configuratore), l'inglese sotto /en
 * (/en/configurator): sono due copie statiche vere, quindi Google indicizza
 * entrambe e i link sono condivisibili. Ogni componente ricava la lingua
 * dall'indirizzo con `linguaDa(Astro.url.pathname)` e legge i testi da
 * `testi[lingua]`.
 *
 * Per aggiungere una pagina: una voce in `pagine`, le due pagine in
 * src/pages e i testi nei due dizionari qui sotto. Il dizionario inglese è
 * controllato con `satisfies Testi`: se manca una chiave, `npm run check`
 * segnala l'errore.
 */

export type Lingua = 'it' | 'en';
export type IdPagina = 'home' | 'configuratore' | 'contatti';

/** Coppie di indirizzi: servono al cambio lingua per trovare la pagina gemella. */
export const pagine: { id: IdPagina; it: string; en: string }[] = [
  { id: 'home', it: '/', en: '/en' },
  { id: 'configuratore', it: '/configuratore', en: '/en/configurator' },
  { id: 'contatti', it: '/contatti', en: '/en/contact' },
];

/** In build gli indirizzi arrivano con lo slash finale: "/contatti/" → "/contatti". */
export const normalizza = (percorso: string) => {
  const p = percorso.replace(/\/+$/, '');
  return p === '' ? '/' : p;
};

/** Ricava la lingua dall'indirizzo: tutto ciò che sta sotto /en è inglese. */
export const linguaDa = (percorso: string): Lingua => {
  const p = normalizza(percorso);
  return p === '/en' || p.startsWith('/en/') ? 'en' : 'it';
};

/** L'indirizzo di una pagina nella lingua richiesta. */
export const percorso = (id: IdPagina, lingua: Lingua) =>
  pagine.find((p) => p.id === id)![lingua];

/** L'indirizzo della stessa pagina nell'altra lingua. */
export const gemella = (indirizzo: string) => {
  const p = normalizza(indirizzo);
  const lingua = linguaDa(p);
  const altra: Lingua = lingua === 'it' ? 'en' : 'it';
  const coppia = pagine.find((c) => c[lingua] === p);
  // pagina non mappata (es. 404): si torna alla home dell'altra lingua
  return coppia ? coppia[altra] : percorso('home', altra);
};

const it = {
  codice: 'it',
  altraLingua: { sigla: 'EN', etichetta: 'Passa alla versione in inglese' },

  nav: {
    home: { label: 'Home', href: percorso('home', 'it') },
    configuratore: { label: 'Configuratore', href: percorso('configuratore', 'it') },
    contatti: { label: 'Contatti', href: percorso('contatti', 'it') },
  },
  menu: { apri: 'Apri il menu', chiudi: 'Chiudi il menu', principale: 'Menu principale' },
  vaiAlContenuto: 'Vai al contenuto',

  home: {
    occhiello: 'SP Design · Tavolini da cerchi hypercar',
    titolo: 'L’anima di un’hypercar, nel tuo salotto.',
    testo: 'Cerchi di supercar trasformati in tavolini da salotto, configurati da te in ogni dettaglio.',
    esplora: 'Esplora',
    contatti: 'Contattaci',
    pausa: 'Metti in pausa il video',
    riproduci: 'Riproduci il video',
  },

  configuratore: {
    h1: 'Configuratore tavolino SP Design',
    intro: 'Scegli il cerchio, il colore, la base in legno, la forma del vetro e la posizione del logo inciso: il tavolino si aggiorna in tempo reale.',
    caricamento: 'Caricamento del configuratore',
    noscript: 'Il configuratore 3D richiede JavaScript. Scrivici dalla pagina contatti per un preventivo.',
    marchioAuto: 'Lamborghini',
    passo: 'Passo',
    di: 'di',
    passi: {
      modello: 'Modello',
      colore: 'Colore',
      base: 'Base',
      vetro: 'Vetro',
      logo: 'Logo',
      riepilogo: 'Riepilogo',
    },
    descrizioni: {
      modello: 'Il cerchio da cui nasce il tavolino.',
      colore: 'Colore e finitura della verniciatura del cerchio.',
      base: 'Essenza e tinta della base in legno.',
      vetro: 'La forma del piano in vetro.',
      logo: 'Dove incidere al laser il logo SP Design sul vetro.',
      riepilogo: 'Controlla le tue scelte e richiedi il preventivo.',
    },
    etichette: {
      colore: 'Colore',
      finitura: 'Finitura',
      essenza: 'Essenza',
      tinta: 'Tinta',
      forma: 'Forma',
      posizione: 'Posizione',
      modello: 'Modello',
      misura: 'Misura',
    },
    note: {
      soloLucidoSatinato: 'I colori metallizzati sono disponibili lucidi o satinati.',
      tintaFissa: 'Il frassino tinto nero ha una tinta unica.',
      unicoModello: 'Per ora configuriamo questo cerchio. Altri modelli in arrivo.',
    },
    avanti: 'Avanti',
    indietro: 'Indietro',
    vediRiepilogo: 'Vai al riepilogo',
    viste: {
      titolo: 'Viste',
      treQuarti: 'Tre quarti',
      alto: 'Dall’alto',
      lato: 'Laterale',
      mozzo: 'Dettaglio',
    },
    riepilogo: {
      titolo: 'La tua configurazione',
      codice: 'Codice configurazione',
      copia: 'Copia link',
      copiato: 'Link copiato',
      condividi: 'Condividi',
      preventivo: 'Richiedi preventivo',
      modifica: 'Modifica',
      prezzo: 'Prezzo su richiesta',
      misure: 'Misure indicative',
      altezza: 'Altezza',
      ingombro: 'Ingombro piano',
      condivisione: 'La mia configurazione SP Design',
    },
    pannello: { apri: 'Mostra le opzioni', chiudi: 'Nascondi le opzioni' },
    chiudi: 'Esci dal configuratore',
    trascina: 'Trascina per ruotare',
    canvas: 'Anteprima 3D del tavolino. Trascina per ruotare, scorri o pizzica per avvicinarti.',
    selezionato: 'selezionato',
    noWebgl: 'Il tuo browser non può mostrare l’anteprima 3D. Puoi comunque comporre la configurazione e richiedere il preventivo.',
    contestoPerso: 'L’anteprima 3D si è interrotta.',
    ricarica: 'Ricarica',
    errore: 'Qualcosa è andato storto nel caricare l’anteprima 3D.',
  },

  contatti: {
    occhiello: 'Contatti',
    titolo: 'Parliamo del tuo tavolino',
    testo: 'Per un preventivo, una misura particolare o un cerchio diverso da quelli del configuratore: scrivici, ti rispondiamo via email.',
    email: 'Email',
    telefono: 'Telefono',
    instagram: 'Instagram',
    sede: 'Sede',
  },

  form: {
    titolo: 'Richiedi un preventivo',
    sottotitolo: 'Compila il modulo, ti rispondiamo via email.',
    nome: 'Nome',
    cognome: 'Cognome',
    email: 'Email',
    emailSegnaposto: 'nome@email.com',
    messaggio: 'Messaggio',
    messaggioSegnaposto: 'Raccontaci il tavolino che hai in mente: ambiente, misure, tempi…',
    messaggioPreventivo: 'Buongiorno, vorrei un preventivo per il tavolino che ho configurato.',
    esca: 'Sito web',
    invia: 'Invia richiesta',
    invio: 'Invio…',
    inviato: 'Inviata',
    grazie: 'Grazie! Ti rispondiamo al più presto.',
    erroreGenerico: 'Invio non riuscito. Riprova tra poco o scrivici via email.',
    configurazione: 'La tua configurazione',
    codice: 'Codice',
    modificaConfigurazione: 'Modifica configurazione',
  },

  footer: {
    testo: 'Tavolini da salotto realizzati con cerchi di hypercar.',
    colonnaSito: 'Sito',
    diritti: 'Tutti i diritti riservati',
    marchi:
      'Lamborghini e Aventador sono marchi registrati di Automobili Lamborghini S.p.A. SP Design non è affiliata ad Automobili Lamborghini né da essa approvata.',
  },

  pagine: {
    home: {
      titolo: 'SP Design — Tavolini da cerchi hypercar',
      descrizione:
        'Tavolini da salotto realizzati con cerchi di hypercar. Configura in 3D colore del cerchio, base in legno, forma del vetro e logo inciso.',
    },
    configuratore: {
      titolo: 'Configuratore 3D — SP Design',
      descrizione:
        'Configura in tempo reale il tuo tavolino SP Design: colore e finitura del cerchio, essenza e tinta della base, forma del vetro e posizione del logo.',
    },
    contatti: {
      titolo: 'Contatti — SP Design',
      descrizione: 'Richiedi un preventivo per il tuo tavolino SP Design realizzato con un cerchio di hypercar.',
    },
    nonTrovata: {
      titolo: 'Pagina non trovata — SP Design',
      descrizione: 'La pagina che cerchi non esiste.',
      occhiello: 'Errore 404',
      h1: 'Strada sbagliata',
      testo: 'La pagina che cerchi non esiste o è stata spostata.',
      cta: 'Torna alla home',
    },
  },
};

export type Testi = typeof it;

const en = {
  codice: 'en',
  altraLingua: { sigla: 'IT', etichetta: 'Switch to the Italian version' },

  nav: {
    home: { label: 'Home', href: percorso('home', 'en') },
    configuratore: { label: 'Configurator', href: percorso('configuratore', 'en') },
    contatti: { label: 'Contact', href: percorso('contatti', 'en') },
  },
  menu: { apri: 'Open the menu', chiudi: 'Close the menu', principale: 'Main menu' },
  vaiAlContenuto: 'Skip to content',

  home: {
    occhiello: 'SP Design · Hypercar wheel tables',
    titolo: 'The soul of a hypercar, in your living room.',
    testo: 'Supercar wheels turned into coffee tables, configured by you down to the last detail.',
    esplora: 'Explore',
    contatti: 'Contact us',
    pausa: 'Pause the video',
    riproduci: 'Play the video',
  },

  configuratore: {
    h1: 'SP Design coffee table configurator',
    intro: 'Choose the wheel, the colour, the wooden base, the glass shape and where the engraved logo goes: the table updates in real time.',
    caricamento: 'Loading the configurator',
    noscript: 'The 3D configurator needs JavaScript. Write to us from the contact page for a quote.',
    marchioAuto: 'Lamborghini',
    passo: 'Step',
    di: 'of',
    passi: {
      modello: 'Model',
      colore: 'Colour',
      base: 'Base',
      vetro: 'Glass',
      logo: 'Logo',
      riepilogo: 'Summary',
    },
    descrizioni: {
      modello: 'The wheel your table is built from.',
      colore: 'Colour and finish of the wheel paint.',
      base: 'Wood species and stain of the base.',
      vetro: 'The shape of the glass top.',
      logo: 'Where to laser-engrave the SP Design logo on the glass.',
      riepilogo: 'Check your choices and request a quote.',
    },
    etichette: {
      colore: 'Colour',
      finitura: 'Finish',
      essenza: 'Wood',
      tinta: 'Stain',
      forma: 'Shape',
      posizione: 'Position',
      modello: 'Model',
      misura: 'Size',
    },
    note: {
      soloLucidoSatinato: 'Metallic colours come in gloss or satin.',
      tintaFissa: 'Black-stained ash comes in a single stain.',
      unicoModello: 'This is the wheel we configure for now. More models are coming.',
    },
    avanti: 'Next',
    indietro: 'Back',
    vediRiepilogo: 'Go to summary',
    viste: {
      titolo: 'Views',
      treQuarti: 'Three quarter',
      alto: 'Top',
      lato: 'Side',
      mozzo: 'Detail',
    },
    riepilogo: {
      titolo: 'Your configuration',
      codice: 'Configuration code',
      copia: 'Copy link',
      copiato: 'Link copied',
      condividi: 'Share',
      preventivo: 'Request a quote',
      modifica: 'Edit',
      prezzo: 'Price on request',
      misure: 'Approximate size',
      altezza: 'Height',
      ingombro: 'Top size',
      condivisione: 'My SP Design configuration',
    },
    pannello: { apri: 'Show options', chiudi: 'Hide options' },
    chiudi: 'Leave the configurator',
    trascina: 'Drag to rotate',
    canvas: '3D preview of the coffee table. Drag to rotate, scroll or pinch to zoom.',
    selezionato: 'selected',
    noWebgl: 'Your browser cannot show the 3D preview. You can still build your configuration and request a quote.',
    contestoPerso: 'The 3D preview stopped.',
    ricarica: 'Reload',
    errore: 'Something went wrong while loading the 3D preview.',
  },

  contatti: {
    occhiello: 'Contact',
    titolo: 'Let’s talk about your table',
    testo: 'For a quote, a custom size or a wheel that is not in the configurator: write to us and we will reply by email.',
    email: 'Email',
    telefono: 'Phone',
    instagram: 'Instagram',
    sede: 'Workshop',
  },

  form: {
    titolo: 'Request a quote',
    sottotitolo: 'Fill in the form and we will reply by email.',
    nome: 'First name',
    cognome: 'Last name',
    email: 'Email',
    emailSegnaposto: 'name@email.com',
    messaggio: 'Message',
    messaggioSegnaposto: 'Tell us about the table you have in mind: room, size, timing…',
    messaggioPreventivo: 'Hello, I would like a quote for the table I configured.',
    esca: 'Website',
    invia: 'Send request',
    invio: 'Sending…',
    inviato: 'Sent',
    grazie: 'Thank you! We will reply as soon as we can.',
    erroreGenerico: 'Could not send. Please try again shortly or email us.',
    configurazione: 'Your configuration',
    codice: 'Code',
    modificaConfigurazione: 'Edit configuration',
  },

  footer: {
    testo: 'Coffee tables made from hypercar wheels.',
    colonnaSito: 'Site',
    diritti: 'All rights reserved',
    marchi:
      'Lamborghini and Aventador are registered trademarks of Automobili Lamborghini S.p.A. SP Design is not affiliated with or endorsed by Automobili Lamborghini.',
  },

  pagine: {
    home: {
      titolo: 'SP Design — Hypercar wheel coffee tables',
      descrizione:
        'Coffee tables made from hypercar wheels. Configure the wheel colour, wooden base, glass shape and engraved logo in 3D.',
    },
    configuratore: {
      titolo: '3D configurator — SP Design',
      descrizione:
        'Configure your SP Design coffee table in real time: wheel colour and finish, wood and stain of the base, glass shape and logo position.',
    },
    contatti: {
      titolo: 'Contact — SP Design',
      descrizione: 'Request a quote for your SP Design coffee table made from a hypercar wheel.',
    },
    nonTrovata: {
      titolo: 'Page not found — SP Design',
      descrizione: 'The page you are looking for does not exist.',
      occhiello: 'Error 404',
      h1: 'Wrong turn',
      testo: 'The page you are looking for does not exist or has been moved.',
      cta: 'Back to home',
    },
  },
} satisfies Testi;

export const testi: Record<Lingua, Testi> = { it, en };
