/**
 * Scena per registrare il video della home (SOLO SVILUPPO: /dev/video).
 *
 * frameloop "never": i fotogrammi li chiede lo script di registrazione con
 * window.__spVideo.renderFrame(t), uno alla volta, a tempo fisso. Così il
 * video è identico a ogni rendering e non dipende dalla velocità della GPU.
 *
 * Parametri: ?w=1920&h=1080 (dimensioni), ?t=3 (mostra subito il tempo t).
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, advance, useLoader, useThree } from '@react-three/fiber';
import { AccumulativeShadows, Environment, Lightformer, RandomizedLight, useEnvironment } from '@react-three/drei';
import { Bloom, DepthOfField, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { Mesh, MeshBasicMaterial, NeutralToneMapping, PlaneGeometry, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector3, type PerspectiveCamera } from 'three';
import hdrSalotto from '../../../dev-assets/hdri/cayley_interior_2k.hdr?url';
import parquetColore from '../../../dev-assets/hdri/parquet/color.jpg?url';
import parquetNormal from '../../../dev-assets/hdri/parquet/normal.jpg?url';
import parquetRugosita from '../../../dev-assets/hdri/parquet/rough.jpg?url';
import { useConfiguratore } from '../state/store';
import { LinguaContext } from '../ui/hooks';
import { testi } from '../../i18n/index';
import { Tavolino } from '../scene/Tavolino';
import { COLORE_FONDO, Pavimento } from '../scene/Studio';
import { RAGGIO_INQUADRATURA } from '../data/views';
import { DURATA, inquadratura, type Ambiente } from './shots';

const DEG = Math.PI / 180;

// il salotto si scarica subito: al taglio non si aspetta
useLoader.preload(TextureLoader, [parquetColore, parquetNormal, parquetRugosita]);
useEnvironment.preload({ files: hdrSalotto });

declare global {
  interface Window {
    __spVideo?: { pronto: boolean; durata: number; renderFrame: (t: number) => Promise<void> };
  }
}

/** Le luci dello showroom, con una striscia mobile che scorre sui riflessi. */
function LuciStudio({ striscia }: { striscia: React.RefObject<Mesh | null> }) {
  return (
    <Environment resolution={512} frames={Infinity}>
      <color attach="background" args={['#050506']} />
      <Lightformer form="rect" intensity={1.7} position={[0, 3.2, -2.2]} scale={[3.4, 0.6, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={0.8} position={[1.6, 3.6, 1.2]} scale={[0.3, 2.2, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={0.7} position={[0.6, 0.35, 3.4]} scale={[4, 0.8, 1]} target={[0, 0.05, 0]} />
      <Lightformer form="rect" intensity={3} position={[-4, 1.2, 1]} rotation-y={Math.PI / 2} scale={[0.4, 6, 1]} />
      <Lightformer form="rect" intensity={3} position={[4, 1.2, 1]} rotation-y={-Math.PI / 2} scale={[0.4, 6, 1]} />
      <Lightformer form="rect" intensity={0.9} position={[0, 1.5, -5]} scale={[10, 2, 1]} />
      <Lightformer form="rect" intensity={1.6} position={[0, 3.1, -4.2]} scale={[7, 0.2, 1]} target={[0, 0.3, 0]} />
      <Lightformer form="rect" color="#C8A45D" intensity={0.55} position={[2.4, 0.4, 3]} scale={[3, 0.5, 1]} target={[0, 0, 0]} />
      {/* la striscia che scorre: verticale, davanti al tavolino, si muove lungo X */}
      <Lightformer ref={striscia} form="rect" intensity={6} position={[-3.4, 1.4, 2.6]} scale={[0.35, 4, 1]} target={[0, 0.3, 0]} />
    </Environment>
  );
}

/**
 * Il salotto: la villa (HDRI) fa luce e riflessi ed è lo sfondo, sfocato come
 * in una foto di prodotto; il pavimento è vero 3D (parquet a spina di pesce),
 * così tavolino, ombra e riflessi poggiano su qualcosa di solido.
 */
function Salotto() {
  const [map, normalMap, roughnessMap] = useLoader(TextureLoader, [parquetColore, parquetNormal, parquetRugosita]);
  useMemo(() => {
    map.colorSpace = SRGBColorSpace;
    for (const t of [map, normalMap, roughnessMap]) {
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(14 / 3.4, 14 / 3.4);
      t.anisotropy = 16;
    }
  }, [map, normalMap, roughnessMap]);
  return (
    <>
      <Environment files={hdrSalotto} background backgroundBlurriness={0.16} backgroundIntensity={0.8} environmentIntensity={1} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[7, 128]} />
        <meshPhysicalMaterial
          map={map}
          normalMap={normalMap}
          roughnessMap={roughnessMap}
          color="#7d6a5c"
          clearcoat={0.35}
          clearcoatRoughness={0.3}
          envMapIntensity={0.9}
        />
      </mesh>
    </>
  );
}

function Scena() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const [ambiente, setAmbiente] = useState<Ambiente>('studio');
  const striscia = useRef<Mesh>(null);
  const attesaAmbiente = useRef<(() => void) | null>(null);
  const ambienteCorrente = useRef<Ambiente>('studio');

  // velo nero davanti alla camera per le dissolvenze (il DOM non finisce nel video)
  const velo = useMemo(() => {
    const m = new Mesh(new PlaneGeometry(4, 4), new MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
    m.renderOrder = 999;
    m.frustumCulled = false;
    return m;
  }, []);

  useEffect(() => {
    gl.toneMapping = NeutralToneMapping;
    useConfiguratore.getState().impostaLivello('alto');
  }, [gl]);

  // cambio d'ambiente avvenuto (React ha montato la nuova scena)
  useEffect(() => {
    const ok = attesaAmbiente.current;
    attesaAmbiente.current = null;
    // due frame per lasciare a ombre e ambiente il tempo di prepararsi
    if (ok) requestAnimationFrame(() => requestAnimationFrame(ok));
  }, [ambiente]);

  useEffect(() => {
    const prova = new URLSearchParams(location.search);
    const posa = (t: number) => {
      const q = inquadratura(t);
      if (q.ambiente === 'salotto') {
        if (prova.has('az')) q.azimut = Number(prova.get('az'));
        if (prova.has('pol')) q.polare = Number(prova.get('pol'));
        if (prova.has('k')) q.k = Number(prova.get('k'));
      }
      // impaginazione per la home: il testo dell'hero sta a sinistra (desktop)
      // o in basso (mobile), quindi il tavolino va a destra / in alto
      const orizzontale = size.width >= size.height;
      const spostaX = orizzontale ? -0.235 * size.width : 0;
      const spostaY = orizzontale ? 0.02 * size.height : 0.22 * size.height;
      camera.setViewOffset(size.width, size.height, spostaX, spostaY, size.width, size.height);
      const vFov = camera.fov * DEG;
      const tg = Math.tan(vFov / 2);
      const fov = Math.min(vFov, 2 * Math.atan(tg * (size.width / size.height)));
      const d = (q.k * (orizzontale ? 1.3 : 1.3) * RAGGIO_INQUADRATURA) / Math.sin(fov / 2);
      const a = q.azimut * DEG;
      const p = q.polare * DEG;
      const mira = new Vector3(...q.mira);
      camera.position.set(mira.x + d * Math.sin(p) * Math.sin(a), mira.y + d * Math.cos(p), mira.z + d * Math.sin(p) * Math.cos(a));
      camera.lookAt(mira);
      camera.updateMatrixWorld();
      // velo: appena davanti alla camera
      velo.position.copy(camera.position).add(new Vector3(0, 0, -0.1).applyQuaternion(camera.quaternion));
      velo.quaternion.copy(camera.quaternion);
      (velo.material as MeshBasicMaterial).opacity = q.nero;
      if (striscia.current) {
        // fuori corsa: sotto il pavimento, dove nessuna superficie la riflette
        const fuori = Math.abs(q.striscia) > 10;
        striscia.current.position.x = fuori ? 0 : q.striscia;
        striscia.current.position.y = fuori ? -30 : 1.4;
      }
      return q;
    };

    window.__spVideo = {
      pronto: true,
      durata: DURATA,
      renderFrame: async (t: number) => {
        const q = inquadratura(t);
        if (q.ambiente !== ambienteCorrente.current) {
          await new Promise<void>((ok) => {
            attesaAmbiente.current = ok;
            ambienteCorrente.current = q.ambiente;
            setAmbiente(q.ambiente);
          });
        }
        posa(t);
        advance(performance.now());
      },
    };
    const t0 = Number(new URLSearchParams(location.search).get('t') ?? 2.5);
    void window.__spVideo.renderFrame(t0);
  }, [camera, size, velo]);

  return (
    <>
      <primitive object={velo} />
      {ambiente === 'studio' ? (
        <>
          <color attach="background" args={[COLORE_FONDO]} />
          <LuciStudio striscia={striscia} />
          <Pavimento livello="alto" />
        </>
      ) : (
        <Salotto />
      )}
      <Tavolino />
      <AccumulativeShadows key={`ombre-${ambiente}`} temporal={false} frames={100} alphaTest={0.85} opacity={ambiente === 'studio' ? 0.92 : 0.8} scale={2.6} position={[0, 0.0008, 0]} color="#000000">
        <RandomizedLight amount={8} radius={0.55} ambient={0.45} intensity={1.2} position={ambiente === 'studio' ? [0.8, 3, 0.9] : [2.2, 2.6, 0.4]} bias={0.0008} mapSize={1024} />
      </AccumulativeShadows>
      {ambiente === 'studio' ? (
        <EffectComposer key="studio" multisampling={4} enableNormalPass={false}>
          <N8AO halfRes={false} aoRadius={0.12} distanceFalloff={0.6} intensity={1.6} color="#000000" />
          <Bloom mipmapBlur intensity={0.25} luminanceThreshold={0.9} luminanceSmoothing={0.1} />
          <Vignette offset={0.25} darkness={0.55} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        </EffectComposer>
      ) : (
        <EffectComposer key="salotto" multisampling={4} enableNormalPass={false}>
          <N8AO halfRes={false} aoRadius={0.12} distanceFalloff={0.6} intensity={1.4} color="#000000" />
          {/* sfocatura: il salotto resta morbido dietro al tavolino, come in foto */}
          <DepthOfField target={[0, 0.2, 0]} worldFocusRange={1.1} bokehScale={2.6} />
          <Bloom mipmapBlur intensity={0.22} luminanceThreshold={0.92} luminanceSmoothing={0.1} />
          <Vignette offset={0.3} darkness={0.45} />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        </EffectComposer>
      )}
    </>
  );
}

function SegnalePronto() {
  useEffect(() => {
    document.documentElement.dataset.videoPronto = 'true';
  }, []);
  return null;
}

export default function VideoStage() {
  const q = new URLSearchParams(location.search);
  const w = Number(q.get('w') ?? 1920);
  const h = Number(q.get('h') ?? 1080);
  const contesto = useMemo(() => ({ lingua: 'it' as const, t: testi.it.configuratore, link: { home: '/', contatti: '/contatti', altraLingua: '/en', siglaAltraLingua: 'EN', etichettaAltraLingua: '' }, L: (x: { it: string }) => x.it }), []);
  return (
    <LinguaContext.Provider value={contesto}>
      <div style={{ width: w, height: h }}>
        <Canvas
          frameloop="never"
          dpr={1}
          shadows
          camera={{ fov: 30, near: 0.05, far: 120 }}
          gl={{ antialias: false, preserveDrawingBuffer: true, alpha: false, stencil: false }}
          style={{ width: w, height: h }}
        >
          <Suspense fallback={null}>
            <Scena />
            <SegnalePronto />
          </Suspense>
        </Canvas>
      </div>
    </LinguaContext.Provider>
  );
}
