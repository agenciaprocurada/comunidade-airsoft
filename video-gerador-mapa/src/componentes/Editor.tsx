import { Img, interpolate, staticFile } from "remotion";
import { COR, FONTE_DADO, FONTE_DISPLAY, FONTE_TEXTO } from "../tema";

/**
 * A casca do editor de mapas, recriada.
 *
 * Não é screenshot: o vídeo precisa que cada botão acenda na hora
 * certa, que o contador de camadas suba e que a paleta troque de aba —
 * coisas que uma imagem não faz. As medidas seguem /mapa do site (barra
 * de aplicativo, barra de comando, ferramentas à esquerda, painéis em
 * dock à direita), com a tipografia um passo maior porque em vídeo o
 * espectador está longe da tela.
 */

export const ALTURA_BARRA = 60;
export const ALTURA_COMANDO = 64;
export const RESPIRO = 28;
export const LARGURA_FERRAMENTAS = 86;
export const LARGURA_PAINEIS = 340;

/** Espaço que sobra para o palco, e a escala que o documento assume. */
export const LARGURA_PALCO = 1920 - RESPIRO * 2 - LARGURA_FERRAMENTAS - LARGURA_PAINEIS - 28;
export const ESCALA_DOC = LARGURA_PALCO / 1280;

/**
 * A altura do palco é FIXA, não `flex: 1`.
 *
 * Não é preciosismo: o ponteiro do mouse precisa clicar em coordenadas
 * do documento, e para converter doc → tela eu tenho que saber onde o
 * documento começa ANTES de o navegador medir nada. Com altura fixa a
 * conta é fechada; com flex ela dependeria da altura renderizada do
 * rodapé, que muda com a fonte.
 */
export const ALTURA_AREA_DOC = 861;
export const ALTURA_RODAPE_PALCO = 29;

/** Canto superior esquerdo do documento, em pixels da tela de 1920x1080. */
export const ORIGEM_DOC = {
  x: RESPIRO + LARGURA_FERRAMENTAS + 14,
  y: ALTURA_BARRA + ALTURA_COMANDO + RESPIRO + (ALTURA_AREA_DOC - 720 * ESCALA_DOC) / 2,
};

/** Um ponto do documento (1280x720) no espaço da tela. */
export const docParaTela = (x: number, y: number) => ({
  x: ORIGEM_DOC.x + x * ESCALA_DOC,
  y: ORIGEM_DOC.y + y * ESCALA_DOC,
});

/** Também usada pela barra horizontal do vídeo vertical. */
export const FERRAMENTAS = [
  { acao: "selecionar", rotulo: "Selecionar", icone: "M5 3l14 8-6 1.5L10 19z" },
  {
    acao: "mover",
    rotulo: "Mover",
    icone: "M12 4v16M4 12h16M9 7l3-3 3 3M9 17l3 3 3-3M7 9l-3 3 3 3M17 9l3 3-3 3",
  },
  { acao: "area", rotulo: "Área", icone: "M4 8l6-4 10 5-3 10-9 2z" },
  { acao: "linha", rotulo: "Linha", icone: "M4 20L20 4M4 20h4M20 4v4" },
  { acao: "rota", rotulo: "Rota", icone: "M4 19c6 0 4-7 9-7h6M15 8l4 4-4 4" },
  { acao: "texto", rotulo: "Texto", icone: "M5 5h14M12 5v14M9 19h6" },
  {
    acao: "marcacao",
    rotulo: "Ponto",
    icone: "M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11zM12 8v4M12 14.5v.5",
  },
];

const ACOES = [
  { acao: "desfazer", rotulo: "Desfazer", icone: "M9 7L4 12l5 5M4 12h10a5 5 0 0 1 0 10h-2" },
  { acao: "refazer", rotulo: "Refazer", icone: "M15 7l5 5-5 5M20 12H10a5 5 0 0 0 0 10h2" },
  {
    acao: "excluir",
    rotulo: "Excluir",
    icone: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6",
  },
];

/** Aba "Estrutura" da paleta de símbolos, na ordem do site. */
const PALETA_ESTRUTURA = [
  { rotulo: "Base", cor: "#3b82f6", icone: "M6 21V3M6 4h12l-3 4 3 4H6" },
  { rotulo: "Safe zone", cor: "#3b82f6", icone: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" },
  { rotulo: "Respawn", cor: "#22c55e", icone: "M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4" },
  { rotulo: "Estacionamento", cor: "#8b8f8a", icone: "M8 20V4h5a4 4 0 0 1 0 8H8" },
  {
    rotulo: "Concentração",
    cor: "#f2b705",
    icone:
      "M12 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM7 20v-1a5 5 0 0 1 10 0v1M4.5 9.5a2 2 0 1 1 0 4M19.5 9.5a2 2 0 1 0 0 4",
  },
];

const Icone: React.FC<{ d: string; tamanho?: number; cor?: string }> = ({
  d,
  tamanho = 20,
  cor = "currentColor",
}) => (
  <svg
    viewBox="0 0 24 24"
    width={tamanho}
    height={tamanho}
    fill="none"
    stroke={cor}
    strokeWidth={1.6}
    strokeLinecap="square"
  >
    <path d={d} />
  </svg>
);

const BotaoBarra: React.FC<{ rotulo: string; icone: string }> = ({ rotulo, icone }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      border: `1px solid ${COR.borda}`,
      color: COR.texto,
      fontFamily: FONTE_TEXTO,
      fontSize: 15,
      whiteSpace: "nowrap",
    }}
  >
    <Icone d={icone} tamanho={17} />
    {rotulo}
  </div>
);

const RotuloPainel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontFamily: FONTE_DADO,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: "0.16em",
      color: COR.texto2,
    }}
  >
    {children}
  </div>
);

const Controle: React.FC<{ rotulo: string; valor: string; preenchido: number }> = ({
  rotulo,
  valor,
  preenchido,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <RotuloPainel>{rotulo}</RotuloPainel>
      <span style={{ fontFamily: FONTE_DADO, fontSize: 14, color: COR.oliva300 }}>{valor}</span>
    </div>
    <div style={{ position: "relative", height: 4, backgroundColor: COR.borda }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${preenchido * 100}%`,
          backgroundColor: COR.oliva500,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `${preenchido * 100}%`,
          top: -5,
          width: 14,
          height: 14,
          marginLeft: -7,
          backgroundColor: COR.oliva300,
        }}
      />
    </div>
  </div>
);

const Aba: React.FC<{ rotulo: string; ativa: boolean }> = ({ rotulo, ativa }) => (
  <div
    style={{
      flex: 1,
      textAlign: "center",
      padding: "11px 4px",
      borderBottom: `2px solid ${ativa ? COR.oliva500 : "transparent"}`,
      fontFamily: FONTE_DADO,
      fontSize: 12,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: ativa ? COR.oliva300 : COR.texto2,
      whiteSpace: "nowrap",
      overflow: "hidden",
    }}
  >
    {rotulo}
  </div>
);

export interface CamadaPainel {
  rotulo: string;
  cor: string;
  /** 0 a 1: a linha entrando na lista. */
  entrada: number;
}

export const Editor: React.FC<{
  ferramenta: string;
  camadas: CamadaPainel[];
  dica: string;
  /** 0 a 1: a casca se montando na tela. */
  montagem?: number;
  menuAberto?: boolean;
  /** Qual aba do grupo de cima está aberta. */
  abaConteudo?: "camadas" | "estrutura";
  /** Item da paleta em destaque (o que o ponteiro vai clicar). */
  simboloDestacado?: string | null;
  children?: React.ReactNode;
}> = ({
  ferramenta,
  camadas,
  dica,
  montagem = 1,
  menuAberto = false,
  abaConteudo = "camadas",
  simboloDestacado = null,
  children,
}) => {
  const entra = (atraso: number) =>
    interpolate(montagem, [atraso, atraso + 0.35], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: COR.fundo,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ---------- Barra do aplicativo ---------- */}
      <div
        style={{
          height: ALTURA_BARRA,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: `0 ${RESPIRO}px`,
          borderBottom: `1px solid ${COR.borda}`,
          opacity: entra(0),
          translate: `0 ${interpolate(entra(0), [0, 1], [-24, 0])}px`,
        }}
      >
        <Img
          src={staticFile("logo.webp")}
          style={{ height: 30, width: "auto", filter: "brightness(0) invert(1)" }}
        />
        <span
          style={{
            fontFamily: FONTE_DADO,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: COR.oliva300,
          }}
        >
          Editor de mapas
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <BotaoBarra
            rotulo="Ajuda"
            icone="M9.5 9.3a2.6 2.6 0 1 1 3.6 2.4c-.8.35-1.1.9-1.1 1.8M12 16.6v.6"
          />
          <BotaoBarra rotulo="Sair do editor" icone="M14 4h6v16h-6M13 12H4M8 8l-4 4 4 4" />
          <BotaoBarra rotulo="Tela cheia" icone="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
        </div>
      </div>

      {/* ---------- Barra de comando ---------- */}
      <div
        style={{
          height: ALTURA_COMANDO,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: `0 ${RESPIRO}px`,
          borderBottom: `1px solid ${COR.borda}`,
          opacity: entra(0.08),
          translate: `0 ${interpolate(entra(0.08), [0, 1], [-18, 0])}px`,
        }}
      >
        <BotaoBarra rotulo="Meus mapas" icone="M19 12H5M11 6l-6 6 6 6" />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: FONTE_DISPLAY,
              fontSize: 22,
              fontWeight: 600,
              color: COR.tinta,
              whiteSpace: "nowrap",
            }}
          >
            Bengazi — Operação Fênix
          </span>
          <Icone
            d="M4 20l.8-3.2L15.6 6l2.4 2.4L7.2 19.2zM14 7.6l2.4 2.4M17 4.6l2.4 2.4"
            tamanho={17}
            cor={COR.texto2}
          />
        </div>

        <div
          style={{
            flex: 1,
            maxWidth: 520,
            margin: "0 auto",
            position: "relative",
            border: `1px solid ${COR.borda}`,
            backgroundColor: COR.papel,
            padding: "9px 14px 9px 40px",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={18}
            height={18}
            fill="none"
            stroke={COR.texto2}
            strokeWidth={1.8}
            style={{ position: "absolute", left: 12, top: "50%", marginTop: -9 }}
          >
            <circle cx={11} cy={11} r={6.5} />
            <path d="M20 20l-4-4" strokeLinecap="square" />
          </svg>
          <span style={{ fontFamily: FONTE_TEXTO, fontSize: 15, color: COR.texto2 }}>
            Buscar endereço, sítio, CEP ou coordenada…
          </span>
        </div>

        <BotaoBarra rotulo="Travar mapa" icone="M8 11V7a4 4 0 0 1 8 0v4M12 14.5v2.5" />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            backgroundColor: COR.oliva500,
            color: COR.fundo,
            fontFamily: FONTE_TEXTO,
            fontSize: 15,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          <Icone d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6" tamanho={17} />
          Salvar mapa
        </div>

        <div style={{ position: "relative" }}>
          <div style={{ padding: "9px 8px", border: `1px solid ${COR.borda}`, color: COR.texto }}>
            <svg viewBox="0 0 24 24" width={17} height={17} fill="currentColor">
              <circle cx={12} cy={5} r={1.8} />
              <circle cx={12} cy={12} r={1.8} />
              <circle cx={12} cy={19} r={1.8} />
            </svg>
          </div>
          {menuAberto ? (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                width: 250,
                backgroundColor: COR.papel,
                border: `1px solid ${COR.bordaForte}`,
                padding: "6px 0",
                zIndex: 40,
                boxShadow: "0 18px 50px -12px rgba(0,0,0,0.9)",
              }}
            >
              {["Novo mapa", "Duplicar mapa", "Reposicionar satélite", "Meus mapas"].map((item) => (
                <div
                  key={item}
                  style={{
                    padding: "10px 16px",
                    fontFamily: FONTE_TEXTO,
                    fontSize: 15,
                    color: item === "Reposicionar satélite" ? COR.oliva300 : COR.texto,
                    backgroundColor:
                      item === "Reposicionar satélite" ? COR.oliva050 : "transparent",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* ---------- Área de trabalho ---------- */}
      <div style={{ flex: 1, display: "flex", gap: 14, padding: RESPIRO, minHeight: 0 }}>
        {/* Ferramentas */}
        <div
          style={{
            width: LARGURA_FERRAMENTAS,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            padding: 5,
            border: `1px solid ${COR.borda}`,
            backgroundColor: "rgba(20,24,15,0.5)",
            opacity: entra(0.16),
            translate: `${interpolate(entra(0.16), [0, 1], [-30, 0])}px 0`,
          }}
        >
          {FERRAMENTAS.map((f) => {
            const ativa = f.acao === ferramenta;
            return (
              <div
                key={f.acao}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  padding: "8px 2px",
                  border: `1px solid ${ativa ? COR.oliva700 : "transparent"}`,
                  backgroundColor: ativa ? COR.oliva050 : "transparent",
                  color: ativa ? COR.oliva300 : COR.texto2,
                  fontFamily: FONTE_DADO,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                <Icone d={f.icone} tamanho={19} />
                {f.rotulo}
              </div>
            );
          })}

          <div style={{ height: 1, backgroundColor: COR.borda, margin: "6px 0" }} />

          {ACOES.map((a) => (
            <div
              key={a.acao}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "8px 2px",
                color: COR.texto2,
                fontFamily: FONTE_DADO,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              <Icone d={a.icone} tamanho={19} />
              {a.rotulo}
            </div>
          ))}
        </div>

        {/* Palco */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              height: ALTURA_AREA_DOC,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: entra(0.24),
            }}
          >
            {children}
          </div>

          <div
            style={{
              height: ALTURA_RODAPE_PALCO,
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 22,
              opacity: entra(0.3),
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {["−", "100%", "+", "Ajustar"].map((b) => (
                <div
                  key={b}
                  style={{
                    padding: "5px 12px",
                    border: `1px solid ${COR.borda}`,
                    fontFamily: FONTE_DADO,
                    fontSize: 14,
                    color: COR.texto2,
                  }}
                >
                  {b}
                </div>
              ))}
            </div>
            <span style={{ fontFamily: FONTE_TEXTO, fontSize: 15, color: COR.texto2 }}>{dica}</span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: FONTE_DADO,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: COR.texto2,
              }}
            >
              29°50′03″S 51°10′20″W · Z19 · 59°
            </span>
          </div>
        </div>

        {/* Painéis em dock */}
        <div
          style={{
            width: LARGURA_PAINEIS,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            minHeight: 0,
            opacity: entra(0.2),
            translate: `${interpolate(entra(0.2), [0, 1], [30, 0])}px 0`,
          }}
        >
          {/* Grupo de cima: o que está no mapa */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              border: `1px solid ${COR.borda}`,
              backgroundColor: "rgba(20,24,15,0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                borderBottom: `1px solid ${COR.borda}`,
                backgroundColor: "rgba(11,13,9,0.7)",
              }}
            >
              <Aba rotulo={`Camadas ${camadas.length}`} ativa={abaConteudo === "camadas"} />
              <Aba rotulo="Estrutura" ativa={abaConteudo === "estrutura"} />
              <Aba rotulo="Terreno" ativa={false} />
              <Aba rotulo="Operação" ativa={false} />
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              {abaConteudo === "estrutura" ? (
                <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {PALETA_ESTRUTURA.map((s) => {
                    const aceso = simboloDestacado === s.rotulo;
                    return (
                      <div
                        key={s.rotulo}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 11,
                          padding: "9px 11px",
                          border: `1px solid ${aceso ? COR.oliva500 : COR.borda}`,
                          backgroundColor: aceso ? COR.oliva050 : COR.papel,
                          fontFamily: FONTE_TEXTO,
                          fontSize: 15,
                          color: COR.tinta,
                        }}
                      >
                        <span
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 999,
                            backgroundColor: s.cor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icone d={s.icone} tamanho={17} cor="#0b0d09" />
                        </span>
                        {s.rotulo}
                      </div>
                    );
                  })}
                </div>
              ) : camadas.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 14,
                    padding: "48px 26px",
                    textAlign: "center",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width={40}
                    height={40}
                    fill="none"
                    stroke={COR.texto2}
                    strokeWidth={1.4}
                    strokeLinejoin="round"
                  >
                    <path d="M12 3l9 5-9 5-9-5z" />
                    <path d="M3 12.5l9 5 9-5M3 17l9 5 9-5" opacity={0.55} />
                  </svg>
                  <span
                    style={{
                      fontFamily: FONTE_TEXTO,
                      fontSize: 15,
                      lineHeight: 1.6,
                      color: COR.texto2,
                      maxWidth: 250,
                    }}
                  >
                    Nada desenhado ainda. Escolha uma ferramenta à esquerda e clique no mapa para
                    criar áreas, rotas ou pontos.
                  </span>
                </div>
              ) : (
                camadas.map((c) => (
                  <div
                    key={c.rotulo}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderBottom: `1px solid ${COR.borda}`,
                      opacity: c.entrada,
                      translate: `${interpolate(c.entrada, [0, 1], [24, 0], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      })}px 0`,
                    }}
                  >
                    <div
                      style={{ width: 13, height: 13, backgroundColor: c.cor, flexShrink: 0 }}
                    />
                    <span style={{ fontFamily: FONTE_TEXTO, fontSize: 15, color: COR.tinta }}>
                      {c.rotulo}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      width={17}
                      height={17}
                      fill="none"
                      stroke={COR.texto2}
                      strokeWidth={1.5}
                      style={{ marginLeft: "auto" }}
                    >
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                      <circle cx={12} cy={12} r={2.5} />
                    </svg>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Grupo de baixo: como o mapa é desenhado */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              border: `1px solid ${COR.borda}`,
              backgroundColor: "rgba(20,24,15,0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                borderBottom: `1px solid ${COR.borda}`,
                backgroundColor: "rgba(11,13,9,0.7)",
              }}
            >
              <Aba rotulo="Traço" ativa />
              <Aba rotulo="Grade" ativa={false} />
              <Aba rotulo="Satélite" ativa={false} />
            </div>

            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <RotuloPainel>Cor</RotuloPainel>
                <div style={{ display: "flex", gap: 8 }}>
                  {["#22c55e", "#f2b705", "#ef4444", "#3b82f6", "#a855f7", "#ffffff"].map(
                    (c, i) => (
                      <div
                        key={c}
                        style={{
                          width: 30,
                          height: 30,
                          backgroundColor: c,
                          border: i === 0 ? `2px solid ${COR.tinta}` : `1px solid ${COR.borda}`,
                        }}
                      />
                    ),
                  )}
                </div>
              </div>
              <Controle rotulo="Espessura" valor="3 px" preenchido={0.3} />
              <Controle rotulo="Preenchimento" valor="22%" preenchido={0.22} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
