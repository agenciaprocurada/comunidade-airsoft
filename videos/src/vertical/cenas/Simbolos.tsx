import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Documento } from "../../componentes/Documento";
import { Janela } from "../Janela";
import { ENQ } from "../enquadramentos";
import { FitaSimbolos } from "../cartoes";
import { Legenda } from "../Moldura";
import { FIM_DESENHAR, Pecas } from "../pecas";
import { COR } from "../../tema";

/**
 * 13–17 s — a paleta de símbolos.
 *
 * Os 17 símbolos passam em duas fitas enquanto três deles caem no mapa.
 * Mostrar a paleta parada seria mais fácil e diria menos: o que vende
 * aqui é a QUANTIDADE de vocabulário pronto — ninguém precisa desenhar
 * um ícone de torre.
 *
 * CQB, Torre e Trincheira são os três que caem porque as posições deles
 * no mapa salvo estão dentro do enquadramento desta cena. Estacionamento
 * ficou para a revelação, que é quando o plano abre e ele aparece.
 */

const CHEGADAS = [30, 48, 66];

export const Simbolos: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <Janela
        escala={interpolate(frame, [0, 120], [ENQ.desenhar.escala, ENQ.simbolosFim.escala], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.33, 0, 0.2, 1),
        })}
        centro={{
          x: interpolate(frame, [0, 120], [ENQ.desenhar.centro.x, ENQ.simbolosFim.centro.x], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.33, 0, 0.2, 1),
          }),
          y: 360,
        }}
      >
        <Documento>
          <Pecas
            frame={frame}
            aparicaoDe={(i) => {
              if (i <= FIM_DESENHAR) return 1;
              const chegada = CHEGADAS[i - FIM_DESENHAR - 1];
              if (chegada === undefined) return 0;
              return interpolate(frame, [chegada, chegada + 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
            }}
          />
        </Documento>
      </Janela>

      <FitaSimbolos
        frameLocal={frame}
        entrada={interpolate(frame, [0, 14], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
        // No alto, e não no rodapé da janela: embaixo a fita caía
        // exatamente em cima do CQB e da Trincheira, que são justamente
        // os símbolos que a cena está soltando no mapa.
        y={270}
      />

      <Legenda kicker="17 símbolos táticos" titulo="Base, safe, CQB, torre…" entrada={4} />
    </AbsoluteFill>
  );
};
