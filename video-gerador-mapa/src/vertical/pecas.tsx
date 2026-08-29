import { Easing, interpolate } from "remotion";
import { Area } from "../componentes/Area";
import { Marcador } from "../componentes/Marcador";
import { AREAS, SIMBOLOS_MAPA } from "../dados/mapa";
import {
  AREA_RESPAWN_ALFA,
  AREA_RESPAWN_BRAVO,
  MARCADOR_ALFA,
  MARCADOR_BRAVO,
} from "../dados/respawn";
import { COR_RESPAWN, ESCALA_MINIMA_VIDEO } from "../dados/simbolos";

/**
 * O mapa é construído na ORDEM em que o vídeo o constrói.
 *
 * Uma lista única em vez de cada cena desenhar o que quer: assim a
 * cena 5 sabe exatamente o que a cena 3 já deixou na tela, e ninguém
 * some no corte. Mexer na ordem aqui muda o vídeo inteiro de uma vez.
 *
 * 0–1 saem da cena "Desenhar", 2–5 da cena "Símbolos", 6–12 da
 * "Revelação".
 */

type Peca =
  | { tipo: "area"; pontos: [number, number][]; traco: string; preenchimento: string; espessura: number; tracejado: number[] | null }
  | { tipo: "marcador"; x: number; y: number; escala: number; cor: string; rotulo: string; respawn?: boolean };

const areaRespawn = (pontos: [number, number][]): Peca => ({
  tipo: "area",
  pontos,
  traco: COR_RESPAWN,
  preenchimento: "#22c55e38",
  espessura: 3,
  tracejado: [12, 8],
});

const doMapa = (i: number): Peca => ({
  tipo: "area",
  pontos: AREAS[i].pontos,
  traco: AREAS[i].traco,
  preenchimento: AREAS[i].preenchimento,
  espessura: AREAS[i].espessura,
  tracejado: AREAS[i].tracejado,
});

const simboloDoMapa = (i: number): Peca => ({
  tipo: "marcador",
  x: SIMBOLOS_MAPA[i].x,
  y: SIMBOLOS_MAPA[i].y,
  escala: Math.max(SIMBOLOS_MAPA[i].escala, ESCALA_MINIMA_VIDEO),
  cor: SIMBOLOS_MAPA[i].cor,
  rotulo: SIMBOLOS_MAPA[i].rotulo,
});

export const PECAS: Peca[] = [
  areaRespawn(AREA_RESPAWN_ALFA), // 0  ┐ cena "Desenhar"
  {
    tipo: "marcador",
    x: MARCADOR_ALFA.x,
    y: MARCADOR_ALFA.y,
    escala: ESCALA_MINIMA_VIDEO,
    cor: COR_RESPAWN,
    rotulo: MARCADOR_ALFA.rotulo,
    respawn: true,
  }, // 1  ┘
  simboloDoMapa(1), // 2  CQB        ┐ cena "Símbolos"
  simboloDoMapa(3), // 3  Torre      │
  simboloDoMapa(4), // 4  Trincheira ┘
  doMapa(0), // 5   área amarela grande  ┐ cena "Revelação"
  simboloDoMapa(0), // 6  Estacionamento │
  doMapa(1), // 7   área amarela pequena │
  doMapa(3), // 8   safe zone (azul)     │
  simboloDoMapa(2), // 9  Safe zone      │
  doMapa(2), // 10  CQB (vermelha)       │
  areaRespawn(AREA_RESPAWN_BRAVO), // 11 │
  {
    tipo: "marcador",
    x: MARCADOR_BRAVO.x,
    y: MARCADOR_BRAVO.y,
    escala: ESCALA_MINIMA_VIDEO,
    cor: COR_RESPAWN,
    rotulo: MARCADOR_BRAVO.rotulo,
    respawn: true,
  }, // 12 ┘
];

/** Índices que já estão na tela ao fim de cada cena. */
export const FIM_DESENHAR = 1;
export const FIM_SIMBOLOS = 4;

/** Batida do respawn: 30 frames por ciclo, um compasso a 120 BPM. */
const batida = (frame: number) => {
  const t = (frame % 30) / 30;
  return { pulso: 1 + Math.sin(t * Math.PI * 2) * 0.06, halo: t };
};

export const Pecas: React.FC<{
  /** 0 = ausente, 1 = assentada. Recebe o índice na lista `PECAS`. */
  aparicaoDe: (indice: number) => number;
  /** Frame para a batida dos respawns. */
  frame: number;
  pulsarRespawn?: boolean;
}> = ({ aparicaoDe, frame, pulsarRespawn = true }) => {
  const b = batida(frame);

  return (
    <>
      {PECAS.map((p, i) => {
        const a = aparicaoDe(i);
        if (a <= 0) return null;

        if (p.tipo === "area") {
          return (
            <Area
              key={`p${i}`}
              pontos={p.pontos}
              traco={p.traco}
              preenchimento={p.preenchimento}
              espessura={p.espessura}
              tracejado={p.tracejado}
              aparicao={a}
            />
          );
        }

        const pulsando = pulsarRespawn && p.respawn && a >= 1;
        return (
          <Marcador
            key={`p${i}`}
            x={p.x}
            y={p.y}
            escala={p.escala}
            cor={p.cor}
            rotulo={p.rotulo}
            opacidade={a}
            pulso={
              (pulsando ? b.pulso : 1) *
              interpolate(a, [0, 1], [1.3, 1], { easing: Easing.bezier(0.16, 1, 0.3, 1) })
            }
            halo={pulsando ? b.halo : 0}
          />
        );
      })}
    </>
  );
};
