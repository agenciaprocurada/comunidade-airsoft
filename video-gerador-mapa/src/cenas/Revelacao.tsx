import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Documento } from "../componentes/Documento";
import { Area } from "../componentes/Area";
import { Marcador } from "../componentes/Marcador";
import { ESCALA_DOC, ORIGEM_DOC } from "../componentes/Editor";
import { AREAS, SIMBOLOS_MAPA } from "../dados/mapa";
import {
  AREA_RESPAWN_ALFA,
  AREA_RESPAWN_BRAVO,
  MARCADOR_ALFA,
  MARCADOR_BRAVO,
} from "../dados/respawn";
import { COR_RESPAWN, ESCALA_MINIMA_VIDEO } from "../dados/simbolos";
import { COR, FONTE_DADO } from "../tema";

/**
 * 10–13 s — o campo se monta, peça por peça.
 *
 * É o pagamento do vídeo: até aqui a pessoa viu UMA área ser desenhada
 * a mão; agora vê o mapa inteiro que aquilo vira. Por isso as peças
 * entram em ordem de leitura do campo (estacionamento, safe, CQB,
 * estruturas) e não todas de uma vez — em bloco viraria só um mapa
 * bonito, sem a ideia de que foi construído.
 *
 * As áreas e os símbolos são os do mapa REAL salvo no banco: quatro
 * áreas e cinco símbolos do "Bengazi-final". Só os respawns são do
 * roteiro (ver dados/respawn.ts).
 */

/** Frame em que cada peça começa a assentar. 12 frames por peça. */
const ENTRADA_AREA = [28, 38, 52, 42];
const ENTRADA_SIMBOLO = [34, 58, 48, 62, 66];
const ENTRADA_BRAVO = 70;
const ENTRADA_MARCADOR_BRAVO = 76;

const chegada = (frame: number, inicio: number) =>
  interpolate(frame, [inicio, inicio + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Batida do respawn: 36 frames por ciclo, começando quando o marcador chega. */
const batida = (frame: number, inicio: number) => {
  if (frame < inicio) return { pulso: 1, halo: 0 };
  const t = ((frame - inicio) % 36) / 36;
  return {
    pulso: 1 + Math.sin(t * Math.PI * 2) * 0.05,
    halo: t,
  };
};

export const Revelacao: React.FC = () => {
  const frame = useCurrentFrame();

  const alfa = batida(frame, 0);
  const bravo = batida(frame, ENTRADA_MARCADOR_BRAVO);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COR.fundo,
        opacity: interpolate(frame, [0, 8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      {/*
        O documento sai da posição que ocupava no palco do editor e vai
        a tela cheia. É o mesmo mapa, não um corte para outro lugar —
        essa continuidade é o que faz a cena anterior valer.
      */}
      <div
        style={{
          position: "absolute",
          transformOrigin: "0 0",
          left: interpolate(frame, [4, 34, 96], [ORIGEM_DOC.x, 0, -38.4], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.4, 0, 0.15, 1),
          }),
          top: interpolate(frame, [4, 34, 96], [ORIGEM_DOC.y, 0, -21.6], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.4, 0, 0.15, 1),
          }),
          scale: interpolate(frame, [4, 34, 96], [ESCALA_DOC, 1.5, 1.56], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.4, 0, 0.15, 1),
          }),
        }}
      >
        <Documento>
          {/* A área de respawn desenhada na cena anterior já está aqui. */}
          <Area
            pontos={AREA_RESPAWN_ALFA}
            traco={COR_RESPAWN}
            preenchimento="#22c55e38"
            espessura={3}
            tracejado={[12, 8]}
            aparicao={1}
          />

          {AREAS.map((a, i) => (
            <Area
              key={`a${i}`}
              pontos={a.pontos}
              traco={a.traco}
              preenchimento={a.preenchimento}
              espessura={a.espessura}
              tracejado={a.tracejado}
              aparicao={chegada(frame, ENTRADA_AREA[i])}
            />
          ))}

          <Area
            pontos={AREA_RESPAWN_BRAVO}
            traco={COR_RESPAWN}
            preenchimento="#22c55e38"
            espessura={3}
            tracejado={[12, 8]}
            aparicao={chegada(frame, ENTRADA_BRAVO)}
          />

          {SIMBOLOS_MAPA.map((s, i) => (
            <Marcador
              key={s.rotulo}
              x={s.x}
              y={s.y}
              escala={Math.max(s.escala, ESCALA_MINIMA_VIDEO)}
              cor={s.cor}
              rotulo={s.rotulo}
              opacidade={chegada(frame, ENTRADA_SIMBOLO[i])}
              pulso={interpolate(chegada(frame, ENTRADA_SIMBOLO[i]), [0, 1], [1.3, 1], {
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              })}
            />
          ))}

          {/* Os dois respawns pulsam: são o ponto que muda o jogo. */}
          <Marcador
            x={MARCADOR_ALFA.x}
            y={MARCADOR_ALFA.y}
            escala={ESCALA_MINIMA_VIDEO}
            cor={COR_RESPAWN}
            rotulo={MARCADOR_ALFA.rotulo}
            pulso={alfa.pulso}
            halo={alfa.halo}
          />
          <Marcador
            x={MARCADOR_BRAVO.x}
            y={MARCADOR_BRAVO.y}
            escala={ESCALA_MINIMA_VIDEO}
            cor={COR_RESPAWN}
            rotulo={MARCADOR_BRAVO.rotulo}
            opacidade={chegada(frame, ENTRADA_MARCADOR_BRAVO)}
            pulso={bravo.pulso * interpolate(chegada(frame, ENTRADA_MARCADOR_BRAVO), [0, 1], [1.3, 1], {
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            })}
            halo={frame >= ENTRADA_MARCADOR_BRAVO + 12 ? bravo.halo : 0}
          />
        </Documento>
      </div>

      {/* Cartela de identificação do mapa. Em cima, no centro: embaixo
          ela disputava espaço com a barra de escala e com o rótulo da
          safe zone, que são conteúdo do mapa e vêm antes dela. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          translate: "-50% 0",
          top: 52,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 22px",
          backgroundColor: "rgba(11,13,9,0.82)",
          border: `1px solid ${COR.oliva700}`,
          opacity: interpolate(frame, [78, 90], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span
          style={{
            fontFamily: FONTE_DADO,
            fontSize: 20,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: COR.oliva300,
          }}
        >
          Bengazi — Operação Fênix
        </span>
        <span style={{ width: 1, height: 22, backgroundColor: COR.oliva700 }} />
        <span
          style={{
            fontFamily: FONTE_DADO,
            fontSize: 20,
            letterSpacing: "0.12em",
            color: COR.texto2,
          }}
        >
          10 × 10 setores · 2 respawns
        </span>
      </div>
    </AbsoluteFill>
  );
};
