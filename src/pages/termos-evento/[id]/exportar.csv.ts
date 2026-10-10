import type { APIContext } from "astro";
import { celulaCsv, dataBr, dataHoraBr, formatarCpf, formatarTelefone } from "../../../lib/termo-evento";

export const prerender = false;

/**
 * Planilha com todas as assinaturas do evento. Acesso: so o dono — o
 * middleware ja barrou os outros e a RLS devolve vazio para quem nao e.
 */
export async function GET(contexto: APIContext) {
  const { supabase } = contexto.locals;
  const id = contexto.params.id ?? "";

  const { data: evento } = await supabase
    .from("termos_eventos")
    .select("nome, data_evento, texto_hash")
    .eq("id", id)
    .maybeSingle();
  if (!evento) return new Response("Não encontrado", { status: 404 });

  const { data } = await supabase
    .from("termos_assinaturas")
    .select("nome, email, telefone, cpf, nascimento, equipe, assinado_em, ip, user_agent")
    .eq("evento_id", id)
    .order("assinado_em", { ascending: true });

  const linhas = [
    ["Nome", "E-mail", "Telefone", "CPF", "Nascimento", "Equipe", "Assinou em", "IP", "Navegador"].map(celulaCsv).join(";"),
    ...(data ?? []).map((a) =>
      [
        a.nome,
        a.email,
        formatarTelefone(a.telefone),
        formatarCpf(a.cpf),
        a.nascimento ? dataBr(a.nascimento) : "",
        a.equipe ?? "",
        dataHoraBr(a.assinado_em),
        a.ip ?? "",
        a.user_agent ?? "",
      ]
        .map(celulaCsv)
        .join(";"),
    ),
  ];

  const arquivo = `termo-${(evento.nome as string)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)}-${dataBr(evento.data_evento as string | null).replace(/\//g, "-") || "sem-data"}.csv`;

  // BOM para o Excel abrir os acentos certos; ';' e o separador do Excel em pt-BR.
  return new Response("﻿" + linhas.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${arquivo}"`,
      "cache-control": "no-store",
    },
  });
}
