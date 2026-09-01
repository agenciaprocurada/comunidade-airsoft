import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Cursor, posicaoCursor, pulsoDoClique, type Parada } from "../../componentes/Cursor";
import { COR, FONTE_DADO, FONTE_DISPLAY, FONTE_TEXTO } from "../../tema";
import { CONVERSA, OPERACAO, TOTAL_VAGAS } from "../dados";
import {
  Botao,
  CaixaLink,
  Chip,
  GradeTatica,
  Painel,
  Passo,
  surgir,
} from "../pecas";

/**
 * 8–12 s — o link.
 *
 * É a cena que carrega a tese do produto: a lista sai do grupo, o
 * grupo fica. Por isso ela mostra as duas coisas na mesma tela — o
 * painel com o link de um lado, a conversa do grupo do outro — e o
 * link atravessando de um para o outro UMA vez.
 *
 * A conversa é genérica de propósito: sem logo, sem marca e sem imitar
 * a interface de nenhum aplicativo. O que a cena diz é "o link é
 * colado no grupo", e isso vale para qualquer grupo.
 */

const PARADAS: Parada[] = [
  { frame: 0, x: 980, y: 980 },
  { frame: 24, x: 1010, y: 400, clique: true },
  { frame: 56, x: 1180, y: 720 },
  { frame: 126, x: 1240, y: 780 },
];

/** Bolha da conversa. */
const Bolha: React.FC<{
  de: string;
  texto: string;
  minha: boolean;
  entrada: number;
  children?: React.ReactNode;
}> = ({ de, texto, minha, entrada, children }) => (
  <div
    style={{
      display: "flex",
      justifyContent: minha ? "flex-end" : "flex-start",
      opacity: entrada,
      translate: `0 ${interpolate(entrada, [0, 1], [16, 0])}px`,
    }}
  >
    <div
      style={{
        maxWidth: 660,
        padding: "14px 18px",
        border: `1px solid ${minha ? COR.oliva700 : COR.borda}`,
        backgroundColor: minha ? COR.oliva050 : COR.papel,
      }}
    >
      {!minha ? (
        <div
          style={{
            fontFamily: FONTE_DADO,
            fontSize: 17,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: COR.texto2,
            marginBottom: 7,
          }}
        >
          {de}
        </div>
      ) : null}
      <div style={{ fontFamily: FONTE_TEXTO, fontSize: 25, color: COR.texto }}>{texto}</div>
      {children}
    </div>
  </div>
);

export const Link: React.FC = () => {
  const frame = useCurrentFrame();
  const cursor = posicaoCursor(frame, PARADAS);
  const clique = pulsoDoClique(frame, PARADAS);

  const copiou = frame >= 28;

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.5} />

      <Passo numero="02" titulo={"Mande o link.\nUma vez."} frame={frame} entrada={2} />

      <div
        style={{
          position: "absolute",
          left: 110,
          top: 600,
          width: 470,
          fontFamily: FONTE_DADO,
          fontSize: 24,
          lineHeight: 1.7,
          letterSpacing: "0.04em",
          color: COR.texto2,
          opacity: surgir(frame, 20, 16),
        }}
      >
        Quem abrir amanhã vê a lista de amanhã. Você não reenvia print
        nenhum.
      </div>

      {/* Painel do organizador, com o link que vai para o grupo. */}
      <div
        style={{
          position: "absolute",
          left: 700,
          top: 130,
          opacity: surgir(frame, 0, 8),
        }}
      >
        <Painel titulo={OPERACAO.titulo} etiqueta="Aberta" largura={1060} pulso>
          <div style={{ padding: 30, display: "flex", flexDirection: "column", gap: 22 }}>
            <CaixaLink
              rotulo="Link do evento"
              link={OPERACAO.link}
              entrada={surgir(frame, 6, 10)}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Botao variante="secundario" tamanho={24}>
                Ver a página
              </Botao>
              <Botao tamanho={24} aceso={copiou ? interpolate(frame, [28, 44], [1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }) : 0}>
                Copiar link
              </Botao>
              <span style={{ opacity: surgir(frame, 30, 8) }}>
                <Chip tom="ok">Copiado</Chip>
              </span>
            </div>
          </div>
        </Painel>
      </div>

      {/* O grupo. */}
      <div
        style={{
          position: "absolute",
          left: 700,
          top: 500,
          opacity: surgir(frame, 38, 10),
        }}
      >
        <Painel titulo="Grupo da equipe" etiqueta="42 membros" corEtiqueta={COR.texto2} largura={1060}>
          <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
            <Bolha
              de={CONVERSA[0].de}
              texto={CONVERSA[0].texto}
              minha
              entrada={surgir(frame, 48, 10)}
            >
              {/* A prévia do link: é ela que faz o grupo clicar. */}
              <div
                style={{
                  marginTop: 14,
                  border: `1px solid ${COR.oliva700}`,
                  backgroundColor: COR.fundo,
                  padding: "14px 18px",
                  opacity: surgir(frame, 54, 10),
                }}
              >
                <div
                  style={{
                    fontFamily: FONTE_DISPLAY,
                    fontWeight: 700,
                    fontSize: 27,
                    textTransform: "uppercase",
                    color: COR.tinta,
                  }}
                >
                  {OPERACAO.titulo} · {OPERACAO.dataCurta}
                </div>
                <div style={{ fontFamily: FONTE_TEXTO, fontSize: 22, color: COR.texto2, marginTop: 6 }}>
                  {OPERACAO.campo} · {TOTAL_VAGAS} vagas · {OPERACAO.precoAntecipado}{" "}
                  {OPERACAO.prazoLote}
                </div>
                <div
                  style={{
                    fontFamily: FONTE_DADO,
                    fontSize: 18,
                    letterSpacing: "0.1em",
                    color: COR.oliva300,
                    marginTop: 10,
                  }}
                >
                  comunidadeairsoft.com.br
                </div>
              </div>
            </Bolha>

            <Bolha
              de={CONVERSA[1].de}
              texto={CONVERSA[1].texto}
              minha={false}
              entrada={surgir(frame, 72, 8)}
            />
            <Bolha
              de={CONVERSA[2].de}
              texto={CONVERSA[2].texto}
              minha={false}
              entrada={surgir(frame, 90, 8)}
            />
          </div>
        </Painel>
      </div>

      <Cursor x={cursor.x} y={cursor.y} clique={clique} />
    </AbsoluteFill>
  );
};
