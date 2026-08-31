import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { COR, FONTE_DADO } from "../../tema";
import { GradeTatica } from "../pecas";

/**
 * 0–2 s — a marca.
 *
 * Mesma abertura do vídeo do criador de mapas, e de propósito: são
 * duas ferramentas da mesma casa, e quem vê os dois vídeos tem que
 * reconhecer a casa antes de reconhecer a ferramenta. Só o subtítulo
 * muda.
 *
 * Dois segundos é tempo de UMA coisa. Nada mais entra aqui.
 */
export const Abertura: React.FC = () => {
  const frame = useCurrentFrame();

  const suave = (inicio: number, fim: number) =>
    interpolate(frame, [inicio, fim], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={suave(0, 20)} />

      {/* Clarão oliva atrás do logo. */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(52% 62% at 50% 46%, rgba(125,145,57,0.30) 0%, rgba(11,13,9,0) 70%)",
          opacity: suave(4, 34),
        }}
      />

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 34,
        }}
      >
        <Img
          src={staticFile("logo.webp")}
          style={{
            height: 250,
            width: "auto",
            filter: "brightness(0) invert(1)",
            opacity: suave(2, 26),
            scale: interpolate(suave(2, 40), [0, 1], [0.9, 1], {
              output: "perceptual-scale",
            }),
          }}
        />

        <div
          style={{
            height: 2,
            backgroundColor: COR.oliva500,
            width: interpolate(suave(20, 44), [0, 1], [0, 560]),
          }}
        />

        <span
          style={{
            fontFamily: FONTE_DADO,
            fontSize: 30,
            textTransform: "uppercase",
            letterSpacing: "0.34em",
            color: COR.oliva300,
            opacity: suave(28, 48),
            translate: `0 ${interpolate(suave(28, 48), [0, 1], [14, 0])}px`,
          }}
        >
          Organizador de operações
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
