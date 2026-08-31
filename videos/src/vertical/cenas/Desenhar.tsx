import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Documento } from "../../componentes/Documento";
import { AreaEmConstrucao } from "../../componentes/Area";
import { Cursor, posicaoCursor, pulsoDoClique, type Parada } from "../../componentes/Cursor";
import { Janela, docParaTela } from "../Janela";
import { ENQ } from "../enquadramentos";
import { CartaoFerramentas } from "../cartoes";
import { Legenda } from "../Moldura";
import { Pecas } from "../pecas";
import { AREA_RESPAWN_ALFA } from "../../dados/respawn";
import { COR_RESPAWN } from "../../dados/simbolos";
import { COR } from "../../tema";

/**
 * 7–13 s — desenhar a área de respawn, clique a clique.
 *
 * A cena mais longa, e de propósito: é a única que responde "como é
 * usar isso?". Cada vértice tem 12 frames — rápido demais e vira
 * animação, e animação ninguém acredita que consegue repetir.
 *
 * O enquadramento fica PARADO aqui. O ponteiro precisa cair em
 * coordenadas exatas do documento, e câmera em movimento exigiria
 * recalcular a conversão a cada frame só para o ponteiro escorregar.
 */

const CLIQUES = [30, 42, 54, 66, 78, 90];
const FECHA = 104;

const TELA = AREA_RESPAWN_ALFA.map(([x, y]) =>
  docParaTela(x, y, ENQ.desenhar.escala, ENQ.desenhar.centro),
);

/** Centro do botão "Área" na barra horizontal: 7 células de 136 px a partir de x=64. */
const BOTAO_AREA = { x: 64 + 136 * 2.5, y: 366 };

const PARADAS: Parada[] = [
  { frame: 0, x: 620, y: 860 },
  { frame: 14, x: BOTAO_AREA.x, y: BOTAO_AREA.y, clique: true },
  ...CLIQUES.map((frame, i) => ({ frame, x: TELA[i].x, y: TELA[i].y, clique: true })),
  { frame: FECHA, x: TELA[0].x, y: TELA[0].y, clique: true },
  { frame: 126, x: 700, y: 700, clique: true },
  { frame: 180, x: 760, y: 760 },
];

export const Desenhar: React.FC = () => {
  const frame = useCurrentFrame();
  const cursor = posicaoCursor(frame, PARADAS);

  const verticesPostos = CLIQUES.filter((f) => frame >= f).length;
  const fechada = frame >= FECHA;

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <Janela escala={ENQ.desenhar.escala} centro={ENQ.desenhar.centro}>
        <Documento>
          {fechada ? null : (
            <AreaEmConstrucao
              pontos={AREA_RESPAWN_ALFA}
              cor={COR_RESPAWN}
              vertices={verticesPostos}
              cursor={[
                ENQ.desenhar.centro.x + (cursor.x - 540) / ENQ.desenhar.escala,
                ENQ.desenhar.centro.y + (cursor.y - 800) / ENQ.desenhar.escala,
              ]}
            />
          )}

          <Pecas
            frame={frame}
            aparicaoDe={(i) =>
              i === 0
                ? interpolate(frame, [FECHA, FECHA + 14], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })
                : i === 1
                  ? interpolate(frame, [126, 140], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    })
                  : 0
            }
          />
        </Documento>
      </Janela>

      <CartaoFerramentas
        ativa={frame >= 16 ? "area" : "selecionar"}
        entrada={interpolate(frame, [0, 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}
        y={300}
      />

      <Legenda kicker="Passo 2" titulo="Desenhe as áreas clicando" entrada={4} saida={100} />
      <Legenda kicker="Camada criada" titulo="Área de respawn no mapa" entrada={112} />

      <Cursor x={cursor.x} y={cursor.y} clique={pulsoDoClique(frame, PARADAS)} />
    </AbsoluteFill>
  );
};
