import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COR, FONTE_DISPLAY, FONTE_TEXTO } from "../../tema";
import { GRUPO } from "../dados";
import {
  BarraDeEnvio,
  CabecalhoDaConversa,
  FundoDaConversa,
  ZAP,
} from "../conversa";
import { GradeTatica, Telefone, surgir } from "../pecas";

/**
 * O gancho — 10 s, e nenhum segundo mostrando o produto.
 *
 * Quem não sente o problema não vê valor na solução. Esta cena é a
 * tela que o organizador reconhece antes de ler qualquer palavra: o
 * anúncio da operação no grupo e, embaixo, a lista numerada na mão —
 * com o time repetido oito vezes porque ninguém sabe quem vai, o 💰
 * marcando quem pagou e o "Ler mais" cortando o resto.
 *
 * O formato veio de prints reais de grupos de airsoft. Os nomes são
 * fictícios e o Pix é falso: a forma é que precisa ser verdadeira.
 *
 * Três batidas:
 *   1. o anúncio (0–3 s)      — "sua lista de presença hoje é assim?"
 *   2. a lista rolando (3–7 s) — o tamanho do problema
 *   3. as perguntas (7–10 s)  — "e você corre atrás. toda semana."
 */

/** O anúncio, na forma em que ele é escrito de verdade. */
const ANUNCIO = [
  { t: "🔥 OPERAÇÃO FÊNIX", forte: true },
  { t: "Organização: Equipe Fênix ⚡" },
  { t: "📅 Data: 13/setembro/2026 (domingo)" },
  { t: "obs: em caso de chuva o game será no dia 27/09" },
  { t: "" },
  { t: "⏰ Horário", forte: true },
  { t: "Abertura dos portões: 7:00" },
  { t: "Briefing: 8:30" },
  { t: "Início do Jogo: 9:00" },
  { t: "Término do Jogo: 13:00" },
  { t: "" },
  { t: "💰 Valor", forte: true },
  { t: "1º lote R$ 35,00 — pagamento até 05/09" },
  { t: "2º lote R$ 50,00 no dia" },
  { t: "" },
  { t: "Pix: (51) 9xxxx-xxxx" },
  { t: "👉 Somente o pagamento garante a vaga." },
  { t: "" },
  { t: "🎒 Incluso", forte: true },
  { t: "• Ingresso do jogo" },
  { t: "• Patch do jogo" },
  { t: "• Água e frutas" },
  { t: "" },
  { t: "🛡️ PMC — farda preta ou multicam", forte: true },
];

/**
 * A lista na mão.
 *
 * O time repetido é o detalhe que faz todo organizador rir de nervoso:
 * o líder reserva seis vagas e ninguém sabe quem são as pessoas até o
 * dia. O 💰 é o controle de pagamento — feito com emoji, porque não
 * existe outro lugar para guardar isso.
 */
const LISTA_NA_MAO = [
  "1. Rafael M. 💰",
  "2. Bruno T. +1 💰",
  "3. ALCATEIA",
  "4. ALCATEIA",
  "5. ALCATEIA",
  "6. ALCATEIA",
  "7. ALCATEIA",
  "8. ALCATEIA",
  "9. Diego A.",
  "10. Caio R. 💰",
  "11. Léo NNS 💰",
  "12. Tiago S.",
  "13. Marcos V. 💰",
  "14. Ana C. 💰",
  "15. amigo do Bruno",
  "16. Wesley P.",
  "17. Venerável 💰",
  "18. Ghost 💰",
  "19. Teixeira",
  "20. Especialista 💰",
];

/** As perguntas que chegam toda semana, sempre as mesmas. */
const PERGUNTAS = [
  { texto: "ainda tem vaga?", de: "Léo" },
  { texto: "posso levar um amigo?", de: "Ana" },
  { texto: "quem já confirmou?", de: "Marcos" },
  { texto: "manda a lista de novo aí", de: "Tiago" },
];

export const Dor: React.FC<{
  /** Frames em que cada batida começa. */
  batidas?: { lista: number; perguntas: number };
  telefone?: { x: number; y: number; largura: number; altura: number };
  legenda?: {
    x: number;
    y: number;
    largura: number;
    tamanho: number;
    /** Centralizado no 9:16, onde o aparelho também é centralizado. */
    centro?: boolean;
  };
}> = ({
  batidas = { lista: 90, perguntas: 210 },
  telefone = { x: 240, y: 300, largura: 600, altura: 1060 },
  legenda = { x: 64, y: 1400, largura: 952, tamanho: 76 },
}) => {
  const frame = useCurrentFrame();

  /* A conversa rola devagar do anúncio para a lista, como o dedo de
     quem procura o próprio nome. */
  const rolagem = interpolate(frame, [batidas.lista, batidas.perguntas - 20], [0, -980], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.5} />

      <div
        style={{
          position: "absolute",
          left: telefone.x,
          top: telefone.y,
          opacity: surgir(frame, 0, 10),
          scale: interpolate(surgir(frame, 0, 30), [0, 1], [0.97, 1], {
            output: "perceptual-scale",
          }),
        }}
      >
        <Telefone largura={telefone.largura} altura={telefone.altura} hora="21:48">
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CabecalhoDaConversa nome={GRUPO.nome} membros={GRUPO.membros} />

            <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
              <FundoDaConversa />

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  padding: 14,
                  translate: `0 ${rolagem}px`,
                }}
              >
                {/* O anúncio e a lista são UMA mensagem só, como no
                    grupo de verdade: o organizador escreve tudo junto
                    e vai editando a mesma mensagem a semana inteira. */}
                <div
                  style={{
                    maxWidth: telefone.largura - 130,
                    padding: "10px 12px 6px",
                    borderRadius: 9,
                    borderTopLeftRadius: 0,
                    backgroundColor: ZAP.recebida,
                    boxShadow: ZAP.sombra,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONTE_TEXTO,
                      fontSize: 17,
                      fontWeight: 600,
                      color: ZAP.nomes[0],
                      marginBottom: 4,
                    }}
                  >
                    Rodrigo
                  </div>

                  {ANUNCIO.map((linha, i) => (
                    <div
                      key={`${linha.t}-${i}`}
                      style={{
                        fontFamily: FONTE_TEXTO,
                        fontSize: linha.forte ? 20 : 19,
                        fontWeight: linha.forte ? 700 : 400,
                        lineHeight: 1.45,
                        color: ZAP.texto,
                        minHeight: linha.t === "" ? 10 : undefined,
                      }}
                    >
                      {linha.t}
                    </div>
                  ))}

                  <div style={{ height: 10 }} />

                  {LISTA_NA_MAO.map((linha) => (
                    <div
                      key={linha}
                      style={{
                        fontFamily: FONTE_TEXTO,
                        fontSize: 19,
                        lineHeight: 1.5,
                        color: ZAP.texto,
                      }}
                    >
                      {linha}
                    </div>
                  ))}

                  <div
                    style={{
                      marginTop: 8,
                      fontFamily: FONTE_TEXTO,
                      fontSize: 19,
                      fontWeight: 600,
                      color: "#027eb5",
                    }}
                  >
                    Ler mais
                  </div>

                  <div
                    style={{
                      marginTop: 2,
                      textAlign: "right",
                      fontFamily: FONTE_TEXTO,
                      fontSize: 14,
                      color: ZAP.hora,
                    }}
                  >
                    17:12
                  </div>
                </div>

                {/* As perguntas: chegam depois, uma atrás da outra, e
                    é a repetição que é o argumento. */}
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {PERGUNTAS.map((pergunta, i) => {
                    const entrada = surgir(frame, batidas.perguntas + i * 16, 6);
                    if (entrada === 0) return null;
                    return (
                      <div
                        key={pergunta.texto}
                        style={{
                          alignSelf: "flex-start",
                          maxWidth: telefone.largura - 190,
                          padding: "9px 12px 5px",
                          borderRadius: 9,
                          borderTopLeftRadius: 0,
                          backgroundColor: ZAP.recebida,
                          boxShadow: ZAP.sombra,
                          opacity: entrada,
                          translate: `${(1 - entrada) * -18}px 0`,
                        }}
                      >
                        <div
                          style={{
                            fontFamily: FONTE_TEXTO,
                            fontSize: 17,
                            fontWeight: 600,
                            color: ZAP.nomes[(i + 1) % ZAP.nomes.length],
                            marginBottom: 3,
                          }}
                        >
                          {pergunta.de}
                        </div>
                        <div style={{ fontFamily: FONTE_TEXTO, fontSize: 21, color: ZAP.texto }}>
                          {pergunta.texto}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <BarraDeEnvio />
          </div>
        </Telefone>
      </div>

      {/* Duas frases, uma por metade da cena. Curtas: em vídeo mudo,
          legenda longa é legenda não lida. */}
      <div
        style={{
          position: "absolute",
          left: legenda.x,
          top: legenda.y,
          width: legenda.largura,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            fontFamily: FONTE_DISPLAY,
            fontWeight: 700,
            fontSize: legenda.tamanho,
            lineHeight: 1,
            textTransform: "uppercase",
            color: COR.tinta,
            textAlign: legenda.centro ? "center" : "left",
            textShadow: "0 4px 24px rgba(0,0,0,0.85)",
            opacity: interpolate(
              frame,
              [10, 26, batidas.perguntas - 16, batidas.perguntas - 2],
              [0, 1, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
          }}
        >
          Sua lista de presença
          <br />
          hoje é <span style={{ color: COR.latao }}>assim?</span>
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            fontFamily: FONTE_DISPLAY,
            fontWeight: 700,
            fontSize: legenda.tamanho,
            lineHeight: 1,
            textTransform: "uppercase",
            color: COR.tinta,
            textAlign: legenda.centro ? "center" : "left",
            textShadow: "0 4px 24px rgba(0,0,0,0.85)",
            opacity: surgir(frame, batidas.perguntas + 6, 12),
          }}
        >
          E você corre atrás
          <br />
          de todo mundo.
          <br />
          <span style={{ color: COR.latao }}>Toda semana.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
