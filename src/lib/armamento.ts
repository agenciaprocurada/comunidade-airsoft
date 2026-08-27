/**
 * Réplicas do jogador. A nomenclatura da interface é sempre
 * "réplica", nunca "arma" — é o termo correto do esporte e consta do
 * glossário do documento de projeto. No banco a tabela é
 * `armamentos`.
 */

export const ACIONAMENTOS = [
  { valor: "aeg", rotulo: "AEG", ajuda: "Elétrica, com bateria" },
  { valor: "aep", rotulo: "AEP", ajuda: "Elétrica compacta" },
  { valor: "gbb", rotulo: "GBB", ajuda: "Pistola a gás, com blowback" },
  { valor: "gbbr", rotulo: "GBBR", ajuda: "Rifle a gás, com blowback" },
  { valor: "hpa", rotulo: "HPA", ajuda: "Ar comprimido, com cilindro" },
  { valor: "mola", rotulo: "Mola", ajuda: "Ação por mola, engatilha a cada tiro" },
  { valor: "co2", rotulo: "CO2", ajuda: "Cápsula de CO2" },
] as const;

export const CATEGORIAS = [
  { valor: "rifle", rotulo: "Rifle" },
  { valor: "smg", rotulo: "Submetralhadora (SMG)" },
  { valor: "pistola", rotulo: "Pistola" },
  { valor: "sniper", rotulo: "Sniper" },
  { valor: "dmr", rotulo: "DMR" },
  { valor: "shotgun", rotulo: "Shotgun" },
  { valor: "metralhadora", rotulo: "Metralhadora (LMG)" },
  { valor: "outra", rotulo: "Outra" },
] as const;

export type Acionamento = (typeof ACIONAMENTOS)[number]["valor"];
export type Categoria = (typeof CATEGORIAS)[number]["valor"];

/** Valor do <select> que abre o campo de marca escrita à mão. */
export const MARCA_OUTRA = "__outra__";

/** Espelha o gatilho `limitar_armamentos` no banco. */
export const LIMITE_REPLICAS = 30;

export interface Marca {
  id: string;
  nome: string;
  ordem: number;
}

export interface Armamento {
  id: string;
  marca_id: string | null;
  marca_outra: string | null;
  modelo: string;
  acionamento: Acionamento;
  categoria: Categoria;
  principal: boolean;
  observacoes: string | null;
  criado_em: string;
}

export const COLUNAS_ARMAMENTO =
  "id,marca_id,marca_outra,modelo,acionamento,categoria,principal,observacoes,criado_em";

export function rotuloAcionamento(valor: string) {
  return ACIONAMENTOS.find((a) => a.valor === valor)?.rotulo ?? valor;
}

export function rotuloCategoria(valor: string) {
  return CATEGORIAS.find((c) => c.valor === valor)?.rotulo ?? valor;
}

export function ehAcionamento(valor: unknown): valor is Acionamento {
  return ACIONAMENTOS.some((a) => a.valor === valor);
}

export function ehCategoria(valor: unknown): valor is Categoria {
  return CATEGORIAS.some((c) => c.valor === valor);
}

/**
 * Como a réplica aparece na lista. A marca sai da tabela quando é da
 * lista; quando foi escrita à mão, aparece com aviso de pendente para
 * a pessoa saber que ainda vamos conferir.
 */
export function nomeDaMarca(
  arma: Pick<Armamento, "marca_id" | "marca_outra">,
  marcas: Marca[],
): { nome: string; pendente: boolean } {
  if (arma.marca_outra) return { nome: arma.marca_outra, pendente: true };
  const marca = marcas.find((m) => m.id === arma.marca_id);
  return { nome: marca?.nome ?? "Marca desconhecida", pendente: false };
}

/**
 * Normaliza a marca escrita à mão antes de gravar: espaços colapsados
 * e capitalização inicial. Não é perfeito (siglas como "VFC" perderiam
 * caixa se o usuário digitasse "vfc"), mas evita que a fila de
 * curadoria vire "cyma", "CYMA " e "Cyma" como três entradas.
 */
export function normalizarMarcaLivre(bruto: string): string {
  return bruto.replace(/\s+/g, " ").trim();
}
