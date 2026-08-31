import { Easing, interpolate } from "remotion";

/**
 * O ponteiro do mouse.
 *
 * Existe porque o vídeo mostra alguém USANDO a ferramenta — sem o
 * ponteiro, os cliques viram mágica e a pessoa que assiste não entende
 * que aquilo é ela quem faz. O anel do clique é o que dá o "toc".
 */

export interface Parada {
  /** Frame em que o ponteiro chega aqui. */
  frame: number;
  x: number;
  y: number;
  /** Marca um clique ao chegar. */
  clique?: boolean;
}

/** Posição do ponteiro no frame pedido, andando entre as paradas. */
export const posicaoCursor = (frame: number, paradas: Parada[]) => {
  const frames = paradas.map((p) => p.frame);
  return {
    x: interpolate(frame, frames, paradas.map((p) => p.x), {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.33, 0, 0.15, 1),
    }),
    y: interpolate(frame, frames, paradas.map((p) => p.y), {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.33, 0, 0.15, 1),
    }),
  };
};

/** Quão "aceso" está o anel de clique agora (0 a 1), 12 frames por clique. */
export const pulsoDoClique = (frame: number, paradas: Parada[]) => {
  const cliques = paradas.filter((p) => p.clique);
  let maior = 0;
  for (const c of cliques) {
    const t = (frame - c.frame) / 12;
    if (t >= 0 && t <= 1) maior = Math.max(maior, t);
  }
  return maior;
};

export const Cursor: React.FC<{
  x: number;
  y: number;
  /** 0 = sem clique; passa de 0 a 1 durante o anel. */
  clique: number;
  opacidade?: number;
}> = ({ x, y, clique, opacidade = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      opacity: opacidade,
      pointerEvents: "none",
      zIndex: 90,
    }}
  >
    {clique > 0 ? (
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 54,
          height: 54,
          marginLeft: -27,
          marginTop: -27,
          borderRadius: 999,
          border: "3px solid #d6e0b6",
          scale: interpolate(clique, [0, 1], [0.25, 1.15]),
          opacity: interpolate(clique, [0, 0.35, 1], [0.95, 0.75, 0]),
        }}
      />
    ) : null}

    <svg
      width={30}
      height={30}
      viewBox="0 0 24 24"
      style={{
        scale: interpolate(clique, [0, 0.18, 0.5], [1, 0.86, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.85))",
      }}
    >
      <path
        d="M5 2.5l13.5 8-5.8 1.4L9.6 19.5z"
        fill="#f0f2e9"
        stroke="#0b0d09"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  </div>
);
