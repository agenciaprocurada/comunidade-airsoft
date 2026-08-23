import type { APIRoute } from "astro";

export const prerender = false;

/** Sair e POST para que nenhum link ou prefetch derrube a sessao. */
export const POST: APIRoute = async ({ locals, redirect }) => {
  await locals.supabase.auth.signOut();
  return redirect("/", 303);
};
