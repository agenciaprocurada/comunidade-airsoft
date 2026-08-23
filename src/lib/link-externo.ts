/**
 * Links que saem do site: abrem em aba nova e carregam UTM de origem.
 *
 * O objetivo do UTM e o dono do campo ou da loja enxergar "comunidadeairsoft.com.br"
 * como fonte de trafego no analytics dele. Isso e o que sustenta a conversa de
 * reivindicacao da pagina na Fase 2: o diretorio consegue mostrar que manda gente.
 *
 * Vale registrar onde o UTM NAO produz relatorio, para ninguem contar com um dado
 * que nao existe:
 *   - Instagram e Facebook descartam a query no proprio redirecionamento;
 *   - wa.me ignora parametro que nao seja `text`;
 *   - so o site proprio do campo/loja registra a visita de verdade.
 * O parametro e mantido nesses casos porque nao quebra nada e o custo e zero, mas
 * o numero confiavel vem dos links de site.
 */

const FONTE = "comunidadeairsoft.com.br";

/** Esquemas que nao aceitam query de rastreio: e-mail e telefone. */
const SEM_UTM = /^(mailto:|tel:|sms:)/i;

export interface LinkExterno {
  href: string;
  target: "_blank";
  rel: string;
}

/**
 * @param url     destino original
 * @param campanha  de onde partiu o clique — vira `utm_campaign` ("campo", "loja")
 */
export function linkExterno(url: string, campanha: string): LinkExterno {
  return {
    href: comUtm(url, campanha),
    target: "_blank",
    // noopener fecha o acesso da aba nova a window.opener; nofollow evita repassar
    // autoridade para perfil e site de terceiro, que nao passaram por curadoria.
    rel: "nofollow noopener noreferrer",
  };
}

/** Acrescenta os UTM preservando a query que a URL ja tiver. */
export function comUtm(url: string, campanha: string): string {
  if (SEM_UTM.test(url)) return url;

  try {
    const destino = new URL(url);

    // Nao sobrescreve UTM que o proprio cadastro ja trouxe: se alguem colou um
    // link de campanha, a intencao dele vale mais que a nossa.
    if (!destino.searchParams.has("utm_source")) {
      destino.searchParams.set("utm_source", FONTE);
      destino.searchParams.set("utm_medium", "referral");
      destino.searchParams.set("utm_campaign", campanha);
    }

    return destino.href;
  } catch {
    // URL invalida sobrevive sem UTM em vez de derrubar o build inteiro por um
    // link mal cadastrado. O saneamento de verdade acontece no loader.
    return url;
  }
}
