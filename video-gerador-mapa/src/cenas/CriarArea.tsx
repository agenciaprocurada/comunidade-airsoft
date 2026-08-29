import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  docParaTela,
  Editor,
  ESCALA_DOC,
  ORIGEM_DOC,
  type CamadaPainel,
} from "../componentes/Editor";
import { Documento } from "../componentes/Documento";
import { Area, AreaEmConstrucao } from "../componentes/Area";
import { Marcador } from "../componentes/Marcador";
import { Cursor, posicaoCursor, pulsoDoClique, type Parada } from "../componentes/Cursor";
import { AREA_RESPAWN_ALFA, MARCADOR_ALFA } from "../dados/respawn";
import { COR_RESPAWN, ESCALA_MINIMA_VIDEO } from "../dados/simbolos";

/**
 * 2–8 s — entrar na ferramenta e criar a área de respawn.
 *
 * O trecho mais longo do vídeo, e o único que precisa ser LENTO: é aqui
 * que quem assiste entende que a ferramenta é clicável, não um gerador
 * automático. Por isso cada vértice tem seus 9 frames — clique rápido
 * demais vira animação, e animação não convence ninguém a experimentar.
 */

/** Vértice i é clicado neste frame. O sétimo clique fecha o polígono. */
const CLIQUES_VERTICE = [40, 49, 58, 67, 76, 85];
const FRAME_FECHA = 94;

const TELA_VERTICES = AREA_RESPAWN_ALFA.map(([x, y]) => docParaTela(x, y));

const PARADAS: Parada[] = [
  { frame: 0, x: 1700, y: 1010 },
  { frame: 22, x: 71, y: 296, clique: true },
  ...CLIQUES_VERTICE.map((frame, i) => ({
    frame,
    x: TELA_VERTICES[i].x,
    y: TELA_VERTICES[i].y,
    clique: true,
  })),
  { frame: FRAME_FECHA, x: TELA_VERTICES[0].x, y: TELA_VERTICES[0].y, clique: true },
  { frame: 114, x: 1679, y: 171, clique: true },
  { frame: 132, x: 1722, y: 327, clique: true },
  { frame: 168, x: 1330, y: 700 },
];

export const CriarArea: React.FC = () => {
  const frame = useCurrentFrame();

  const cursor = posicaoCursor(frame, PARADAS);
  const verticesPostos = CLIQUES_VERTICE.filter((f) => frame >= f).length;
  const fechada = frame >= FRAME_FECHA;

  const abaConteudo = frame >= 114 && frame < 152 ? "estrutura" : "camadas";

  const camadas: CamadaPainel[] = [];
  if (frame >= FRAME_FECHA) {
    camadas.push({
      rotulo: "Área de respawn",
      cor: COR_RESPAWN,
      entrada: interpolate(frame, [FRAME_FECHA, FRAME_FECHA + 12], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    });
  }
  if (frame >= 138) {
    camadas.push({
      rotulo: "Respawn",
      cor: COR_RESPAWN,
      entrada: interpolate(frame, [154, 166], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    });
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0b0d09",
        scale: interpolate(frame, [150, 186], [1, 1.025], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          output: "perceptual-scale",
        }),
      }}
    >
      <Editor
        ferramenta={frame >= 26 ? "area" : "selecionar"}
        camadas={camadas}
        abaConteudo={abaConteudo}
        simboloDestacado={frame >= 126 && frame < 152 ? "Respawn" : null}
        montagem={interpolate(frame, [0, 30], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
        dica={
          frame < 26
            ? "Clique para selecionar e arraste para mover."
            : frame < FRAME_FECHA
              ? "Clique em cada canto da área. Clique no primeiro ponto para fechar."
              : "Área criada. Escolha um símbolo para nomear o ponto."
        }
      >
        <div style={{ width: 1280, height: 720, scale: ESCALA_DOC }}>
          <Documento
            grade={interpolate(frame, [8, 44], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
            enfeites={interpolate(frame, [30, 50], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            {fechada ? (
              <Area
                pontos={AREA_RESPAWN_ALFA}
                traco={COR_RESPAWN}
                preenchimento="#22c55e38"
                espessura={3}
                tracejado={[12, 8]}
                aparicao={interpolate(frame, [FRAME_FECHA, FRAME_FECHA + 14], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })}
              />
            ) : (
              <AreaEmConstrucao
                pontos={AREA_RESPAWN_ALFA}
                cor={COR_RESPAWN}
                vertices={verticesPostos}
                cursor={[
                  (cursor.x - ORIGEM_DOC.x) / ESCALA_DOC,
                  (cursor.y - ORIGEM_DOC.y) / ESCALA_DOC,
                ]}
              />
            )}

            {frame >= 138 ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  translate: `0 ${interpolate(frame, [138, 152], [-26, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  })}px`,
                }}
              >
                <Marcador
                  x={MARCADOR_ALFA.x}
                  y={MARCADOR_ALFA.y}
                  escala={ESCALA_MINIMA_VIDEO}
                  cor={COR_RESPAWN}
                  rotulo={MARCADOR_ALFA.rotulo}
                  opacidade={interpolate(frame, [138, 148], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}
                  pulso={interpolate(frame, [138, 154], [1.45, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.bezier(0.16, 1, 0.3, 1),
                  })}
                />
              </div>
            ) : null}
          </Documento>
        </div>
      </Editor>

      <Cursor
        x={cursor.x}
        y={cursor.y}
        clique={pulsoDoClique(frame, PARADAS)}
        opacidade={interpolate(frame, [0, 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}
      />
    </AbsoluteFill>
  );
};
