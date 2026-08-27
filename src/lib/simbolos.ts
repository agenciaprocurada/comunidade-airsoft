/**
 * Símbolos táticos do editor de mapa.
 *
 * Desenhados aqui, à mão, e não trazidos de um pacote de ícones. Dois
 * motivos: os conjuntos "táticos" prontos quase sempre trazem restrição
 * de uso comercial na letra miúda, e nenhum deles fala o dialeto visual
 * do site — traço reto, ponta quadrada, sem arredondamento, o mesmo de
 * `IconeNav` e `IconeCategoria`.
 *
 * Cada símbolo é um path em caixa 24×24. O editor o desenha dentro de
 * um disco da cor da categoria, então o path só precisa da silhueta.
 *
 * Regra ao acrescentar: nada de caveira, sangue ou mira vermelha. O
 * PRODUCT.md lista "tático agressivo / arma de fogo" como
 * anti-referência declarada — reforça a confusão regulatória que é o
 * maior risco do projeto e afasta o iniciante, que é o maior público.
 * Por isso CQB é um quadrado de paredes, não um crânio.
 */

export interface Simbolo {
  /** Rótulo que aparece no mapa quando o símbolo vira marcador nomeado. */
  rotulo: string;
  /** Path em viewBox 24 24. Traçado, não preenchido. */
  desenho: string;
  /** Cor padrão. O usuário troca depois. */
  cor: string;
}

/**
 * As cores repetem as de `AREAS` de propósito: safe é sempre azul e
 * proibido é sempre vermelho, em qualquer mapa feito aqui. Convenção
 * comum entre campos diferentes vale mais que liberdade de paleta.
 */
export const SIMBOLOS = {
  // ----- Estrutura do jogo -----
  base: {
    rotulo: "Base",
    // Bandeira em mastro.
    desenho: "M6 21V3M6 4h12l-3 4 3 4H6",
    cor: "#3b82f6",
  },
  safe: {
    rotulo: "Safe zone",
    // Escudo — a área onde não se atira.
    desenho: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
    cor: "#3b82f6",
  },
  respawn: {
    rotulo: "Respawn",
    // Seta em círculo: voltar ao jogo.
    desenho: "M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4",
    cor: "#22c55e",
  },
  estacionamento: {
    rotulo: "Estacionamento",
    desenho: "M8 20V4h5a4 4 0 0 1 0 8H8",
    cor: "#8b8f8a",
  },
  concentracao: {
    rotulo: "Concentração",
    // Três silhuetas: o ponto de reunião.
    desenho:
      "M12 5.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM7 20v-1a5 5 0 0 1 10 0v1M4.5 9.5a2 2 0 1 1 0 4M19.5 9.5a2 2 0 1 0 0 4",
    cor: "#f2b705",
  },

  // ----- Terreno -----
  cqb: {
    rotulo: "CQB",
    // Planta de paredes: combate em ambiente fechado.
    desenho: "M3 4h18v16H3zM3 10h7M14 4v6M14 14h7M10 14v6",
    cor: "#ef4444",
  },
  mata: {
    rotulo: "Mata",
    desenho: "M12 3l5 7h-3l4 6H6l4-6H7z M12 16v5",
    cor: "#22c55e",
  },
  agua: {
    rotulo: "Água",
    desenho: "M3 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0",
    cor: "#38bdf8",
  },
  ponte: {
    rotulo: "Ponte",
    desenho: "M3 14h18M6 14V9M18 14V9M3 9c4-4 14-4 18 0",
    cor: "#8b8f8a",
  },
  trincheira: {
    rotulo: "Trincheira",
    desenho: "M3 8h5l2 8h4l2-8h5M3 16h3M18 16h3",
    cor: "#a16207",
  },
  torre: {
    rotulo: "Torre",
    desenho: "M8 21l1-12h6l1 12M7 9h10M10 9V5h4v4M12 5V3",
    cor: "#a855f7",
  },

  // ----- Operação -----
  objetivo: {
    rotulo: "Objetivo",
    // Alvo concêntrico.
    desenho: "M12 3v3M12 18v3M3 12h3M18 12h3M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z",
    cor: "#a855f7",
  },
  observacao: {
    rotulo: "Posto de observação",
    desenho: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6zM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z",
    cor: "#f2b705",
  },
  medico: {
    rotulo: "Primeiros socorros",
    desenho: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z",
    cor: "#ffffff",
  },
  cronografo: {
    rotulo: "Cronógrafo",
    desenho: "M12 20a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM12 12l4-3M12 4V2",
    cor: "#f97316",
  },
  radio: {
    rotulo: "Comando",
    desenho: "M4 20h16V10H4zM8 10V6l8-2v6M8 15h3",
    cor: "#f2b705",
  },
  proibido: {
    rotulo: "Área proibida",
    desenho: "M12 3l9 17H3zM12 9v5M12 16.5v.5",
    cor: "#dc2626",
  },
} as const;

export type TipoSimbolo = keyof typeof SIMBOLOS;

/**
 * Abas da paleta, na ordem em que aparecem.
 *
 * Agrupadas pelo que a pessoa está pensando na hora — "onde fica o
 * quê", "como é o terreno", "o que acontece no jogo" — e não por forma
 * ou cor do ícone.
 */
export const GRUPOS_SIMBOLOS = [
  {
    chave: "estrutura",
    rotulo: "Estrutura",
    itens: ["base", "safe", "respawn", "estacionamento", "concentracao"],
  },
  {
    chave: "terreno",
    rotulo: "Terreno",
    itens: ["cqb", "mata", "agua", "ponte", "trincheira", "torre"],
  },
  {
    chave: "operacao",
    rotulo: "Operação",
    itens: ["objetivo", "observacao", "medico", "cronografo", "radio", "proibido"],
  },
] as const satisfies readonly {
  chave: string;
  rotulo: string;
  itens: readonly TipoSimbolo[];
}[];
