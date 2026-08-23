import type { APIRoute } from "astro";
import { destinoSeguro } from "../../lib/conta";

export const prerender = false;

/**
 * Volta do Google. Troca o `code` pela sessao; os cookies sao gravados
 * pelo `setAll` do cliente e aplicados na resposta pelo Astro.
 */
export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const erroDoGoogle = url.searchParams.get("error");
  if (erroDoGoogle) {
    // "access_denied" e o caso normal de quem clicou em cancelar.
    const motivo = erroDoGoogle === "access_denied" ? "cancelado" : "provedor";
    return redirect(`/entrar?erro=${motivo}`, 303);
  }

  const codigo = url.searchParams.get("code");
  if (!codigo) return redirect("/entrar?erro=sem_codigo", 303);

  const { error } = await locals.supabase.auth.exchangeCodeForSession(codigo);

  if (error) {
    console.error("Falha ao trocar code por sessao:", error);
    return redirect("/entrar?erro=troca", 303);
  }

  return redirect(destinoSeguro(url.searchParams.get("destino")), 303);
};
