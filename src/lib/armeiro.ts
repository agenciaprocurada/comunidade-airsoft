/**
 * Regras do auto-cadastro de armeiro. Compartilhadas entre o
 * formulário do site e o script de carga (db/carregar-armeiros.mjs),
 * para que os dois nunca discordem sobre o que é válido.
 *
 * Os vocabulários aqui espelham as constraints de
 * db/schema-armeiros.sql. Mudar um valor exige mudar os dois.
 */
import { SIGLAS_UF, slugificar } from "./uf";

export const PLATAFORMAS = [
  "aeg", "aep", "gbb", "gbbr", "hpa", "spring", "ptw",
] as const;

/** Versao de gearbox. Detalhe opcional: so o proprio armeiro sabe. */
export const GEARBOXES = ["v2", "v3", "v6", "v7"] as const;

export const SERVICOS = [
  "manutencao", "reparo", "upgrade", "shimming", "aoe",
  "hop-up", "eletronica", "solda", "customizacao", "pintura",
] as const;

export const TIPOS_ARMEIRO = [
  {
    valor: "autonomo",
    rotulo: "Autônomo",
    ajuda: "Bancada própria, sem ponto de atendimento aberto ao público.",
  },
  {
    valor: "oficina",
    rotulo: "Oficina",
    ajuda: "Ponto dedicado a manutenção, onde o cliente pode ir.",
  },
  {
    valor: "loja",
    rotulo: "Atendo dentro de uma loja",
    ajuda: "Você trabalha em uma loja de airsoft que já está no diretório.",
  },
] as const;

/**
 * Slugs que a rota /armeiros/[slug] não pode entregar a um armeiro.
 *
 * Duas famílias, e as duas quebrariam o site em silêncio:
 *  - as siglas de UF, que são os hubs estaduais;
 *  - as páginas próprias que vivem sob /armeiros/.
 *
 * Astro dá precedência à rota estática, então um armeiro com slug
 * "cadastrar" não roubaria a página — ele simplesmente ficaria
 * inacessível para sempre, o que é pior porque não dá erro.
 */
export const SLUGS_RESERVADOS = new Set<string>([
  "cadastrar",
  "indicar",
  ...SIGLAS_UF.map((uf) => uf.toLowerCase()),
]);

export const DESCRICAO_MINIMA = 40;

/**
 * Monta o slug da ficha: nome + cidade.
 *
 * A cidade entra sempre, e não só no desempate, porque "jp-airsoft"
 * existe em três estados e o nome de guerra se repete muito neste
 * meio. Slug de URL nunca muda depois de publicado (PLANO-DE-ACAO.md
 * §3), então é melhor nascer específico do que ter que conviver com
 * "joao-2".
 */
export function slugArmeiro(nome: string, cidadeSlug: string): string {
  const base = `${slugificar(nome)}-${cidadeSlug}`.replace(/^-+|-+$/g, "");
  return base.slice(0, 80);
}

export function ehGearbox(valor: string): boolean {
  return (GEARBOXES as readonly string[]).includes(valor);
}

export function ehPlataforma(valor: string): boolean {
  return (PLATAFORMAS as readonly string[]).includes(valor);
}

export function ehServico(valor: string): boolean {
  return (SERVICOS as readonly string[]).includes(valor);
}

export function ehTipoArmeiro(valor: string): boolean {
  return TIPOS_ARMEIRO.some((t) => t.valor === valor);
}
