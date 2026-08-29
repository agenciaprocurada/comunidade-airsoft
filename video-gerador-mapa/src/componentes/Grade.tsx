import { interpolate } from "remotion";
import { DOC, GRADE } from "../dados/mapa";
import { FONTE_DADO } from "../tema";

/**
 * A grade de setores, reproduzindo `desenharGrade` do editor.
 *
 * A geometria não é decorativa: a régua ocupa 30 px DENTRO do documento
 * (não é moldura de interface), e a área útil começa depois dela. Se
 * isso sair do lugar, o rótulo "B4" deixa de cair dentro do B4 — que é
 * a única razão de a grade existir.
 */

const REGUA = 30;

const LETRAS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export const Grade: React.FC<{ progresso: number }> = ({ progresso }) => {
  const esquerda = REGUA;
  const topo = REGUA;
  const passoX = (DOC.largura - esquerda) / GRADE.colunas;
  const passoY = (DOC.altura - topo) / GRADE.linhas;

  return (
    <svg
      width={DOC.largura}
      height={DOC.altura}
      viewBox={`0 0 ${DOC.largura} ${DOC.altura}`}
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      {/* Réguas: faixa opaca dentro do documento. */}
      <rect
        x={0}
        y={0}
        width={DOC.largura}
        height={REGUA}
        fill="rgba(9,11,7,0.88)"
        opacity={interpolate(progresso, [0, 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
      <rect
        x={0}
        y={0}
        width={REGUA}
        height={DOC.altura}
        fill="rgba(9,11,7,0.88)"
        opacity={interpolate(progresso, [0, 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />

      {/* Verticais — varrem da esquerda para a direita. */}
      {Array.from({ length: GRADE.colunas - 1 }, (_, i) => {
        const x = Math.round(esquerda + (i + 1) * passoX);
        const inicio = 0.1 + (i / (GRADE.colunas - 1)) * 0.35;
        return (
          <line
            key={`v${i}`}
            x1={x}
            y1={topo}
            x2={x}
            y2={DOC.altura}
            stroke={GRADE.cor}
            strokeWidth={GRADE.espessura}
            opacity={interpolate(progresso, [inicio, inicio + 0.12], [0, GRADE.opacidade], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          />
        );
      })}

      {/* Horizontais — varrem de cima para baixo, meio passo atrás. */}
      {Array.from({ length: GRADE.linhas - 1 }, (_, i) => {
        const y = Math.round(topo + (i + 1) * passoY);
        const inicio = 0.16 + (i / (GRADE.linhas - 1)) * 0.35;
        return (
          <line
            key={`h${i}`}
            x1={esquerda}
            y1={y}
            x2={DOC.largura}
            y2={y}
            stroke={GRADE.cor}
            strokeWidth={GRADE.espessura}
            opacity={interpolate(progresso, [inicio, inicio + 0.12], [0, GRADE.opacidade], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          />
        );
      })}

      {/* Letras da régua de cima */}
      {LETRAS.map((letra, i) => (
        <text
          key={`l${letra}`}
          x={esquerda + i * passoX + passoX / 2}
          y={REGUA / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={FONTE_DADO}
          fontSize={15}
          fill={GRADE.cor}
          opacity={interpolate(progresso, [0.3, 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
        >
          {letra}
        </text>
      ))}

      {/* Números da régua da esquerda */}
      {Array.from({ length: GRADE.linhas }, (_, i) => (
        <text
          key={`n${i}`}
          x={REGUA / 2}
          y={topo + i * passoY + passoY / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={FONTE_DADO}
          fontSize={15}
          fill={GRADE.cor}
          opacity={interpolate(progresso, [0.3, 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
        >
          {i + 1}
        </text>
      ))}

      {/* "B4" dentro do B4: quem lê o mapa no campo olha um pedaço da
          tela e precisa saber onde está sem seguir a linha até a borda. */}
      {Array.from({ length: GRADE.linhas }, (_, linha) =>
        LETRAS.map((letra, coluna) => (
          <text
            key={`c${letra}${linha}`}
            x={esquerda + coluna * passoX + 5}
            y={topo + linha * passoY + 4}
            dominantBaseline="hanging"
            fontFamily={FONTE_DADO}
            fontSize={14}
            fill={GRADE.cor}
            opacity={interpolate(progresso, [0.5, 0.75], [0, 0.75], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            {letra}
            {linha + 1}
          </text>
        )),
      )}
    </svg>
  );
};
