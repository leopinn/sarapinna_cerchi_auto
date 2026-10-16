/**
 * Regia della camera.
 *  - ogni step ha la sua vista (o quella scelta coi pulsanti), raggiunta con
 *    una transizione morbida
 *  - la distanza si calcola sull'area di schermo LIBERA (accanto al pannello
 *    o sopra il bottom sheet), così il tavolino è sempre intero e centrato
 *  - setViewOffset sposta l'inquadratura senza ridimensionare il canvas
 *  - all'avvio: arrivo da lontano mentre le luci si accendono
 *  - nel riepilogo: lenta rotazione automatica, finché non si tocca
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import { gsap } from 'gsap';
import type { PerspectiveCamera } from 'three';
import { CERCHI, VETRO, mm, quote } from '../data/dimensions';
import { MODELLI, trova } from '../data/options';
import { RAGGIO_INQUADRATURA, VISTA_DEL_PASSO, VISTE, vistaLogo, type Vista } from '../data/views';
import { posizioneLogo } from '../geometry/logoPlacement';
import { PROPORZIONI_LOGO } from '../materials/canvasTextures';
import { useConfiguratore } from '../state/store';
import { riduciMovimento } from '../ui/hooks';

const DEG = Math.PI / 180;

export function CameraRig() {
  const controlli = useRef<CameraControlsImpl>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  const passo = useConfiguratore((s) => s.passo);
  const vista = useConfiguratore((s) => s.vista);
  const idVetro = useConfiguratore((s) => s.config.vetro) as keyof typeof VETRO.forme;
  const idLogo = useConfiguratore((s) => s.config.logo);
  const idCerchio = useConfiguratore((s) => trova(MODELLI, s.config.modello).rim);
  const ingombro = useConfiguratore((s) => s.ingombro);
  const pronta = useConfiguratore((s) => s.pronta);
  const impostaInterazione = useConfiguratore((s) => s.impostaInterazione);

  const scostamento = useRef({ x: 0, y: 0 });
  const introFatta = useRef(false);

  /* comandi: niente spostamento laterale, limiti di distanza e di angolo -------- */
  useEffect(() => {
    const c = controlli.current;
    if (!c) return;
    c.mouseButtons.right = CameraControlsImpl.ACTION.NONE;
    c.mouseButtons.middle = CameraControlsImpl.ACTION.DOLLY;
    c.touches.two = CameraControlsImpl.ACTION.TOUCH_DOLLY;
    c.touches.three = CameraControlsImpl.ACTION.NONE;
    const inizio = () => impostaInterazione(true);
    const fine = () => impostaInterazione(false);
    c.addEventListener('controlstart', inizio);
    c.addEventListener('controlend', fine);
    return () => {
      c.removeEventListener('controlstart', inizio);
      c.removeEventListener('controlend', fine);
    };
  }, [impostaInterazione]);

  /* inquadratura spostata dall'interfaccia (pannello / bottom sheet) ------------ */
  useEffect(() => {
    const obiettivo = { x: ingombro.destra / 2, y: (ingombro.basso - ingombro.alto) / 2 };
    const applica = () => {
      camera.setViewOffset(size.width, size.height, scostamento.current.x, scostamento.current.y, size.width, size.height);
      invalidate();
    };
    const tween = gsap.to(scostamento.current, {
      ...obiettivo,
      duration: riduciMovimento() || !introFatta.current ? 0 : 0.7,
      ease: 'power3.out',
      onUpdate: applica,
      onComplete: applica,
    });
    return () => void tween.kill();
  }, [ingombro, size.width, size.height, camera, invalidate]);

  /* vista da raggiungere ------------------------------------------------------------ */
  const calcolaVista = (): Vista => {
    const nome = vista ?? VISTA_DEL_PASSO[passo];
    if (nome !== 'logo') return VISTE[nome];
    const p = posizioneLogo(idVetro, idLogo, PROPORZIONI_LOGO);
    return vistaLogo(p.x, p.z, mm(quote(CERCHI[idCerchio]).cimaVetro));
  };

  const posizione = (v: Vista, fattore = 1) => {
    const vFov = camera.fov * DEG;
    const liberoL = Math.max(1, size.width - ingombro.destra);
    const liberoA = Math.max(1, size.height - ingombro.basso - ingombro.alto);
    const t = Math.tan(vFov / 2) / size.height;
    const fov = Math.min(2 * Math.atan(t * liberoA), 2 * Math.atan(t * liberoL));
    const d = (v.k * fattore * RAGGIO_INQUADRATURA) / Math.sin(fov / 2);
    const a = v.azimut * DEG;
    const p = v.polare * DEG;
    const [mx, my, mz] = v.mira;
    return [mx + d * Math.sin(p) * Math.sin(a), my + d * Math.cos(p), mz + d * Math.sin(p) * Math.cos(a), mx, my, mz] as const;
  };

  useEffect(() => {
    const c = controlli.current;
    if (!c) return;
    const v = calcolaVista();
    if (!pronta) {
      // prima che la scena sia pronta: già nella posizione di partenza dell'intro
      const partenza = { ...v, azimut: v.azimut - 50, polare: 78 };
      void c.setLookAt(...posizione(partenza, 2.1), false);
      return;
    }
    const intro = !introFatta.current;
    introFatta.current = true;
    const animato = !riduciMovimento();
    c.smoothTime = intro ? 1.1 : 0.6;
    void c.setLookAt(...posizione(v), animato).then(() => {
      c.smoothTime = 0.6;
    });
    if (intro && animato) {
      scene.environmentIntensity = 0.1;
      gsap.to(scene, { environmentIntensity: 1, duration: 2, ease: 'power2.out', onUpdate: invalidate });
    }
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passo, vista, idVetro, idLogo, pronta, size.width, size.height, ingombro]);

  /* riepilogo: rotazione lenta finché il cliente non tocca ------------------------ */
  useFrame((_, delta) => {
    const s = useConfiguratore.getState();
    const c = controlli.current;
    if (!c || !s.pronta || s.passo !== 'riepilogo' || s.interazione || riduciMovimento()) return;
    void c.rotate(Math.min(delta, 0.05) * 0.14, 0, false);
    invalidate();
  });

  return (
    <CameraControls
      ref={controlli}
      makeDefault
      minDistance={0.3}
      maxDistance={4}
      minPolarAngle={0}
      maxPolarAngle={86 * DEG}
      smoothTime={0.6}
      draggingSmoothTime={0.12}
      dollySpeed={0.6}
      azimuthRotateSpeed={0.8}
      polarRotateSpeed={0.8}
    />
  );
}
