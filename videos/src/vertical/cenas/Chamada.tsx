import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Documento } from "../../componentes/Documento";
import { Pecas } from "../pecas";
import { COR, FONTE_DADO, FONTE_DISPLAY } from "../../tema";

/**
 * 26–30 s — a chamada.
 *
 * O mapa continua atrás, desfocado: cortar para fundo liso jogaria fora
 * a única coisa que a pessoa acabou de querer. O chanfro de 10 px no
 * botão é do DS e só o CTA primário pode usá-lo — por isso ele aparece
 * aqui e em nenhum outro lugar do vídeo.
 *
 * O texto fica todo acima de y=1620: abaixo disso o Instagram e o TikTok
 * desenham a interface deles por cima.
 */
export const Chamada: React.FC = () => {
  const frame = useCurrentFrame();

  const surge = (inicio: number) =>
    interpolate(frame, [inicio, inicio + 12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      {/*
        Aqui o mapa NÃO fica na janela: ele cobre a tela inteira.

        Na janela ele viraria uma tarja de 607 px no meio de 1920, com
        preto liso em cima e embaixo — composição pesada no vazio bem no
        frame em que a pessoa decide clicar. Coberto e desfocado, ele
        vira o fundo: o verde do terreno e as manchas das áreas ainda
        leem, e o botão ganha a tela toda.
      */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 1280,
            height: 720,
            marginLeft: -640,
            marginTop: -360,
            scale: interpolate(frame, [0, 120], [1920 / 720, 2.85], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            filter: `blur(${interpolate(frame, [0, 22], [1.5, 8], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}px)`,
          }}
        >
          <Documento>
            <Pecas aparicaoDe={() => 1} frame={frame} />
          </Documento>
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          backgroundColor: `rgba(6,8,5,${interpolate(frame, [0, 20], [0.2, 0.8], {
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
          paddingBottom: 220,
        }}
      >
        <Img
          src={staticFile("logo.webp")}
          style={{
            height: 84,
            width: "auto",
            filter: "brightness(0) invert(1)",
            opacity: surge(0) * 0.92,
            marginBottom: 46,
          }}
        />

        <span
          style={{
            fontFamily: FONTE_DISPLAY,
            fontWeight: 700,
            fontSize: 104,
            lineHeight: 0.95,
            textTransform: "uppercase",
            textAlign: "center",
            color: COR.tinta,
            opacity: surge(6),
            translate: `0 ${interpolate(surge(6), [0, 1], [26, 0])}px`,
          }}
        >
          Gerador de mapas
        </span>
        <span
          style={{
            fontFamily: FONTE_DISPLAY,
            fontWeight: 700,
            fontSize: 104,
            lineHeight: 1.02,
            textTransform: "uppercase",
            textAlign: "center",
            color: COR.oliva300,
            opacity: surge(12),
            translate: `0 ${interpolate(surge(12), [0, 1], [26, 0])}px`,
          }}
        >
          da Comunidade Airsoft
        </span>

        <div
          style={{
            marginTop: 62,
            filter: `drop-shadow(0 0 ${interpolate(frame, [22, 56, 90], [0, 48, 24], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}px rgba(125,145,57,0.8))`,
            opacity: surge(22),
            scale: interpolate(frame, [22, 40, 62, 90], [0.9, 1, 1.04, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              output: "perceptual-scale",
            }),
          }}
        >
          <div
            style={{
              padding: "30px 62px",
              backgroundColor: COR.oliva500,
              clipPath:
                "polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)",
              fontFamily: FONTE_DISPLAY,
              fontWeight: 700,
              fontSize: 56,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: COR.fundo,
            }}
          >
            Crie o seu grátis aqui
          </div>
        </div>

        <span
          style={{
            marginTop: 38,
            fontFamily: FONTE_DADO,
            fontSize: 32,
            letterSpacing: "0.2em",
            color: COR.texto,
            opacity: surge(34),
          }}
        >
          comunidadeairsoft.com.br
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
