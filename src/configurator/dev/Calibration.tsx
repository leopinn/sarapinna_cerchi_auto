/**
 * Calibrazione del cerchio (SOLO SVILUPPO: /dev/calibrazione).
 *
 * Mostra il tavolino dall'alto, con la foto del prodotto sovrapposta e
 * semitrasparente. I cursori (leva) cambiano il disegno della faccia in tempo
 * reale; "Copia JSON" mette negli appunti i valori da incollare nel blocco
 * `faccia` di src/configurator/data/dimensions.ts.
 */
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { button, useControls } from 'leva';
import { NeutralToneMapping } from 'three';
import fotoAlto from '../../../docs/foto/WhatsApp Image 2026-10-13 at 21.31.563.jpeg?url';
import { CERCHI } from '../data/dimensions';
import { svuotaCacheCerchi } from '../geometry/rim';
import { useConfiguratore } from '../state/store';
import { LinguaContext } from '../ui/hooks';
import { testi } from '../../i18n/index';
import { Tavolino } from '../scene/Tavolino';
import { COLORE_FONDO, Luci } from '../scene/Studio';

const ID = 'aventador-lp700-4-front-20';

function Camera({ altezza }: { altezza: number }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    camera.position.set(0, altezza, 0.0001);
    camera.lookAt(0, 0.25, 0);
    invalidate();
  }, [camera, altezza, invalidate]);
  return null;
}

export default function Calibration() {
  const f = CERCHI[ID].faccia;
  const [versione, setVersione] = useState(0);

  const sovrapposizione = useControls('Foto', {
    opacita: { value: 0.5, min: 0, max: 1, step: 0.01 },
    scala: { value: 1, min: 0.5, max: 1.6, step: 0.005 },
    x: { value: 0, min: -300, max: 300, step: 1 },
    y: { value: 0, min: -300, max: 300, step: 1 },
    rotazione: { value: 0, min: -40, max: 40, step: 0.5 },
  });
  const vista = useControls('Camera', {
    altezza: { value: 1.35, min: 0.8, max: 3, step: 0.01 },
    fov: { value: 62, min: 20, max: 90, step: 1 },
  });
  const faccia = useControls('Faccia (mm)', {
    angoloIniziale: { value: f.angoloIniziale, min: 0, max: 360, step: 1 },
    rMozzo: { value: f.rMozzo, min: 60, max: 120, step: 1 },
    rAnello: { value: f.rAnello, min: 200, max: 250, step: 1 },
    rBiforcazione: { value: f.stelo.rBiforcazione, min: 120, max: 230, step: 1 },
    larghezzaMozzo: { value: f.stelo.larghezzaMozzo, min: 20, max: 80, step: 1 },
    larghezzaBiforcazione: { value: f.stelo.larghezzaBiforcazione, min: 20, max: 80, step: 1 },
    semiAngoloBraccio: { value: f.braccio.semiAngolo, min: 5, max: 30, step: 0.5 },
    larghezzaBraccio: { value: f.braccio.larghezza, min: 14, max: 50, step: 1 },
    raccordoSpalla: { value: f.raccordi.spalla, min: 2, max: 30, step: 1 },
    raccordoAnello: { value: f.raccordi.anello, min: 2, max: 20, step: 1 },
    finestraInterna: f.finestraInterna,
    campanatura: { value: f.campanatura.profondita, min: 0, max: 90, step: 1 },
    nervaturaStelo: { value: f.nervatura.stelo, min: 0, max: 10, step: 0.5 },
  });

  // applica i valori al registro (solo in questa pagina) e rigenera
  useEffect(() => {
    Object.assign(f, {
      angoloIniziale: faccia.angoloIniziale,
      rMozzo: faccia.rMozzo,
      rAnello: faccia.rAnello,
      finestraInterna: faccia.finestraInterna,
    });
    f.stelo = { larghezzaMozzo: faccia.larghezzaMozzo, larghezzaBiforcazione: faccia.larghezzaBiforcazione, rBiforcazione: faccia.rBiforcazione };
    f.braccio = { ...f.braccio, semiAngolo: faccia.semiAngoloBraccio, larghezza: faccia.larghezzaBraccio };
    f.raccordi = { ...f.raccordi, spalla: faccia.raccordoSpalla, anello: faccia.raccordoAnello };
    f.campanatura = { ...f.campanatura, profondita: faccia.campanatura };
    f.nervatura = { ...f.nervatura, stelo: faccia.nervaturaStelo };
    svuotaCacheCerchi();
    setVersione((v) => v + 1);
  }, [faccia, f]);

  useControls('Esporta', {
    'Copia JSON': button(() => {
      const json = JSON.stringify(f, null, 2);
      void navigator.clipboard.writeText(json);
      console.log(json);
    }),
  });

  useEffect(() => {
    useConfiguratore.getState().impostaLivello('alto');
    useConfiguratore.getState().imposta('vetro', 'rotondo');
  }, []);

  const contesto = useMemo(
    () => ({ lingua: 'it' as const, t: testi.it.configuratore, link: { home: '/', contatti: '/contatti', altraLingua: '/en', siglaAltraLingua: 'EN', etichettaAltraLingua: '' }, L: (x: { it: string }) => x.it }),
    [],
  );

  return (
    <LinguaContext.Provider value={contesto}>
      <div style={{ position: 'fixed', inset: 0, background: COLORE_FONDO }}>
        <Canvas frameloop="demand" camera={{ fov: vista.fov, near: 0.05, far: 20 }} onCreated={({ gl }) => (gl.toneMapping = NeutralToneMapping)} key={vista.fov}>
          <color attach="background" args={[COLORE_FONDO]} />
          <Luci />
          <Camera altezza={vista.altezza} />
          <Suspense fallback={null}>
            <Tavolino key={versione} />
          </Suspense>
        </Canvas>
        <img
          src={fotoAlto}
          alt=""
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            height: '100vh',
            opacity: sovrapposizione.opacita,
            transform: `translate(calc(-50% + ${sovrapposizione.x}px), calc(-50% + ${sovrapposizione.y}px)) rotate(${sovrapposizione.rotazione}deg) scale(${sovrapposizione.scala})`,
            pointerEvents: 'none',
            mixBlendMode: 'screen',
          }}
        />
      </div>
    </LinguaContext.Provider>
  );
}
