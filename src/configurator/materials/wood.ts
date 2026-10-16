/**
 * Legno della base: texture CC0 per essenza (colore, normal, rugosità) e una
 * tinta applicata nello shader: prima si desatura, poi si moltiplica per il
 * colore della tinta. Così "Grigio" è un vero sbiancato e non solo un velo.
 *
 * Cambiando essenza le nuove texture si caricano in background: finché non
 * sono pronte resta quella vecchia (niente sfarfallio, niente schermo vuoto).
 */
import { useEffect, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { suspend } from 'suspend-react';
import { Color, MeshPhysicalMaterial, NoColorSpace, RepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { easing } from 'maath';
import { LEGNI, TINTE, trova } from '../data/options';
import { useConfiguratore, type Livello } from '../state/store';
import { riduciMovimento } from '../ui/hooks';

/**
 * Taratura per essenza: `base` porta la texture grezza (impiallacciatura non
 * finita) al colore del legno oliato; `metri` è la misura reale della texture.
 */
const SPECIE: Record<string, { base: [number, number, number]; metri: number }> = {
  abete: { base: [1.36, 1.27, 1.08], metri: 1.89 },
  rovere: { base: [1.04, 0.96, 0.86], metri: 1.83 },
  noce: { base: [0.62, 0.43, 0.31], metri: 1.0 },
  frassino: { base: [1, 1, 1], metri: 1.0 },
};

interface MappeLegno {
  map: Texture;
  normalMap: Texture;
  roughnessMap: Texture;
}

const loader = new TextureLoader();
const cache = new Map<string, Promise<MappeLegno>>();

const carica = (url: string) => new Promise<Texture>((ok, ko) => loader.load(url, ok, undefined, ko));

export const caricaLegno = (cartella: string, livello: Livello, anisotropia: number): Promise<MappeLegno> => {
  const chiave = `${cartella}:${livello}`;
  let p = cache.get(chiave);
  if (!p) {
    const base = `/configurator/textures/wood/${cartella}/`;
    const s = livello === 'alto' ? '2k' : '1k';
    const ripeti = 1 / SPECIE[cartella].metri;
    p = Promise.all([carica(`${base}color_${s}.webp`), carica(`${base}normal_${s}.webp`), carica(`${base}rough_1k.webp`)]).then(
      ([map, normalMap, roughnessMap]) => {
        map.colorSpace = SRGBColorSpace;
        normalMap.colorSpace = NoColorSpace;
        roughnessMap.colorSpace = NoColorSpace;
        for (const t of [map, normalMap, roughnessMap]) {
          t.wrapS = t.wrapT = RepeatWrapping;
          t.repeat.set(ripeti, ripeti);
          t.anisotropy = anisotropia;
        }
        return { map, normalMap, roughnessMap };
      },
    );
    cache.set(chiave, p);
  }
  return p;
};

/** Precarica tutte le essenze (si chiama quando si apre lo step Base). */
export const precaricaLegni = (livello: Livello, anisotropia: number) => {
  for (const l of LEGNI) void caricaLegno(l.texture, livello, anisotropia);
};

export function useLegno(livello: Livello) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const anisotropia = Math.min(8, gl.capabilities.getMaxAnisotropy());

  // la prima essenza si aspetta (Suspense): il tavolino non compare senza legno
  const [cartellaIniziale] = useState(() => trova(LEGNI, useConfiguratore.getState().config.legno).texture);
  const iniziali = suspend(() => caricaLegno(cartellaIniziale, livello, anisotropia), ['legno', cartellaIniziale, livello]);

  const { materiale, uniformi } = useMemo(() => {
    const uniformi = { uTint: { value: new Color(1, 1, 1) }, uDesat: { value: 0 } };
    const materiale = new MeshPhysicalMaterial({
      ...iniziali,
      roughness: 1,
      metalness: 0,
      clearcoat: livello === 'alto' ? 0.22 : 0.001,
      clearcoatRoughness: 0.42,
    });
    materiale.color.setRGB(...SPECIE[cartellaIniziale].base);
    materiale.onBeforeCompile = (shader) => {
      shader.uniforms.uTint = uniformi.uTint;
      shader.uniforms.uDesat = uniformi.uDesat;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uTint;\nuniform float uDesat;')
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          float lumaLegno = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(lumaLegno), uDesat) * uTint;`,
        );
    };
    materiale.customProgramCacheKey = () => 'sp-legno-tinta';
    return { materiale, uniformi };
  }, [iniziali, cartellaIniziale, livello]);

  // cambio di essenza: si caricano le mappe e si scambiano quando sono pronte
  const cartella = useConfiguratore((s) => trova(LEGNI, s.config.legno).texture);
  useEffect(() => {
    let annullato = false;
    void caricaLegno(cartella, livello, anisotropia).then((m) => {
      if (annullato) return;
      materiale.map = m.map;
      materiale.normalMap = m.normalMap;
      materiale.roughnessMap = m.roughnessMap;
      invalidate();
    });
    return () => {
      annullato = true;
    };
  }, [cartella, livello, anisotropia, materiale, invalidate]);

  useEffect(
    () => useConfiguratore.subscribe((s) => s.config.legno + s.config.tinta, () => invalidate()),
    [invalidate],
  );

  const obiettivoBase = useMemo(() => new Color(), []);
  const obiettivoTinta = useMemo(() => new Color(), []);
  useFrame((_, delta) => {
    const { legno, tinta } = useConfiguratore.getState().config;
    const specie = SPECIE[trova(LEGNI, legno).texture];
    const t = trova(TINTE, tinta);
    obiettivoBase.setRGB(...specie.base);
    obiettivoTinta.set(t.tint);
    if (riduciMovimento()) {
      materiale.color.copy(obiettivoBase);
      uniformi.uTint.value.copy(obiettivoTinta);
      uniformi.uDesat.value = t.desat;
      return;
    }
    const dt = Math.min(delta, 0.05);
    let inMoto = easing.dampC(materiale.color, obiettivoBase, 0.25, dt);
    inMoto = easing.dampC(uniformi.uTint.value, obiettivoTinta, 0.25, dt) || inMoto;
    inMoto = easing.damp(uniformi.uDesat, 'value', t.desat, 0.25, dt) || inMoto;
    if (inMoto) invalidate();
  });

  return materiale;
}
