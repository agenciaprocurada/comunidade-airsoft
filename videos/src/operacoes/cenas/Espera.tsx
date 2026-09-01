import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COR, FONTE_DADO, FONTE_DISPLAY } from "../../tema";
import { LADOS, TOTAL_VAGAS, confirmadosDo } from "../dados";
import { BarraLado, Chip, GradeTatica, LinhaJogador, Painel, surgir } from "../pecas";

/**
 * O pico do vídeo — 3 s.
 *
 * É a única coisa que a ferramenta faz e o bloco de notas não faz de
 * jeito nenhum: o lado lota, o próximo entra na fila sozinho, alguém
 * desiste e o primeiro da fila sobe. Antes isso passava em um segundo,
 * como um chip discreto no canto; agora é uma cena com três batidas e
 * um número grande na tela.
 *
 * As batidas:
 *   1. o 12º entra e o PMC fecha em 12/12
 *   2. o Wesley chega e cai na espera
 *   3. o Diego desiste — e o Wesley SOBE, sem ninguém tocar em nada
 *
 * A terceira é a que vende. Sem ela, "lista de espera" é só uma fila.
 */

const BATIDAS = { lota: 18, espera: 56, desiste: 100, promove: 118 } as const;

export const Espera: React.FC<{
  /** Onde o painel fica, em coordenadas de tela. */
  painel?: { x: number; y: number; largura: number };
  /** Onde o texto grande fica. */
  legenda?: { x: number; y: number; largura: number; tamanho: number };
}> = ({
  painel = { x: 700, y: 210, largura: 1060 },
  legenda = { x: 110, y: 300, largura: 500, tamanho: 56 },
}) => {
  const frame = useCurrentFrame();

  const lotou = frame >= BATIDAS.lota;
  const naEspera = frame >= BATIDAS.espera && frame < BATIDAS.promove;
  const desistiu = frame >= BATIDAS.desiste;
  const promoveu = frame >= BATIDAS.promove;

  /* Os números saem da mesma função das outras cenas: o PMC tem 11
     antes de o Marcos entrar e 12 depois. Quando o Diego sai, a vaga é
     ocupada na hora pelo Wesley — o número NÃO cai, e é isso que a
     cena existe para provar. */
  const pmc = confirmadosDo(LADOS[0], lotou ? 7 : 6);
  const militar = confirmadosDo(LADOS[1], 6);
  const total = pmc + militar;

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.5} />

      {/* O texto acompanha a batida: uma frase por acontecimento. */}
      <div style={{ position: "absolute", left: legenda.x, top: legenda.y, width: legenda.largura }}>
        {[
          { t: "O lado lotou", de: BATIDAS.lota, ate: BATIDAS.espera },
          { t: "O próximo entra\nna fila sozinho", de: BATIDAS.espera, ate: BATIDAS.desiste },
          { t: "Desistiu um?\nA fila anda.", de: BATIDAS.desiste, ate: 999 },
        ].map((fala) => (
          <div
            key={fala.t}
            style={{
              position: "absolute",
              inset: 0,
              fontFamily: FONTE_DISPLAY,
              fontWeight: 700,
              fontSize: legenda.tamanho,
              lineHeight: 0.98,
              textTransform: "uppercase",
              whiteSpace: "pre-line",
              color: COR.tinta,
              textShadow: "0 4px 24px rgba(0,0,0,0.8)",
              opacity: interpolate(
                frame,
                [fala.de, fala.de + 8, fala.ate - 8, fala.ate],
                [0, 1, 1, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              ),
            }}
          >
            {fala.t}
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          left: legenda.x,
          top: legenda.y + legenda.tamanho * 2.6,
          opacity: surgir(frame, BATIDAS.promove + 4, 10),
        }}
      >
        <Chip tom="ok" tamanho={24} marcavel>
          Sem você fazer nada
        </Chip>
      </div>

      <div
        style={{
          position: "absolute",
          left: painel.x,
          top: painel.y,
          opacity: surgir(frame, 0, 8),
        }}
      >
        <Painel
          titulo="Operação Fênix · Dom · 13/09"
          etiqueta={`${total} confirmados${naEspera ? " · 1 na espera" : ""}`}
          largura={painel.largura}
          pulso
        >
          <div style={{ padding: 26, display: "flex", gap: 22 }}>
            <BarraLado
              nome={LADOS[0].nome}
              confirmados={pmc}
              vagas={LADOS[0].vagas}
              cor={LADOS[0].cor}
              largura={(painel.largura - 74) / 2}
              nota={lotou ? "Lado cheio" : "1 vaga"}
              corNota={lotou ? COR.latao : COR.oliva300}
            />
            <BarraLado
              nome={LADOS[1].nome}
              confirmados={militar}
              vagas={LADOS[1].vagas}
              cor={LADOS[1].cor}
              largura={(painel.largura - 74) / 2}
              nota="3 vagas"
              corNota={COR.oliva300}
            />
          </div>

          <div>
            <LinhaJogador
              nome="Marcos V."
              lado="PMC"
              cor={LADOS[0].cor}
              altura={74}
              entrada={surgir(frame, BATIDAS.lota, 6)}
              direita={<Chip tom="oliva">Confirmado</Chip>}
            />

            {/* O Diego sai: a linha apaga e some do caminho. */}
            <div
              style={{
                opacity: desistiu ? interpolate(frame, [BATIDAS.desiste, BATIDAS.desiste + 10], [1, 0.25], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }) : 1,
              }}
            >
              <LinhaJogador
                nome="Diego A."
                lado="PMC"
                cor={LADOS[0].cor}
                altura={74}
                direita={
                  desistiu ? (
                    <Chip tom="neutro">Não vou mais</Chip>
                  ) : (
                    <Chip tom="oliva">Confirmado</Chip>
                  )
                }
              />
            </div>

            {/* O Wesley: chega na espera e é promovido sozinho. */}
            <div
              style={{
                opacity: surgir(frame, BATIDAS.espera, 6),
                backgroundColor: promoveu
                  ? `rgba(125,145,57,${interpolate(frame, [BATIDAS.promove, BATIDAS.promove + 20], [0.35, 0], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    })})`
                  : "transparent",
              }}
            >
              <LinhaJogador
                nome="Wesley P."
                lado="PMC"
                cor={LADOS[0].cor}
                altura={74}
                direita={
                  promoveu ? (
                    <Chip tom="oliva" marcavel>
                      Confirmado
                    </Chip>
                  ) : (
                    <Chip tom="espera">Lista de espera</Chip>
                  )
                }
              />
            </div>
          </div>

          {/* A conta embaixo, em número grande: é o que fica na cabeça. */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              borderTop: `1px solid ${COR.borda}`,
              padding: "18px 22px",
            }}
          >
            <span
              style={{
                fontFamily: FONTE_DADO,
                fontSize: 20,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: COR.texto2,
              }}
            >
              Vagas ocupadas
            </span>
            <span
              style={{
                fontFamily: FONTE_DISPLAY,
                fontWeight: 700,
                fontSize: 46,
                lineHeight: 1,
                color: promoveu ? COR.oliva300 : COR.tinta,
              }}
            >
              {total}/{TOTAL_VAGAS}
            </span>
          </div>
        </Painel>
      </div>
    </AbsoluteFill>
  );
};
