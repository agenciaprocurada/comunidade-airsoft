import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { APIContext } from "astro";

/**
 * Cliente Supabase por requisicao, com a sessao em cookie.
 *
 * Roda so no servidor (rotas com `prerender = false`). A ANON key vai
 * junto de proposito: quem manda e a RLS somada ao JWT do usuario que
 * o proprio cliente injeta a partir do cookie. Service role NUNCA
 * entra aqui — ela ignora RLS.
 *
 * Um cliente novo por requisicao, sempre. Compartilhar entre
 * requisicoes vaza sessao de um usuario para outro.
 */
export function criarClienteSupabase(contexto: APIContext) {
  const url = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
  const chave = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !chave) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_ANON_KEY nao estao definidas. " +
        "Localmente, copie .env.example para .env e preencha; no deploy, " +
        "cadastre as duas nas variaveis de ambiente do projeto.",
    );
  }

  /**
   * O @supabase/ssr pede que estes cabecalhos acompanhem toda resposta
   * que grava cookie de sessao. Sem eles, um CDN pode cachear a pagina
   * junto com o Set-Cookie e servir a sessao de uma pessoa para outra.
   * O middleware aplica no fim da requisicao.
   */
  const cabecalhosDeSessao: Record<string, string> = {};

  const cliente = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return parseCookieHeader(contexto.request.headers.get("cookie") ?? "");
      },
      setAll(lista, cabecalhos) {
        for (const { name, value, options } of lista) {
          contexto.cookies.set(name, value, {
            ...options,
            path: options.path ?? "/",
            // Nada aqui e lido por JavaScript no navegador: o site nao
            // usa cliente Supabase no browser.
            httpOnly: true,
            // 'lax' e obrigatorio: o retorno do Google e uma navegacao
            // de terceiro para ca, e com 'strict' o cookie do PKCE nao
            // seria enviado e o login falharia sempre.
            sameSite: "lax",
            secure: !import.meta.env.DEV,
          });
        }
        Object.assign(cabecalhosDeSessao, cabecalhos);
      },
    },
  });

  return { cliente, cabecalhosDeSessao };
}
