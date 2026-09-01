import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Cursor, posicaoCursor, pulsoDoClique, type Parada } from "../../componentes/Cursor";
import { COR, FONTE_DADO } from "../../tema";
import {
  Balao,
  BarraDeEnvio,
  CabecalhoDaConversa,
  FundoDaConversa,
  indiceDoNome,
} from "../conversa";
import { CONVERSA, GRUPO, OPERACAO } from "../dados";
import { Botao, CaixaLink, Chip, GradeTatica, Painel, Passo, surgir } from "../pecas";

/**
 * O link — 8 s, e o copia-e-cola acontece NA TELA.
 *
 * A versão anterior copiava o link e a mensagem simplesmente aparecia
 * no grupo. Quem assiste não fecha essa lacuna sozinho: fica com a
 * impressão de que o site "posta" no grupo por conta própria, o que
 * não é verdade e levanta a pergunta errada.
 *
 * Agora são cinco movimentos visíveis:
 *   1. o link fica selecionado e o ponteiro clica em COPIAR LINK
 *   2. o selo "Copiado" acende
 *   3. o ponteiro atravessa para a janela do grupo
 *   4. o link APARECE colado no campo de mensagem, e o botão troca de
 *      microfone para avião
 *   5. o clique em enviar — e só então a mensagem sobe no chat
 *
 * É o gesto que o organizador vai repetir na vida real. Vê-lo inteiro
 * é o que faz a ferramenta parecer possível.
 */

const BATIDAS = {
  copiar: 40,
  janela: 56,
  colar: 96,
  enviar: 130,
  mensagem: 136,
  respostas: 190,
} as const;

const PARADAS: Parada[] = [
  { frame: 0, x: 980, y: 1000 },
  { frame: BATIDAS.copiar, x: 1006, y: 384, clique: true },
  { frame: BATIDAS.colar, x: 1150, y: 946, clique: true },
  { frame: BATIDAS.enviar, x: 1716, y: 946, clique: true },
  { frame: 240, x: 1680, y: 900 },
];

export const Link: React.FC = () => {
  const frame = useCurrentFrame();
  const cursor = posicaoCursor(frame, PARADAS);
  const clique = pulsoDoClique(frame, PARADAS);

  const copiou = frame >= BATIDAS.copiar;
  const colou = frame >= BATIDAS.colar;
  const enviou = frame >= BATIDAS.enviar;

  /** O clarão do campo no instante em que o texto cai lá dentro. */
  const flashDoColar = interpolate(
    frame,
    [BATIDAS.colar, BATIDAS.colar + 4, BATIDAS.colar + 24],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.5} />

      <Passo titulo={"Manda UM link.\nUma vez."} frame={frame} entrada={2} />

      <div
        style={{
          position: "absolute",
          left: 110,
          top: 540,
          width: 470,
          fontFamily: FONTE_DADO,
          fontSize: 24,
          lineHeight: 1.7,
          letterSpacing: "0.04em",
          color: COR.texto2,
          opacity: surgir(frame, 16, 14),
        }}
      >
        Copia do painel, cola no grupo e acabou. Quem abrir amanhã vê a
        lista de amanhã.
      </div>

      <div
        style={{
          position: "absolute",
          left: 110,
          top: 760,
          opacity: surgir(frame, BATIDAS.mensagem + 12, 12),
        }}
      >
        <Chip tom="ok" tamanho={26} marcavel>
          Você não reenvia nada
        </Chip>
      </div>

      {/* Painel do organizador. */}
      <div style={{ position: "absolute", left: 700, top: 150, opacity: surgir(frame, 0, 10) }}>
        <Painel titulo={OPERACAO.titulo} etiqueta="Aberta" largura={1060} pulso>
          <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
            <CaixaLink
              rotulo="Link do evento"
              link={OPERACAO.link}
              entrada={surgir(frame, 6, 12)}
              selecionado={interpolate(
                frame,
                [BATIDAS.copiar - 16, BATIDAS.copiar - 6, BATIDAS.copiar + 18, BATIDAS.copiar + 30],
                [0, 1, 1, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              )}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Botao variante="secundario" tamanho={24}>
                Ver a página
              </Botao>
              <Botao
                tamanho={24}
                aceso={
                  copiou
                    ? interpolate(frame, [BATIDAS.copiar, BATIDAS.copiar + 18], [1, 0], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      })
                    : 0
                }
              >
                Copiar link
              </Botao>
              <span style={{ opacity: surgir(frame, BATIDAS.copiar + 3, 8) }}>
                <Chip tom="ok" marcavel>
                  Copiado
                </Chip>
              </span>
            </div>
          </div>
        </Painel>
      </div>

      {/*
        A janela do grupo, embaixo. O ponteiro atravessa de um painel
        para o outro — a distância entre os dois é a própria
        demonstração de que são dois lugares, e que a ponte é você.
      */}
      <div
        style={{
          position: "absolute",
          left: 700,
          top: 546,
          width: 1060,
          height: 440,
          overflow: "hidden",
          border: `1px solid ${COR.borda}`,
          opacity: surgir(frame, BATIDAS.janela - 24, 12),
        }}
      >
        <CabecalhoDaConversa nome={GRUPO.nome} membros={GRUPO.membros} />

        <div style={{ position: "relative", height: 296 }}>
          <FundoDaConversa />
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            {CONVERSA.map((mensagem, i) => {
              /* 0 é a pergunta que já estava no grupo; 1 é o link
                 que acabou de ser enviado; as outras são respostas. */
              const quando =
                i === 0 ? 0 : i === 1 ? BATIDAS.mensagem : BATIDAS.respostas + (i - 2) * 26;
              const entrada = surgir(frame, quando, 8);
              if (entrada === 0) return null;
              return (
                <Balao
                  key={`${mensagem.de}-${i}`}
                  mensagem={mensagem}
                  eu="Rodrigo"
                  indiceNome={indiceDoNome(mensagem.de)}
                  largura={520}
                  entrada={entrada}
                />
              );
            })}
          </div>
        </div>

        <BarraDeEnvio
          texto={colou && !enviou ? OPERACAO.link : undefined}
          destaque={flashDoColar}
        />
      </div>

      <Cursor x={cursor.x} y={cursor.y} clique={clique} />
    </AbsoluteFill>
  );
};
