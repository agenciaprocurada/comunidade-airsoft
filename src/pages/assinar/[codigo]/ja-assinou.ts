import type { APIContext } from "astro";
import { CODIGO_VALIDO, cpfValido, emailValido, soDigitos } from "../../../lib/termo-evento";

export const prerender = false;

/**
 * "Esta pessoa já assinou?" — chamado no passo 1 da página de assinatura,
 * antes de a pessoa ler o termo e desenhar a assinatura à toa.
 *
 * Responde `{ assinou: false }` quando o CPF não assinou. Quando assinou,
 * só entrega o código da cópia (`token`) se CPF + e-mail + data de
 * nascimento baterem com o registro; 5 erros bloqueiam aquele CPF por 15 min.
 * A lógica e os limites ficam no banco (função `termo_recuperar`).
 */
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export async function POST(contexto: APIContext) {
  const codigo = (contexto.params.codigo ?? "").toLowerCase();
  if (!CODIGO_VALIDO.test(codigo)) return json({ assinou: false }, 404);

  const origem = contexto.request.headers.get("origin");
  if (origem && origem !== contexto.url.origin) return json({ assinou: false }, 403);

  let corpo: { cpf?: unknown; email?: unknown; nascimento?: unknown };
  try {
    corpo = await contexto.request.json();
  } catch {
    return json({ assinou: false }, 400);
  }
  const cpf = soDigitos(String(corpo.cpf ?? ""));
  const email = String(corpo.email ?? "").trim().toLowerCase();
  const nascimento = String(corpo.nascimento ?? "");
  if (!cpfValido(cpf) || !emailValido(email) || !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) {
    return json({ assinou: false }, 400);
  }

  const { data, error } = await contexto.locals.supabase.rpc("termo_recuperar", {
    p_codigo: codigo,
    p_cpf: cpf,
    p_email: email,
    p_nascimento: nascimento,
  });
  if (error || !data) return json({ assinou: false }, 500);
  return json(data);
}
