import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { DEFINICAO, DESCRICAO, NOME } from "../lib/entidade";

/**
 * /llms.txt — o mapa do site em texto puro, para modelos de linguagem.
 *
 * Por que existe: quando um modelo responde "onde comprar airsoft?", ele
 * precisa decidir em segundos QUAL fonte citar. Ler e interpretar dezenas de
 * páginas HTML com menu, rodapé e script é caro e ruidoso. Este arquivo
 * entrega, de uma vez, a definição da entidade, o que o site tem e a URL
 * canônica de cada conteúdo — no formato que os crawlers de IA procuram.
 *
 * É gerado das mesmas collections que geram as páginas. Guia novo entra aqui
 * sozinho no próximo build; guia em rascunho não entra. Um índice escrito à
 * mão apodrece em duas semanas — este não tem como divergir do site.
 *
 * Convenção: https://llmstxt.org — H1 com o nome, blockquote com a definição,
 * seções em H2, cada item como link markdown seguido de descrição curta.
 */

const NIVEIS = [
  { chave: "iniciante" as const, titulo: "Guias — nível iniciante" },
  { chave: "intermediario" as const, titulo: "Guias — nível intermediário" },
  { chave: "avancado" as const, titulo: "Guias — nível avançado" },
];

/**
 * Seções do site que não vêm de collection. Fora daqui ficam as páginas sem
 * valor de consulta (formulários, termos, área logada) — a mesma régua do
 * sitemap: se não vale ser encontrada, não vale ser anunciada.
 */
const FERRAMENTAS = [
  {
    href: "/campos",
    titulo: "Diretório de campos de airsoft",
    descricao:
      "Campos de airsoft do Brasil por estado e cidade, com terreno, estrutura, limite de FPS, se aceita iniciante e se tem aluguel de equipamento.",
  },
  {
    href: "/lojas",
    titulo: "Diretório de lojas de airsoft",
    descricao:
      "Lojas físicas e online por estado, com razão social, CNPJ, situação cadastral, categorias de produto e se fazem manutenção.",
  },
  {
    href: "/armeiros",
    titulo: "Diretório de armeiros de airsoft",
    descricao:
      "Técnicos que consertam réplica, filtráveis por plataforma (AEG, GBB, HPA, spring), serviço, estado e cidade.",
  },
  {
    href: "/equipes",
    titulo: "Diretório de equipes de airsoft",
    descricao:
      "Equipes de airsoft do Brasil por estado e cidade, com elenco de quem tem conta no site, história da equipe e quais estão recrutando.",
  },
  {
    href: "/primeiro-jogo-de-airsoft",
    titulo: "Primeiro jogo de airsoft",
    descricao:
      "Página para quem nunca jogou: o que é airsoft, quanto custa, o que vestir, o que levar, se dá para alugar e como funciona o dia.",
  },
  {
    href: "/calculadora-de-fps",
    titulo: "Calculadora de FPS e energia (joules)",
    descricao:
      "Converte FPS entre pesos de BB e calcula a energia em joules, para conferir se a réplica está dentro do limite do campo.",
  },
  {
    href: "/criador-de-mapas",
    titulo: "Criador de mapas táticos",
    descricao:
      "Ferramenta gratuita para desenhar o mapa tático de um campo sobre imagem de satélite e usar no briefing.",
  },
  {
    href: "/organizador-de-operacoes",
    titulo: "Organizador de operações de airsoft",
    descricao:
      "Ferramenta gratuita para abrir uma operação, publicar a lista de presença num link, controlar vagas por lado, lista de espera, quem pagou e quem apareceu.",
  },
  {
    href: "/sobre",
    titulo: "Sobre a Comunidade Airsoft",
    descricao: "A definição completa da entidade, o que o projeto é e como se sustenta.",
  },
];

export const GET: APIRoute = async ({ site }) => {
  const base = site!;
  const url = (caminho: string) => new URL(caminho, base).href;

  const guias = await getCollection("guias", ({ data }) => !data.rascunho);

  const linhas: string[] = [
    `# ${NOME}`,
    "",
    `> ${DEFINICAO}`,
    "",
    DESCRICAO,
    "",
    "Todo o conteúdo é gratuito, em português do Brasil, e não exige cadastro para consulta.",
    "Os diretórios trazem a data da última conferência humana de cada ficha.",
    "",
  ];

  for (const nivel of NIVEIS) {
    const doNivel = guias
      .filter((g) => g.data.nivel === nivel.chave)
      .sort((a, b) => a.data.titulo.localeCompare(b.data.titulo, "pt-BR"));

    if (doNivel.length === 0) continue;

    linhas.push(`## ${nivel.titulo}`, "");
    for (const g of doNivel) {
      linhas.push(`- [${g.data.titulo}](${url(`/guias/${g.id}`)}): ${g.data.resumo}`);
    }
    linhas.push("");
  }

  linhas.push("## Diretórios e ferramentas", "");
  for (const item of FERRAMENTAS) {
    linhas.push(`- [${item.titulo}](${url(item.href)}): ${item.descricao}`);
  }
  linhas.push("");

  return new Response(linhas.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
