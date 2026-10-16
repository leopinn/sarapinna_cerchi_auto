/**
 * Solido di rivoluzione da un profilo 2D (raggio, altezza) in millimetri.
 * Come THREE.LatheGeometry, ma con normali calcolate dal profilo come media
 * delle normali normalizzate dei due lati adiacenti (più pulite sui raccordi
 * piccoli) e con profili chiusi senza cuciture.
 */
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { mm } from '../data/dimensions';
import type { V2 } from './fillet';

interface OpzioniLathe {
  segmenti: number;
  /** profilo chiuso: l'ultimo punto si ricollega al primo */
  chiuso?: boolean;
  /**
   * UV: 'profilo' = u lungo la circonferenza, v lungo il profilo (in metri);
   * 'legno' = piano (x, z) sulle facce orizzontali, cilindrico sui fianchi.
   */
  uv?: 'profilo' | 'legno';
}

const normaleLato = (a: V2, b: V2): V2 => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [dy / l, -dx / l];
};

export function lathe(profiloMm: V2[], { segmenti, chiuso = false, uv = 'profilo' }: OpzioniLathe): BufferGeometry {
  const punti = chiuso ? [...profiloMm, profiloMm[0]] : profiloMm;
  const n = punti.length;

  // normali del profilo
  const normali: V2[] = punti.map((p, j) => {
    const prima = j > 0 ? normaleLato(punti[j - 1], p) : chiuso ? normaleLato(profiloMm[profiloMm.length - 1], p) : null;
    const dopo = j < n - 1 ? normaleLato(p, punti[j + 1]) : chiuso ? normaleLato(p, punti[1]) : null;
    const s: V2 = [(prima?.[0] ?? 0) + (dopo?.[0] ?? 0), (prima?.[1] ?? 0) + (dopo?.[1] ?? 0)];
    const l = Math.hypot(s[0], s[1]) || 1;
    return [s[0] / l, s[1] / l];
  });

  // lunghezza cumulata lungo il profilo (per le UV)
  const cumulata = [0];
  for (let j = 1; j < n; j++) cumulata.push(cumulata[j - 1] + Math.hypot(punti[j][0] - punti[j - 1][0], punti[j][1] - punti[j - 1][1]));

  const pos: number[] = [];
  const nor: number[] = [];
  const uvs: number[] = [];
  const indici: number[] = [];

  for (let i = 0; i <= segmenti; i++) {
    const phi = (i / segmenti) * Math.PI * 2;
    const s = Math.sin(phi);
    const c = Math.cos(phi);
    for (let j = 0; j < n; j++) {
      const [r, y] = punti[j];
      const x = r * s;
      const z = r * c;
      pos.push(mm(x), mm(y), mm(z));
      nor.push(normali[j][0] * s, normali[j][1], normali[j][0] * c);
      if (uv === 'legno' && Math.abs(normali[j][1]) > 0.7) {
        uvs.push(mm(x), mm(z));
      } else if (uv === 'legno') {
        uvs.push(mm(r) * phi, mm(y));
      } else {
        uvs.push((mm(r) * phi), mm(cumulata[j]));
      }
    }
  }
  for (let i = 0; i < segmenti; i++) {
    for (let j = 0; j < n - 1; j++) {
      const a = j + i * n;
      const b = a + n;
      const c = a + n + 1;
      const d = a + 1;
      indici.push(a, b, d, c, d, b);
    }
  }

  const g = new BufferGeometry();
  g.setIndex(indici);
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  return g;
}
