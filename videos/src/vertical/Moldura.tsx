import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { COR, FONTE_DADO, FONTE_DISPLAY } from "../tema";
import { DURACAO } from "./ritmo";

/**
 * A moldura fixa do 9:16: barra de progresso, marca em cima, legenda
 * embaixo.
 *
 * As margens não são estéticas. Instagram e TikTok desenham a interface
 * deles POR CIMA do vídeo: uns 250 px embaixo (curtidas, legenda, áudio)
 * e uns 120 px em cima. Por isso o conteúdo vive entre y=120 e y=1660 —
 * texto fora dessa faixa é texto que o espectador não lê.
 */

export const BarraDeProgresso: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        top: 120,
        width: 952,
        height: 5,
        backgroundColor: "rgba(240,242,233,0.16)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, (frame / DURACAO) * 100)}%`,
          backgroundColor: COR.oliva300,
        }}
      />
    </div>
  );
};

export const Topo: React.FC<{ opacidade?: number }> = ({ opacidade = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: 64,
      top: 152,
      width: 952,
      height: 56,
      display: "flex",
      alignItems: "center",
      opacity: opacidade,
    }}
  >
    <Img
      src={staticFile("logo.webp")}
      style={{ height: 44, width: "auto", filter: "brightness(0) invert(1)" }}
    />
    <span
      style={{
        marginLeft: "auto",
        padding: "8px 18px",
        border: `1px solid ${COR.oliva700}`,
        backgroundColor: COR.oliva050,
        fontFamily: FONTE_DADO,
        fontSize: 22,
        textTransform: "uppercase",
        letterSpacing: "0.22em",
        color: COR.oliva300,
      }}
    >
      100% grátis
    </span>
  </div>
);

/**
 * A legenda explicativa.
 *
 * Rede social se assiste no mudo — a legenda não é acessório, é o
 * roteiro. Por isso ela é grande (82 px numa tela de 1080), fica sempre
 * no mesmo lugar e troca com corte, não com transição lenta: legenda
 * que desliza devagar é legenda que ninguém termina de ler.
 */
export const Legenda: React.FC<{
  kicker: string;
  titulo: string;
  /** Frame (local à cena) em que ela entra. */
  entrada: number;
  /** Frame em que ela sai. Sem isso, fica até o fim da cena. */
  saida?: number;
}> = ({ kicker, titulo, entrada, saida }) => {
  const frame = useCurrentFrame();

  const surge = interpolate(
    frame,
    saida === undefined ? [entrada, entrada + 8] : [entrada, entrada + 8, saida, saida + 6],
    saida === undefined ? [0, 1] : [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    },
  );

  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        top: 1400,
        width: 952,
        opacity: surge,
        translate: `0 ${interpolate(surge, [0, 1], [26, 0])}px`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 20 }}>
        <span style={{ width: 56, height: 4, backgroundColor: COR.oliva500 }} />
        <span
          style={{
            fontFamily: FONTE_DADO,
            fontSize: 27,
            textTransform: "uppercase",
            letterSpacing: "0.26em",
            color: COR.oliva300,
          }}
        >
          {kicker}
        </span>
      </div>
      <div
        style={{
          fontFamily: FONTE_DISPLAY,
          fontWeight: 700,
          fontSize: 82,
          lineHeight: 0.98,
          textTransform: "uppercase",
          color: COR.tinta,
          textShadow: "0 4px 24px rgba(0,0,0,0.8)",
        }}
      >
        {titulo}
      </div>
    </div>
  );
};

export const Rodape: React.FC<{ opacidade?: number }> = ({ opacidade = 1 }) => (
  <span
    style={{
      position: "absolute",
      left: 0,
      top: 1666,
      width: 1080,
      textAlign: "center",
      fontFamily: FONTE_DADO,
      fontSize: 26,
      letterSpacing: "0.2em",
      color: COR.texto2,
      opacity: opacidade,
    }}
  >
    comunidadeairsoft.com.br
  </span>
);
