import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Documento } from "../../componentes/Documento";
import { Janela } from "../Janela";
import { ENQ } from "../enquadramentos";
import { Pecas } from "../pecas";
import { COR, FONTE_DADO, FONTE_DISPLAY } from "../../tema";

/**
 * 0–2 s — o gancho.
 *
 * Rede social dá dois segundos antes do polegar subir, então o primeiro
 * frame já mostra o RESULTADO: o mapa pronto, desfocado atrás da marca.
 * Guardar o mapa para o fim funcionaria num vídeo que a pessoa escolheu
 * assistir; aqui ela ainda não escolheu nada.
 */
export const Abertura: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <Janela
        escala={interpolate(frame, [0, 60], [ENQ.aberto.escala * 1.06, ENQ.aberto.escala], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
        centro={ENQ.aberto.centro}
        desfoque={5}
      >
        <Documento>
          <Pecas aparicaoDe={() => 1} frame={frame} />
        </Documento>
      </Janela>

      <AbsoluteFill style={{ backgroundColor: "rgba(6,8,5,0.74)" }} />

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 40,
        }}
      >
        <Img
          src={staticFile("logo.webp")}
          style={{
            height: 210,
            width: "auto",
            filter: "brightness(0) invert(1)",
            opacity: interpolate(frame, [0, 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            scale: interpolate(frame, [0, 26], [1.22, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              output: "perceptual-scale",
            }),
          }}
        />

        <div
          style={{
            height: 3,
            backgroundColor: COR.oliva500,
            width: interpolate(frame, [12, 34], [0, 620], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        />

        <span
          style={{
            fontFamily: FONTE_DISPLAY,
            fontWeight: 700,
            fontSize: 92,
            lineHeight: 0.98,
            textTransform: "uppercase",
            textAlign: "center",
            color: COR.tinta,
            opacity: interpolate(frame, [18, 32], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            translate: `0 ${interpolate(frame, [18, 32], [22, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            })}px`,
          }}
        >
          Criador de mapa
          <br />
          operacional
        </span>

        <span
          style={{
            fontFamily: FONTE_DADO,
            fontSize: 32,
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            color: COR.oliva300,
            opacity: interpolate(frame, [34, 48], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Grátis · no navegador
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
