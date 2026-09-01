import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COR, FONTE_DADO, FONTE_DISPLAY } from "../../tema";
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
 * A lista se escreve sozinha — 4 s.
 *
 * Sem ponteiro de mouse de propósito: NINGUÉM está mexendo. Os nomes
 * caem porque as pessoas confirmaram no link, e o contador ao lado
 * sobe junto — número subindo é o argumento visual mais forte que
 * existe para "não dá trabalho".
 *
 * Os dois últimos jogadores (Marcos e Wesley) NÃO entram aqui: eles
 * são a cena da espera, que precisa deles com tempo na tela.
 *
 * As barras leem `confirmadosDo()`, a mesma função da contagem do
 * topo — assim a soma nunca se contradiz no meio da animação.
 */

/**
 * Frame em que cada jogador aparece. A Ana entra em 0: ela confirmou
 * na cena anterior e a lista abre com ela dentro. O último demora — é
 * a virada da cena.
 */
const ENTRADAS = [0, 18, 38, 58, 78, 98];

export const Lista: React.FC = () => {
  const frame = useCurrentFrame();

  const entraram = ENTRADAS.filter((f) => frame >= f).length;
  // Só os seis primeiros: o Marcos e o Wesley são a cena seguinte.
  const naTela = JOGADORES.slice(0, ENTRADAS.length);
  const total = totalConfirmado(entraram);

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.5} />

      <Passo titulo={"A lista se\nescreve sozinha"} frame={frame} entrada={2} />

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
          opacity: surgir(frame, 14, 14),
        }}
      >
        Cada um entra pelo link, escolhe o lado e some da sua caixa de
        mensagem.
      </div>

      {/*
        O contador grande, do lado do texto: número subindo é o
        argumento visual mais forte que existe para "se enche sozinha".
        É o fio condutor do vídeo — reaparece na cena da espera.
      */}
      <div
        style={{
          position: "absolute",
          left: 110,
          top: 740,
          opacity: surgir(frame, 10, 10),
        }}
      >
        <div
          style={{
            fontFamily: FONTE_DISPLAY,
            fontWeight: 700,
            fontSize: 120,
            lineHeight: 0.9,
            color: COR.oliva300,
          }}
        >
          {total}
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: FONTE_DADO,
            fontSize: 22,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: COR.texto2,
          }}
        >
          confirmados
        </div>
      </div>

      <div style={{ position: "absolute", left: 700, top: 128, opacity: surgir(frame, 0, 8) }}>
        <Painel
          titulo={`${OPERACAO.titulo} · ${OPERACAO.dataCurta}`}
          etiqueta={`${total} confirmados`}
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
            {naTela.map((jogador, i) => {
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
