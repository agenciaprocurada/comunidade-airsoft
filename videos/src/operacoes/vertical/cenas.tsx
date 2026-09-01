import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Cursor, posicaoCursor, pulsoDoClique, type Parada } from "../../componentes/Cursor";
import { Legenda } from "../../vertical/Moldura";
import { ChatNoCelular, PaginaDoEvento } from "../cenas/Confirmar";
import { COR, FONTE_DADO, FONTE_DISPLAY, FONTE_TEXTO } from "../../tema";
import {
  BUSCA_CAMPO,
  CONVERSA,
  JOGADORES,
  LADOS,
  OPERACAO,
  TOTAL_FIM,
  TOTAL_VAGAS,
  confirmadosDo,
  corDoLado,
  digitado,
  totalConfirmado,
} from "../dados";
import {
  BarraLado,
  Botao,
  CaixaLink,
  CampoForm,
  Chip,
  GradeTatica,
  LinhaJogador,
  Painel,
  Telefone,
  surgir,
} from "../pecas";

/**
 * As seis cenas do 9:16.
 *
 * Ficam num arquivo só, e não em seis, porque cada uma aqui é uma
 * VARIANTE de enquadramento da cena equivalente do 16:9 — o conteúdo
 * de verdade mora em `../pecas.tsx` e `../dados.ts`. Espalhar 40 linhas
 * de moldura por seis arquivos daria a impressão de que existem seis
 * roteiros, quando existe um.
 *
 * O truque do formato: os painéis são desenhados na medida do 16:9
 * (1060 px de largura) e entram aqui dentro de um `Palco`, que escala
 * para os 952 px úteis da tela vertical. Uma implementação só para os
 * dois vídeos — mexeu na peça, mexeu nos dois.
 *
 * As margens são das plataformas: Instagram e TikTok desenham a
 * interface deles por cima dos ~250 px de baixo e dos ~120 px de cima,
 * então todo conteúdo vive entre y=120 e y=1660.
 */

const ESCALA = 0.9;

/**
 * O palco: um painel de 1060 px encaixado na largura vertical.
 *
 * O cursor vai DENTRO dele de propósito — assim as paradas continuam
 * em coordenadas do painel, iguais às do 16:9, e não em coordenadas de
 * tela que mudariam a cada escala.
 */
const Palco: React.FC<{ topo: number; children: React.ReactNode }> = ({ topo, children }) => (
  <div
    style={{
      position: "absolute",
      left: 64,
      top: topo,
      width: 1060,
      transformOrigin: "0 0",
      scale: ESCALA,
    }}
  >
    {children}
  </div>
);

/* ==================================================================
   0–2 s · Gancho — a lista cheia atrás da marca
   ================================================================== */

export const Gancho: React.FC = () => {
  const frame = useCurrentFrame();

  const suave = (a: number, b: number) =>
    interpolate(frame, [a, b], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.6} />

      <Palco topo={430}>
        <div style={{ filter: "blur(3px)", opacity: 0.7 }}>
          <Painel
            titulo={`${OPERACAO.titulo} · ${OPERACAO.dataCurta}`}
            etiqueta={`${TOTAL_FIM} confirmados`}
            largura={1060}
            pulso
          >
            <div style={{ padding: 26, display: "flex", gap: 22 }}>
              {LADOS.map((lado) => (
                <BarraLado
                  key={lado.nome}
                  nome={lado.nome}
                  confirmados={confirmadosDo(lado, JOGADORES.length)}
                  vagas={lado.vagas}
                  cor={lado.cor}
                  largura={493}
                />
              ))}
            </div>
            {JOGADORES.slice(0, 5).map((j) => (
              <LinhaJogador
                key={j.nome}
                nome={j.nome}
                lado={j.lado}
                cor={corDoLado(j.lado)}
                altura={68}
                direita={<Chip tom="oliva">Confirmado</Chip>}
              />
            ))}
          </Painel>
        </div>
      </Palco>

      <AbsoluteFill style={{ backgroundColor: "rgba(6,8,5,0.72)" }} />

      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30 }}
      >
        <Img
          src={staticFile("logo.webp")}
          style={{
            height: 150,
            width: "auto",
            filter: "brightness(0) invert(1)",
            opacity: suave(0, 16),
          }}
        />
        <div style={{ height: 2, backgroundColor: COR.oliva500, width: interpolate(suave(10, 30), [0, 1], [0, 520]) }} />
        <span
          style={{
            fontFamily: FONTE_DISPLAY,
            fontWeight: 700,
            fontSize: 78,
            lineHeight: 0.98,
            textTransform: "uppercase",
            textAlign: "center",
            color: COR.tinta,
            opacity: suave(14, 34),
          }}
        >
          Sua lista de presença<br />
          <span style={{ color: COR.oliva300 }}>vira um link</span>
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ==================================================================
   2–8 s · Abrir a operação
   ================================================================== */

const PARADAS_CRIAR: Parada[] = [
  { frame: 0, x: 520, y: 820 },
  { frame: 12, x: 220, y: 154, clique: true },
  { frame: 54, x: 220, y: 265, clique: true },
  { frame: 76, x: 160, y: 450, clique: true },
  { frame: 96, x: 220, y: 561, clique: true },
  { frame: 124, x: 200, y: 650, clique: true },
  { frame: 150, x: 200, y: 650 },
];

export const Criar: React.FC = () => {
  const frame = useCurrentFrame();
  const cursor = posicaoCursor(frame, PARADAS_CRIAR);
  const clique = pulsoDoClique(frame, PARADAS_CRIAR);

  const digitando = frame >= 14 && frame < 46;
  const escolheu = frame >= 48;
  const publicou = frame >= 124;

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.6} />

      <Palco topo={480}>
        <Painel
          titulo="Nova operação"
          etiqueta={publicou ? "Aberta" : "Rascunho"}
          corEtiqueta={publicou ? COR.oliva300 : COR.texto2}
          largura={1060}
        >
          <div style={{ padding: 34, display: "flex", flexDirection: "column", gap: 22 }}>
            <CampoForm
              rotulo="Campo"
              valor={
                escolheu ? `${OPERACAO.campo} — ${OPERACAO.cidade}` : digitado(BUSCA_CAMPO, frame, 14)
              }
              digitando={digitando}
              frame={frame}
            />
            <div style={{ display: "flex", gap: 22 }}>
              <CampoForm rotulo="Data" valor={frame >= 58 ? "13/09/2026" : ""} largura={485} />
              <CampoForm rotulo="Início" valor={frame >= 66 ? OPERACAO.inicio : ""} largura={485} />
            </div>

            <div>
              <div
                style={{
                  fontFamily: FONTE_DADO,
                  fontSize: 18,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: COR.texto2,
                  marginBottom: 9,
                }}
              >
                Lados do jogo
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {LADOS.map((lado, i) => {
                  /* O primeiro lado já vem sugerido; o segundo entra no
                     clique do frame 92 — sem isso o ponteiro clicaria
                     num espaço vazio e o gesto não faria sentido. */
                  const entra = i === 0 ? surgir(frame, 50, 10) : surgir(frame, 84, 10);
                  return (
                    <div
                      key={lado.nome}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        height: 62,
                        padding: "0 18px",
                        border: `1px solid ${COR.bordaForte}`,
                        backgroundColor: COR.papel,
                        opacity: entra,
                      }}
                    >
                      <span style={{ fontSize: 27, color: COR.tinta }}>{lado.nome}</span>
                      <span
                        style={{
                          fontFamily: FONTE_DADO,
                          fontSize: 22,
                          letterSpacing: "0.1em",
                          color: COR.oliva300,
                        }}
                      >
                        {lado.vagas} vagas
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 22 }}>
              <CampoForm rotulo="Lote antecipado" valor={frame >= 98 ? "35,00" : ""} largura={485} />
              <CampoForm rotulo="No dia" valor={frame >= 106 ? "50,00" : ""} largura={485} />
            </div>

            <Botao
              aceso={
                publicou
                  ? interpolate(frame, [124, 144], [1, 0.2], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    })
                  : 0
              }
            >
              Publicar evento
            </Botao>
          </div>
        </Painel>

        <Cursor x={cursor.x} y={cursor.y} clique={clique} />
      </Palco>

      <Legenda kicker="Passo 1" titulo={"Abra a\noperação"} entrada={6} saida={110} />
      <Legenda kicker="Passo 1" titulo={"Vagas de cada\nlado do jogo"} entrada={116} />
    </AbsoluteFill>
  );
};

/* ==================================================================
   8–13 s · O link no grupo
   ================================================================== */

export const LinkNoGrupo: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.6} />

      <Palco topo={440}>
        <Painel titulo={OPERACAO.titulo} etiqueta="Aberta" largura={1060} pulso>
          <div style={{ padding: 30, display: "flex", flexDirection: "column", gap: 20 }}>
            <CaixaLink rotulo="Link do evento" link={OPERACAO.link} entrada={surgir(frame, 4, 10)} />
            <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: surgir(frame, 12, 8) }}>
              <Botao tamanho={24} aceso={frame >= 24 ? interpolate(frame, [24, 40], [1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }) : 0}>
                Copiar link
              </Botao>
              <span style={{ opacity: surgir(frame, 26, 8) }}>
                <Chip tom="ok">Copiado</Chip>
              </span>
            </div>
          </div>
        </Painel>
      </Palco>

      {/* O grupo, logo abaixo: o link atravessa de um para o outro. */}
      <Palco topo={730}>
        <div style={{ opacity: surgir(frame, 34, 10) }}>
          <Painel titulo="Grupo da equipe" etiqueta="42 membros" corEtiqueta={COR.texto2} largura={1060}>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  alignSelf: "flex-end",
                  maxWidth: 760,
                  padding: "16px 20px",
                  border: `1px solid ${COR.oliva700}`,
                  backgroundColor: COR.oliva050,
                  opacity: surgir(frame, 44, 10),
                }}
              >
                <div style={{ fontFamily: FONTE_TEXTO, fontSize: 26, color: COR.texto }}>
                  {CONVERSA[0].texto}
                </div>
                <div
                  style={{
                    marginTop: 14,
                    border: `1px solid ${COR.oliva700}`,
                    backgroundColor: COR.fundo,
                    padding: "14px 18px",
                    opacity: surgir(frame, 50, 10),
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONTE_DISPLAY,
                      fontWeight: 700,
                      fontSize: 28,
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
                </div>
              </div>

              {[1, 2].map((i) => (
                <div
                  key={CONVERSA[i].de}
                  style={{
                    alignSelf: "flex-start",
                    maxWidth: 700,
                    padding: "16px 20px",
                    border: `1px solid ${COR.borda}`,
                    backgroundColor: COR.papel,
                    opacity: surgir(frame, 76 + (i - 1) * 20, 8),
                  }}
                >
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
                    {CONVERSA[i].de}
                  </div>
                  <div style={{ fontFamily: FONTE_TEXTO, fontSize: 26, color: COR.texto }}>
                    {CONVERSA[i].texto}
                  </div>
                </div>
              ))}
            </div>
          </Painel>
        </div>
      </Palco>

      <Legenda kicker="Passo 2" titulo={"Mande o link.\nUma vez."} entrada={4} />
    </AbsoluteFill>
  );
};

/* ==================================================================
   11–16 s · Do outro lado do link: ele abre e confirma
   ================================================================== */

/**
 * O aparelho ocupa quase a tela toda aqui — é o formato pedindo: um
 * celular dentro de um vídeo vertical é o mesmo retângulo, e fingir
 * outra coisa só desperdiçaria pixel.
 *
 * As telas são as MESMAS do 16:9 (`ChatNoCelular`, `PaginaDoEvento`),
 * só o ritmo muda: 150 frames em vez de 126.
 */
const TROCA_V = 40;

const PARADAS_CONFIRMAR: Parada[] = [
  { frame: 0, x: 540, y: 1500 },
  { frame: 32, x: 560, y: 620, clique: true },
  { frame: 78, x: 560, y: 922, clique: true },
  { frame: 106, x: 560, y: 999, clique: true },
  { frame: 150, x: 580, y: 1030 },
];

export const ConfirmarNoCelular: React.FC = () => {
  const frame = useCurrentFrame();
  const cursor = posicaoCursor(frame, PARADAS_CONFIRMAR);
  const clique = pulsoDoClique(frame, PARADAS_CONFIRMAR);

  const abrindo = interpolate(frame, [TROCA_V, TROCA_V + 12], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.6} />

      <div
        style={{
          position: "absolute",
          left: 240,
          top: 270,
          opacity: surgir(frame, 0, 10),
          translate: `0 ${interpolate(surgir(frame, 0, 10), [0, 1], [26, 0])}px`,
        }}
      >
        <Telefone largura={600} altura={1100}>
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
              <PaginaDoEvento frame={frame} militar={78} confirmar={106} />
            </div>
          </div>
        </Telefone>
      </div>

      <Cursor x={cursor.x} y={cursor.y} clique={clique} />

      <Legenda kicker="Passo 3" titulo={"Ele abre\ne confirma"} entrada={4} saida={100} />
      <Legenda kicker="Dois toques" titulo={"Entrou\nna lista"} entrada={110} />
    </AbsoluteFill>
  );
};

/* ==================================================================
   16–23 s · A lista se enche sozinha
   ================================================================== */

const ENTRADAS_V = [0, 22, 44, 66, 88, 110, 132, 168];

export const Lista: React.FC = () => {
  const frame = useCurrentFrame();

  const entraram = ENTRADAS_V.filter((f) => frame >= f).length;
  const total = totalConfirmado(entraram);
  const naEspera = JOGADORES.slice(0, entraram).filter((j) => j.estado === "espera").length;

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.6} />

      <Palco topo={470}>
        <Painel
          titulo={`${OPERACAO.titulo} · ${OPERACAO.dataCurta}`}
          etiqueta={`${total} confirmados${naEspera > 0 ? ` · ${naEspera} na espera` : ""}`}
          largura={1060}
          pulso
        >
          <div style={{ padding: 26, display: "flex", gap: 22 }}>
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

          <div style={{ paddingBottom: 8 }}>
            {JOGADORES.map((jogador, i) => {
              const entrada = surgir(frame, ENTRADAS_V[i], 9);
              if (entrada === 0) return null;
              return (
                <LinhaJogador
                  key={jogador.nome}
                  nome={jogador.nome}
                  lado={jogador.lado}
                  cor={corDoLado(jogador.lado)}
                  entrada={entrada}
                  altura={66}
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
      </Palco>

      <Legenda kicker="Passo 3" titulo={"A lista se\nenche sozinha"} entrada={4} saida={150} />
      <Legenda kicker="Lotou o lado" titulo={"O próximo entra\nna espera"} entrada={168} />
    </AbsoluteFill>
  );
};

/* ==================================================================
   21–26 s · No dia do jogo
   ================================================================== */

const ACENDE_V = {
  presente: [0, 30, 74, 96, -1],
  pago: [0, 0, 54, 0, 0],
} as const;

const LINHA_Y_V = [101, 179, 257, 335, 413];

const PARADAS_DIA: Parada[] = [
  { frame: 0, x: 520, y: 900 },
  { frame: 30, x: 960, y: LINHA_Y_V[1], clique: true },
  { frame: 54, x: 790, y: LINHA_Y_V[2], clique: true },
  { frame: 74, x: 960, y: LINHA_Y_V[2], clique: true },
  { frame: 96, x: 960, y: LINHA_Y_V[3], clique: true },
  { frame: 120, x: 940, y: 452 },
];

export const NoDia: React.FC = () => {
  const frame = useCurrentFrame();
  const cursor = posicaoCursor(frame, PARADAS_DIA);
  const clique = pulsoDoClique(frame, PARADAS_DIA);

  const aceso = (quando: number) => (quando >= 0 && frame >= quando ? 1 : 0);
  const presentes = 14 + ACENDE_V.presente.filter((q) => aceso(q) === 1).length;

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.6} />

      <Palco topo={600}>
        <Painel
          titulo="Lista · dia do jogo"
          etiqueta={`${presentes}/${TOTAL_FIM} presentes`}
          largura={1060}
          pulso
        >
          {JOGADORES.slice(0, 5).map((jogador, i) => (
            <LinhaJogador
              key={jogador.nome}
              nome={jogador.nome}
              lado={jogador.lado}
              cor={corDoLado(jogador.lado)}
              altura={78}
              direita={
                <>
                  <Chip tom="ok" marcavel aceso={aceso(ACENDE_V.pago[i])}>
                    Pago
                  </Chip>
                  <Chip tom="oliva" marcavel aceso={aceso(ACENDE_V.presente[i])}>
                    Presente
                  </Chip>
                </>
              }
            />
          ))}
        </Painel>

        <Cursor x={cursor.x} y={cursor.y} clique={clique} />
      </Palco>

      {/* Duas linhas no máximo: a legenda mora em y=1400 e a terceira
          linha cairia dentro dos ~250 px que o Instagram cobre. */}
      <Legenda kicker="No portão do campo" titulo={"Quem pagou,\nquem chegou"} entrada={6} />
    </AbsoluteFill>
  );
};

/* ==================================================================
   26–30 s · Chamada
   ================================================================== */

export const Chamada: React.FC = () => {
  const frame = useCurrentFrame();

  const surge = (inicio: number) =>
    interpolate(frame, [inicio, inicio + 14], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.5} />

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(50% 40% at 50% 45%, rgba(125,145,57,0.28) 0%, rgba(11,13,9,0) 70%)",
        }}
      />

      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}
      >
        <Img
          src={staticFile("logo.webp")}
          style={{
            height: 96,
            width: "auto",
            filter: "brightness(0) invert(1)",
            opacity: surge(0) * 0.9,
            marginBottom: 44,
          }}
        />

        <span
          style={{
            fontFamily: FONTE_DISPLAY,
            fontWeight: 700,
            fontSize: 96,
            lineHeight: 0.96,
            textTransform: "uppercase",
            textAlign: "center",
            color: COR.tinta,
            opacity: surge(4),
            translate: `0 ${interpolate(surge(4), [0, 1], [22, 0])}px`,
          }}
        >
          Organizador
          <br />
          de operações
        </span>
        <span
          style={{
            marginTop: 18,
            fontFamily: FONTE_DADO,
            fontSize: 30,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: COR.oliva300,
            opacity: surge(12),
          }}
        >
          Grátis · sem taxa por inscrição
        </span>

        <div
          style={{
            marginTop: 60,
            filter: `drop-shadow(0 0 ${interpolate(frame, [18, 44, 70], [0, 44, 22], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}px rgba(125,145,57,0.75))`,
            opacity: surge(18),
          }}
        >
          <Botao tamanho={44}>Abra a sua no site</Botao>
        </div>

        <span
          style={{
            marginTop: 36,
            fontFamily: FONTE_DADO,
            fontSize: 30,
            letterSpacing: "0.2em",
            color: COR.texto2,
            opacity: surge(26),
          }}
        >
          comunidadeairsoft.com.br
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
