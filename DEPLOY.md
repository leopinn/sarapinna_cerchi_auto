# Deploy su Hostinger (hosting condiviso)

Il piano Hostinger serve HTML e PHP, ma **non esegue Node**. Di conseguenza:

- il sito è **statico** (`output: 'static'`), compilato in locale;
- il configuratore 3D gira tutto nel browser;
- il form di contatto passa da **`public/api/contatti.php`**, che invia via SMTP con PHPMailer
  (incluso in `public/api/lib/`) e legge `api/opzioni.json` per il riepilogo della configurazione.

Due rami:

| Ramo | Contenuto | Chi lo scrive |
|---|---|---|
| `main` | i sorgenti | tu, con `git push` |
| `deploy` | il sito compilato (contenuto di `dist/`) | `npm run pubblica` |

Hostinger clona **`deploy`** dentro `public_html`.

## ⚠️ Prima di tutto: il repository

Questo progetto è nato come copia del sito di un altro cliente e `origin` punta ancora al suo
repository. Per sicurezza:

- il **push verso origin è disattivato** (`git remote set-url --push origin DISABLED`);
- `npm run pubblica` **si rifiuta di partire** finché la variabile `SP_DEPLOY_REMOTE` non
  coincide con l'URL di `origin`.

Quando esiste il repository di SP Design:

```bash
git remote set-url origin https://github.com/leopinn/sarapinna_cerchi_auto.git
git remote set-url --push origin https://github.com/leopinn/sarapinna_cerchi_auto.git
```

Consiglio: ripartire con una storia pulita (la vecchia contiene file e foto dell'altro sito):

```bash
git checkout --orphan main-sp
git add -A && git commit -m "SP Design: primo commit"
git branch -M main-sp main
git push -u origin main
```

## Configurazione iniziale (una volta sola)

### 1. Credenziali SMTP sul server
Le credenziali NON stanno in Git. Dal File Manager crea **`smtp-config.php`** nella cartella del
dominio, **fuori da `public_html`**, copiando `smtp-config.esempio.php`:

```php
<?php
return [
    'SMTP_HOST' => 'smtp.hostinger.com',
    'SMTP_PORT' => '465',
    'SMTP_USER' => 'info@<dominio>',
    'SMTP_PASS' => 'la password della casella',
    'MAIL_FROM' => 'info@<dominio>',
    'MAIL_FROM_NOME' => 'Sito SP Design',
    'MAIL_TO' => 'info@<dominio>',
    'SITE_URL' => 'https://www.<dominio>',
];
```

I file `.env` e `smtp-config.php` presenti nella cartella del progetto appartengono al vecchio
sito: **non vanno usati** per SP Design.

### 2. hPanel → Avanzate → GIT
- Repository: quello di SP Design
- **Branch: `deploy`**
- Directory: `public_html` (vuota prima del primo clone)

### 3. Prova
Configura un tavolino, premi "Richiedi preventivo", compila il form: deve arrivare la mail con
il riepilogo della configurazione e l'auto-risposta al cliente.

## Ogni aggiornamento del sito

```bash
git push
# PowerShell:  $env:SP_DEPLOY_REMOTE = (git remote get-url origin)
npm run pubblica        # verifica il repository, compila, aggiorna il ramo deploy
```

Poi in hPanel: **GIT → Deploy** (o webhook automatico).

## Se qualcosa non va

- **"Pubblicazione BLOCCATA"**: è la protezione descritta sopra: imposta `SP_DEPLOY_REMOTE`.
- **Il form risponde 500 "SMTP non configurato"**: manca `smtp-config.php` accanto a `public_html`.
- **Errore SMTP**: se la porta 465 è bloccata usa `'SMTP_PORT' => '587'` (STARTTLS).
- **Le mail arrivano senza riepilogo leggibile** (solo il codice): manca `api/opzioni.json`
  nel deploy — viene generato da `npm run build`.
- **Il video della home non parte su iPhone**: controlla che `.htaccess` sia stato copiato (tipi
  MIME per `.webm`/`.mp4`).
- **Le mail finiscono in spam**: record SPF e DKIM nel DNS del dominio.
- **"Troppi invii ravvicinati"**: rate limit di 3 invii ogni 10 minuti per IP, in cima a
  `public/api/contatti.php`.
