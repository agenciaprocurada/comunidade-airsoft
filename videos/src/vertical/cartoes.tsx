import { Easing, interpolate } from "remotion";
import { FERRAMENTAS } from "../componentes/Editor";
import { SIMBOLOS } from "../dados/simbolos";
import { COR, FONTE_DADO, FONTE_TEXTO } from "../tema";

/**
 * Os controles do editor, reflowados para a vertical.
 *
 * No site eles são uma coluna à esquerda e um dock à direita — layout
 * de monitor. Aqui viram cartões que flutuam sobre o mapa, porque numa
 * tela de 1080 de largura uma coluna de 86 px ao lado de um mapa
 * sobraria ilegível dos dois lados. O conteúdo é o mesmo: as mesmas 7
 * ferramentas, os mesmos 17 símbolos, os mesmos controles de grade.
 */

const Icone: React.FC<{ d: string; tamanho: number; cor?: string; traco?: number }> = ({
  d,
  tamanho,
  cor = "currentColor",
  traco = 1.6,
}) => (
  <svg
    viewBox="0 0 24 24"
    width={tamanho}
    height={tamanho}
    fill="none"
    stroke={cor}
    strokeWidth={traco}
    strokeLinecap="square"
  >
    <path d={d} />
  </svg>
);

/** Deslizada padrão de entrada dos cartões: sobe e aparece. */
const entradaDe = (progresso: number, distancia: number) => ({
  opacity: progresso,
  translate: `0 ${interpolate(progresso, [0, 1], [distancia, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })}px`,
});

// ------------------------------------------------------------
// Busca de endereço
// ------------------------------------------------------------

export const CartaoBusca: React.FC<{
  texto: string;
  cursorVisivel: boolean;
  resultados: number;
  entrada: number;
  y: number;
}> = ({ texto, cursorVisivel, resultados, entrada, y }) => (
  <div
    style={{
      position: "absolute",
      left: 64,
      top: y,
      width: 952,
      ...entradaDe(entrada, 30),
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "22px 26px",
        backgroundColor: COR.papel,
        border: `1px solid ${COR.bordaForte}`,
        boxShadow: "0 24px 60px -18px rgba(0,0,0,0.9)",
      }}
    >
      <svg viewBox="0 0 24 24" width={30} height={30} fill="none" stroke={COR.texto2} strokeWidth={1.8}>
        <circle cx={11} cy={11} r={6.5} />
        <path d="M20 20l-4-4" strokeLinecap="square" />
      </svg>
      <span style={{ fontFamily: FONTE_TEXTO, fontSize: 30, color: COR.tinta }}>
        {texto}
        <span style={{ opacity: cursorVisivel ? 1 : 0, color: COR.oliva300 }}>|</span>
      </span>
    </div>

    {resultados > 0 ? (
      <div
        style={{
          marginTop: 8,
          backgroundColor: COR.papel,
          border: `1px solid ${COR.bordaForte}`,
          boxShadow: "0 24px 60px -18px rgba(0,0,0,0.9)",
          overflow: "hidden",
        }}
      >
        {["Bengazi Airsoft — Novo Hamburgo, RS", "Estrada do Cachoeirão, s/n", "29°50′03″S 51°10′20″W"]
          .slice(0, resultados)
          .map((r, i) => (
            <div
              key={r}
              style={{
                padding: "18px 26px",
                borderTop: i === 0 ? "none" : `1px solid ${COR.borda}`,
                backgroundColor: i === 0 ? COR.oliva050 : "transparent",
                fontFamily: FONTE_TEXTO,
                fontSize: 27,
                color: i === 0 ? COR.oliva300 : COR.texto,
              }}
            >
              {r}
            </div>
          ))}
      </div>
    ) : null}
  </div>
);

// ------------------------------------------------------------
// Barra de ferramentas
// ------------------------------------------------------------

export const CartaoFerramentas: React.FC<{
  ativa: string;
  entrada: number;
  y: number;
}> = ({ ativa, entrada, y }) => (
  <div
    style={{
      position: "absolute",
      left: 64,
      top: y,
      width: 952,
      display: "flex",
      backgroundColor: "rgba(20,24,15,0.94)",
      border: `1px solid ${COR.bordaForte}`,
      boxShadow: "0 24px 60px -18px rgba(0,0,0,0.9)",
      ...entradaDe(entrada, -30),
    }}
  >
    {FERRAMENTAS.map((f) => {
      const acesa = f.acao === ativa;
      return (
        <div
          key={f.acao}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "22px 4px",
            backgroundColor: acesa ? COR.oliva050 : "transparent",
            borderBottom: `3px solid ${acesa ? COR.oliva500 : "transparent"}`,
            color: acesa ? COR.oliva300 : COR.texto2,
            fontFamily: FONTE_DADO,
            fontSize: 17,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <Icone d={f.icone} tamanho={34} traco={1.5} />
          {f.rotulo}
        </div>
      );
    })}
  </div>
);

// ------------------------------------------------------------
// Fita de símbolos
// ------------------------------------------------------------

const FichaSimbolo: React.FC<{ rotulo: string; cor: string; path: string }> = ({
  rotulo,
  cor,
  path,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "16px 26px 16px 16px",
      marginRight: 16,
      backgroundColor: "rgba(20,24,15,0.94)",
      border: `1px solid ${COR.bordaForte}`,
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}
  >
    <span
      style={{
        width: 52,
        height: 52,
        borderRadius: 999,
        backgroundColor: cor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icone d={path} tamanho={32} cor="#0b0d09" traco={1.8} />
    </span>
    <span style={{ fontFamily: FONTE_TEXTO, fontSize: 29, color: COR.tinta }}>{rotulo}</span>
  </div>
);

/**
 * Os 17 símbolos passando em duas fitas, em sentidos opostos.
 *
 * Grade estática não caberia: com 17 itens e rótulo legível, ou a fonte
 * fica pequena ou o cartão come o mapa inteiro. Rolando, cada símbolo
 * aparece grande e sobra tela. As listas são duplicadas para a emenda
 * não aparecer no meio do laço.
 */
export const FitaSimbolos: React.FC<{ frameLocal: number; entrada: number; y: number }> = ({
  frameLocal,
  entrada,
  y,
}) => {
  const linhas = [SIMBOLOS.slice(0, 9), SIMBOLOS.slice(9)];

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: y,
        width: 1080,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        overflow: "hidden",
        // As duas grafias: o Chrome do render aceita a sem prefixo, mas
        // sem a `-webkit-` a fita corta a ficha no meio na borda direita
        // em vez de dissolver.
        maskImage:
          "linear-gradient(90deg, transparent 0, #000 160px, #000 920px, transparent 1080px)",
        WebkitMaskImage:
          "linear-gradient(90deg, transparent 0, #000 160px, #000 920px, transparent 1080px)",
        ...entradaDe(entrada, 40),
      }}
    >
      {linhas.map((linha, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            translate: `${
              i === 0
                ? -((frameLocal * 3.2) % 2600)
                : -2600 + ((frameLocal * 2.6) % 2600)
            }px 0`,
          }}
        >
          {[...linha, ...linha, ...linha].map((s, j) => (
            <FichaSimbolo key={`${s.rotulo}-${j}`} rotulo={s.rotulo} cor={s.cor} path={s.path} />
          ))}
        </div>
      ))}
    </div>
  );
};

// ------------------------------------------------------------
// Ajustes
// ------------------------------------------------------------

const Controle: React.FC<{ rotulo: string; valor: string; preenchido: number }> = ({
  rotulo,
  valor,
  preenchido,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span
        style={{
          fontFamily: FONTE_DADO,
          fontSize: 22,
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: COR.texto2,
        }}
      >
        {rotulo}
      </span>
      <span style={{ fontFamily: FONTE_DADO, fontSize: 26, color: COR.oliva300 }}>{valor}</span>
    </div>
    <div style={{ position: "relative", height: 6, backgroundColor: COR.borda }}>
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
          top: -8,
          width: 22,
          height: 22,
          marginLeft: -11,
          backgroundColor: COR.oliva300,
        }}
      />
    </div>
  </div>
);

export const CartaoAjustes: React.FC<{
  colunas: number;
  linhas: number;
  veu: number;
  entrada: number;
  y: number;
}> = ({ colunas, linhas, veu, entrada, y }) => (
  <div
    style={{
      position: "absolute",
      left: 64,
      top: y,
      width: 952,
      backgroundColor: "rgba(20,24,15,0.94)",
      border: `1px solid ${COR.bordaForte}`,
      boxShadow: "0 24px 60px -18px rgba(0,0,0,0.9)",
      ...entradaDe(entrada, 40),
    }}
  >
    <div style={{ display: "flex", borderBottom: `1px solid ${COR.borda}` }}>
      {["Traço", "Grade", "Satélite"].map((aba) => (
        <div
          key={aba}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "18px 4px",
            borderBottom: `3px solid ${aba === "Grade" ? COR.oliva500 : "transparent"}`,
            fontFamily: FONTE_DADO,
            fontSize: 22,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: aba === "Grade" ? COR.oliva300 : COR.texto2,
          }}
        >
          {aba}
        </div>
      ))}
    </div>

    <div style={{ padding: 34, display: "flex", flexDirection: "column", gap: 30 }}>
      <Controle rotulo="Colunas" valor={String(colunas)} preenchido={(colunas - 2) / 10} />
      <Controle rotulo="Linhas" valor={String(linhas)} preenchido={(linhas - 2) / 10} />
      <Controle
        rotulo="Véu sobre o satélite"
        valor={`${Math.round(veu * 100)}%`}
        preenchido={veu / 0.6}
      />
    </div>
  </div>
);
