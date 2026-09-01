import { Img, staticFile } from "remotion";
import { COR, FONTE_DADO } from "../tema";

/**
 * A marca, presente em TODA tela do vídeo.
 *
 * Não é vaidade: o vídeo circula em grupo de WhatsApp, em print, em
 * story reencaminhado. Em metade dessas viagens ele chega sem a
 * legenda e sem o link — a marca no canto é a única coisa que sobra
 * dizendo de onde aquilo veio.
 *
 * Fica no canto SUPERIOR DIREITO no 16:9 porque a coluna da esquerda
 * é do texto grande de cada cena. No 9:16 quem faz esse papel é a
 * `Topo` da moldura, que já vive lá em cima.
 *
 * Discreta de propósito (opacidade 0,72): assinatura, não anúncio.
 */
export const Marca: React.FC<{
  x?: number;
  y?: number;
  altura?: number;
  /** Uma linha miúda embaixo do logo. */
  legenda?: string;
  /* Sem legenda por padrão: a linha de texto batia na etiqueta do
     painel das cenas com janela alta. Só o logo já assina. */
}> = ({ x = 1664, y = 44, altura = 44, legenda = "" }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 8,
      opacity: 0.72,
    }}
  >
    <Img
      src={staticFile("logo.webp")}
      style={{ height: altura, width: "auto", filter: "brightness(0) invert(1)" }}
    />
    {legenda ? (
      <span
        style={{
          fontFamily: FONTE_DADO,
          fontSize: 15,
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: COR.texto2,
        }}
      >
        {legenda}
      </span>
    ) : null}
  </div>
);
