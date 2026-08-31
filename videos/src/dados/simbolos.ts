/**
 * Os 17 símbolos táticos de src/lib/simbolos.ts do site, em caixa 24x24.
 *
 * `caixa` é o bounding box do TRAÇADO — o editor faz
 * `icone.scaleToWidth(21)`, ou seja, é a largura do desenho que vai a
 * 21 px, não a caixa de 24. Sem esse número o ícone sai com outro
 * tamanho dentro do disco e o marcador deixa de ser o do produto.
 *
 * A paleta do vídeo vertical desenha na caixa 24 cheia (é assim que o
 * site desenha na paleta também), então lá a `caixa` não entra.
 */
export interface DesenhoSimbolo {
  rotulo: string;
  path: string;
  cor: string;
  /** [x, y, largura, altura] do traçado dentro da caixa 24x24. */
  caixa: [number, number, number, number];
}

/** Na ordem das abas do site: Estrutura, Terreno, Operação. */
export const SIMBOLOS: DesenhoSimbolo[] = [
  { rotulo: "Base", cor: "#3b82f6", path: "M6 21V3M6 4h12l-3 4 3 4H6", caixa: [6, 3, 12, 18] },
  {
    rotulo: "Safe zone",
    cor: "#3b82f6",
    path: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
    caixa: [4, 3, 16, 18],
  },
  {
    rotulo: "Respawn",
    cor: "#22c55e",
    path: "M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4",
    caixa: [4, 4, 16, 16],
  },
  {
    rotulo: "Estacionamento",
    cor: "#8b8f8a",
    path: "M8 20V4h5a4 4 0 0 1 0 8H8",
    caixa: [8, 4, 9, 16],
  },
  {
    rotulo: "Concentração",
    cor: "#f2b705",
    path: "M12 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM7 20v-1a5 5 0 0 1 10 0v1M4.5 9.5a2 2 0 1 1 0 4M19.5 9.5a2 2 0 1 0 0 4",
    caixa: [4, 5, 16, 15],
  },
  {
    rotulo: "CQB",
    cor: "#ef4444",
    path: "M3 4h18v16H3zM3 10h7M14 4v6M14 14h7M10 14v6",
    caixa: [3, 4, 18, 16],
  },
  { rotulo: "Mata", cor: "#22c55e", path: "M12 3l5 7h-3l4 6H6l4-6H7z M12 16v5", caixa: [6, 3, 12, 18] },
  {
    rotulo: "Água",
    cor: "#38bdf8",
    path: "M3 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0",
    caixa: [3, 10.5, 18, 9],
  },
  {
    rotulo: "Ponte",
    cor: "#8b8f8a",
    path: "M3 14h18M6 14V9M18 14V9M3 9c4-4 14-4 18 0",
    caixa: [3, 6, 18, 8],
  },
  {
    rotulo: "Trincheira",
    cor: "#a16207",
    path: "M3 8h5l2 8h4l2-8h5M3 16h3M18 16h3",
    caixa: [3, 8, 18, 8],
  },
  {
    rotulo: "Torre",
    cor: "#a855f7",
    path: "M8 21l1-12h6l1 12M7 9h10M10 9V5h4v4M12 5V3",
    caixa: [7, 3, 10, 18],
  },
  {
    rotulo: "Objetivo",
    cor: "#a855f7",
    path: "M12 3v3M12 18v3M3 12h3M18 12h3M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z",
    caixa: [3, 3, 18, 18],
  },
  {
    rotulo: "Posto de observação",
    cor: "#f2b705",
    path: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6zM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z",
    caixa: [2, 6, 20, 12],
  },
  {
    rotulo: "Primeiros socorros",
    cor: "#ffffff",
    path: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z",
    caixa: [3, 3, 18, 18],
  },
  {
    rotulo: "Cronógrafo",
    cor: "#f97316",
    path: "M12 20a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM12 12l4-3M12 4V2",
    caixa: [4, 2, 16, 18],
  },
  {
    rotulo: "Comando",
    cor: "#f2b705",
    path: "M4 20h16V10H4zM8 10V6l8-2v6M8 15h3",
    caixa: [4, 4, 16, 16],
  },
  {
    rotulo: "Área proibida",
    cor: "#dc2626",
    path: "M12 3l9 17H3zM12 9v5M12 16.5v.5",
    caixa: [3, 3, 18, 17],
  },
];

/** Acesso por rótulo em CAIXA ALTA — é assim que o marcador o guarda. */
export const DESENHO_SIMBOLO: Record<string, DesenhoSimbolo> = Object.fromEntries(
  SIMBOLOS.map((s) => [s.rotulo.toUpperCase(), s]),
);

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
