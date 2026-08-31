import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Documento } from "../componentes/Documento";
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
import { COR, FONTE_DADO, FONTE_DISPLAY } from "../tema";

/**
 * 13–15 s — a chamada.
 *
 * O mapa continua atrás, desfocado: sair para um fundo liso jogaria
 * fora a única coisa que a pessoa acabou de querer. O chanfro de 10 px
 * no botão é do DS e só o CTA primário pode usá-lo — por isso ele
 * aparece aqui e em nenhum outro lugar do vídeo.
 */
export const Chamada: React.FC = () => {
  const frame = useCurrentFrame();

  const surge = (inicio: number) =>
    interpolate(frame, [inicio, inicio + 14], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

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
      <div
        style={{
          position: "absolute",
          transformOrigin: "0 0",
          left: -38.4,
          top: -21.6,
          scale: interpolate(frame, [0, 60], [1.56, 1.63], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          filter: `blur(${interpolate(frame, [0, 20], [0, 7], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}px)`,
        }}
      >
        <Documento>
          <Area
            pontos={AREA_RESPAWN_ALFA}
            traco={COR_RESPAWN}
            preenchimento="#22c55e38"
            espessura={3}
            tracejado={[12, 8]}
            aparicao={1}
          />
          <Area
            pontos={AREA_RESPAWN_BRAVO}
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
              aparicao={1}
            />
          ))}
          {SIMBOLOS_MAPA.map((s) => (
            <Marcador
              key={s.rotulo}
              x={s.x}
              y={s.y}
              escala={Math.max(s.escala, ESCALA_MINIMA_VIDEO)}
              cor={s.cor}
              rotulo={s.rotulo}
            />
          ))}
          <Marcador
            x={MARCADOR_ALFA.x}
            y={MARCADOR_ALFA.y}
            escala={ESCALA_MINIMA_VIDEO}
            cor={COR_RESPAWN}
            rotulo={MARCADOR_ALFA.rotulo}
          />
          <Marcador
            x={MARCADOR_BRAVO.x}
            y={MARCADOR_BRAVO.y}
            escala={ESCALA_MINIMA_VIDEO}
            cor={COR_RESPAWN}
            rotulo={MARCADOR_BRAVO.rotulo}
          />
        </Documento>
      </div>

      <AbsoluteFill
        style={{
          backgroundColor: `rgba(6,8,5,${interpolate(frame, [0, 18], [0.25, 0.78], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })})`,
        }}
      />

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 0,
        }}
      >
        <Img
          src={staticFile("logo.webp")}
          style={{
            height: 74,
            width: "auto",
            filter: "brightness(0) invert(1)",
            opacity: surge(2) * 0.9,
            marginBottom: 34,
          }}
        />

        <span
          style={{
            fontFamily: FONTE_DISPLAY,
            fontWeight: 700,
            fontSize: 116,
            lineHeight: 0.98,
            textTransform: "uppercase",
            letterSpacing: "0.005em",
            color: COR.tinta,
            textAlign: "center",
            opacity: surge(6),
            translate: `0 ${interpolate(surge(6), [0, 1], [22, 0])}px`,
          }}
        >
          Gerador de Mapas
        </span>
        <span
          style={{
            fontFamily: FONTE_DISPLAY,
            fontWeight: 700,
            fontSize: 116,
            lineHeight: 1.02,
            textTransform: "uppercase",
            letterSpacing: "0.005em",
            color: COR.oliva300,
            textAlign: "center",
            opacity: surge(11),
            translate: `0 ${interpolate(surge(11), [0, 1], [22, 0])}px`,
          }}
        >
          da Comunidade Airsoft
        </span>

        {/*
          CTA primário: o único lugar do vídeo que usa o chanfro do DS.

          O brilho é `drop-shadow` no invólucro e não `box-shadow` no
          botão porque `clip-path` corta a sombra junto com a caixa — o
          box-shadow simplesmente não aparecia. O drop-shadow segue o
          contorno já recortado, chanfro incluído.
        */}
        <div
          style={{
            marginTop: 52,
            filter: `drop-shadow(0 0 ${interpolate(frame, [20, 46, 60], [0, 44, 20], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}px rgba(125,145,57,0.75))`,
            opacity: surge(20),
            scale: interpolate(frame, [20, 34, 46, 60], [0.9, 1, 1.03, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              output: "perceptual-scale",
            }),
          }}
        >
          <div
            style={{
              padding: "26px 58px",
              backgroundColor: COR.oliva500,
              clipPath:
                "polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)",
              fontFamily: FONTE_DISPLAY,
              fontWeight: 700,
              fontSize: 50,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: COR.fundo,
            }}
          >
            Crie o seu grátis aqui
          </div>
        </div>

        <span
          style={{
            marginTop: 30,
            fontFamily: FONTE_DADO,
            fontSize: 27,
            letterSpacing: "0.2em",
            color: COR.texto2,
            opacity: surge(28),
          }}
        >
          comunidadeairsoft.com.br
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
