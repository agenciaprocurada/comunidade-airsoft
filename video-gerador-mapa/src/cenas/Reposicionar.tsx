import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Editor, ESCALA_DOC } from "../componentes/Editor";
import { Documento } from "../componentes/Documento";
import { BaseSatelite } from "../componentes/BaseSatelite";
import { Area } from "../componentes/Area";
import { Marcador } from "../componentes/Marcador";
import { Cursor, posicaoCursor, pulsoDoClique, type Parada } from "../componentes/Cursor";
import { AREA_RESPAWN_ALFA, MARCADOR_ALFA } from "../dados/respawn";
import { COR_RESPAWN, ESCALA_MINIMA_VIDEO } from "../dados/simbolos";
import { COR, FONTE_DADO, FONTE_DISPLAY, FONTE_TEXTO } from "../tema";

/**
 * 8–10 s — reposicionar o satélite.
 *
 * O painel que abre POR CIMA do editor, e não um passo para trás: a
 * primeira versão da ferramenta era um assistente de três passos e
 * trocar o local exigia voltar dois. O vídeo mostra o comportamento
 * atual porque é ele que vende — dois segundos, sem sair da tela.
 *
 * O voo de aproximação é feito com duas camadas de tiles (z15 e z17)
 * que se cruzam no meio do caminho: ampliar uma só ficaria borrado
 * exatamente no frame em que o espectador está olhando o terreno.
 */

const PARADAS: Parada[] = [
  { frame: 0, x: 1874, y: 92 },
  { frame: 6, x: 1767, y: 219, clique: true },
  { frame: 30, x: 1200, y: 620 },
  { frame: 50, x: 1420, y: 862, clique: true },
  { frame: 66, x: 1420, y: 862 },
];

export const Reposicionar: React.FC = () => {
  const frame = useCurrentFrame();
  const cursor = posicaoCursor(frame, PARADAS);

  /** 0 a 1: o voo de z15 para z17 dentro do painel. */
  const voo = interpolate(frame, [14, 48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.42, 0, 0.18, 1),
  });
  /**
   * A relação entre as duas camadas é fixa: z17 tem 4× a resolução de
   * z15 por metro de terreno, então z15 tem que aparecer 4× maior para
   * mostrar o MESMO chão. É isso que faz a troca no meio do voo passar
   * despercebida.
   *
   * O 0,29 é o piso: com ele o mosaico de 1024 px cobre os 1132 px da
   * área do painel já no primeiro frame (1024 × 0,29 × 4 = 1188). Menos
   * que isso e sobra tarja preta na lateral.
   */
  const escalaZ17 = 0.29 * 2 ** (2 * voo);

  // Fecha sozinho no fim: quem "usou este local" volta para o editor, e
  // é de lá que a cena seguinte parte.
  const abertura = interpolate(frame, [8, 22, 54, 64], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <Editor
        ferramenta="selecionar"
        camadas={[
          { rotulo: "Área de respawn", cor: COR_RESPAWN, entrada: 1 },
          { rotulo: "Respawn", cor: COR_RESPAWN, entrada: 1 },
        ]}
        menuAberto={frame < 10}
        dica="Arraste o mapa para escolher outro enquadramento."
      >
        <div style={{ width: 1280, height: 720, scale: ESCALA_DOC }}>
          <Documento>
            <Area
              pontos={AREA_RESPAWN_ALFA}
              traco={COR_RESPAWN}
              preenchimento="#22c55e38"
              espessura={3}
              tracejado={[12, 8]}
              aparicao={1}
            />
            <Marcador
              x={MARCADOR_ALFA.x}
              y={MARCADOR_ALFA.y}
              escala={ESCALA_MINIMA_VIDEO}
              cor={COR_RESPAWN}
              rotulo={MARCADOR_ALFA.rotulo}
            />
          </Documento>
        </div>
      </Editor>

      {/* Escurecimento por trás do painel. */}
      <AbsoluteFill style={{ backgroundColor: `rgba(4,6,3,${0.72 * abertura})` }} />

      {/* ---------- Painel de reposicionamento ---------- */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 1180,
            height: 760,
            backgroundColor: COR.papel,
            border: `1px solid ${COR.bordaForte}`,
            boxShadow: "0 40px 120px -20px rgba(0,0,0,0.95)",
            display: "flex",
            flexDirection: "column",
            opacity: abertura,
            scale: interpolate(abertura, [0, 1], [0.94, 1], { output: "perceptual-scale" }),
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "18px 24px",
              borderBottom: `1px solid ${COR.borda}`,
            }}
          >
            <span
              style={{
                fontFamily: FONTE_DISPLAY,
                fontSize: 26,
                fontWeight: 600,
                color: COR.tinta,
              }}
            >
              Reposicionar satélite
            </span>
            <span
              style={{
                marginLeft: 16,
                fontFamily: FONTE_DADO,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: COR.texto2,
              }}
            >
              Arraste o mapa · a grade não se move
            </span>
            <svg
              viewBox="0 0 24 24"
              width={22}
              height={22}
              fill="none"
              stroke={COR.texto2}
              strokeWidth={1.8}
              strokeLinecap="square"
              style={{ marginLeft: "auto" }}
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </div>

          <div style={{ padding: "16px 24px 0" }}>
            <div
              style={{
                border: `1px solid ${COR.borda}`,
                backgroundColor: COR.fundo,
                padding: "11px 16px",
                fontFamily: FONTE_TEXTO,
                fontSize: 16,
                color: COR.tinta,
              }}
            >
              Bengazi Airsoft — Novo Hamburgo, RS
            </div>
          </div>

          {/* Mapa do painel */}
          <div
            style={{
              margin: "16px 24px",
              flex: 1,
              position: "relative",
              overflow: "hidden",
              border: `1px solid ${COR.borda}`,
              backgroundColor: "#070a06",
            }}
          >
            <BaseSatelite
              camada="z15"
              style={{
                scale: escalaZ17 * 4,
                opacity: interpolate(voo, [0.44, 0.62], [1, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            />
            <BaseSatelite
              camada="z17"
              style={{
                scale: escalaZ17,
                opacity: interpolate(voo, [0.44, 0.62], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            />

            {/* Retângulo do documento e mira central. */}
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
              <div
                style={{
                  width: 640,
                  height: 360,
                  border: `2px dashed ${COR.oliva300}`,
                  boxShadow: "0 0 0 9999px rgba(4,6,3,0.35)",
                  opacity: interpolate(voo, [0.55, 0.8], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              />
            </AbsoluteFill>
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
              <svg width={72} height={72} viewBox="0 0 72 72">
                <circle cx={36} cy={36} r={17} fill="none" stroke="#f0f2e9" strokeWidth={2} />
                <path d="M36 6v16M36 50v16M6 36h16M50 36h16" stroke="#f0f2e9" strokeWidth={2} />
              </svg>
            </AbsoluteFill>

            <span
              style={{
                position: "absolute",
                left: 14,
                bottom: 12,
                fontFamily: FONTE_DADO,
                fontSize: 14,
                color: "#fff",
                textShadow: "0 1px 4px rgba(0,0,0,0.95)",
              }}
            >
              29°50′03″S 51°10′20″W · ZOOM{" "}
              {Math.round(interpolate(voo, [0, 1], [15, 19], { extrapolateRight: "clamp" }))}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "0 24px 22px",
            }}
          >
            <span style={{ fontFamily: FONTE_TEXTO, fontSize: 15, color: COR.texto2 }}>
              O desenho fica onde está — só a foto de satélite se move por baixo.
            </span>
            <div
              style={{
                marginLeft: "auto",
                padding: "11px 20px",
                border: `1px solid ${COR.borda}`,
                fontFamily: FONTE_TEXTO,
                fontSize: 16,
                color: COR.texto,
              }}
            >
              Cancelar
            </div>
            <div
              style={{
                padding: "11px 24px",
                backgroundColor: frame >= 50 ? COR.oliva300 : COR.oliva500,
                color: COR.fundo,
                fontFamily: FONTE_TEXTO,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              Usar este local
            </div>
          </div>
        </div>
      </AbsoluteFill>

      <Cursor x={cursor.x} y={cursor.y} clique={pulsoDoClique(frame, PARADAS)} />
    </AbsoluteFill>
  );
};
