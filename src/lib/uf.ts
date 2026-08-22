/** Nomes por sigla — usados em títulos, breadcrumbs e meta tags dos hubs. */
export const NOME_UF: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AM: "Amazonas",
  AP: "Amapá",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MG: "Minas Gerais",
  MS: "Mato Grosso do Sul",
  MT: "Mato Grosso",
  PA: "Pará",
  PB: "Paraíba",
  PE: "Pernambuco",
  PI: "Piauí",
  PR: "Paraná",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RO: "Rondônia",
  RR: "Roraima",
  RS: "Rio Grande do Sul",
  SC: "Santa Catarina",
  SE: "Sergipe",
  SP: "São Paulo",
  TO: "Tocantins",
};

/**
 * Gera slug de URL: minúsculas, sem acento, hífen no lugar de espaço.
 * Usado na importação da planilha de coleta para montar `cidade_slug`.
 */
export function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "R$ 60" · "R$ 60 a R$ 90" · "A combinar" */
export function faixaDeValor(min?: number, max?: number): string {
  if (min == null && max == null) return "A combinar";
  if (min != null && max != null && min !== max) {
    return `R$ ${min} a R$ ${max}`;
  }
  return `R$ ${min ?? max}`;
}

/** Rótulos legíveis para os enums do schema. */
export const ROTULO_TERRENO: Record<string, string> = {
  mata: "Mata",
  cqb: "CQB",
  urbano: "Urbano",
  misto: "Misto",
};

export const ROTULO_ESTRUTURA: Record<string, string> = {
  "safe-zone-coberta": "Safe zone coberta",
  banheiro: "Banheiro",
  estacionamento: "Estacionamento",
  "aluguel-equipamento": "Aluguel de equipamento",
  "loja-no-local": "Loja no local",
  lanchonete: "Lanchonete",
  chuveiro: "Chuveiro",
  energia: "Tomada / energia",
};

export const ROTULO_CATEGORIA_LOJA: Record<string, string> = {
  replicas: "Réplicas",
  upgrade: "Upgrade",
  vestuario: "Vestuário",
  consumivel: "Consumível",
  acessorio: "Acessório",
};
