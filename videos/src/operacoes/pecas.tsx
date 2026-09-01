import { Easing, interpolate } from "remotion";
import { COR, FONTE_DADO, FONTE_DISPLAY, FONTE_TEXTO } from "../tema";

/**
 * As peças da interface do Organizador de Operações, recriadas em
 * React.
 *
 * Remotion não grava tela. Recriar não é preciosismo: o roteiro pede
 * que a barra de vagas ENCHA, que os nomes CAIAM na lista um a um e
 * que o chip de "pago" ACENDA no clique. Nada disso sai de uma captura
 * de vídeo — cada elemento precisa ser um nó que responde ao frame.
 *
 * As medidas são pensadas para 1920×1080. Para o 9:16 os blocos são
 * reaproveitados dentro de um `scale`, o que mantém uma implementação
 * só: mudou a peça, mudou nos dois vídeos.
 *
 * A tipografia está um passo maior do que no site porque em vídeo o
 * espectador está longe da tela.
 */

const SUAVE = Easing.bezier(0.16, 1, 0.3, 1);

/** 0 → 1 ao longo de `duracao` frames a partir de `inicio`. */
export const surgir = (frame: number, inicio: number, duracao = 14) =>
  interpolate(frame, [inicio, inicio + duracao], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: SUAVE,
  });

/* ==================================================================
   Moldura de painel — a "janela" que carrega qualquer tela
   ================================================================== */

export const Painel: React.FC<{
  titulo: string;
  /** Texto miúdo do canto direito da barra (status, contagem). */
  etiqueta?: string;
  /** Cor do texto da etiqueta. */
  corEtiqueta?: string;
  largura: number;
  children: React.ReactNode;
  /** Ponto vivo pulsando antes do título — "no ar". */
  pulso?: boolean;
  style?: React.CSSProperties;
}> = ({ titulo, etiqueta, corEtiqueta = COR.oliva300, largura, children, pulso, style }) => (
  <div
    style={{
      width: largura,
      border: `1px solid ${COR.bordaForte}`,
      backgroundColor: COR.fundo,
      boxShadow: "0 40px 90px -30px rgba(0,0,0,0.9)",
      ...style,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        padding: "16px 22px",
        borderBottom: `1px solid ${COR.borda}`,
        fontFamily: FONTE_DADO,
        fontSize: 21,
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        color: COR.texto2,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {pulso ? (
          <span style={{ width: 10, height: 10, backgroundColor: COR.oliva400 }} />
        ) : null}
        {titulo}
      </span>
      {etiqueta ? <span style={{ color: corEtiqueta }}>{etiqueta}</span> : null}
    </div>
    <div style={{ backgroundColor: "#101409" }}>{children}</div>
  </div>
);

/* ==================================================================
   Selos e chips
   ================================================================== */

export type Tom = "ok" | "neutro" | "espera" | "oliva";

const TONS: Record<Tom, { borda: string; texto: string; fundo: string }> = {
  ok: { borda: "rgba(111,174,128,0.6)", texto: "#9fd3ad", fundo: "#12200f" },
  neutro: { borda: COR.bordaForte, texto: COR.texto2, fundo: "transparent" },
  espera: { borda: "rgba(209,161,60,0.65)", texto: COR.latao, fundo: "transparent" },
  oliva: { borda: COR.oliva500, texto: COR.oliva300, fundo: COR.oliva050 },
};

export const Chip: React.FC<{
  tom: Tom;
  children: React.ReactNode;
  /** 0 a 1 — chip apagado acende sem trocar de tamanho. */
  aceso?: number;
  tamanho?: number;
  /** Mostra o "✓" quando aceso. Para chips que são estado, não rótulo. */
  marcavel?: boolean;
}> = ({ tom, children, aceso = 1, tamanho = 19, marcavel = false }) => {
  const alvo = TONS[tom];
  const ligado = aceso > 0.5;

  /*
   * A diferença entre aceso e apagado precisa ser óbvia em movimento:
   * no primeiro teste os dois estados só trocavam de cor e, a 30 fps,
   * ninguém via qual linha o organizador tinha acabado de marcar. Agora
   * o apagado perde o fundo, esmaece o texto e fica sem o "✓" — três
   * sinais em vez de um.
   */
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: marcavel ? 8 : 0,
        padding: "7px 14px",
        border: `1px solid ${ligado ? alvo.borda : "rgba(70,81,47,0.5)"}`,
        backgroundColor: ligado ? alvo.fundo : "transparent",
        fontFamily: FONTE_DADO,
        fontSize: tamanho,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: ligado ? alvo.texto : "#5a6150",
        whiteSpace: "nowrap",
      }}
    >
      {marcavel ? (
        <svg
          width={tamanho * 0.9}
          height={tamanho * 0.9}
          viewBox="0 0 24 24"
          style={{ opacity: ligado ? 1 : 0.28 }}
        >
          <path
            d="m4 12.5 5 5L20 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={ligado ? 3.2 : 2}
            strokeLinecap="square"
          />
        </svg>
      ) : null}
      {children}
    </span>
  );
};

/* ==================================================================
   Campo de formulário
   ================================================================== */

export const CampoForm: React.FC<{
  rotulo: string;
  valor: string;
  /** 0 a 1 — o campo inteiro entrando. */
  entrada?: number;
  /** Caret piscando: o campo está sendo digitado agora. */
  digitando?: boolean;
  frame?: number;
  largura?: number | string;
}> = ({ rotulo, valor, entrada = 1, digitando = false, frame = 0, largura = "100%" }) => (
  <div
    style={{
      width: largura,
      opacity: entrada,
      translate: `0 ${interpolate(entrada, [0, 1], [10, 0])}px`,
    }}
  >
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
      {rotulo}
    </div>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        minHeight: 62,
        padding: "0 18px",
        border: `1px solid ${digitando ? COR.oliva500 : COR.bordaForte}`,
        backgroundColor: COR.papel,
        fontFamily: FONTE_TEXTO,
        fontSize: 27,
        color: valor ? COR.tinta : COR.texto2,
      }}
    >
      {valor}
      {digitando ? (
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: 30,
            marginLeft: 3,
            backgroundColor: COR.oliva300,
            opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
          }}
        />
      ) : null}
    </div>
  </div>
);

/* ==================================================================
   Barra de vagas de um lado
   ================================================================== */

export const BarraLado: React.FC<{
  nome: string;
  confirmados: number;
  vagas: number;
  cor: string;
  /** Legenda embaixo. Vazio esconde a linha. */
  nota?: string;
  corNota?: string;
  largura?: number | string;
  entrada?: number;
}> = ({ nome, confirmados, vagas, cor, nota, corNota = COR.texto2, largura = "100%", entrada = 1 }) => (
  <div
    style={{
      width: largura,
      border: `1px solid ${COR.borda}`,
      backgroundColor: COR.fundo,
      padding: "18px 20px",
      opacity: entrada,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        fontFamily: FONTE_DADO,
        fontSize: 23,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
      }}
    >
      <span style={{ color: COR.tinta }}>{nome}</span>
      <span style={{ color: COR.texto2 }}>
        {confirmados}/{vagas}
      </span>
    </div>

    <div style={{ height: 12, backgroundColor: COR.borda, marginTop: 14 }}>
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, (confirmados / vagas) * 100)}%`,
          backgroundColor: cor,
        }}
      />
    </div>

    {nota ? (
      <div
        style={{
          marginTop: 12,
          fontFamily: FONTE_DADO,
          fontSize: 19,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: corNota,
        }}
      >
        {nota}
      </div>
    ) : null}
  </div>
);

/* ==================================================================
   Uma linha da lista de presença
   ================================================================== */

export const LinhaJogador: React.FC<{
  nome: string;
  lado: string;
  cor: string;
  /** 0 a 1 — a linha caindo na lista. */
  entrada?: number;
  /** Chips à direita. */
  direita?: React.ReactNode;
  altura?: number;
}> = ({ nome, lado, cor, entrada = 1, direita, altura = 74 }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 20,
      height: altura,
      padding: "0 22px",
      borderTop: `1px solid ${COR.borda}`,
      opacity: entrada,
      translate: `0 ${interpolate(entrada, [0, 1], [-12, 0])}px`,
    }}
  >
    <span style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
      <span style={{ width: 10, height: 10, backgroundColor: cor, flexShrink: 0 }} />
      <span
        style={{
          fontFamily: FONTE_TEXTO,
          fontWeight: 600,
          fontSize: 27,
          color: COR.tinta,
          whiteSpace: "nowrap",
        }}
      >
        {nome}
      </span>
      <span
        style={{
          fontFamily: FONTE_DADO,
          fontSize: 18,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: COR.texto2,
        }}
      >
        {lado}
      </span>
    </span>
    <span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>{direita}</span>
  </div>
);

/* ==================================================================
   Caixa do link — no painel de verdade ela é a única coisa em oliva,
   porque é o link que o organizador tem que copiar.
   ================================================================== */

export const CaixaLink: React.FC<{
  rotulo: string;
  link: string;
  largura?: number | string;
  entrada?: number;
}> = ({ rotulo, link, largura = "100%", entrada = 1 }) => (
  <div
    style={{
      width: largura,
      border: `1px solid ${COR.oliva700}`,
      backgroundColor: COR.oliva050,
      padding: "18px 22px",
      opacity: entrada,
      translate: `0 ${interpolate(entrada, [0, 1], [12, 0])}px`,
    }}
  >
    <div
      style={{
        fontFamily: FONTE_DADO,
        fontSize: 18,
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        color: COR.oliva300,
      }}
    >
      {rotulo}
    </div>
    <div
      style={{
        marginTop: 10,
        fontFamily: FONTE_DADO,
        fontSize: 26,
        color: COR.tinta,
        whiteSpace: "nowrap",
      }}
    >
      {link}
    </div>
  </div>
);

/* ==================================================================
   Telefone — a página do evento na mão de quem recebeu o link
   ================================================================== */

/**
 * A moldura do celular.
 *
 * Único lugar do vídeo com canto arredondado: é o que faz a tela ser
 * lida como "celular de alguém" e não como mais um painel. Exceção
 * local e consciente à regra de canto reto do DS — a mesma licença
 * que a bandeja de símbolos tem na landing do criador de mapas.
 *
 * A tela por dentro é reta, então tudo que vive nela continua no
 * dialeto do produto.
 */
export const Telefone: React.FC<{
  largura: number;
  altura: number;
  children: React.ReactNode;
  /** Barra de status falsa no topo — hora e sinal, sem marca nenhuma. */
  hora?: string;
}> = ({ largura, altura, children, hora = "08:12" }) => (
  <div
    style={{
      width: largura,
      height: altura,
      padding: 14,
      borderRadius: 44,
      backgroundColor: "#05060a",
      border: `2px solid ${COR.bordaForte}`,
      boxShadow: "0 50px 120px -40px rgba(0,0,0,0.95)",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 32,
        backgroundColor: COR.fundo,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 26px 10px",
          fontFamily: FONTE_DADO,
          fontSize: 19,
          color: COR.texto2,
          flexShrink: 0,
        }}
      >
        <span>{hora}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {[6, 9, 12, 15].map((h) => (
            <span key={h} style={{ width: 4, height: h, backgroundColor: COR.texto2 }} />
          ))}
          <span
            style={{
              marginLeft: 6,
              width: 26,
              height: 12,
              border: `1px solid ${COR.texto2}`,
              padding: 2,
            }}
          >
            <span style={{ display: "block", width: "70%", height: "100%", backgroundColor: COR.texto2 }} />
          </span>
        </span>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
    </div>
  </div>
);

/**
 * Uma opção de lado no formulário de inscrição, como no site: caixa
 * clicável inteira, marcador redondo à esquerda e o aviso de "espera"
 * quando aquele lado já lotou.
 */
export const OpcaoLado: React.FC<{
  nome: string;
  marcada: boolean;
  cheio?: boolean;
  tamanho?: number;
}> = ({ nome, marcada, cheio = false, tamanho = 25 }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "14px 18px",
      border: `1px solid ${marcada ? COR.oliva700 : COR.borda}`,
      backgroundColor: marcada ? COR.oliva050 : "transparent",
    }}
  >
    <span
      style={{
        width: 20,
        height: 20,
        flexShrink: 0,
        borderRadius: 999,
        border: `2px solid ${marcada ? COR.oliva500 : COR.bordaForte}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {marcada ? (
        <span style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: COR.oliva500 }} />
      ) : null}
    </span>
    <span style={{ flex: 1, fontFamily: FONTE_TEXTO, fontSize: tamanho, color: COR.texto }}>
      {nome}
    </span>
    {cheio ? (
      <span
        style={{
          fontFamily: FONTE_DADO,
          fontSize: 17,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: COR.latao,
        }}
      >
        espera
      </span>
    ) : null}
  </div>
);

/* ==================================================================
   Botão
   ================================================================== */

export const Botao: React.FC<{
  children: React.ReactNode;
  /** 0 a 1 — brilho do clique. */
  aceso?: number;
  tamanho?: number;
  /** Secundário some com o fundo; primário é oliva com chanfro. */
  variante?: "primario" | "secundario";
}> = ({ children, aceso = 0, tamanho = 30, variante = "primario" }) => {
  const primario = variante === "primario";
  return (
    <div
      style={{
        filter: primario
          ? `drop-shadow(0 0 ${interpolate(aceso, [0, 1], [0, 34])}px rgba(125,145,57,0.8))`
          : undefined,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: `${Math.round(tamanho * 0.6)}px ${Math.round(tamanho * 1.5)}px`,
          backgroundColor: primario
            ? aceso > 0.5
              ? COR.oliva400
              : COR.oliva500
            : "transparent",
          border: primario ? "none" : `1px solid ${COR.bordaForte}`,
          // O chanfro de 10 px é do DS e SÓ o CTA primário pode usá-lo.
          clipPath: primario
            ? "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)"
            : undefined,
          fontFamily: FONTE_DISPLAY,
          fontWeight: 700,
          fontSize: tamanho,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: primario ? COR.fundo : COR.tinta,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </div>
    </div>
  );
};

/* ==================================================================
   Etiqueta de passo — a legenda do 16:9
   ================================================================== */

export const Passo: React.FC<{
  numero: string;
  titulo: string;
  /** Frame local da cena. */
  frame: number;
  entrada?: number;
  saida?: number;
  x?: number;
  y?: number;
}> = ({ numero, titulo, frame, entrada = 6, saida, x = 96, y = 108 }) => {
  const opacidade = interpolate(
    frame,
    saida === undefined ? [entrada, entrada + 12] : [entrada, entrada + 12, saida, saida + 10],
    saida === undefined ? [0, 1] : [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: SUAVE },
  );

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: opacidade,
        translate: `0 ${interpolate(opacidade, [0, 1], [16, 0])}px`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 52,
            height: 44,
            border: `1px solid ${COR.bordaForte}`,
            fontFamily: FONTE_DADO,
            fontSize: 20,
            letterSpacing: "0.06em",
            color: COR.oliva400,
          }}
        >
          {numero}
        </span>
        <span style={{ width: 56, height: 3, backgroundColor: COR.oliva500 }} />
      </div>
      <div
        style={{
          fontFamily: FONTE_DISPLAY,
          fontWeight: 700,
          fontSize: 56,
          lineHeight: 1,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          color: COR.tinta,
          textShadow: "0 4px 24px rgba(0,0,0,0.85)",
          // O título vem com "\n" onde a quebra tem que cair: título de
          // vídeo quebrado pelo acaso da largura fica feio no play.
          whiteSpace: "pre-line",
        }}
      >
        {titulo}
      </div>
    </div>
  );
};

/* ==================================================================
   Fundo comum a todas as cenas: grade tática do DS, bem apagada
   ================================================================== */

export const GradeTatica: React.FC<{ opacidade?: number }> = ({ opacidade = 1 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage:
        "linear-gradient(rgba(147,168,74,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(147,168,74,0.055) 1px, transparent 1px)",
      backgroundSize: "56px 56px",
      opacity: opacidade,
    }}
  />
);
