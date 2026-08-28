/**
 * A ENTIDADE — o que a Comunidade Airsoft é, dito uma vez só.
 *
 * Toda página do site emite a mesma Organization com o mesmo `@id`, e as
 * páginas que têm dado estruturado próprio (artigo, ficha, listagem)
 * apontam para ela em vez de redescrever "Organization, name: ...".
 * Assim, para um buscador ou um modelo de linguagem, o site inteiro
 * converge para UMA entidade com UMA definição — e a definição
 * completa mora em /sobre.
 *
 * Mudar a frase aqui muda em toda parte. É intencional: identidade de
 * marca não pode variar de página para página.
 */

/** A definição canônica. Uma frase, sempre a mesma, em toda parte. */
export const DEFINICAO =
  "Comunidade Airsoft é uma plataforma brasileira de informação e descoberta dedicada ao airsoft.";

/** Descrição um pouco maior, para `description` dos dados estruturados. */
export const DESCRICAO =
  "Comunidade Airsoft é uma plataforma brasileira de informação e descoberta dedicada ao airsoft: " +
  "reúne campos, operações, lojas, armeiros, equipes, grupos, guias e ferramentas do esporte no Brasil, " +
  "de graça e sem exigir cadastro para consultar.";

export const NOME = "Comunidade Airsoft";

export const GRUPO_OFICIAL = "https://chat.whatsapp.com/GbZdm2rFiTD6vLi0FpLpfW";

export function idOrganizacao(site: URL): string {
  return new URL("/#organizacao", site).href;
}

export function idSite(site: URL): string {
  return new URL("/#website", site).href;
}

/** A entidade completa. Emitida pelo layout em toda página. */
export function organizacao(site: URL) {
  return {
    "@type": "Organization",
    "@id": idOrganizacao(site),
    name: NOME,
    url: site.href,
    description: DESCRICAO,
    // A página que define a entidade por extenso.
    mainEntityOfPage: new URL("/sobre", site).href,
    areaServed: { "@type": "Country", name: "Brasil" },
    knowsAbout: [
      "airsoft",
      "campos de airsoft no Brasil",
      "operações de airsoft",
      "lojas de airsoft",
      "armeiros de airsoft",
      "equipes de airsoft",
      "legislação do airsoft no Brasil",
      "mapas táticos de airsoft",
    ],
    sameAs: [GRUPO_OFICIAL],
  };
}

/** O site como obra, publicado pela entidade. */
export function website(site: URL) {
  return {
    "@type": "WebSite",
    "@id": idSite(site),
    name: NOME,
    url: site.href,
    inLanguage: "pt-BR",
    publisher: refOrganizacao(site),
  };
}

/** Referência curta — o que as outras páginas usam em `publisher`, `about`, etc. */
export function refOrganizacao(site: URL) {
  return { "@id": idOrganizacao(site) };
}

export function refSite(site: URL) {
  return { "@id": idSite(site) };
}
