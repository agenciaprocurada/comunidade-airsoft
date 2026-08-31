import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { COR, FONTE_DADO } from "../tema";

/**
 * 0–2 s — a marca aparece.
 *
 * Fundo com a grade tática do DS em opacidade baixíssima: sinaliza
 * "mapa/HUD" sem competir com o logo. Nada mais entra aqui; dois
 * segundos é tempo de uma coisa só.
 */
export const Abertura: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      {/* Grade tática — mesma receita do .grade-tatica do site. */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(147,168,74,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(147,168,74,0.055) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          opacity: interpolate(frame, [0, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />

      {/* Clarão oliva atrás do logo. */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(52% 62% at 50% 46%, rgba(125,145,57,0.30) 0%, rgba(11,13,9,0) 70%)",
          opacity: interpolate(frame, [4, 34], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
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
            opacity: interpolate(frame, [2, 26], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            scale: interpolate(frame, [2, 40], [0.9, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              output: "perceptual-scale",
            }),
          }}
        />

        {/* Filete oliva que abre debaixo da marca. */}
        <div
          style={{
            height: 2,
            backgroundColor: COR.oliva500,
            width: interpolate(frame, [20, 44], [0, 520], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        />

        <span
          style={{
            fontFamily: FONTE_DADO,
            fontSize: 30,
            textTransform: "uppercase",
            letterSpacing: "0.34em",
            color: COR.oliva300,
            opacity: interpolate(frame, [28, 48], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: `0 ${interpolate(frame, [28, 48], [14, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            })}px`,
          }}
        >
          Criador de mapa operacional
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
