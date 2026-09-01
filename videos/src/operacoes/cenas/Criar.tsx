import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Cursor, posicaoCursor, pulsoDoClique, type Parada } from "../../componentes/Cursor";
import { COR, FONTE_DADO } from "../../tema";
import { BUSCA_CAMPO, LADOS, OPERACAO, digitado } from "../dados";
import { Botao, CampoForm, Chip, GradeTatica, Painel, Passo, surgir } from "../pecas";

/**
 * 2–8 s — abrir a operação.
 *
 * A primeira objeção de quem organiza jogo não é "será que é bom", é
 * "quanto trabalho isso me dá". Por isso a cena é o formulário sendo
 * preenchido em seis segundos, com o ponteiro visível: campo, data,
 * dois lados com vagas, dois lotes de preço, publicar.
 *
 * O ponteiro existe para os cliques não virarem mágica — sem ele, a
 * pessoa não entende que é ELA quem faz aquilo.
 *
 * Geometria: o painel ocupa x 700–1760 e o texto vive na coluna da
 * esquerda (x 110). As paradas do cursor são coordenadas de tela, e
 * batem com as caixas desenhadas abaixo — mexer numa exige mexer na
 * outra.
 */

const PARADAS: Parada[] = [
  { frame: 0, x: 980, y: 980 },
  { frame: 12, x: 900, y: 296, clique: true },
  { frame: 62, x: 900, y: 409, clique: true },
  { frame: 88, x: 820, y: 652, clique: true },
  { frame: 118, x: 900, y: 747, clique: true },
  { frame: 148, x: 880, y: 843, clique: true },
  { frame: 186, x: 880, y: 843 },
];

export const Criar: React.FC = () => {
  const frame = useCurrentFrame();
  const cursor = posicaoCursor(frame, PARADAS);
  const clique = pulsoDoClique(frame, PARADAS);

  const digitando = frame >= 14 && frame < 56;
  const escolheu = frame >= 58;

  /* O campo primeiro é digitado, depois vira a ficha escolhida no
     diretório — que é o que a ferramenta faz: você busca, ela acha. */
  const valorCampo = escolheu
    ? `${OPERACAO.campo} — ${OPERACAO.cidade}`
    : digitado(BUSCA_CAMPO, frame, 14);

  const publicou = frame >= 152;

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.5} />

      <Passo numero="01" titulo={"Abra a\noperação"} frame={frame} entrada={4} />

      <div
        style={{
          position: "absolute",
          left: 110,
          top: 560,
          width: 470,
          fontFamily: FONTE_DADO,
          fontSize: 24,
          lineHeight: 1.7,
          letterSpacing: "0.04em",
          color: COR.texto2,
          opacity: surgir(frame, 24, 18),
        }}
      >
        Campo, data, os lados do jogo e as vagas de cada um. Um minuto.
      </div>

      <div
        style={{
          position: "absolute",
          left: 700,
          top: 140,
          opacity: surgir(frame, 0, 10),
          translate: `0 ${interpolate(surgir(frame, 0, 10), [0, 1], [24, 0])}px`,
        }}
      >
        <Painel
          titulo="Nova operação"
          etiqueta={publicou ? "Aberta" : "Rascunho"}
          corEtiqueta={publicou ? COR.oliva300 : COR.texto2}
          largura={1060}
        >
          <div style={{ padding: 36, display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ position: "relative" }}>
              <CampoForm
                rotulo="Campo"
                valor={valorCampo}
                digitando={digitando}
                frame={frame}
              />
              {escolheu ? (
                <div style={{ position: "absolute", right: 16, top: 42, opacity: surgir(frame, 58, 8) }}>
                  <Chip tom="oliva">Do diretório</Chip>
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 24 }}>
              <CampoForm
                rotulo="Data"
                valor={frame >= 70 ? "13/09/2026" : ""}
                largura={482}
              />
              <CampoForm
                rotulo="Início"
                valor={frame >= 78 ? OPERACAO.inicio : ""}
                largura={482}
              />
            </div>

            <div>
              <div
                style={{
                  fontFamily: FONTE_DADO,
                  fontSize: 18,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: COR.texto2,
                  marginBottom: 9,
                }}
              >
                Lados do jogo
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {LADOS.map((lado, i) => {
                  /* O primeiro lado já vem sugerido pela ferramenta; o
                     SEGUNDO é o que entra depois do clique em
                     "+ adicionar lado", e é ele que mostra que a
                     divisão do jogo é decisão de quem organiza. */
                  const entra = i === 0 ? surgir(frame, 82, 10) : surgir(frame, 96, 10);
                  return (
                    <div
                      key={lado.nome}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        height: 62,
                        padding: "0 18px",
                        border: `1px solid ${COR.bordaForte}`,
                        backgroundColor: COR.papel,
                        opacity: entra,
                        translate: `0 ${interpolate(entra, [0, 1], [-8, 0])}px`,
                      }}
                    >
                      <span style={{ fontSize: 27, color: COR.tinta }}>{lado.nome}</span>
                      <span
                        style={{
                          fontFamily: FONTE_DADO,
                          fontSize: 22,
                          letterSpacing: "0.1em",
                          color: COR.oliva300,
                        }}
                      >
                        {lado.vagas} vagas
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: 14,
                  fontFamily: FONTE_DADO,
                  fontSize: 21,
                  letterSpacing: "0.08em",
                  color: frame >= 88 && frame < 104 ? COR.oliva300 : COR.texto2,
                }}
              >
                + adicionar lado
              </div>
            </div>

            <div style={{ display: "flex", gap: 24 }}>
              <CampoForm
                rotulo="Lote antecipado"
                valor={frame >= 124 ? "35,00" : ""}
                largura={482}
              />
              <CampoForm rotulo="No dia" valor={frame >= 132 ? "50,00" : ""} largura={482} />
            </div>

            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 22 }}>
              <Botao aceso={publicou ? interpolate(frame, [152, 168], [1, 0.2], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }) : 0}>
                Publicar evento
              </Botao>
              <span
                style={{
                  fontFamily: FONTE_DADO,
                  fontSize: 20,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: COR.texto2,
                  opacity: surgir(frame, 140, 12),
                }}
              >
                Grátis · sem taxa
              </span>
            </div>
          </div>
        </Painel>
      </div>

      <Cursor x={cursor.x} y={cursor.y} clique={clique} />
    </AbsoluteFill>
  );
};
