import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Documento } from "../../componentes/Documento";
import { Janela } from "../Janela";
import { ENQ } from "../enquadramentos";
import { CartaoAjustes } from "../cartoes";
import { Legenda } from "../Moldura";
import { FIM_SIMBOLOS, Pecas } from "../pecas";
import { COR } from "../../tema";

/**
 * 17–21 s — a grade de setores e o véu.
 *
 * A grade é o único motivo de o mapa existir em campo: ninguém fala
 * "eles estão perto do galpão do meio", fala "inimigo no B4". Então o
 * slider tinha que mexer NA TELA — grade que muda de 6 para 12 na
 * frente do espectador prova a ideia sem uma linha de narração.
 *
 * O véu entra junto porque é a resposta à pergunta seguinte: satélite
 * cru é claro e ruidoso, e linha fina de grade sobre telhado branco
 * some. Ver o véu escurecer explica o controle melhor que o nome dele.
 */

/** Os controles andam em degraus, como se alguém arrastasse o slider. */
const passo = (frame: number, quadros: number[], valores: number[]) =>
  interpolate(frame, quadros, valores, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });

export const Ajustes: React.FC = () => {
  const frame = useCurrentFrame();

  const colunas = Math.round(passo(frame, [8, 28, 48, 68, 88], [10, 6, 6, 12, 10]));
  const linhas = Math.round(passo(frame, [14, 34, 54, 74, 94], [10, 6, 6, 12, 10]));
  const veu = passo(frame, [30, 52, 68, 92], [0.18, 0.46, 0.46, 0.18]);

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <Janela
        escala={interpolate(frame, [0, 120], [ENQ.simbolosFim.escala, ENQ.ajustesFim.escala], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
        centro={{
          x: interpolate(frame, [0, 120], [ENQ.simbolosFim.centro.x, ENQ.ajustesFim.centro.x], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          y: 360,
        }}
      >
        <Documento colunas={colunas} linhas={linhas} veu={veu}>
          <Pecas frame={frame} aparicaoDe={(i) => (i <= FIM_SIMBOLOS ? 1 : 0)} />
        </Documento>
      </Janela>

      <CartaoAjustes
        colunas={colunas}
        linhas={linhas}
        veu={veu}
        entrada={interpolate(frame, [0, 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
        y={940}
      />

      <Legenda kicker="Grade de setores" titulo="“Inimigo no B4”" entrada={4} />
    </AbsoluteFill>
  );
};
