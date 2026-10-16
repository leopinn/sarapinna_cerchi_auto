/**
 * Costruisce tutte le geometrie del cerchio a partire dal registro in
 * dimensions.ts. Coordinate: metri, Y in alto, y = 0 alla base del cerchio
 * (il gruppo del cerchio viene poi alzato dello spessore della base).
 *
 * Il disegno 2D della faccia vive nel piano XY; ruotandolo di −90° attorno a X
 * il punto (x, y) finisce in (x, −y) nel piano XZ: `aMondo` fa la stessa cosa
 * per i dettagli (bulloni, valvola, staffe).
 */
import { BufferGeometry, ExtrudeGeometry, Shape, Vector2 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CERCHI, STAFFE, mm, type Cerchio } from '../data/dimensions';
import { roundClosedPolyline, type V2 } from './fillet';
import { lathe } from './lathe';
import { disegnaFaccia } from './face';
import { denseExtrude } from './denseExtrude';
import { deformaFaccia } from './displace';

export type Livello = 'alto' | 'basso';

/** Dal piano della faccia (mm) al piano XZ della scena (m). */
export const aMondo = (p: V2): [number, number] => [mm(p[0]), mm(-p[1])];
/** Angolo (rad) da usare con rotateY per allineare +X locale alla direzione 2D di angolo `a`. */
export const angoloMondo = (a: number) => a;

export interface GeometrieCerchio {
  canale: BufferGeometry;
  faccia: BufferGeometry;
  sedi: BufferGeometry;
  tappi: BufferGeometry;
  mozzo: BufferGeometry;
  staffe: BufferGeometry;
  valvola: BufferGeometry;
  /** quote in metri nel sistema del cerchio */
  quotaCimaMozzo: number;
  quotaFondoMozzo: number;
  rim: Cerchio;
}

const cache = new Map<string, GeometrieCerchio>();

/** Solo per la pagina di calibrazione: rigenera le geometrie dopo aver cambiato le misure. */
export const svuotaCacheCerchi = () => cache.clear();

export function geometrieCerchio(id: string, livello: Livello): GeometrieCerchio {
  const chiave = `${id}:${livello}`;
  const presente = cache.get(chiave);
  if (presente) return presente;

  const rim = CERCHI[id];
  const f = rim.faccia;
  const alto = livello === 'alto';
  const passoBordo = alto ? 3.5 : 6;

  /* canale ------------------------------------------------------------------ */
  const profilo = roundClosedPolyline(
    rim.profilo.map(([r, y, raccordo]) => ({ p: [r, y] as V2, r: raccordo })),
    alto ? 1.5 : 3,
  );
  const canale = lathe(profilo, { segmenti: alto ? 192 : 112, chiuso: true });

  /* faccia -------------------------------------------------------------------- */
  const disegno = disegnaFaccia(f, rim.bulloni, passoBordo);
  const faccia = denseExtrude(disegno.esterno, disegno.fori, {
    spessore: f.spessore,
    smusso: f.smusso,
    segmentiSmusso: f.segmentiSmusso,
    passoInterno: alto ? 6 : 10,
  });
  deformaFaccia(faccia, f, disegno.razze);
  faccia.rotateX(-Math.PI / 2);
  faccia.translate(0, f.quotaAnello - f.spessore, 0);
  faccia.scale(0.001, 0.001, 0.001);

  // il mozzo è la parte centrale della faccia, abbassata dalla campanatura
  const cimaMozzo = f.quotaAnello - f.campanatura.profondita;
  const fondoMozzo = cimaMozzo - f.spessore;

  /* sedi dei bulloni: pozzetti verniciati con il fondo -------------------------- */
  const b = rim.bulloni;
  const segPozzetto = alto ? 40 : 24;
  // i profili aperti vanno percorsi con il materiale "a destra": le normali
  // escono dalla superficie visibile (qui: verso l'asse del pozzetto e in alto)
  const pozzetto = lathe(
    roundClosedPolyline(
      [
        { p: [b.rSede, cimaMozzo + 1], r: 0 },
        { p: [b.rSede, cimaMozzo - b.profonditaSede], r: 2 },
        { p: [0, cimaMozzo - b.profonditaSede], r: 0 },
      ],
      1,
    ),
    { segmenti: segPozzetto },
  );
  const tappo = lathe(
    roundClosedPolyline(
      [
        { p: [0, cimaMozzo - b.profonditaSede + 0.5], r: 0 },
        { p: [b.rTappo, cimaMozzo - b.profonditaSede + 0.5], r: 0 },
        { p: [b.rTappo, cimaMozzo - 6], r: 2.5 },
        { p: [b.rTappo * 0.45, cimaMozzo - 4.5], r: 3 },
        { p: [b.rTappo * 0.18, cimaMozzo - 6.5], r: 0.8 },
        { p: [0, cimaMozzo - 6.5], r: 0 },
      ],
      0.8,
    ),
    { segmenti: segPozzetto },
  );
  const sedi = mergeGeometries(
    disegno.sediBulloni.map((c) => {
      const g = pozzetto.clone();
      const [x, z] = aMondo(c);
      g.translate(x, 0, z);
      return g;
    }),
  );
  const tappi = mergeGeometries(
    disegno.sediBulloni.map((c) => {
      const g = tappo.clone();
      const [x, z] = aMondo(c);
      g.translate(x, 0, z);
      return g;
    }),
  );

  /* massa piena sotto il mozzo ------------------------------------------------- */
  const mozzo = lathe(
    roundClosedPolyline(
      [
        { p: [0, fondoMozzo - rim.mozzo.altezza], r: 0 },
        { p: [rim.mozzo.r, fondoMozzo - rim.mozzo.altezza], r: 6 },
        { p: [rim.mozzo.r, fondoMozzo + 2], r: 0 },
        { p: [0, fondoMozzo + 2], r: 0 },
      ],
      1.5,
    ),
    { segmenti: alto ? 96 : 48 },
  );

  /* valvola: dado esagonale + stelo sull'anello -------------------------------- */
  const angValvola = (rim.valvola.angolo * Math.PI) / 180;
  const posValvola: V2 = [rim.valvola.r * Math.cos(angValvola), rim.valvola.r * Math.sin(angValvola)];
  const valvola = mergeGeometries([
    lathe([[5.5, f.quotaAnello - 1], [5.5, f.quotaAnello + 3.5], [0, f.quotaAnello + 3.5]], { segmenti: 6 }),
    lathe(
      roundClosedPolyline(
        [
          { p: [0, f.quotaAnello + 3], r: 0 },
          { p: [3.2, f.quotaAnello + 3], r: 0 },
          { p: [3.2, f.quotaAnello + 13], r: 0.8 },
          { p: [0, f.quotaAnello + 13], r: 0 },
        ],
        0.5,
      ),
      { segmenti: 24 },
    ),
  ]);
  const [vx, vz] = aMondo(posValvola);
  valvola.translate(vx, 0, vz);

  /* staffe del vetro: profilo a U nel piano raggio/altezza, estruso di lato ---- */
  const s = STAFFE;
  const yCima = rim.altezza;
  const profiloStaffa = new Shape(
    (
      [
        [s.rInterno - s.spessoreGamba / 2, yCima - s.gambaInterna],
        [s.rInterno + s.spessoreGamba / 2, yCima - s.gambaInterna],
        [s.rInterno + s.spessoreGamba / 2, yCima],
        [s.rEsterno - s.spessoreGamba, yCima],
        [s.rEsterno - s.spessoreGamba, yCima - s.gambaEsterna],
        [s.rEsterno, yCima - s.gambaEsterna],
        [s.rEsterno, yCima + s.ponte],
        [s.rInterno - s.spessoreGamba / 2, yCima + s.ponte],
      ] as V2[]
    ).map(([x, y]) => new Vector2(x, y)),
  );
  const staffa = new ExtrudeGeometry(profiloStaffa, {
    depth: s.larghezza - 2,
    bevelEnabled: true,
    bevelThickness: 1,
    bevelSize: 0.8,
    bevelSegments: 2,
    curveSegments: 1,
  });
  staffa.translate(0, 0, -(s.larghezza - 2) / 2);
  const staffe = mergeGeometries(
    Array.from({ length: s.numero }, (_, k) => {
      const g = staffa.clone();
      g.rotateY(((s.angoloIniziale + (k * 360) / s.numero) * Math.PI) / 180);
      return g;
    }).map((g) => (g.deleteAttribute('uv'), g)),
  );
  staffe.scale(0.001, 0.001, 0.001);

  const risultato: GeometrieCerchio = {
    canale,
    faccia,
    sedi,
    tappi,
    mozzo,
    staffe,
    valvola,
    quotaCimaMozzo: mm(cimaMozzo),
    quotaFondoMozzo: mm(fondoMozzo - rim.mozzo.altezza),
    rim,
  };
  cache.set(chiave, risultato);
  return risultato;
}
