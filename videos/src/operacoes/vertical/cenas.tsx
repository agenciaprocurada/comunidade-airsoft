import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Cursor, posicaoCursor, pulsoDoClique, type Parada } from "../../componentes/Cursor";
import { Legenda } from "../../vertical/Moldura";
import { ChatNoCelular, PaginaDoEvento } from "../cenas/Confirmar";
import { Apresentacao as ApresentacaoBase } from "../cenas/Apresentacao";
import { Dor as DorBase } from "../cenas/Dor";
import { Espera as EsperaBase } from "../cenas/Espera";
import {
  Balao,
  BarraDeEnvio,
  CabecalhoDaConversa,
  FundoDaConversa,
  indiceDoNome,
} from "../conversa";
import { COR, FONTE_DADO, FONTE_DISPLAY } from "../../tema";
import {
  BUSCA_CAMPO,
  CONVERSA,
  JOGADORES,
  LADOS,
  GRUPO,
  OPERACAO,
  TOTAL_FIM,
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
 * As sete cenas do 9:16.
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
   0–4 s · O gancho: a dor
   ================================================================== */

/**
 * A abertura NÃO tem marca nem produto.
 *
 * O vídeo antigo abria com o logo por dois segundos — os dois
 * segundos mais caros do formato, gastos com a única coisa que o
 * espectador ainda não tem motivo para querer ver. Agora ele abre na
 * tela que o organizador reconhece antes de ler: a lista no bloco de
 * notas, e as mesmas quatro perguntas de toda semana caindo por cima.
 */
export const Dor: React.FC = () => (
  <DorBase
    batidas={{ lista: 90, perguntas: 210 }}
    telefone={{ x: 240, y: 250, largura: 600, altura: 1130 }}
    /* Centralizado: o aparelho também é, e texto encostado na
       esquerda com meia tela vazia à direita fica torto no 9:16. */
    legenda={{ x: 64, y: 1410, largura: 952, tamanho: 72, centro: true }}
  />
);

/* ==================================================================
   10–14 s · O que é a ferramenta
   ================================================================== */

/** A apresentação, com a marca em tela cheia — só depois da dor. */
export const ApresentacaoVertical: React.FC = () => (
  <ApresentacaoBase logo={150} titulo={78} centroY={0.44} />
);

/* ==================================================================
   14–20 s · Abrir a operação
   ================================================================== */

/**
 * O formulário voltou ao roteiro — agora com tempo para ser lido.
 *
 * Ele tinha saído porque preencher formulário é custo, não benefício.
 * Mas num vídeo que se propõe a EXPLICAR a ferramenta, a pergunta
 * "quanto trabalho isso me dá" precisa de resposta na tela: seis
 * segundos mostrando campo, data, lados e preço respondem melhor do
 * que qualquer adjetivo.
 */
const PARADAS_CRIAR: Parada[] = [
  { frame: 0, x: 520, y: 820 },
  { frame: 16, x: 220, y: 154, clique: true },
  { frame: 66, x: 220, y: 265, clique: true },
  { frame: 96, x: 160, y: 450, clique: true },
  { frame: 126, x: 220, y: 561, clique: true },
  { frame: 156, x: 200, y: 650, clique: true },
  { frame: 180, x: 200, y: 650 },
];

export const CriarVertical: React.FC = () => {
  const frame = useCurrentFrame();
  const cursor = posicaoCursor(frame, PARADAS_CRIAR);
  const clique = pulsoDoClique(frame, PARADAS_CRIAR);

  const digitando = frame >= 18 && frame < 56;
  const escolheu = frame >= 58;
  const publicou = frame >= 156;

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
                escolheu
                  ? `${OPERACAO.campo} — ${OPERACAO.cidade}`
                  : digitado(BUSCA_CAMPO, frame, 18)
              }
              digitando={digitando}
              frame={frame}
            />
            <div style={{ display: "flex", gap: 22 }}>
              <CampoForm rotulo="Data" valor={frame >= 70 ? "13/09/2026" : ""} largura={485} />
              <CampoForm rotulo="Início" valor={frame >= 80 ? OPERACAO.inicio : ""} largura={485} />
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
                  const entra = i === 0 ? surgir(frame, 62, 10) : surgir(frame, 100, 10);
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
              <CampoForm rotulo="Lote antecipado" valor={frame >= 130 ? "35,00" : ""} largura={485} />
              <CampoForm rotulo="No dia" valor={frame >= 140 ? "50,00" : ""} largura={485} />
            </div>

            <Botao
              aceso={
                publicou
                  ? interpolate(frame, [156, 176], [1, 0.2], {
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

      <Legenda kicker="Um minuto" titulo={"Abra a\noperação"} entrada={6} saida={110} />
      <Legenda kicker="Você decide" titulo={"Os lados e as\nvagas de cada um"} entrada={118} />
    </AbsoluteFill>
  );
};

/* ==================================================================
   20–28 s · Copiar o link e colar no grupo
   ================================================================== */

/**
 * O copia-e-cola inteiro, na tela, com ponteiro.
 *
 * Mesmas cinco batidas do 16:9 — selecionar, copiar, atravessar,
 * colar, enviar — porque é o gesto que o organizador vai repetir na
 * vida real, e vê-lo completo é o que faz a ferramenta parecer
 * possível. Sem isso a mensagem aparece no grupo e sobra a dúvida
 * errada: o site posta no meu grupo sozinho?
 */
const BATIDAS_LINK = {
  copiar: 44,
  colar: 108,
  enviar: 146,
  mensagem: 152,
  respostas: 196,
} as const;

/**
 * As paradas são em coordenadas de TELA, porque o ponteiro é desenhado
 * fora do `Palco` (que escala o painel em 0,9). Elas foram calculadas
 * a partir da geometria abaixo — mexer no `topo` do palco ou na altura
 * da janela do grupo obriga a refazer estas contas:
 *
 *   botão "Copiar link": x 178 · y 565 (medido no quadro renderizado)
 *   campo de mensagem:   x 300 · 860 + 68 + 370 + 41 = 1339
 *   botão de enviar:     x 981 · mesmo y
 */
const PARADAS_LINK: Parada[] = [
  { frame: 0, x: 540, y: 1600 },
  { frame: BATIDAS_LINK.copiar, x: 178, y: 565, clique: true },
  { frame: BATIDAS_LINK.colar, x: 300, y: 1339, clique: true },
  { frame: BATIDAS_LINK.enviar, x: 981, y: 1339, clique: true },
  { frame: 240, x: 940, y: 1300 },
];

export const LinkNoGrupo: React.FC = () => {
  const frame = useCurrentFrame();
  const cursor = posicaoCursor(frame, PARADAS_LINK);
  const clique = pulsoDoClique(frame, PARADAS_LINK);

  const copiou = frame >= BATIDAS_LINK.copiar;
  const colou = frame >= BATIDAS_LINK.colar;
  const enviou = frame >= BATIDAS_LINK.enviar;

  const flashDoColar = interpolate(
    frame,
    [BATIDAS_LINK.colar, BATIDAS_LINK.colar + 4, BATIDAS_LINK.colar + 24],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.6} />

      <Palco topo={330}>
        <Painel titulo={OPERACAO.titulo} etiqueta="Aberta" largura={1060} pulso>
          <div style={{ padding: 30, display: "flex", flexDirection: "column", gap: 20 }}>
            <CaixaLink
              rotulo="Link do evento"
              link={OPERACAO.link}
              entrada={surgir(frame, 2, 10)}
              selecionado={interpolate(
                frame,
                [
                  BATIDAS_LINK.copiar - 16,
                  BATIDAS_LINK.copiar - 6,
                  BATIDAS_LINK.copiar + 18,
                  BATIDAS_LINK.copiar + 30,
                ],
                [0, 1, 1, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              )}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: surgir(frame, 10, 8) }}>
              <Botao
                tamanho={24}
                aceso={
                  copiou
                    ? interpolate(frame, [BATIDAS_LINK.copiar, BATIDAS_LINK.copiar + 18], [1, 0], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      })
                    : 0
                }
              >
                Copiar link
              </Botao>
              <span style={{ opacity: surgir(frame, BATIDAS_LINK.copiar + 3, 8) }}>
                <Chip tom="ok" marcavel>
                  Copiado
                </Chip>
              </span>
            </div>
          </div>
        </Painel>
      </Palco>

      {/* O grupo, embaixo: o ponteiro atravessa de um para o outro. */}
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 860,
          // 500 e não 580: a janela terminava em 1440 e batia na
          // legenda, que mora em 1400. Agora fecha em 1360.
          width: 952,
          height: 500,
          overflow: "hidden",
          border: `1px solid ${COR.borda}`,
          opacity: surgir(frame, 20, 10),
        }}
      >
        <CabecalhoDaConversa nome={GRUPO.nome} membros={GRUPO.membros} />

        <div style={{ position: "relative", height: 370 }}>
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
            {CONVERSA.map((mensagem, i) => {
              const quando =
                i === 0
                  ? 0
                  : i === 1
                    ? BATIDAS_LINK.mensagem
                    : BATIDAS_LINK.respostas + (i - 2) * 24;
              const entrada = surgir(frame, quando, 8);
              if (entrada === 0) return null;
              return (
                <Balao
                  key={`${mensagem.de}-${i}`}
                  mensagem={mensagem}
                  eu="Rodrigo"
                  indiceNome={indiceDoNome(mensagem.de)}
                  largura={560}
                  entrada={entrada}
                />
              );
            })}
          </div>
        </div>

        <BarraDeEnvio texto={colou && !enviou ? OPERACAO.link : undefined} destaque={flashDoColar} />
      </div>

      <Cursor x={cursor.x} y={cursor.y} clique={clique} />

      <Legenda kicker="A virada" titulo={"Manda UM link.\nUma vez."} entrada={6} saida={150} />
      <Legenda kicker="Colou no grupo" titulo={"Você não\nreenvia nada"} entrada={160} />
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
const TROCA_V = 46;

const PARADAS_CONFIRMAR: Parada[] = [
  { frame: 0, x: 540, y: 1500 },
  { frame: 38, x: 480, y: 1020, clique: true },
  { frame: 96, x: 480, y: 1053, clique: true },
  { frame: 130, x: 440, y: 1137, clique: true },
  { frame: 180, x: 470, y: 1160 },
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
              <PaginaDoEvento frame={frame} militar={96} confirmar={130} />
            </div>
          </div>
        </Telefone>
      </div>

      <Cursor x={cursor.x} y={cursor.y} clique={clique} />

      {/* A segunda legenda só entra DEPOIS que a primeira terminou de
          sair (saída + 6 frames de fade). Sem essa folga as duas ficam
          na tela ao mesmo tempo, uma por cima da outra. */}
      <Legenda kicker="Do outro lado" titulo={"Ele abre\ne confirma"} entrada={6} saida={118} />
      <Legenda kicker="Dois toques" titulo={"Entrou\nna lista"} entrada={132} />
    </AbsoluteFill>
  );
};

/* ==================================================================
   16–23 s · A lista se enche sozinha
   ================================================================== */

const ENTRADAS_V = [0, 18, 38, 58, 78, 98];

export const Lista: React.FC = () => {
  const frame = useCurrentFrame();

  const entraram = ENTRADAS_V.filter((f) => frame >= f).length;
  // Só os seis primeiros: o Marcos e o Wesley são a cena da espera.
  const naTela = JOGADORES.slice(0, ENTRADAS_V.length);
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
            {naTela.map((jogador, i) => {
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

      <Legenda kicker="Sem você fazer nada" titulo={"A lista se\nescreve sozinha"} entrada={4} />
    </AbsoluteFill>
  );
};

/* ==================================================================
   15–18 s · O pico: lotou, e a fila anda sozinha
   ================================================================== */

/**
 * A mesma cena do 16:9, só reenquadrada.
 *
 * É o único momento do vídeo que mostra algo que o bloco de notas não
 * faz de jeito nenhum — por isso ela tem cena própria, três batidas e
 * um número grande, em vez do chip discreto de antes.
 */
export const EsperaNaFila: React.FC = () => (
  <EsperaBase
    painel={{ x: 64, y: 520, largura: 952 }}
    legenda={{ x: 64, y: 1330, largura: 952, tamanho: 76 }}
  />
);

/* ==================================================================
   18–22 s · No dia do jogo
   ================================================================== */

const ACENDE_V = {
  presente: [0, 34, 78, 108, -1],
  pago: [0, 0, 58, 0, 0],
} as const;

const LINHA_Y_V = [101, 179, 257, 335, 413];

const PARADAS_DIA: Parada[] = [
  { frame: 0, x: 520, y: 900 },
  { frame: 34, x: 960, y: LINHA_Y_V[1], clique: true },
  { frame: 58, x: 790, y: LINHA_Y_V[2], clique: true },
  { frame: 78, x: 960, y: LINHA_Y_V[2], clique: true },
  { frame: 108, x: 960, y: LINHA_Y_V[3], clique: true },
  { frame: 148, x: 940, y: 452 },
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
   22–26 s · Objeções e chamada
   ================================================================== */

/**
 * Os três selos entram ANTES do botão, e não é enfeite: as três
 * objeções de quem organiza jogo são sempre as mesmas — "quanto
 * custa", "vocês ficam com uma parte" e "vou ter que cobrar por
 * dentro do site". Responder isso em três segundos vale mais do que
 * qualquer adjetivo no CTA.
 */
const SELOS = ["Grátis", "Sem taxa por inscrição", "O dinheiro é seu"];

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

        {/* As três objeções, respondidas antes do botão. */}
        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 12,
            maxWidth: 900,
          }}
        >
          {SELOS.map((selo, i) => (
            <span key={selo} style={{ opacity: surge(10 + i * 6) }}>
              <Chip tom="oliva" tamanho={24} marcavel>
                {selo}
              </Chip>
            </span>
          ))}
        </div>

        <div
          style={{
            marginTop: 52,
            filter: `drop-shadow(0 0 ${interpolate(frame, [18, 44, 70], [0, 44, 22], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}px rgba(125,145,57,0.75))`,
            opacity: surge(18),
          }}
        >
          <Botao tamanho={44}>Abra a sua em 1 minuto</Botao>
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
