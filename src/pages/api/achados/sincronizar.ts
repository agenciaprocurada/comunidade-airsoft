import type { APIContext } from "astro";

export const prerender = false;

/**
 * Entrada dos achados que vem do Katachados (ver db/schema-achados-katachados.sql).
 *
 * A rota nao decide nada: repassa a chave e a lista para a funcao
 * `katachados_sincronizar`, que confere o hash da chave no banco. Por
 * isso o site nao guarda segredo nenhum para esta integracao.
 */

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function POST({ request, locals }: APIContext) {
  const chave = request.headers.get("x-katachados-chave") ?? "";
  if (!/^ach_[0-9a-f]{48}$/.test(chave)) return json({ erro: "chave invalida" }, 401);

  const corpo = await request.json().catch(() => null);
  if (!corpo || !Array.isArray(corpo.itens)) return json({ erro: "envie { itens: [...] }" }, 400);

  const { data, error } = await locals.supabase.rpc("katachados_sincronizar", {
    p_chave: chave,
    p_itens: corpo.itens,
  });
  if (error) return json({ erro: error.message }, error.code === "28000" ? 401 : 400);
  return json({ ok: true, ...(data as object) });
}
