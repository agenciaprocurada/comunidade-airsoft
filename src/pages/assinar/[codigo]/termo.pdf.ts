import type { APIContext } from "astro";
import { CODIGO_VALIDO } from "../../../lib/termo-evento";
import { gerarPdfTermoAssinado, type DadosTermoAssinado } from "../../../lib/termo-pdf";

export const prerender = false;

/**
 * Download do termo assinado. Sem login: quem assinou recebe um codigo
 * secreto (32 caracteres hex, 128 bits) na tela de conclusao, e so esse
 * codigo libera o PDF dele. Sem o codigo certo a resposta e 404.
 */
export async function GET(contexto: APIContext) {
  const codigo = (contexto.params.codigo ?? "").toLowerCase();
  const token = (contexto.url.searchParams.get("t") ?? "").toLowerCase();
  if (!CODIGO_VALIDO.test(codigo) || !/^[0-9a-f]{32}$/.test(token)) {
    return new Response("Não encontrado", { status: 404 });
  }

  const { data, error } = await contexto.locals.supabase.rpc("termo_assinado", {
    p_codigo: codigo,
    p_token: token,
  });
  if (error || !data) return new Response("Não encontrado", { status: 404 });

  const dados = data as DadosTermoAssinado;
  const pdf = await gerarPdfTermoAssinado(dados);

  const limpo = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
  const arquivo = `termo-assinado-${limpo(dados.evento.nome)}-${limpo(dados.assinatura.nome)}.pdf`;

  return new Response(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${arquivo}"`,
      "cache-control": "no-store",
    },
  });
}
