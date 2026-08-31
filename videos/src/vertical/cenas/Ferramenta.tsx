import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Documento } from "../../componentes/Documento";
import { Cursor, posicaoCursor, pulsoDoClique, type Parada } from "../../componentes/Cursor";
import { Janela } from "../Janela";
import { ENQ } from "../enquadramentos";
import { CartaoBusca } from "../cartoes";
import { Legenda } from "../Moldura";
import { COR } from "../../tema";

/**
 * 2–7 s — achar o campo.
 *
 * A objeção real de quem vê a ferramenta pela primeira vez é "meu campo
 * não deve estar aí". Por isso a cena não abre desenhando: ela abre
 * digitando um endereço e mostrando o satélite chegar. Só depois de
 * responder isso é que vale falar de ferramenta de desenho.
 */

const BUSCA = "Bengazi Airsoft, Novo Hamburgo";

const PARADAS: Parada[] = [
  { frame: 0, x: 540, y: 1300 },
  { frame: 62, x: 300, y: 470, clique: true },
  { frame: 96, x: 540, y: 900 },
  { frame: 150, x: 620, y: 860 },
];

export const Ferramenta: React.FC = () => {
  const frame = useCurrentFrame();
  const cursor = posicaoCursor(frame, PARADAS);

  // Digitação: 2 frames por caractere, começando no frame 6.
  const letras = Math.max(0, Math.min(BUSCA.length, Math.round((frame - 6) / 1.6)));
  const terminouDeDigitar = letras >= BUSCA.length;

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <Janela
        escala={interpolate(frame, [0, 150], [ENQ.ferramentaInicio.escala, ENQ.desenhar.escala], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.33, 0, 0.2, 1),
        })}
        centro={{
          x: interpolate(
            frame,
            [0, 150],
            [ENQ.ferramentaInicio.centro.x, ENQ.desenhar.centro.x],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.33, 0, 0.2, 1),
            },
          ),
          y: 360,
        }}
      >
        {/*
          O satélite entra desbotado e "revela" com a grade: é o que o
          editor faz de verdade ao carregar a base — e é o instante que
          convence, porque o terreno que aparece é o campo da pessoa.
        */}
        <Documento
          grade={interpolate(frame, [66, 126], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
          enfeites={interpolate(frame, [110, 134], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      </Janela>

      {/* Escurecimento que sai quando o mapa "chega". */}
      <AbsoluteFill
        style={{
          backgroundColor: `rgba(6,8,5,${interpolate(frame, [40, 80], [0.55, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })})`,
          pointerEvents: "none",
        }}
      />

      <CartaoBusca
        texto={BUSCA.slice(0, letras)}
        cursorVisivel={!terminouDeDigitar || frame % 20 < 12}
        resultados={frame >= 44 && frame < 70 ? 3 : 0}
        entrada={interpolate(frame, [0, 10, 78, 90], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
        y={300}
      />

      <Legenda kicker="Passo 1" titulo="Ache o campo pelo endereço" entrada={4} saida={82} />
      <Legenda kicker="Satélite" titulo="A foto do terreno já vem junto" entrada={92} />

      <Cursor x={cursor.x} y={cursor.y} clique={pulsoDoClique(frame, PARADAS)} />
    </AbsoluteFill>
  );
};
