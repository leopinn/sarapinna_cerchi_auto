/**
 * Post-produzione (solo livello alto): occlusione ambientale, un filo di
 * bloom sui riflessi più forti, vignettatura e tone mapping "Neutral"
 * (colori fedeli ai campioni). Il composer disattiva il tone mapping del
 * renderer: per questo ToneMapping è l'ultimo effetto.
 */
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

export function Effetti({ leggeri = false }: { leggeri?: boolean }) {
  if (leggeri) {
    // dopo un declassamento in corsa: niente AO e bloom, ma antialias (SMAA)
    return (
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <SMAA />
        <Vignette offset={0.25} darkness={0.5} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <N8AO halfRes aoRadius={0.12} distanceFalloff={0.6} intensity={1.6} color="#000000" />
      <Bloom mipmapBlur intensity={0.22} luminanceThreshold={0.92} luminanceSmoothing={0.1} />
      <Vignette offset={0.25} darkness={0.55} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  );
}
