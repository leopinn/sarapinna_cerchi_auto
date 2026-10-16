<?php
/**
 * BACKEND — endpoint del form di contatto di SP Design (hosting condiviso PHP).
 *
 * Invia le mail via SMTP dalla casella Hostinger, senza servizi terzi.
 * Le credenziali NON stanno qui: vanno in smtp-config.php, fuori dalla
 * cartella pubblica. Vedi smtp-config.esempio.php.
 *
 * Se la richiesta arriva dal configuratore contiene anche il codice della
 * configurazione (es. 1-A1-NR-LU-AB-NA-RO-AN): lo si traduce in un riepilogo
 * leggibile con opzioni.json, generato dal build accanto a questo file.
 * Le etichette mandate dal browser non vengono mai usate.
 */

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

require __DIR__ . '/lib/Exception.php';
require __DIR__ . '/lib/PHPMailer.php';
require __DIR__ . '/lib/SMTP.php';

const MARCHIO = 'SP Design';
const LIMITE_INVII = 3;              // per IP
const FINESTRA_SECONDI = 600;        // in 10 minuti
const LUNGHEZZA_MAX_MESSAGGIO = 5000;
const FORMATO_CODICE = '/^[A-Za-z0-9-]{3,64}$/';

/**
 * Messaggi nelle due lingue del sito. La lingua arriva dal form nel campo
 * "lingua"; se manca o non e' prevista si resta in italiano.
 */
const MESSAGGI = [
    'it' => [
        'metodo'        => 'Metodo non consentito',
        'smtp'          => 'SMTP non configurato sul server',
        'corpo'         => 'Corpo della richiesta non valido',
        'obbligatori'   => 'Compila tutti i campi obbligatori',
        'emailNonValida' => 'Indirizzo email non valido',
        'troppoLungo'   => 'Messaggio troppo lungo',
        'campiNonValidi' => 'Campi non validi',
        'troppiInvii'   => 'Troppi invii ravvicinati. Riprova tra qualche minuto.',
        'invioFallito'  => 'Invio non riuscito',
        'oggetto'       => 'Abbiamo ricevuto la tua richiesta',
        'saluto'        => 'Ciao',
        'corpoConferma' => 'grazie per averci scritto: abbiamo ricevuto la tua richiesta e ti rispondiamo al più presto.',
        'etichettaConfig' => 'La configurazione che hai scelto:',
        'etichettaCopia' => 'Il messaggio che ci hai inviato:',
        'codice'        => 'Codice',
        'apri'          => 'Riapri la configurazione',
        'firma'         => 'A presto,',
    ],
    'en' => [
        'metodo'        => 'Method not allowed',
        'smtp'          => 'SMTP is not configured on the server',
        'corpo'         => 'Invalid request body',
        'obbligatori'   => 'Please fill in all the required fields',
        'emailNonValida' => 'Invalid email address',
        'troppoLungo'   => 'Message too long',
        'campiNonValidi' => 'Invalid fields',
        'troppiInvii'   => 'Too many messages in a short time. Please try again in a few minutes.',
        'invioFallito'  => 'Could not send the message',
        'oggetto'       => 'We received your request',
        'saluto'        => 'Hi',
        'corpoConferma' => 'thank you for writing to us: we have received your request and will reply as soon as we can.',
        'etichettaConfig' => 'The configuration you chose:',
        'etichettaCopia' => 'The message you sent us:',
        'codice'        => 'Code',
        'apri'          => 'Open the configuration again',
        'firma'         => 'Best regards,',
    ],
];

header('Content-Type: application/json; charset=utf-8');

// La lingua serve gia' per il primo errore, quindi si legge il corpo prima.
$corpoGrezzo = (string) file_get_contents('php://input');
$datiGrezzi  = json_decode($corpoGrezzo, true);
$lingua = is_array($datiGrezzi) ? (string) ($datiGrezzi['lingua'] ?? 'it') : 'it';
if (!array_key_exists($lingua, MESSAGGI)) {
    $lingua = 'it';
}
$m = MESSAGGI[$lingua];

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    rispondi(['errore' => $m['metodo']], 405);
}

$config = caricaConfig();
if ($config['SMTP_USER'] === '' || $config['SMTP_PASS'] === '') {
    error_log('[contatti] credenziali SMTP mancanti: manca smtp-config.php?');
    rispondi(['errore' => $m['smtp']], 500);
}

$dati = $datiGrezzi;
if (!is_array($dati)) {
    rispondi(['errore' => $m['corpo']], 400);
}

$nome      = trim((string) ($dati['nome'] ?? ''));
$cognome   = trim((string) ($dati['cognome'] ?? ''));
$email     = trim((string) ($dati['email'] ?? ''));
$messaggio = trim((string) ($dati['messaggio'] ?? ''));
$codice    = trim((string) ($dati['configurazione'] ?? ''));
$esca      = trim((string) ($dati['sito'] ?? ''));

// Honeypot: se il campo nascosto "sito" è compilato, è un bot.
// Rispondiamo ok per non dargli segnali, ma non inviamo nulla.
if ($esca !== '') {
    rispondi(['ok' => true]);
}

if ($nome === '' || $cognome === '' || $email === '' || $messaggio === '') {
    rispondi(['errore' => $m['obbligatori']], 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    rispondi(['errore' => $m['emailNonValida']], 422);
}
if (mb_strlen($messaggio) > LUNGHEZZA_MAX_MESSAGGIO) {
    rispondi(['errore' => $m['troppoLungo']], 422);
}
// Niente a capo nei campi che finiscono nell'intestazione: evita header injection.
if (preg_match('/[\r\n]/', $nome . $cognome . $email)) {
    rispondi(['errore' => $m['campiNonValidi']], 422);
}
// Il codice configurazione è facoltativo, ma se c'è deve essere ben formato.
if ($codice !== '' && !preg_match(FORMATO_CODICE, $codice)) {
    rispondi(['errore' => $m['campiNonValidi']], 422);
}

if (troppiInvii(indirizzoIp())) {
    rispondi(['errore' => $m['troppiInvii']], 429);
}

$nomeCompleto = $nome . ' ' . $cognome;
$sito = rtrim($config['SITE_URL'], '/');
$righeIt = $codice !== '' ? riepilogoConfigurazione($codice, 'it') : [];
$righeCliente = $codice !== '' ? riepilogoConfigurazione($codice, $lingua) : [];
$linkConfig = ($codice !== '' && $sito !== '')
    ? $sito . ($lingua === 'en' ? '/en/configurator' : '/configuratore') . '?c=' . rawurlencode($codice)
    : '';

// 1) La richiesta a SP Design (sempre in italiano). Reply-To: rispondendo si scrive al cliente.
try {
    $posta = nuovoMailer($config);
    $posta->setFrom($config['MAIL_FROM'], $config['MAIL_FROM_NOME']);
    $posta->addAddress($config['MAIL_TO']);
    $posta->addReplyTo($email, $nomeCompleto);
    $posta->Subject = ($codice !== '' ? 'Richiesta preventivo — ' : 'Nuova richiesta dal sito — ') . $nomeCompleto;
    $posta->isHTML(true);
    $posta->Body = '
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#1c1c1c">
          <p style="margin:0 0 16px"><strong>' . ($codice !== '' ? 'Richiesta di preventivo dal configuratore' : 'Nuova richiesta dal sito') . '</strong></p>
          <p style="margin:0 0 4px"><strong>Nome:</strong> ' . esc($nomeCompleto) . '</p>
          <p style="margin:0 0 4px"><strong>Email:</strong> <a href="mailto:' . esc($email) . '">' . esc($email) . '</a></p>
          <p style="margin:0 0 16px"><strong>Lingua:</strong> ' . esc($lingua) . '</p>
          ' . tabellaRiepilogo($righeIt, $codice, 'Codice', $linkConfig, 'Apri la configurazione') . '
          <div style="border-left:2px solid #c8a45d;padding-left:16px;white-space:pre-wrap">' . esc($messaggio) . '</div>
        </div>';
    $posta->AltBody = "Nome: {$nomeCompleto}\nEmail: {$email}\nLingua: {$lingua}\n\n"
        . testoRiepilogo($righeIt, $codice, 'Codice', $linkConfig)
        . "{$messaggio}\n";
    $posta->send();
} catch (PHPMailerException $e) {
    error_log('[contatti] invio fallito: ' . $e->getMessage());
    rispondi(['errore' => $m['invioFallito']], 502);
}

// 2) Auto-risposta al cliente. Se fallisce, la richiesta è comunque arrivata.
try {
    $conferma = nuovoMailer($config);
    $conferma->setFrom($config['MAIL_FROM'], MARCHIO);
    $conferma->addAddress($email, $nomeCompleto);
    $conferma->addReplyTo($config['MAIL_TO'], MARCHIO);
    $conferma->Subject = $m['oggetto'] . ' — ' . MARCHIO;
    $conferma->isHTML(true);
    $firmaSito = $sito !== '' ? '<br /><a href="' . esc($sito) . '" style="color:#6b6b6b">' . esc(preg_replace('#^https?://#', '', $sito)) . '</a>' : '';
    $conferma->Body = '
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#1c1c1c">
          <p style="margin:0 0 16px">' . esc($m['saluto']) . ' ' . esc($nome) . ',</p>
          <p style="margin:0 0 16px">' . esc($m['corpoConferma']) . '</p>
          ' . ($codice !== '' ? '<p style="margin:0 0 8px;color:#6b6b6b;font-size:13px">' . esc($m['etichettaConfig']) . '</p>' . tabellaRiepilogo($righeCliente, $codice, $m['codice'], $linkConfig, $m['apri']) : '') . '
          <p style="margin:0 0 8px;color:#6b6b6b;font-size:13px">' . esc($m['etichettaCopia']) . '</p>
          <div style="border-left:2px solid #c8a45d;padding-left:16px;white-space:pre-wrap;color:#4a4a4a">' . esc($messaggio) . '</div>
          <p style="margin:24px 0 0">' . esc($m['firma']) . '<br /><strong>' . MARCHIO . '</strong>' . $firmaSito . '</p>
        </div>';
    $conferma->AltBody = "{$m['saluto']} {$nome},\n\n"
        . "{$m['corpoConferma']}\n\n"
        . ($codice !== '' ? $m['etichettaConfig'] . "\n" . testoRiepilogo($righeCliente, $codice, $m['codice'], $linkConfig) : '')
        . "{$m['etichettaCopia']}\n\n{$messaggio}\n\n"
        . "{$m['firma']}\n" . MARCHIO . "\n" . ($sito !== '' ? $sito . "\n" : '');
    $conferma->send();
} catch (PHPMailerException $e) {
    error_log('[contatti] auto-risposta fallita: ' . $e->getMessage());
}

rispondi(['ok' => true]);

// --- Funzioni ---------------------------------------------------------------

/**
 * Traduce il codice configurazione in righe [etichetta, valore] usando
 * opzioni.json (stessa fonte del configuratore). Segmenti sconosciuti: "—".
 * Se il file manca si restituisce un elenco vuoto (resta il codice grezzo).
 *
 * @return array<int, array{0:string,1:string}>
 */
function riepilogoConfigurazione(string $codice, string $lingua): array
{
    static $opzioni = null;
    if ($opzioni === null) {
        $json = @file_get_contents(__DIR__ . '/opzioni.json');
        $opzioni = $json !== false ? json_decode($json, true) : false;
    }
    if (!is_array($opzioni) || !isset($opzioni['ordine'], $opzioni['campi'], $opzioni['etichette'])) {
        return [];
    }
    $parti = explode('-', strtoupper($codice));
    $versione = array_shift($parti);
    if ($versione !== (string) ($opzioni['versione'] ?? '')) {
        return [];
    }
    $righe = [];
    foreach ($opzioni['ordine'] as $i => $campo) {
        $etichetta = (string) ($opzioni['etichette'][$campo][$lingua] ?? $campo);
        $voce = $opzioni['campi'][$campo][$parti[$i] ?? ''][$lingua] ?? '—';
        $righe[] = [$etichetta, (string) $voce];
    }
    return $righe;
}

/** @param array<int, array{0:string,1:string}> $righe */
function tabellaRiepilogo(array $righe, string $codice, string $etichettaCodice, string $link, string $etichettaLink): string
{
    if ($codice === '') {
        return '';
    }
    $html = '<table style="border-collapse:collapse;margin:0 0 16px;font-size:14px">';
    foreach ($righe as [$etichetta, $valore]) {
        $html .= '<tr><td style="padding:4px 16px 4px 0;color:#6b6b6b">' . esc($etichetta) . '</td><td style="padding:4px 0"><strong>' . esc($valore) . '</strong></td></tr>';
    }
    $html .= '<tr><td style="padding:4px 16px 4px 0;color:#6b6b6b">' . esc($etichettaCodice) . '</td><td style="padding:4px 0;font-family:monospace">' . esc($codice) . '</td></tr>';
    $html .= '</table>';
    if ($link !== '') {
        $html .= '<p style="margin:0 0 16px"><a href="' . esc($link) . '" style="color:#8e7238">' . esc($etichettaLink) . '</a></p>';
    }
    return $html;
}

/** @param array<int, array{0:string,1:string}> $righe */
function testoRiepilogo(array $righe, string $codice, string $etichettaCodice, string $link): string
{
    if ($codice === '') {
        return '';
    }
    $testo = '';
    foreach ($righe as [$etichetta, $valore]) {
        $testo .= "{$etichetta}: {$valore}\n";
    }
    $testo .= "{$etichettaCodice}: {$codice}\n";
    if ($link !== '') {
        $testo .= "{$link}\n";
    }
    return $testo . "\n";
}

function nuovoMailer(array $config): PHPMailer
{
    $posta = new PHPMailer(true);
    $posta->isSMTP();
    $posta->Host = $config['SMTP_HOST'];
    $posta->Port = (int) $config['SMTP_PORT'];
    // 465 = TLS implicito, 587 = STARTTLS
    $posta->SMTPSecure = ((int) $config['SMTP_PORT'] === 465)
        ? PHPMailer::ENCRYPTION_SMTPS
        : PHPMailer::ENCRYPTION_STARTTLS;
    $posta->SMTPAuth = true;
    $posta->Username = $config['SMTP_USER'];
    $posta->Password = $config['SMTP_PASS'];
    $posta->CharSet = PHPMailer::CHARSET_UTF8;
    $posta->Timeout = 20;
    return $posta;
}

/**
 * Le credenziali stanno fuori dalla cartella pubblica: un file .php lì dentro
 * sarebbe scaricabile se il server smettesse di interpretare PHP.
 */
function caricaConfig(): array
{
    $predefinito = [
        'SMTP_HOST' => 'smtp.hostinger.com',
        'SMTP_PORT' => '465',
        'SMTP_USER' => '',
        'SMTP_PASS' => '',
        'MAIL_FROM' => '',
        'MAIL_FROM_NOME' => 'Sito ' . MARCHIO,
        'MAIL_TO' => '',
        'SITE_URL' => '',
    ];

    $config = [];
    foreach ($predefinito as $chiave => $valore) {
        $daAmbiente = getenv($chiave);
        $config[$chiave] = ($daAmbiente !== false && $daAmbiente !== '') ? $daAmbiente : $valore;
    }

    $radice = $_SERVER['DOCUMENT_ROOT'] ?? __DIR__;
    $candidati = [
        getenv('SMTP_CONFIG') ?: '',
        dirname($radice) . '/smtp-config.php',        // accanto a public_html
        dirname($radice, 2) . '/smtp-config.php',
        __DIR__ . '/../../smtp-config.php',
    ];
    foreach ($candidati as $percorso) {
        if ($percorso !== '' && is_readable($percorso)) {
            $daFile = require $percorso;
            if (is_array($daFile)) {
                $config = array_merge($config, array_filter($daFile, 'strlen'));
            }
            break;
        }
    }

    if ($config['MAIL_FROM'] === '') {
        $config['MAIL_FROM'] = $config['SMTP_USER'];
    }
    if ($config['MAIL_TO'] === '') {
        $config['MAIL_TO'] = $config['SMTP_USER'];
    }

    return $config;
}

function indirizzoIp(): string
{
    $inoltrato = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($inoltrato !== '') {
        return trim(explode(',', $inoltrato)[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'sconosciuto';
}

function troppiInvii(string $ip): bool
{
    $cartella = sys_get_temp_dir() . '/contatti-spdesign';
    if (!is_dir($cartella) && !@mkdir($cartella, 0700, true) && !is_dir($cartella)) {
        return false; // senza spazio scrivibile non blocchiamo nessuno
    }

    $file = $cartella . '/' . sha1($ip) . '.json';
    $ora = time();
    $recenti = [];
    if (is_readable($file)) {
        $salvati = json_decode((string) @file_get_contents($file), true);
        if (is_array($salvati)) {
            $recenti = array_values(array_filter(
                $salvati,
                static fn ($t) => is_int($t) && ($ora - $t) < FINESTRA_SECONDI
            ));
        }
    }

    if (count($recenti) >= LIMITE_INVII) {
        @file_put_contents($file, json_encode($recenti), LOCK_EX);
        return true;
    }

    $recenti[] = $ora;
    @file_put_contents($file, json_encode($recenti), LOCK_EX);
    return false;
}

function esc(string $valore): string
{
    return htmlspecialchars($valore, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** @param array<string,mixed> $corpo */
function rispondi(array $corpo, int $stato = 200): void
{
    http_response_code($stato);
    echo json_encode($corpo, JSON_UNESCAPED_UNICODE);
    exit;
}
