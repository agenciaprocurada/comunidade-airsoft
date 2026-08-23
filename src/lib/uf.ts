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

/**
 * "R$ 60" · "R$ 60 a R$ 90" · "A combinar"
 *
 * `precos` é o texto livre vindo do levantamento ("Consultar",
 * "Pacote a partir de R$ 70") e tem precedência: é mais honesto
 * mostrar o que o campo divulga do que inventar uma faixa.
 */
export function faixaDeValor(
  min?: number,
  max?: number,
  precos?: string,
): string {
  if (precos) return precos;
  if (min == null && max == null) return "A combinar";
  if (min != null && max != null && min !== max) {
    return `R$ ${min} a R$ ${max}`;
  }
  return `R$ ${min ?? max}`;
}

/** Rótulos de modalidade — o diretório cobre airsoft e paintball. */
export const ROTULO_MODALIDADE: Record<string, string> = {
  airsoft: "Airsoft",
  paintball: "Paintball",
  ambos: "Airsoft e paintball",
};

/** Termo para título//SEO de listagem, por modalidade. */
export const TERMO_MODALIDADE: Record<string, string> = {
  airsoft: "airsoft",
  paintball: "paintball",
  ambos: "airsoft e paintball",
};

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

/** Rótulos do tipo de operação da loja (doc §4.4). */
export const ROTULO_TIPO_LOJA: Record<string, string> = {
  fisica: "Loja física",
  online: "Loja online",
  ambas: "Física e online",
};

/**
 * Monta o link do WhatsApp a partir do número guardado no banco.
 *
 * O banco guarda só os dígitos com DDD; o wa.me exige o código do
 * país. Concatenar 55 na hora de renderizar evita ter que normalizar
 * o dado histórico de novo a cada carga.
 */
export function linkWhatsapp(numero: string): string {
  const digitos = numero.replace(/\D/g, "");
  const comPais = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${comPais}`;
}
