import type { APIContext } from "astro";
import { COLUNAS_MAPA } from "../../../lib/mapa";

export const prerender = false;

/**
 * Um mapa do usuário: ler para editar, apagar para sair do painel.
 *
 * O editor mora numa página estática (`/mapa`), então ele não recebe o
 * registro pronto do servidor — busca por aqui depois de montar. É o
 * preço de manter a ferramenta indexável e servida do CDN, e é barato:
 * uma requisição de ~2 KB.
 */

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Registro de usuário logado nunca entra em cache compartilhado.
      "cache-control": "private, no-store",
    },
  });
}

export async function GET(contexto: APIContext) {
  const { supabase, usuario } = contexto.locals;
  if (!usuario) return json({ erro: "sem-sessao" }, 401);

  const { data, error } = await supabase
    .from("mapas")
    .select(COLUNAS_MAPA)
    .eq("id", contexto.params.id)
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  if (error) {
    console.error("Falha ao ler mapa:", error);
    return json({ erro: "Não foi possível abrir este mapa." }, 500);
  }
  // 404 e não 403 para id de outra pessoa: não há motivo de confirmar
  // para um curioso que aquele id existe.
  if (!data) return json({ erro: "Mapa não encontrado." }, 404);

  return json({ mapa: data });
}

export async function DELETE(contexto: APIContext) {
  const { supabase, usuario } = contexto.locals;
  if (!usuario) return json({ erro: "sem-sessao" }, 401);

  const id = contexto.params.id!;

  // O PNG publicado sai junto do registro. Deixar o arquivo para trás
  // acumularia lixo no bucket para sempre — mesmo raciocínio do
  // `diretorio-admin` ao trocar a capa de uma ficha.
  const { data: mapa } = await supabase
    .from("mapas")
    .select("publicado_url")
    .eq("id", id)
    .eq("usuario_id", usuario.id)
    .maybeSingle<{ publicado_url: string | null }>();

  const { error } = await supabase
    .from("mapas")
    .delete()
    .eq("id", id)
    .eq("usuario_id", usuario.id);

  if (error) {
    console.error("Falha ao apagar mapa:", error);
    return json({ erro: "Não foi possível apagar." }, 500);
  }

  if (mapa?.publicado_url) {
    const caminho = `${usuario.id}/${id}.png`;
    // Falha aqui não desfaz a exclusão: o registro já saiu e o usuário
    // não pode ficar preso por causa de um arquivo órfão.
    await supabase.storage.from("mapas").remove([caminho]);
  }

  return json({ ok: true });
}
