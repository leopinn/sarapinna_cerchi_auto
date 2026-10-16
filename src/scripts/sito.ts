/**
 * Comportamenti comuni a tutte le pagine (escluso il configuratore 3D, che ha
 * la sua isola React): nav, menu mobile, video della home, animazioni GSAP.
 * Si anima solo transform e opacity.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
CustomEase.create('molla', 'M0,0 C0.22,1.2 0.36,1 1,1');

const riduciMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------------------
   Cambio lingua: conserva la query (es. ?c= con la configurazione)
   ------------------------------------------------------------------------- */
document.querySelectorAll<HTMLAnchorElement>('[data-lang-switch]').forEach((a) => {
  a.addEventListener('click', () => {
    if (location.search) a.href = a.pathname + location.search + location.hash;
  });
});

/* ---------------------------------------------------------------------------
   Nav: fondo che compare dopo l'hero
   ------------------------------------------------------------------------- */
const nav = document.querySelector<HTMLElement>('[data-nav]');
if (nav?.dataset.trasparente === 'true') {
  const aggiorna = () => nav.classList.toggle('is-scorsa', window.scrollY > 24);
  window.addEventListener('scroll', aggiorna, { passive: true });
  aggiorna();
}

/* ---------------------------------------------------------------------------
   Menu mobile
   ------------------------------------------------------------------------- */
const burger = document.querySelector<HTMLButtonElement>('[data-burger]');
const menu = document.querySelector<HTMLElement>('[data-menu]');
if (burger && menu) {
  const voci = menu.querySelectorAll<HTMLElement>('[data-menu-voce]');
  let aperto = false;

  const imposta = (apri: boolean) => {
    aperto = apri;
    burger.setAttribute('aria-expanded', String(apri));
    burger.setAttribute('aria-label', (apri ? burger.dataset.labelChiudi : burger.dataset.labelApri) ?? '');
    document.documentElement.style.overflow = apri ? 'hidden' : '';
    nav?.classList.toggle('is-scorsa', apri || window.scrollY > 24);

    if (apri) {
      menu.hidden = false;
      if (riduciMovimento) return;
      gsap.fromTo(menu, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      gsap.fromTo(voci, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'molla', delay: 0.05 });
    } else if (riduciMovimento) {
      menu.hidden = true;
    } else {
      gsap.to(menu, { opacity: 0, duration: 0.22, ease: 'power2.in', onComplete: () => void (menu.hidden = true) });
    }
  };

  burger.addEventListener('click', () => imposta(!aperto));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && aperto) {
      imposta(false);
      burger.focus();
    }
  });
  // se si allarga la finestra col menu aperto, si chiude
  window.matchMedia('(min-width: 761px)').addEventListener('change', (e) => e.matches && aperto && imposta(false));
}

/* ---------------------------------------------------------------------------
   Video della home: entra in dissolvenza, si ferma fuori schermo,
   bottone pausa (WCAG 2.2.2), niente autoplay con movimento ridotto
   ------------------------------------------------------------------------- */
const video = document.querySelector<HTMLVideoElement>('[data-hero-video]');
const pausa = document.querySelector<HTMLButtonElement>('[data-hero-pausa]');
if (video) {
  let fermatoDaUtente = riduciMovimento;
  const segnaPausa = (inPausa: boolean) => {
    if (!pausa) return;
    pausa.setAttribute('aria-pressed', String(inPausa));
    pausa.setAttribute('aria-label', (inPausa ? pausa.dataset.labelRiproduci : pausa.dataset.labelPausa) ?? '');
  };

  video.addEventListener('playing', () => video.classList.add('is-in-riproduzione'));
  if (riduciMovimento) {
    video.removeAttribute('autoplay');
    video.pause();
    segnaPausa(true);
  }

  pausa?.addEventListener('click', () => {
    fermatoDaUtente = !video.paused;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
    segnaPausa(fermatoDaUtente);
  });

  new IntersectionObserver(([voce]) => {
    if (fermatoDaUtente) return;
    if (voce.isIntersecting) void video.play().catch(() => {});
    else video.pause();
  }).observe(video);
}

/* ---------------------------------------------------------------------------
   Animazioni d'ingresso
   ------------------------------------------------------------------------- */
const rivela = (el: Element | Element[]) => gsap.set(el, { opacity: 1, y: 0, clearProps: 'transform' });

const titoloHero = document.querySelector<HTMLElement>('[data-hero-titolo]');
const elementiHero = document.querySelectorAll<HTMLElement>('[data-reveal-hero]');

if (riduciMovimento) {
  if (titoloHero) gsap.set(titoloHero, { opacity: 1 });
  rivela([...elementiHero]);
  rivela([...document.querySelectorAll('[data-reveal]')]);
} else {
  const tl = gsap.timeline({ defaults: { ease: 'molla' }, delay: 0.15 });

  if (titoloHero) {
    // si aspettano i font: SplitText deve misurare le righe con il font vero
    void document.fonts.ready.then(() => {
      const split = SplitText.create(titoloHero, { type: 'lines', mask: 'lines', linesClass: 'riga' });
      gsap.set(titoloHero, { opacity: 1 });
      tl.from(split.lines, { yPercent: 110, duration: 1.1, stagger: 0.09 }, 0);
    });
  }
  if (elementiHero.length) {
    tl.to(elementiHero, { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 0.35);
  }

  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (lotto) => gsap.to(lotto, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'molla' }),
  });
}
