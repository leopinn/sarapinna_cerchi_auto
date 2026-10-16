/**
 * Strumenti che esistono SOLO durante lo sviluppo (`npm run dev`).
 *
 * 1. Rotte di servizio, mai presenti nel build:
 *    /dev/video        scena 3D usata per registrare il video della home
 *    /dev/calibrazione confronto tra il modello 3D del cerchio e le foto
 * 2. Finto endpoint POST /api/contatti.php: in locale non c'è PHP e Vite
 *    servirebbe il sorgente del file. Qui si stampa il messaggio in console
 *    e si risponde come farebbe il server vero.
 */

/** @returns {import('astro').AstroIntegration} */
export default function devTools() {
  return {
    name: 'sp-dev-tools',
    hooks: {
      'astro:config:setup': ({ command, injectRoute, updateConfig }) => {
        if (command !== 'dev') return;

        injectRoute({ pattern: '/dev/video', entrypoint: './src/dev/video.astro' });
        injectRoute({ pattern: '/dev/calibrazione', entrypoint: './src/dev/calibrazione.astro' });

        updateConfig({
          vite: {
            plugins: [
              {
                name: 'sp-finto-contatti',
                // senza "return" il middleware si registra prima di quelli di Vite e Astro
                configureServer(server) {
                  server.middlewares.use('/api/contatti.php', (req, res, next) => {
                    if (req.method !== 'POST') return next();
                    let corpo = '';
                    req.on('data', (pezzo) => (corpo += pezzo));
                    req.on('end', () => {
                      let dati = {};
                      try {
                        dati = JSON.parse(corpo || '{}');
                      } catch {
                        res.statusCode = 400;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ errore: 'JSON non valido' }));
                        return;
                      }
                      console.log('\n[finto contatti.php] messaggio ricevuto:\n', dati, '\n');
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ ok: true }));
                    });
                  });
                },
              },
            ],
          },
        });
      },
    },
  };
}
