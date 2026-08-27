import type { APIRoute } from "astro";
import { COOKIE_DESTINO, destinoSeguro } from "../../lib/conta";

export const prerender = false;

/**
 * Inicia o login com Google.
 *
 * E POST, nao link: assim o prefetch do navegador (ou um bot) nao
 * dispara o fluxo de OAuth sozinho.
 *
 * O Supabase monta a URL do Google e ja grava o cookie do verificador
 * PKCE pelo `setAll` do cliente — por isso nao ha nada de sessao para
 * gerenciar aqui.
 */
export const POST: APIRoute = async ({ request, locals, url, redirect, cookies }) => {
  const formulario = await request.formData();
  const destino = destinoSeguro(formulario.get("destino")?.toString());

  /**
   * O destino vai em COOKIE, nunca na query string do `redirect_to`.
   *
   * O Supabase compara o `redirect_to` com a lista de Redirect URLs do
   * painel, e uma URL com query string NAO casa com a entrada sem query
   * string. Quando nao casa, ele nao acusa erro: manda o usuario para o
   * Site URL e o login "some". Foi exatamente o que aconteceu aqui.
   *
   * Mandando o `redirect_to` limpo, ele fica identico a entrada
   * cadastrada e o problema deixa de existir em qualquer ambiente.
   */
  cookies.set(COOKIE_DESTINO, destino, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: !import.meta.env.DEV,
    maxAge: 600,
  });

  const retorno = new URL("/auth/callback", url.origin);

  const { data, error } = await locals.supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: retorno.href,
      // Sem isso o Google entra direto na ultima conta usada, o que
      // atrapalha quem tem conta pessoal e de equipe no mesmo browser.
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data?.url) {
    console.error("Falha ao iniciar OAuth com Google:", error);
    return redirect("/entrar?erro=inicio", 303);
  }

  return redirect(data.url, 303);
};
