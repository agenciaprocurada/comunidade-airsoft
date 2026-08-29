import { interpolate } from "remotion";
import { DOC } from "../dados/mapa";

/**
 * Área desenhada sobre o mapa.
 *
 * Os pontos vêm em coordenadas ABSOLUTAS do documento — é assim que o
 * Fabric os grava no jsonb, e é o que deixa o SVG aqui ser um decalque
 * direto do que está salvo, sem conversão nenhuma no meio.
 */

const centroide = (pontos: [number, number][]) => {
  const soma = pontos.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]);
  return [soma[0] / pontos.length, soma[1] / pontos.length];
};

export const Area: React.FC<{
  pontos: [number, number][];
  traco: string;
  preenchimento: string;
  espessura: number;
  tracejado?: number[] | null;
  /** 0 = ausente, 1 = assentada. Abaixo de 1 ela ainda está chegando. */
  aparicao: number;
}> = ({ pontos, traco, preenchimento, espessura, tracejado, aparicao }) => {
  const [cx, cy] = centroide(pontos);
  const d = pontos.map((p) => p.join(",")).join(" ");

  return (
    <svg
      width={DOC.largura}
      height={DOC.altura}
      viewBox={`0 0 ${DOC.largura} ${DOC.altura}`}
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
    >
      <g
        transform={`translate(${cx} ${cy}) scale(${interpolate(aparicao, [0, 1], [0.9, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}) translate(${-cx} ${-cy})`}
        opacity={interpolate(aparicao, [0, 0.45], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      >
        <polygon
          points={d}
          fill={preenchimento}
          stroke={traco}
          strokeWidth={espessura}
          strokeDasharray={tracejado ? tracejado.join(" ") : undefined}
        />
        {/* Clarão de assentamento: o traço acende e apaga na chegada. */}
        <polygon
          points={d}
          fill="none"
          stroke="#ffffff"
          strokeWidth={espessura + 1.5}
          opacity={interpolate(aparicao, [0, 0.3, 0.75], [0, 0.55, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      </g>
    </svg>
  );
};

/**
 * A mesma área enquanto está sendo clicada, ponto a ponto.
 *
 * `vertices` é quantos cliques já aconteceram; `cursor` é onde o
 * ponteiro está agora, e é ele que puxa o segmento tracejado de prévia
 * — o mesmo comportamento da ferramenta Área no editor.
 */
export const AreaEmConstrucao: React.FC<{
  pontos: [number, number][];
  cor: string;
  vertices: number;
  cursor?: [number, number] | null;
}> = ({ pontos, cor, vertices, cursor }) => {
  const postos = pontos.slice(0, Math.max(0, Math.floor(vertices)));
  if (postos.length === 0) return null;

  return (
    <svg
      width={DOC.largura}
      height={DOC.altura}
      viewBox={`0 0 ${DOC.largura} ${DOC.altura}`}
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
    >
      {postos.length > 1 ? (
        <polyline
          points={postos.map((p) => p.join(",")).join(" ")}
          fill={`${cor}22`}
          stroke={cor}
          strokeWidth={3}
          strokeLinejoin="miter"
        />
      ) : null}

      {cursor ? (
        <line
          x1={postos[postos.length - 1][0]}
          y1={postos[postos.length - 1][1]}
          x2={cursor[0]}
          y2={cursor[1]}
          stroke={cor}
          strokeWidth={2}
          strokeDasharray="8 6"
          opacity={0.85}
        />
      ) : null}

      {postos.map((p, i) => (
        <rect
          key={i}
          x={p[0] - 4.5}
          y={p[1] - 4.5}
          width={9}
          height={9}
          fill="#0b0d09"
          stroke={cor}
          strokeWidth={2}
        />
      ))}
    </svg>
  );
};
