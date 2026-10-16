/**
 * Collega la schermata di caricamento statica (#cfg-boot, nell'HTML) allo
 * stato della scena: avanzamento reale delle texture e uscita in dissolvenza
 * quando il tavolino è pronto. Imposta window.__spReady per i test.
 */
import { useEffect } from 'react';
import { useProgress } from '@react-three/drei';
import { gsap } from 'gsap';
import { useConfiguratore } from '../state/store';
import { riduciMovimento } from './hooks';

export function Caricamento() {
  const pronta = useConfiguratore((s) => s.pronta);
  const errore = useConfiguratore((s) => s.erroreGrafica);
  const progresso = useProgress((s) => s.progress);

  useEffect(() => {
    const corsa = document.getElementById('cfg-boot-corsa');
    if (!corsa || progresso <= 0) return;
    corsa.classList.add('is-misurata');
    // le texture sono gran parte del lavoro, poi restano geometria e ombre
    corsa.style.setProperty('--avanzamento', String(Math.min(0.92, (progresso / 100) * 0.92)));
  }, [progresso]);

  useEffect(() => {
    if (!pronta && errore === 'nessuno') return;
    const boot = document.getElementById('cfg-boot');
    const fine = () => {
      boot?.remove();
      (window as Window & { __spReady?: boolean }).__spReady = true;
      document.documentElement.classList.add('cfg-pronto');
    };
    if (!boot) return fine();
    document.getElementById('cfg-boot-corsa')?.style.setProperty('--avanzamento', '1');
    if (riduciMovimento()) return fine();
    const tl = gsap.timeline({ onComplete: fine });
    tl.to(boot.querySelector('.boot__centro'), { opacity: 0, y: -12, duration: 0.45, ease: 'power2.in', delay: 0.25 });
    tl.to(boot, { opacity: 0, duration: 0.7, ease: 'power2.out' }, '-=0.1');
    return () => void tl.kill();
  }, [pronta, errore]);

  return null;
}
