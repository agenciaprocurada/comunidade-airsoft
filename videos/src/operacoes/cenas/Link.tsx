import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Cursor, posicaoCursor, pulsoDoClique, type Parada } from "../../componentes/Cursor";
import { COR, FONTE_DADO } from "../../tema";
import { Balao, CabecalhoDaConversa, FundoDaConversa } from "../conversa";
import { CONVERSA, GRUPO, OPERACAO } from "../dados";
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
 * A conversa tem a cara do aplicativo de mensagens (ver
 * ../conversa.tsx) porque a cena precisa ser reconhecida em meio
 * segundo: "isso é o meu grupo". O que fica de fora dessa imitação —
 * logo, nome do app, papel de parede deles — está explicado lá.
 */

const PARADAS: Parada[] = [
  { frame: 0, x: 980, y: 980 },
  { frame: 24, x: 1010, y: 400, clique: true },
  { frame: 56, x: 1180, y: 720 },
  { frame: 126, x: 1240, y: 780 },
];

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

      {/*
        O grupo, na tela de quem organiza.

        Aqui o "eu" é o Rodrigo: a mensagem dele é a verde, à direita,
        e as respostas chegam do outro lado. A mesma conversa aparece
        espelhada na cena seguinte, no celular da Ana — é o que faz as
        duas cenas serem o mesmo acontecimento visto de dois lugares.
      */}
      <div
        style={{
          position: "absolute",
          left: 700,
          top: 486,
          width: 1060,
          height: 500,
          overflow: "hidden",
          border: `1px solid ${COR.borda}`,
          opacity: surgir(frame, 38, 10),
        }}
      >
        <CabecalhoDaConversa nome={GRUPO.nome} membros={GRUPO.membros} />

        <div style={{ position: "relative", height: 430 }}>
          <FundoDaConversa />
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: 18,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            {CONVERSA.map((mensagem, i) => (
              <Balao
                key={mensagem.de}
                mensagem={mensagem}
                eu="Rodrigo"
                indiceNome={i}
                largura={520}
                entrada={surgir(frame, 46 + i * 22, 8)}
              />
            ))}
          </div>
        </div>
      </div>

      <Cursor x={cursor.x} y={cursor.y} clique={clique} />
    </AbsoluteFill>
  );
};
