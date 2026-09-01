import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COR, FONTE_DISPLAY, FONTE_TEXTO } from "../../tema";
import { ZAP } from "../conversa";
import { GradeTatica, Telefone, surgir } from "../pecas";

/**
 * 0–4 s — o gancho.
 *
 * É a única cena do vídeo que NÃO mostra o produto, e é a mais
 * importante: quem não sente o problema não vê valor na solução. Os
 * dois primeiros segundos são os únicos garantidos num vídeo de rede
 * social, e eles são gastos aqui mostrando a lista no bloco de notas
 * — a tela que todo organizador reconhece antes de ler qualquer
 * palavra.
 *
 * Depois vêm as quatro perguntas que ele responde toda semana,
 * empilhando rápido. Não é enfeite: a repetição é o argumento.
 *
 * Nada de logo aqui. Marca no primeiro frame é o jeito mais rápido de
 * perder quem ainda não tem motivo para se importar com ela.
 */

/** A lista como ela existe hoje: digitada na mão, remendada. */
const LINHAS = [
  { texto: "Lista domingo - Alvorada", titulo: true },
  { texto: "1. Rafael" },
  { texto: "2. Bruno +1" },
  { texto: "3. Diego (nao confirmou)", fraco: true },
  { texto: "4. Caio", riscado: true },
  { texto: "5. Marcos - pagou" },
  { texto: "6. Tiago" },
  { texto: "7. Léo - PMC" },
  { texto: "8. Ana ?", fraco: true },
  { texto: "9. amigo do Bruno" },
  { texto: "10. Wesley - falta pagar" },
];

/** As perguntas que chegam toda semana, sempre as mesmas. */
const PERGUNTAS = [
  { texto: "ainda tem vaga?", de: "Léo" },
  { texto: "posso levar um amigo?", de: "Ana" },
  { texto: "quem já confirmou?", de: "Marcos" },
  { texto: "manda a lista de novo aí", de: "Tiago" },
];

export const Dor: React.FC<{
  /** Frame em que as perguntas começam a cair. */
  inicioPerguntas?: number;
  /** Posição e tamanho do aparelho, em coordenadas de tela. */
  telefone?: { x: number; y: number; largura: number; altura: number };
  /** Onde o texto grande fica. */
  legenda?: { x: number; y: number; largura: number; tamanho: number };
}> = ({
  inicioPerguntas = 54,
  telefone = { x: 240, y: 300, largura: 600, altura: 1060 },
  legenda = { x: 64, y: 1400, largura: 952, tamanho: 82 },
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.5} />

      <div
        style={{
          position: "absolute",
          left: telefone.x,
          top: telefone.y,
          opacity: surgir(frame, 0, 8),
          scale: interpolate(surgir(frame, 0, 20), [0, 1], [0.96, 1], {
            output: "perceptual-scale",
          }),
        }}
      >
        <Telefone largura={telefone.largura} altura={telefone.altura} hora="21:48">
          <div style={{ position: "relative", height: "100%", backgroundColor: "#fbfbf8" }}>
            {/* O bloco de notas. Papel branco, fonte de texto, tudo
                torto: é assim que a lista existe hoje. */}
            <div style={{ padding: "18px 24px" }}>
              {LINHAS.map((linha) => (
                <div
                  key={linha.texto}
                  style={{
                    fontFamily: FONTE_TEXTO,
                    fontSize: linha.titulo ? 30 : 26,
                    fontWeight: linha.titulo ? 700 : 400,
                    lineHeight: 1.75,
                    color: linha.fraco ? "#9aa0a6" : "#202124",
                    textDecoration: linha.riscado ? "line-through" : undefined,
                    opacity: linha.riscado ? 0.55 : 1,
                  }}
                >
                  {linha.texto}
                </div>
              ))}
              {/* O cursor piscando, no fim da lista que nunca acaba. */}
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: 28,
                  marginTop: 8,
                  backgroundColor: "#202124",
                  opacity: Math.floor(frame / 12) % 2 === 0 ? 1 : 0,
                }}
              />
            </div>

            {/* As perguntas caem por cima da lista, uma em cima da
                outra, tapando o que ele estava tentando organizar. */}
            {PERGUNTAS.map((pergunta, i) => {
              const entrada = surgir(frame, inicioPerguntas + i * 11, 5);
              if (entrada === 0) return null;
              return (
                <div
                  key={pergunta.texto}
                  style={{
                    position: "absolute",
                    left: 22 + (i % 2) * 26,
                    top: telefone.altura * 0.3 + i * 118,
                    maxWidth: telefone.largura - 130,
                    padding: "14px 18px",
                    borderRadius: 10,
                    backgroundColor: ZAP.recebida,
                    boxShadow: "0 8px 24px rgba(11,20,26,0.28)",
                    opacity: entrada,
                    translate: `${(1 - entrada) * -20}px 0`,
                    rotate: `${i % 2 === 0 ? -1.2 : 1.4}deg`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONTE_TEXTO,
                      fontSize: 17,
                      fontWeight: 600,
                      color: ZAP.nomes[i % ZAP.nomes.length],
                      marginBottom: 4,
                    }}
                  >
                    {pergunta.de}
                  </div>
                  <div style={{ fontFamily: FONTE_TEXTO, fontSize: 25, color: ZAP.texto }}>
                    {pergunta.texto}
                  </div>
                </div>
              );
            })}
          </div>
        </Telefone>
      </div>

      {/* O texto vira no meio da cena: primeiro nomeia a lista, depois
          nomeia a repetição. Duas frases curtas, não um parágrafo. */}
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
            lineHeight: 0.98,
            textTransform: "uppercase",
            color: COR.tinta,
            textShadow: "0 4px 24px rgba(0,0,0,0.8)",
            opacity: interpolate(frame, [6, 18, inicioPerguntas - 6, inicioPerguntas], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Sua lista de presença hoje
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            fontFamily: FONTE_DISPLAY,
            fontWeight: 700,
            fontSize: legenda.tamanho,
            lineHeight: 0.98,
            textTransform: "uppercase",
            color: COR.tinta,
            textShadow: "0 4px 24px rgba(0,0,0,0.8)",
            opacity: surgir(frame, inicioPerguntas + 4, 10),
          }}
        >
          E as mesmas 4 perguntas.
          <br />
          <span style={{ color: COR.latao }}>Toda semana.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
