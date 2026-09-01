import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COR, FONTE_DADO } from "../../tema";
import {
  JOGADORES,
  LADOS,
  OPERACAO,
  confirmadosDo,
  corDoLado,
  totalConfirmado,
} from "../dados";
import { BarraLado, Chip, GradeTatica, LinhaJogador, Painel, Passo, surgir } from "../pecas";

/**
 * 12–17 s — a lista se enche sozinha.
 *
 * É a cena que justifica o produto, e ela não tem ponteiro de mouse de
 * propósito: NINGUÉM está mexendo. Os nomes caem porque os jogadores
 * confirmaram no link, as barras enchem sozinhas, e o último nome
 * chega depois de o PMC lotar e vai para a espera sem que o
 * organizador toque em nada.
 *
 * As barras leem `confirmadosDo()`, a mesma função que a contagem do
 * topo — assim a soma nunca se contradiz no meio da animação.
 */

/**
 * Frame em que cada jogador aparece. A Ana entra em 0: ela confirmou
 * na cena anterior e a lista abre com ela dentro. O último demora — é
 * a virada da cena.
 */
const ENTRADAS = [0, 12, 26, 40, 54, 68, 82, 106];

export const Lista: React.FC = () => {
  const frame = useCurrentFrame();

  const entraram = ENTRADAS.filter((f) => frame >= f).length;
  const total = totalConfirmado(entraram);
  const naEspera = JOGADORES.slice(0, entraram).filter((j) => j.estado === "espera").length;

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.5} />

      <Passo numero="04" titulo={"A lista se\nenche sozinha"} frame={frame} entrada={2} />

      <div
        style={{
          position: "absolute",
          left: 110,
          top: 620,
          width: 470,
          fontFamily: FONTE_DADO,
          fontSize: 24,
          lineHeight: 1.7,
          letterSpacing: "0.04em",
          color: COR.texto2,
          opacity: surgir(frame, 18, 16),
        }}
      >
        Lotou o lado, o próximo entra na espera. Desistiu alguém, o
        primeiro da fila sobe.
      </div>

      {/* O selo da espera, grande, na coluna do texto: é a informação
          que a cena inteira existe para entregar. */}
      <div
        style={{
          position: "absolute",
          left: 110,
          top: 800,
          opacity: surgir(frame, 108, 12),
          translate: `0 ${interpolate(surgir(frame, 108, 12), [0, 1], [14, 0])}px`,
        }}
      >
        <Chip tom="espera" tamanho={26}>
          Wesley entrou na espera
        </Chip>
      </div>

      <div style={{ position: "absolute", left: 700, top: 128, opacity: surgir(frame, 0, 8) }}>
        <Painel
          titulo={`${OPERACAO.titulo} · ${OPERACAO.dataCurta}`}
          etiqueta={`${total} confirmados${naEspera > 0 ? ` · ${naEspera} na espera` : ""}`}
          largura={1060}
          pulso
        >
          <div style={{ padding: 26 }}>
            <div style={{ display: "flex", gap: 22 }}>
              {LADOS.map((lado) => {
                const confirmados = confirmadosDo(lado, entraram);
                const cheio = confirmados >= lado.vagas;
                return (
                  <BarraLado
                    key={lado.nome}
                    nome={lado.nome}
                    confirmados={confirmados}
                    vagas={lado.vagas}
                    cor={lado.cor}
                    largura={493}
                    nota={cheio ? "Lado cheio" : `${lado.vagas - confirmados} vagas`}
                    corNota={cheio ? COR.latao : COR.oliva300}
                  />
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 26,
                paddingBottom: 4,
                fontFamily: FONTE_DADO,
                fontSize: 20,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: COR.texto2,
              }}
            >
              <span>Lista</span>
              <span>Confirmando agora</span>
            </div>
          </div>

          <div style={{ paddingBottom: 8 }}>
            {JOGADORES.map((jogador, i) => {
              const entrada = surgir(frame, ENTRADAS[i], 9);
              if (entrada === 0) return null;
              return (
                <LinhaJogador
                  key={jogador.nome}
                  nome={jogador.nome}
                  lado={jogador.lado}
                  cor={corDoLado(jogador.lado)}
                  entrada={entrada}
                  altura={64}
                  direita={
                    jogador.estado === "espera" ? (
                      <Chip tom="espera">Lista de espera</Chip>
                    ) : (
                      <Chip tom="oliva">Confirmado</Chip>
                    )
                  }
                />
              );
            })}
          </div>
        </Painel>
      </div>
    </AbsoluteFill>
  );
};
