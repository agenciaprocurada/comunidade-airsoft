/**
 * Apoiadores — as marcas que ajudam a manter a Comunidade Airsoft no ar.
 *
 * A lista mora aqui, não num banco: são poucos, mudam raramente e cada
 * entrada vem com uma logo no repositório. Entrar um parceiro é adicionar
 * um item abaixo e soltar a logo em src/assets/apoiadores/<slug>.webp
 * (ou .svg) — o componente Apoiadores.astro acha o arquivo pelo slug.
 *
 * Com a lista vazia a faixa continua aparecendo, só com a chamada
 * "quer ser parceiro". É de propósito: a vitrine vazia é o convite.
 */

export interface Apoiador {
  /** Nome do arquivo da logo, sem extensão: minúsculas, sem acento, hífen. */
  slug: string;
  /** Nome como aparece no `alt` e no `title`. */
  nome: string;
  /** Site do parceiro. Abre em nova aba com rel="sponsored". */
  site: string;
}

export const APOIADORES: Apoiador[] = [
  // { slug: "loja-exemplo", nome: "Loja Exemplo", site: "https://lojaexemplo.com.br" },
];

/** Para onde vai quem quer ser parceiro: WhatsApp, só os dígitos com DDD. */
export const WHATSAPP_PARCERIA = "51998607446";

const MENSAGEM_PARCERIA =
  "Olá! Quero ser parceiro da Comunidade Airsoft. Podemos conversar?";

export const LINK_PARCERIA =
  `https://wa.me/55${WHATSAPP_PARCERIA}?text=${encodeURIComponent(MENSAGEM_PARCERIA)}`;
