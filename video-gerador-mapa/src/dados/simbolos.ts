/**
 * Os mesmos paths de src/lib/simbolos.ts do site, em caixa 24x24.
 *
 * `caixa` é o bounding box real do traçado — o editor faz
 * `icone.scaleToWidth(21)`, ou seja, é a LARGURA DO DESENHO que vai a
 * 21 px, não a caixa de 24. Sem esse número o ícone sai com outro
 * tamanho e o disco fica com folga que o produto não tem.
 */
export interface DesenhoSimbolo {
  path: string;
  /** [x, y, largura, altura] do traçado dentro da caixa 24x24. */
  caixa: [number, number, number, number];
}

export const DESENHO_SIMBOLO: Record<string, DesenhoSimbolo> = {
  "SAFE ZONE": { path: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", caixa: [4, 3, 16, 18] },
  RESPAWN: { path: "M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4", caixa: [4, 4, 16, 16] },
  ESTACIONAMENTO: { path: "M8 20V4h5a4 4 0 0 1 0 8H8", caixa: [8, 4, 9, 16] },
  CQB: { path: "M3 4h18v16H3zM3 10h7M14 4v6M14 14h7M10 14v6", caixa: [3, 4, 18, 16] },
  TRINCHEIRA: { path: "M3 8h5l2 8h4l2-8h5M3 16h3M18 16h3", caixa: [3, 8, 18, 8] },
  TORRE: { path: "M8 21l1-12h6l1 12M7 9h10M10 9V5h4v4M12 5V3", caixa: [7, 3, 10, 18] },
  MATA: { path: "M12 3l5 7h-3l4 6H6l4-6H7z M12 16v5", caixa: [6, 3, 12, 18] },
  BASE: { path: "M6 21V3M6 4h12l-3 4 3 4H6", caixa: [6, 3, 12, 18] },
};

/** Cor de categoria do respawn, idem ao site. */
export const COR_RESPAWN = "#22c55e";

/**
 * Piso de escala dos símbolos NO VÍDEO.
 *
 * No mapa salvo, Estacionamento e Safe zone estão em ~0,53 e o rótulo
 * fica com 9 px na tela de 1920 — ilegível em vídeo, ainda que correto
 * no produto. Aqui o piso sobe para 0,85; quem já está maior (CQB,
 * Torre, Trincheira) fica como o dono do mapa deixou.
 */
export const ESCALA_MINIMA_VIDEO = 0.85;
