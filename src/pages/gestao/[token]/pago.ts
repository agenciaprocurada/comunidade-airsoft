import type { APIContext } from "astro";

export const prerender = false;

/**
 * Marca/desmarca "pago" de um inscrito (chamado pelo botão da lista, sem
 * recarregar a página). A sessão vem do cookie da gestão; o banco confere.
 */
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export async function POST(contexto: APIContext) {
  const token = (contexto.params.token ?? "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(token)) return json({ ok: false }, 404);

  // O cookie é SameSite=Lax; ainda assim só aceita chamada vinda desta própria origem.
  const origem = contexto.request.headers.get("origin");
  if (origem && origem !== contexto.url.origin) return json({ ok: false }, 403);

  const sessao = contexto.cookies.get("gestao_sessao")?.value ?? "";
  if (!sessao) return json({ ok: false, erro: "sessao" }, 401);

  let corpo: { id?: string; pago?: boolean };
  try {
    corpo = await contexto.request.json();
  } catch {
    return json({ ok: false }, 400);
  }
  if (typeof corpo.id !== "string" || typeof corpo.pago !== "boolean") return json({ ok: false }, 400);

  const { data } = await contexto.locals.supabase.rpc("gestao_pago", {
    p_sessao: sessao,
    p_id: corpo.id,
    p_pago: corpo.pago,
  });
  const r = (data as { ok?: boolean; erro?: string } | null) ?? { ok: false };
  if (r.erro === "sessao") return json(r, 401);
  return json(r, r.ok ? 200 : 400);
}
