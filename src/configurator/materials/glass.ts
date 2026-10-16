/**
 * Vetro float: due materiali.
 *  - facce: trasmissione piena, appena verdino (ferro nel vetro)
 *  - bordo: guardandolo di taglio si attraversa molto vetro, quindi il colore
 *    verde è intenso. Con lo stesso materiale delle facce non verrebbe.
 * Niente MeshTransmissionMaterial: costa un passaggio di render in più.
 */
import { MeshPhysicalMaterial } from 'three';

export const creaMaterialiVetro = () => {
  const facce = new MeshPhysicalMaterial({
    color: '#ffffff',
    metalness: 0,
    roughness: 0.02,
    transmission: 1,
    thickness: 0.01,
    ior: 1.52,
    attenuationColor: '#d4ecdf',
    attenuationDistance: 0.6,
    specularIntensity: 0.7,
    envMapIntensity: 0.55,
  });
  // la luce nel bordo arriva anche dalle facce (riflessione interna): con la
  // sola trasmissione verrebbe quasi nero. Si simula un filo verde chiaro.
  const bordo = new MeshPhysicalMaterial({
    color: '#d6efe3',
    metalness: 0,
    roughness: 0.12,
    transmission: 0.55,
    thickness: 0.04,
    ior: 1.52,
    attenuationColor: '#79c3a2',
    attenuationDistance: 0.12,
    emissive: '#1f4a3a',
    emissiveIntensity: 0.35,
    envMapIntensity: 1,
  });
  return [facce, bordo] as const;
};

/** Incisione laser: vetro satinato, bianco latte semitrasparente. */
export const parametriIncisione = {
  color: '#eef2f0',
  roughness: 1,
  metalness: 0,
  transparent: true,
  opacity: 0.62,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -4,
} as const;
