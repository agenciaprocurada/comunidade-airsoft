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
 *
 * `colunas`, `linhas` e `opacidade` são props (e não constantes) porque
 * o vídeo vertical mexe nos controles ao vivo: a pessoa precisa VER a
 * grade mudar quando o slider anda, senão o painel de ajustes é só
 * enfeite na tela.
 */

const REGUA = 30;

/** A, B, ... Z, AA, AB… — mesma contagem de coluna de planilha. */
const letraDaColuna = (indice: number) => {
  let restante = indice;
  let saida = "";
  do {
    saida = String.fromCharCode(65 + (restante % 26)) + saida;
    restante = Math.floor(restante / 26) - 1;
  } while (restante >= 0);
  return saida;
};

export const Grade: React.FC<{
  progresso: number;
  colunas?: number;
  linhas?: number;
  opacidade?: number;
}> = ({
  progresso,
  colunas = GRADE.colunas,
  linhas = GRADE.linhas,
  opacidade = GRADE.opacidade,
}) => {
  const esquerda = REGUA;
  const topo = REGUA;
  const passoX = (DOC.largura - esquerda) / colunas;
  const passoY = (DOC.altura - topo) / linhas;

  // Mesma conta de `desenharGrade`: o rótulo de célula encolhe junto com
  // a célula, com piso de 10 e teto de 18.
  const corpo = Math.max(10, Math.min(18, Math.round(Math.min(passoX, passoY) / 5)));

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
        opacity={interpolate(progresso, [0, 0.25], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />
      <rect
        x={0}
        y={0}
        width={REGUA}
        height={DOC.altura}
        fill="rgba(9,11,7,0.88)"
        opacity={interpolate(progresso, [0, 0.25], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />

      {/* Verticais — varrem da esquerda para a direita. */}
      {Array.from({ length: colunas - 1 }, (_, i) => {
        const x = Math.round(esquerda + (i + 1) * passoX);
        const inicio = 0.1 + (i / Math.max(1, colunas - 1)) * 0.35;
        return (
          <line
            key={`v${i}`}
            x1={x}
            y1={topo}
            x2={x}
            y2={DOC.altura}
            stroke={GRADE.cor}
            strokeWidth={GRADE.espessura}
            opacity={interpolate(progresso, [inicio, inicio + 0.12], [0, opacidade], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          />
        );
      })}

      {/* Horizontais — varrem de cima para baixo, meio passo atrás. */}
      {Array.from({ length: linhas - 1 }, (_, i) => {
        const y = Math.round(topo + (i + 1) * passoY);
        const inicio = 0.16 + (i / Math.max(1, linhas - 1)) * 0.35;
        return (
          <line
            key={`h${i}`}
            x1={esquerda}
            y1={y}
            x2={DOC.largura}
            y2={y}
            stroke={GRADE.cor}
            strokeWidth={GRADE.espessura}
            opacity={interpolate(progresso, [inicio, inicio + 0.12], [0, opacidade], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          />
        );
      })}

      {/* Letras da régua de cima */}
      {Array.from({ length: colunas }, (_, i) => (
        <text
          key={`l${i}`}
          x={esquerda + i * passoX + passoX / 2}
          y={REGUA / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={FONTE_DADO}
          fontSize={15}
          fill={GRADE.cor}
          opacity={interpolate(progresso, [0.3, 0.5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        >
          {letraDaColuna(i)}
        </text>
      ))}

      {/* Números da régua da esquerda */}
      {Array.from({ length: linhas }, (_, i) => (
        <text
          key={`n${i}`}
          x={REGUA / 2}
          y={topo + i * passoY + passoY / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={FONTE_DADO}
          fontSize={15}
          fill={GRADE.cor}
          opacity={interpolate(progresso, [0.3, 0.5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        >
          {i + 1}
        </text>
      ))}

      {/* "B4" dentro do B4: quem lê o mapa no campo olha um pedaço da
          tela e precisa saber onde está sem seguir a linha até a borda. */}
      {Array.from({ length: linhas }, (_, linha) =>
        Array.from({ length: colunas }, (_, coluna) => (
          <text
            key={`c${coluna}-${linha}`}
            x={esquerda + coluna * passoX + 5}
            y={topo + linha * passoY + 4}
            dominantBaseline="hanging"
            fontFamily={FONTE_DADO}
            fontSize={corpo}
            fill={GRADE.cor}
            opacity={interpolate(progresso, [0.5, 0.75], [0, Math.min(1, opacidade + 0.2)], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            {letraDaColuna(coluna)}
            {linha + 1}
          </text>
        )),
      )}
    </svg>
  );
};
