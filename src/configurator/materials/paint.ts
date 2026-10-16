/**
 * Vernice del cerchio: MeshPhysicalMaterial con trasparente (clearcoat).
 * Un solo materiale condiviso da canale, faccia e sedi dei bulloni; quando il
 * cliente cambia colore o finitura i valori scorrono verso il nuovo obiettivo
 * (smorzamento), invece di saltare.
 */
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, MeshPhysicalMaterial } from 'three';
import { easing } from 'maath';
import { COLORI, FINITURE, trova } from '../data/options';
import { useConfiguratore } from '../state/store';
import { riduciMovimento } from '../ui/hooks';

interface ParametriVernice {
  color: Color;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
}

// clearcoat mai esattamente 0: passare da >0 a 0 costringe three.js a
// ricompilare lo shader (un piccolo scatto durante la transizione)
const FINITURA: Record<string, Omit<ParametriVernice, 'color' | 'metalness'>> = {
  lucido: { roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.03 },
  satinato: { roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 },
  opaco: { roughness: 0.7, clearcoat: 0.001, clearcoatRoughness: 0.6 },
};

export const parametriVernice = (coloreId: string, finituraId: string): ParametriVernice => {
  const colore = trova(COLORI, coloreId);
  const f = FINITURA[trova(FINITURE, finituraId).id];
  return {
    color: new Color(colore.hex),
    metalness: colore.metallizzato ? 0.8 : 0,
    roughness: colore.metallizzato ? f.roughness + 0.1 : f.roughness,
    clearcoat: f.clearcoat,
    clearcoatRoughness: f.clearcoatRoughness,
  };
};

export function useVernice() {
  const invalidate = useThree((s) => s.invalidate);
  const materiale = useMemo(() => {
    const { colore, finitura } = { colore: useConfiguratore.getState().config.colore, finitura: useConfiguratore.getState().config.finitura };
    return new MeshPhysicalMaterial({ ...parametriVernice(colore, finitura), envMapIntensity: 1 });
  }, []);

  // un cambio di configurazione deve far partire i frame (frameloop "demand")
  useEffect(
    () =>
      useConfiguratore.subscribe(
        (s) => s.config.colore + s.config.finitura,
        () => invalidate(),
      ),
    [invalidate],
  );

  useFrame((_, delta) => {
    const { colore, finitura } = useConfiguratore.getState().config;
    const obiettivo = parametriVernice(colore, finitura);
    if (riduciMovimento()) {
      materiale.color.copy(obiettivo.color);
      Object.assign(materiale, { ...obiettivo, color: materiale.color });
      return;
    }
    const dt = Math.min(delta, 0.05);
    let inMoto = easing.dampC(materiale.color, obiettivo.color, 0.22, dt);
    for (const k of ['roughness', 'metalness', 'clearcoat', 'clearcoatRoughness'] as const) {
      inMoto = easing.damp(materiale, k, obiettivo[k], 0.22, dt) || inMoto;
    }
    if (inMoto) invalidate();
  });

  return materiale;
}
