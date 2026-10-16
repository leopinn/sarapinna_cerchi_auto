/**
 * Il tavolino completo: base in legno, perno, cerchio (canale, faccia, sedi,
 * tappi, coprimozzo, valvola, staffe), piano in vetro e logo inciso.
 * Le geometrie sono generate in codice (src/configurator/geometry).
 */
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { suspend } from 'suspend-react';
import { CylinderGeometry, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry } from 'three';
import { BASE, CERCHI, VETRO, mm, quote } from '../data/dimensions';
import { MODELLI, trova } from '../data/options';
import { useConfiguratore } from '../state/store';
import { geometrieCerchio } from '../geometry/rim';
import { geometriaBase, geometriaPerno, geometriaVetro } from '../geometry/tableParts';
import { posizioneLogo } from '../geometry/logoPlacement';
import { useVernice } from '../materials/paint';
import { useLegno } from '../materials/wood';
import { creaMaterialiVetro, parametriIncisione } from '../materials/glass';
import { caricaCoprimozzo, caricaTextureLogo } from '../materials/canvasTextures';

type IdVetro = keyof typeof VETRO.forme;

export function Tavolino() {
  const livello = useConfiguratore((s) => s.livello);
  const idCerchio = useConfiguratore((s) => trova(MODELLI, s.config.modello).rim);
  const idVetro = useConfiguratore((s) => s.config.vetro) as IdVetro;
  const idLogo = useConfiguratore((s) => s.config.logo);
  const gl = useThree((s) => s.gl);
  const anisotropia = Math.min(8, gl.capabilities.getMaxAnisotropy());
  const alto = livello === 'alto';

  const rim = CERCHI[idCerchio];
  const q = quote(rim);
  const g = useMemo(() => geometrieCerchio(idCerchio, livello), [idCerchio, livello]);

  const vernice = useVernice();
  const legno = useLegno(livello);

  const materiali = useMemo(() => {
    const plastica = new MeshStandardMaterial({ color: '#0c0c0d', roughness: 0.55, metalness: 0, envMapIntensity: 0.6 });
    const acciaio = new MeshStandardMaterial({ color: '#8a8d91', roughness: 0.35, metalness: 1 });
    const cromo = new MeshStandardMaterial({ color: '#3a3c40', roughness: 0.25, metalness: 1 });
    const [vetroFacce, vetroBordo] = creaMaterialiVetro();
    // il vetro non scrive la profondità: l'occlusione ambientale vede il cerchio sotto
    vetroFacce.depthWrite = false;
    vetroBordo.depthWrite = false;
    return { plastica, acciaio, cromo, vetroFacce, vetroBordo };
  }, []);

  /* coprimozzo con lo stemma --------------------------------------------------- */
  const stemma = suspend(() => caricaCoprimozzo(anisotropia), ['coprimozzo']);
  const coprimozzo = useMemo(() => {
    const geo = new CylinderGeometry(mm(rim.coprimozzo.r), mm(rim.coprimozzo.r), mm(rim.coprimozzo.altezza), 64, 1);
    const smalto = new MeshPhysicalMaterial({ color: '#0e0d0d', roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04 });
    const faccia = new MeshPhysicalMaterial({
      map: stemma.map,
      roughnessMap: stemma.orm,
      metalnessMap: stemma.orm,
      roughness: 1,
      metalness: 1,
      clearcoat: 0.7,
      clearcoatRoughness: 0.05,
    });
    // gruppi del cilindro: 0 fianco, 1 sopra, 2 sotto
    return { geo, materiali: [smalto, faccia, smalto] };
  }, [rim, stemma]);

  /* logo inciso ------------------------------------------------------------------ */
  const logo = suspend(() => caricaTextureLogo(anisotropia), ['logo-vetro']);
  const posLogo = posizioneLogo(idVetro, idLogo, logo.proporzioni);
  const pianoLogo = useMemo(() => {
    const p = new PlaneGeometry(1, 1);
    p.rotateX(-Math.PI / 2);
    return p;
  }, []);
  const materialeLogo = useMemo(() => new MeshStandardMaterial({ ...parametriIncisione, alphaMap: logo.texture }), [logo]);

  const geoVetro = geometriaVetro(idVetro, alto);
  const geoBase = geometriaBase(alto);
  const quotaBaseCerchio = mm(BASE.altezza);
  const geoPerno = geometriaPerno(quotaBaseCerchio, quotaBaseCerchio + g.quotaFondoMozzo + 0.002);

  // cambio di forma o posizione del logo: un frame nuovo (frameloop "demand")
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [idVetro, idLogo, invalidate]);

  return (
    <group>
      {/* base */}
      <mesh geometry={geoBase} material={legno} castShadow receiveShadow />
      <mesh geometry={geoPerno} material={materiali.acciaio} castShadow />

      {/* cerchio */}
      <group position-y={quotaBaseCerchio}>
        <mesh geometry={g.canale} material={vernice} castShadow receiveShadow />
        <mesh geometry={g.faccia} material={vernice} castShadow receiveShadow />
        <mesh geometry={g.sedi} material={vernice} />
        <mesh geometry={g.mozzo} material={vernice} castShadow />
        <mesh geometry={g.tappi} material={materiali.plastica} />
        <mesh geometry={g.valvola} material={materiali.cromo} />
        <mesh geometry={g.staffe} material={materiali.plastica} castShadow />
        <mesh
          geometry={coprimozzo.geo}
          material={coprimozzo.materiali}
          position-y={g.quotaCimaMozzo + mm(1) - mm(rim.coprimozzo.altezza) / 2}
          rotation-y={Math.PI / 2}
        />
      </group>

      {/* vetro */}
      <mesh geometry={geoVetro} material={[materiali.vetroFacce, materiali.vetroBordo]} position-y={mm(q.fondoVetro)} renderOrder={2} />
      <mesh
        geometry={pianoLogo}
        material={materialeLogo}
        position={[posLogo.x, mm(q.cimaVetro) + 0.00005, posLogo.z]}
        scale={[posLogo.larghezza, 1, posLogo.altezza]}
        renderOrder={10}
      />
    </group>
  );
}
