import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { COR, FONTE_DADO, FONTE_DISPLAY } from "../../tema";
import {
  JOGADORES,
  LADOS,
  OPERACAO,
  TOTAL_FIM,
  confirmadosDo,
  corDoLado,
} from "../dados";
import { BarraLado, Chip, GradeTatica, LinhaJogador, Painel } from "../pecas";

/**
 * 20–22 s — a chamada.
 *
 * O painel continua atrás, desfocado: cortar para um fundo liso
 * jogaria fora a única coisa que a pessoa acabou de querer. O chanfro
 * de 10 px do botão é do DS e só o CTA primário pode usá-lo — por isso
 * ele aparece aqui e em nenhum outro lugar do vídeo.
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
      <GradeTatica opacidade={0.4} />

      {/* O painel da lista, cheio, desfocando para o fundo. */}
      <div
        style={{
          position: "absolute",
          left: 430,
          top: 90,
          scale: interpolate(frame, [0, 60], [1, 1.06], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          filter: `blur(${interpolate(frame, [0, 20], [0, 8], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}px)`,
        }}
      >
        <Painel
          titulo={`${OPERACAO.titulo} · ${OPERACAO.dataCurta}`}
          etiqueta={`${TOTAL_FIM} confirmados · 1 na espera`}
          largura={1060}
          pulso
        >
          <div style={{ padding: 26, display: "flex", gap: 22 }}>
            {LADOS.map((lado) => (
              <BarraLado
                key={lado.nome}
                nome={lado.nome}
                confirmados={confirmadosDo(lado, JOGADORES.length)}
                vagas={lado.vagas}
                cor={lado.cor}
                largura={493}
              />
            ))}
          </div>
          <div style={{ paddingBottom: 8 }}>
            {JOGADORES.map((jogador) => (
              <LinhaJogador
                key={jogador.nome}
                nome={jogador.nome}
                lado={jogador.lado}
                cor={corDoLado(jogador.lado)}
                altura={68}
                direita={
                  jogador.estado === "espera" ? (
                    <Chip tom="espera">Lista de espera</Chip>
                  ) : (
                    <Chip tom="oliva">Confirmado</Chip>
                  )
                }
              />
            ))}
          </div>
        </Painel>
      </div>

      <AbsoluteFill
        style={{
          backgroundColor: `rgba(6,8,5,${interpolate(frame, [0, 18], [0.3, 0.82], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })})`,
        }}
      />

      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}
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
            fontSize: 112,
            lineHeight: 0.98,
            textTransform: "uppercase",
            color: COR.tinta,
            textAlign: "center",
            opacity: surge(6),
            translate: `0 ${interpolate(surge(6), [0, 1], [22, 0])}px`,
          }}
        >
          Organizador de Operações
        </span>
        <span
          style={{
            fontFamily: FONTE_DISPLAY,
            fontWeight: 700,
            fontSize: 112,
            lineHeight: 1.02,
            textTransform: "uppercase",
            color: COR.oliva300,
            textAlign: "center",
            opacity: surge(11),
            translate: `0 ${interpolate(surge(11), [0, 1], [22, 0])}px`,
          }}
        >
          da Comunidade Airsoft
        </span>

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
            Abra a sua grátis
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
