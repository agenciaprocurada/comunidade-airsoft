import type { APIRoute } from "astro";
import { COOKIE_DESTINO, destinoSeguro } from "../../lib/conta";

export const prerender = false;

/**
 * Volta do Google. Troca o `code` pela sessao; os cookies sao gravados
 * pelo `setAll` do cliente e aplicados na resposta pelo Astro.
 */
export const GET: APIRoute = async ({ url, locals, redirect, cookies }) => {
  // Para onde ir depois. Vem do cookie gravado em /auth/google — ver
  // o comentario de la sobre por que nao pode vir na query string.
  const destino = destinoSeguro(cookies.get(COOKIE_DESTINO)?.value);
  cookies.delete(COOKIE_DESTINO, { path: "/" });

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

  return redirect(destino, 303);
};
