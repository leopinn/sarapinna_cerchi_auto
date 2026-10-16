/**
 * Lo "showroom": illuminazione ad immagine generata in scena con dei pannelli
 * luminosi (Lightformer, niente file HDR da scaricare), pavimento scuro e
 * ombre morbide. Il nero lucido si vede solo attraverso i riflessi: le strisce
 * di luce sono quello che disegna razze, canale e bordo del vetro.
 */
import { useMemo } from 'react';
import { AccumulativeShadows, ContactShadows, Environment, Lightformer, MeshReflectorMaterial, RandomizedLight } from '@react-three/drei';
import { AdditiveBlending, CanvasTexture } from 'three';
import type { Livello } from '../state/store';

export const COLORE_FONDO = '#0a0a0b';

export function Luci() {
  return (
    <Environment resolution={512} frames={1}>
      <color attach="background" args={['#050506']} />
      {/* softbox alta e arretrata: la lunga luce su faccia e vetro, ma non a piombo
          (vista dall'alto il nero lucido resterebbe grigio) */}
      <Lightformer form="rect" intensity={1.7} position={[0, 3.2, -2.2]} scale={[3.4, 0.6, 1]} target={[0, 0, 0]} />
      {/* piccola luce di taglio dall'alto, per far brillare gli spigoli delle razze */}
      <Lightformer form="rect" intensity={0.8} position={[1.6, 3.6, 1.2]} scale={[0.3, 2.2, 1]} target={[0, 0, 0]} />
      {/* riempimento basso frontale: illumina il fianco della base in legno */}
      <Lightformer form="rect" intensity={0.7} position={[0.6, 0.35, 3.4]} scale={[4, 0.8, 1]} target={[0, 0.05, 0]} />
      {/* due strisce verticali ai lati: le filettature di luce sul canale */}
      <Lightformer form="rect" intensity={3} position={[-4, 1.2, 1]} rotation-y={Math.PI / 2} scale={[0.4, 6, 1]} />
      <Lightformer form="rect" intensity={3} position={[4, 1.2, 1]} rotation-y={-Math.PI / 2} scale={[0.4, 6, 1]} />
      {/* fondale: stacca la sagoma dal nero */}
      <Lightformer form="rect" intensity={0.9} position={[0, 1.5, -5]} scale={[10, 2, 1]} />
      {/* striscia sottile dietro, più alta della camera: la linea di luce riflessa
          solo sul bordo lontano del vetro (alla stessa altezza velerebbe tutto il piano) */}
      <Lightformer form="rect" intensity={1.6} position={[0, 3.1, -4.2]} scale={[7, 0.2, 1]} target={[0, 0.3, 0]} />
      {/* accento oro basso, il colore del marchio nei riflessi */}
      <Lightformer form="rect" color="#C8A45D" intensity={0.55} position={[2.4, 0.4, 3]} scale={[3, 0.5, 1]} target={[0, 0, 0]} />
      {/* anello: scintillio sul trasparente */}
      <Lightformer form="ring" intensity={1.6} position={[-3, 3, -3]} scale={1.4} target={[0, 0, 0]} />
    </Environment>
  );
}

/**
 * Pozza di luce sul pavimento: un disco sfumato in fusione additiva. Una luce
 * vera (spot) farebbe lo stesso effetto ma lascerebbe un riflesso bianco sul
 * mozzo e sul vetro.
 */
function PozzaDiLuce() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new CanvasTexture(c);
  }, []);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.0004} renderOrder={1}>
      <planeGeometry args={[2.6, 2.6]} />
      <meshBasicMaterial map={texture} color="#fff8f0" transparent opacity={0.06} blending={AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

export function Pavimento({ livello }: { livello: Livello }) {
  return (
    <>
      <fog attach="fog" args={[COLORE_FONDO, 3.2, 9]} />
      <PozzaDiLuce />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[40, 40]} />
        {livello === 'alto' ? (
          <MeshReflectorMaterial
            resolution={1024}
            blur={[400, 120]}
            mixBlur={1}
            mixStrength={6}
            mixContrast={1}
            depthScale={1.1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.3}
            color="#0b0b0c"
            metalness={0.1}
            roughness={0.85}
            envMapIntensity={0.18}
            mirror={0}
          />
        ) : (
          <meshStandardMaterial color="#0b0b0c" roughness={0.88} metalness={0} envMapIntensity={0.2} />
        )}
      </mesh>
    </>
  );
}

/** Ombre sul pavimento: vanno montate insieme al tavolino (stessa Suspense). */
export function Ombre({ livello }: { livello: Livello }) {
  if (livello === 'alto') {
    return (
      <AccumulativeShadows temporal={false} frames={80} alphaTest={0.85} opacity={0.92} scale={2.6} position={[0, 0.0008, 0]} color="#000000">
        <RandomizedLight amount={8} radius={0.55} ambient={0.45} intensity={1.2} position={[0.8, 3, 0.9]} bias={0.0008} mapSize={1024} />
      </AccumulativeShadows>
    );
  }
  return <ContactShadows position={[0, 0.0008, 0]} scale={2.2} blur={2.6} opacity={0.85} far={0.6} resolution={512} frames={1} color="#000000" />;
}
