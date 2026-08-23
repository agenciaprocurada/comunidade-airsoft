import type { APIRoute } from "astro";
import { destinoSeguro } from "../../lib/conta";

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
export const POST: APIRoute = async ({ request, locals, url, redirect }) => {
  const formulario = await request.formData();
  const destino = destinoSeguro(formulario.get("destino")?.toString());

  const retorno = new URL("/auth/callback", url.origin);
  retorno.searchParams.set("destino", destino);

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
