/**
 * Il Canvas 3D.
 *
 * frameloop "demand": si disegna solo quando qualcosa cambia (camera che si
 * muove, colore che sfuma, …). Da fermo la GPU riposa e il telefono non scalda.
 *
 * Livelli di qualità:
 *  - alto:  pavimento riflettente, ombre accumulate, AO, bloom, MSAA 4×
 *  - basso: pavimento opaco, ombre di contatto, niente post-produzione,
 *           antialias nativo, texture 1k, risoluzione adattiva
 *  - se la scena "fatica" partendo dal livello alto: effetti alleggeriti
 */
import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { NeutralToneMapping } from 'three';
import { useConfiguratore } from '../state/store';
import { useLingua } from '../ui/hooks';
import { Tavolino } from './Tavolino';
import { COLORE_FONDO, Luci, Ombre, Pavimento } from './Studio';
import { Effetti } from './Effects';
import { CameraRig } from './CameraRig';

/** Livello di partenza: si decide prima di creare il contesto WebGL. */
export const livelloIniziale = () => {
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'low' || q === 'basso') return 'basso' as const;
  if (q === 'high' || q === 'alto') return 'alto' as const;
  const touch = matchMedia('(pointer: coarse)').matches;
  const piccolo = Math.min(screen.width, screen.height) < 820;
  const core = navigator.hardwareConcurrency ?? 8;
  const memoria = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return (touch && piccolo) || core <= 4 || memoria <= 4 ? ('basso' as const) : ('alto' as const);
};

/** Segnala "pronta" dopo i primi frame completi (texture, ombre, ambiente). */
function Pronta() {
  const segnaPronta = useConfiguratore((s) => s.segnaPronta);
  const invalidate = useThree((s) => s.invalidate);
  const frame = useRef(0);
  useEffect(() => invalidate(), [invalidate]);
  useFrame(() => {
    frame.current++;
    if (frame.current < 4) invalidate();
    else if (frame.current === 4) segnaPronta();
  });
  return null;
}

/** Dati di debug con ?debug (draw call, triangoli, texture). */
function Debug() {
  const gl = useThree((s) => s.gl);
  useFrame(() => {
    (window as Window & { __spInfo?: unknown }).__spInfo = {
      drawCall: gl.info.render.calls,
      triangoli: gl.info.render.triangles,
      geometrie: gl.info.memory.geometries,
      texture: gl.info.memory.textures,
    };
  });
  return null;
}

export function Stage() {
  const { t } = useLingua();
  const livello = useConfiguratore((s) => s.livello);
  const declassato = useConfiguratore((s) => s.declassato);
  const declassa = useConfiguratore((s) => s.declassa);
  const impostaErrore = useConfiguratore((s) => s.impostaErrore);
  const alto = livello === 'alto';
  const pieno = alto && !declassato;
  const debug = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

  return (
    <Canvas
      className="cfg-canvas"
      frameloop="demand"
      dpr={alto ? [1, 2] : [1, 1.5]}
      shadows={alto}
      camera={{ fov: 30, near: 0.05, far: 30, position: [2, 1.4, 3] }}
      gl={{ antialias: !alto, powerPreference: 'high-performance', alpha: false, stencil: false, preserveDrawingBuffer: debug }}
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping;
        gl.domElement.setAttribute('role', 'img');
        gl.domElement.setAttribute('aria-label', t.canvas);
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          impostaErrore('contestoPerso');
        });
      }}
    >
      <color attach="background" args={[COLORE_FONDO]} />
      <Luci />
      <Pavimento livello={pieno ? 'alto' : 'basso'} />
      <Suspense fallback={null}>
        <Tavolino />
        <Ombre livello={pieno ? 'alto' : 'basso'} />
        <Pronta />
      </Suspense>
      <CameraRig />
      {alto && <Effetti leggeri={declassato} />}
      {!alto && <AdaptiveDpr pixelated={false} />}
      {alto && !declassato && <PerformanceMonitor flipflops={1} onDecline={declassa} />}
      {debug && <Debug />}
    </Canvas>
  );
}
