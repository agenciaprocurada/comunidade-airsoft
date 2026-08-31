import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cursor, posicaoCursor, pulsoDoClique, type Parada } from "../../componentes/Cursor";
import { COR, FONTE_DADO, FONTE_TEXTO } from "../../tema";
import { JOGADORES, TOTAL_FIM, corDoLado } from "../dados";
import { Chip, GradeTatica, LinhaJogador, Painel, Passo, surgir } from "../pecas";

/**
 * 17–20 s — o dia do jogo.
 *
 * A lista deixa de ser inscrição e vira prancheta: quem pagou, quem
 * chegou. O ponteiro volta, porque agora É o organizador quem age — a
 * cena anterior era a lista trabalhando sozinha, esta é o portão do
 * campo às sete da manhã.
 *
 * Uma linha fica com "presente" apagado até o fim de propósito:
 * lista honesta tem quem confirmou e não apareceu, e é isso que a
 * ferramenta guarda para a próxima operação.
 */

/** Em que frame cada chip acende. `0` = já vem aceso. */
const ACENDE = {
  presente: [0, 22, 54, 70, -1],
  pago: [0, 0, 40, 0, 0],
} as const;

const LINHA_Y = [311, 389, 467, 545, 623];

const PARADAS: Parada[] = [
  { frame: 0, x: 980, y: 980 },
  { frame: 22, x: 1660, y: LINHA_Y[1], clique: true },
  { frame: 40, x: 1490, y: LINHA_Y[2], clique: true },
  { frame: 54, x: 1660, y: LINHA_Y[2], clique: true },
  { frame: 70, x: 1660, y: LINHA_Y[3], clique: true },
  { frame: 96, x: 1640, y: 670 },
];

export const NoDia: React.FC = () => {
  const frame = useCurrentFrame();
  const cursor = posicaoCursor(frame, PARADAS);
  const clique = pulsoDoClique(frame, PARADAS);

  const aceso = (quando: number) => (quando >= 0 && frame >= quando ? 1 : 0);
  const presentes = 14 + ACENDE.presente.filter((q) => aceso(q) === 1).length;

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.5} />

      <Passo numero="04" titulo={"No portão\ndo campo"} frame={frame} entrada={2} />

      <div
        style={{
          position: "absolute",
          left: 110,
          top: 640,
          width: 470,
          fontFamily: FONTE_DADO,
          fontSize: 24,
          lineHeight: 1.7,
          letterSpacing: "0.04em",
          color: COR.texto2,
          opacity: surgir(frame, 14, 16),
        }}
      >
        Um toque para “pago”, um para “presente”. O dinheiro é combinado
        direto com você — não passa pela plataforma.
      </div>

      <div style={{ position: "absolute", left: 700, top: 210, opacity: surgir(frame, 0, 8) }}>
        <Painel
          titulo="Lista · dia do jogo"
          etiqueta={`${presentes}/${TOTAL_FIM} presentes`}
          largura={1060}
          pulso
        >
          <div>
            {JOGADORES.slice(0, 5).map((jogador, i) => (
              <LinhaJogador
                key={jogador.nome}
                nome={jogador.nome}
                lado={jogador.lado}
                cor={corDoLado(jogador.lado)}
                altura={78}
                direita={
                  <>
                    <Chip tom="ok" marcavel aceso={aceso(ACENDE.pago[i])}>
                      Pago
                    </Chip>
                    <Chip tom="oliva" marcavel aceso={aceso(ACENDE.presente[i])}>
                      Presente
                    </Chip>
                  </>
                }
              />
            ))}
          </div>

          {/*
            O campo de anotar à mão. Sempre vai ter quem mande o nome no
            grupo e não use o site — e lista pela metade é lista que o
            organizador abandona na semana seguinte.
          */}
          <div style={{ borderTop: `1px solid ${COR.borda}`, backgroundColor: COR.papel, padding: 26 }}>
            <div
              style={{
                fontFamily: FONTE_DADO,
                fontSize: 19,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: COR.texto2,
              }}
            >
              Anotar quem mandou no grupo
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
              <div
                style={{
                  flex: 1,
                  height: 62,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 18px",
                  border: `1px solid ${COR.bordaForte}`,
                  backgroundColor: COR.fundo,
                  fontFamily: FONTE_TEXTO,
                  fontSize: 25,
                  color: COR.texto2,
                }}
              >
                Nome do jogador
              </div>
              <div
                style={{
                  height: 62,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 30px",
                  backgroundColor: COR.oliva500,
                  fontFamily: FONTE_DADO,
                  fontSize: 22,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: COR.fundo,
                }}
              >
                Adicionar
              </div>
            </div>
          </div>
        </Painel>
      </div>

      <Cursor x={cursor.x} y={cursor.y} clique={clique} />
    </AbsoluteFill>
  );
};
