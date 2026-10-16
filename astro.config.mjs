import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import devTools from './integrations/dev-tools.mjs';

export default defineConfig({
  // dominio provvisorio di Hostinger: da aggiornare quando c'è quello definitivo
  // (serve per hreflang e canonical; va cambiato anche SITE_URL in smtp-config.php)
  site: 'https://saddlebrown-leopard-790779.hostingersite.com',
  // Sito interamente statico: l'hosting condiviso Hostinger serve HTML e PHP,
  // non esegue Node. Il form passa da public/api/contatti.php, che finisce
  // nel build così com'è e invia via SMTP con PHPMailer. Il configuratore 3D
  // gira tutto nel browser (isola React caricata solo sulla sua pagina).
  output: 'static',
  integrations: [react(), devTools()],
  devToolbar: { enabled: false },
  vite: {
    // una sola copia di three e react, anche se qualche dipendenza ne porta un'altra
    resolve: { dedupe: ['three', 'react', 'react-dom'] },
    build: { chunkSizeWarningLimit: 1600 },
  },
});
