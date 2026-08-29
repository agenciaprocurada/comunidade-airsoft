import { COR } from "../tema";

/**
 * A janela do mapa no formato 9:16.
 *
 * O documento é 16:9 e a tela é 9:16 — não existe encaixe honesto entre
 * os dois. Em vez de encolher o mapa até virar uma tirinha no meio da
 * tela, a janela é um RECORTE: ela mostra a parte do documento que
 * interessa naquele momento, e as cenas passeiam por ele.
 *
 * Só no fim (a revelação) a escala cai para 0,84 e o mapa inteiro
 * aparece de uma vez — é o efeito de "abrir o plano" que faz a peça
 * fechar.
 */

export const JANELA = { x: 0, y: 240, largura: 1080, altura: 1120 };

/** Escala em que o documento inteiro cabe na largura da tela. */
export const ESCALA_INTEIRO = JANELA.largura / 1280;

/** Escala em que o documento cobre a janela toda, sem tarja. */
export const ESCALA_CHEIA = JANELA.altura / 720;

/** Um ponto do documento no espaço da tela de 1080x1920. */
export const docParaTela = (
  x: number,
  y: number,
  escala: number,
  centro: { x: number; y: number },
) => ({
  x: JANELA.x + JANELA.largura / 2 + (x - centro.x) * escala,
  y: JANELA.y + JANELA.altura / 2 + (y - centro.y) * escala,
});

export const Janela: React.FC<{
  escala: number;
  /** Ponto do documento que fica no centro da janela. */
  centro: { x: number; y: number };
  desfoque?: number;
  children: React.ReactNode;
}> = ({ escala, centro, desfoque = 0, children }) => (
  <div
    style={{
      position: "absolute",
      left: JANELA.x,
      top: JANELA.y,
      width: JANELA.largura,
      height: JANELA.altura,
      overflow: "hidden",
      backgroundColor: "#070a06",
      borderTop: `1px solid ${COR.borda}`,
      borderBottom: `1px solid ${COR.borda}`,
    }}
  >
    <div
      style={{
        position: "absolute",
        transformOrigin: "0 0",
        left: JANELA.largura / 2 - centro.x * escala,
        top: JANELA.altura / 2 - centro.y * escala,
        scale: escala,
        filter: desfoque > 0 ? `blur(${desfoque}px)` : undefined,
      }}
    >
      {children}
    </div>
  </div>
);
