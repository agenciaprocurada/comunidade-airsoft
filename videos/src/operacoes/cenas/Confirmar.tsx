import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Cursor, posicaoCursor, pulsoDoClique, type Parada } from "../../componentes/Cursor";
import { COR, FONTE_DADO, FONTE_DISPLAY, FONTE_TEXTO } from "../../tema";
import {
  Balao,
  BarraDeEnvio,
  CabecalhoDaConversa,
  FundoDaConversa,
} from "../conversa";
import {
  CONVERSA,
  GRUPO,
  LADOS,
  OPERACAO,
  confirmadosDo,
  totalConfirmado,
} from "../dados";
import {
  BarraLado,
  Botao,
  Chip,
  GradeTatica,
  OpcaoLado,
  Passo,
  Telefone,
  surgir,
} from "../pecas";

/**
 * 12–16 s — do outro lado do link.
 *
 * A cena anterior mostra o link SAINDO. Esta mostra ele CHEGANDO: o
 * mesmo celular que estava no grupo abre a página do evento, escolhe
 * o lado e confirma. Sem ela, o vídeo pedia que o espectador
 * acreditasse que a lista se enche sozinha — agora ele vê a mão que
 * enche.
 *
 * Um telefone só, duas telas: a conversa do grupo até o toque no
 * link, a página do evento depois dele. Cortar para outro aparelho
 * quebraria a ideia de que é a mesma pessoa.
 *
 * Geometria: o aparelho ocupa x 1150–1650 e y 90–1010; a tela útil
 * começa em ~1164/150. As paradas do cursor são coordenadas de tela e
 * batem com as caixas desenhadas abaixo.
 */

const TROCA = 32; // frame em que o link abre a página

const PARADAS: Parada[] = [
  { frame: 0, x: 1000, y: 980 },
  { frame: 26, x: 1370, y: 665, clique: true },
  { frame: 62, x: 1400, y: 704, clique: true },
  { frame: 86, x: 1400, y: 781, clique: true },
  { frame: 126, x: 1420, y: 800 },
];

/**
 * A conversa do grupo na tela do celular da Ana.
 *
 * Exportada porque o 9:16 mostra a MESMA tela — muda o tamanho do
 * aparelho, não o que está escrito nele. O desenho (balão verde,
 * cabeçalho, barra de digitar) vem de `../conversa.tsx`, que também
 * explica o que foi deixado de fora da imitação e por quê.
 */
export const ChatNoCelular: React.FC<{ frame: number; escala?: number }> = ({
  frame,
  escala = 1,
}) => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
    <CabecalhoDaConversa nome={GRUPO.nome} membros={GRUPO.membros} escala={escala} />

    <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
      <FundoDaConversa />
      {/* As mensagens encostam embaixo, como em qualquer aplicativo de
          conversa: chat alinhado ao topo com meia tela vazia por baixo
          não se parece com o celular de ninguém. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: 14 * escala,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 8 * escala,
        }}
      >
        {CONVERSA.map((mensagem, i) => (
          <Balao
            key={mensagem.de}
            mensagem={mensagem}
            eu="Ana"
            indiceNome={i}
            escala={escala}
            largura={430 * escala}
            entrada={surgir(frame, i * 8, 6)}
          />
        ))}
      </div>
    </div>

    <BarraDeEnvio escala={escala} />
  </div>
);

/**
 * A página do evento, como o jogador a vê no celular.
 *
 * Os marcos de tempo vêm de fora — `militar` é o frame em que o dedo
 * troca de lado, `confirmar` o do toque no botão — porque os dois
 * formatos tocam a mesma cena em ritmos diferentes: 126 frames no
 * 16:9, 150 no 9:16.
 */
export const PaginaDoEvento: React.FC<{
  frame: number;
  militar: number;
  confirmar: number;
}> = ({ frame, militar, confirmar }) => {
  const escolheuMilitar = frame >= militar;
  const confirmou = frame >= confirmar;

  /* A contagem sobe no instante do "confirmar": é o feedback que faz
     a pessoa entender que ela virou linha na lista de alguém. */
  const extra = confirmou ? 1 : 0;

  return (
    <div style={{ padding: 22 }}>
      <div
        style={{
          fontFamily: FONTE_DADO,
          fontSize: 16,
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: COR.oliva300,
        }}
      >
        {OPERACAO.data}
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: FONTE_DISPLAY,
          fontWeight: 700,
          fontSize: 40,
          lineHeight: 0.98,
          textTransform: "uppercase",
          color: COR.tinta,
        }}
      >
        {OPERACAO.titulo}
      </div>
      <div style={{ marginTop: 8, fontFamily: FONTE_TEXTO, fontSize: 21, color: COR.texto2 }}>
        {OPERACAO.campo} · {OPERACAO.cidade}
      </div>

      <div
        style={{
          marginTop: 20,
          paddingTop: 14,
          borderTop: `1px solid ${COR.borda}`,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          fontFamily: FONTE_DADO,
          fontSize: 16,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: COR.texto2,
        }}
      >
        <span style={{ color: COR.tinta }}>Vagas</span>
        <span>{totalConfirmado(0) + extra} confirmados</span>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {LADOS.map((lado) => {
          /* A tela do jogador mostra a operação ANTES de a lista da
             cena seguinte começar a se encher: é o mesmo instante,
             visto do outro lado. */
          const base = confirmadosDo(lado, 0);
          const confirmados = lado.nome === "Militar" ? base + extra : base;
          return (
            <BarraLado
              key={lado.nome}
              nome={lado.nome}
              confirmados={confirmados}
              vagas={lado.vagas}
              cor={lado.cor}
              nota={`${lado.vagas - confirmados} vagas`}
              corNota={COR.oliva300}
            />
          );
        })}
      </div>

      {confirmou ? (
        <div
          style={{
            marginTop: 22,
            border: `1px solid ${COR.oliva700}`,
            backgroundColor: COR.oliva050,
            padding: "20px 20px 22px",
            opacity: surgir(frame, confirmar + 2, 8),
          }}
        >
          <Chip tom="ok" marcavel>
            Você está na lista
          </Chip>
          <div
            style={{
              marginTop: 14,
              fontFamily: FONTE_TEXTO,
              fontSize: 21,
              lineHeight: 1.45,
              color: COR.texto,
            }}
          >
            Bom jogo. Se não puder ir, avise aqui — a vaga vai para o próximo.
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 22 }}>
          <div
            style={{
              fontFamily: FONTE_DISPLAY,
              fontWeight: 700,
              fontSize: 26,
              textTransform: "uppercase",
              color: COR.tinta,
            }}
          >
            Entrar na lista
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: FONTE_TEXTO,
              fontSize: 19,
              color: COR.texto2,
            }}
          >
            Qual lado
          </div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            <OpcaoLado nome="PMC" marcada={!escolheuMilitar} />
            <OpcaoLado nome="Militar" marcada={escolheuMilitar} />
          </div>
          <div style={{ marginTop: 16 }}>
            <Botao tamanho={26}>Confirmar presença</Botao>
          </div>
        </div>
      )}
    </div>
  );
};

export const Confirmar: React.FC = () => {
  const frame = useCurrentFrame();
  const cursor = posicaoCursor(frame, PARADAS);
  const clique = pulsoDoClique(frame, PARADAS);

  /* A troca de tela é a página subindo por cima da conversa, como o
     navegador abrindo em cima do aplicativo. */
  const abrindo = interpolate(frame, [TROCA, TROCA + 12], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.5} />

      <Passo titulo={"Ele abre\ne confirma"} frame={frame} entrada={2} />

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
          opacity: surgir(frame, 18, 16),
        }}
      >
        Do grupo para a lista em dois toques. Escolhe o lado, confirma, e
        o número na sua tela muda na hora.
      </div>

      <div
        style={{
          position: "absolute",
          left: 110,
          top: 760,
          opacity: surgir(frame, 92, 12),
          translate: `0 ${interpolate(surgir(frame, 92, 12), [0, 1], [14, 0])}px`,
        }}
      >
        <Chip tom="oliva" tamanho={26} marcavel>
          +1 no lado Militar
        </Chip>
      </div>

      <div
        style={{
          position: "absolute",
          left: 1150,
          top: 90,
          opacity: surgir(frame, 0, 10),
          translate: `0 ${interpolate(surgir(frame, 0, 10), [0, 1], [26, 0])}px`,
        }}
      >
        <Telefone largura={500} altura={920}>
          <div style={{ position: "relative", height: "100%" }}>
            <div style={{ position: "absolute", inset: 0, opacity: abrindo }}>
              <ChatNoCelular frame={frame} />
            </div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 1 - abrindo,
                translate: `0 ${interpolate(abrindo, [0, 1], [0, 40])}px`,
              }}
            >
              <PaginaDoEvento frame={frame} militar={62} confirmar={86} />
            </div>
          </div>
        </Telefone>
      </div>

      <Cursor x={cursor.x} y={cursor.y} clique={clique} />
    </AbsoluteFill>
  );
};
