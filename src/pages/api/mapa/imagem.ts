import type { APIContext } from "astro";

export const prerender = false;

/**
 * Recebe a imagem que o usuário quer usar como fundo do mapa e a
 * guarda no bucket `mapas`, devolvendo a URL pública.
 *
 * Existe porque o navegador não tem cliente Supabase (a autenticação
 * do site é toda por cookie no servidor) e o registro do mapa não pode
 * carregar a imagem em si — o jsonb de `dados` tem teto de 256 KB e
 * uma foto passa disso fácil. A imagem vai para o Storage e no
 * registro viaja só a URL.
 *
 * As policies do bucket já restringem escrita à pasta do próprio
 * usuário; o caminho `<uid>/fundo-*.webp` respeita isso.
 */

/** 8 MB — o mesmo teto do bucket. */
const LIMITE_BYTES = 8 * 1024 * 1024;

/** O bucket só aceita estes tipos (ver schema-mapas.sql). */
const TIPOS = new Set(["image/png", "image/webp"]);

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(contexto: APIContext) {
  const { supabase, usuario } = contexto.locals;
  if (!usuario) return json({ erro: "sem-sessao" }, 401);

  const tipo = contexto.request.headers.get("content-type") ?? "";
  if (!TIPOS.has(tipo)) {
    return json({ erro: "Envie a imagem em PNG ou WebP." }, 415);
  }

  const corpo = await contexto.request.arrayBuffer();
  if (corpo.byteLength === 0) return json({ erro: "Imagem vazia." }, 400);
  if (corpo.byteLength > LIMITE_BYTES) {
    return json({ erro: "A imagem passa de 8 MB. Reduza e tente de novo." }, 413);
  }

  const extensao = tipo === "image/png" ? "png" : "webp";
  // Nome aleatório porque o mapa pode ainda nem ter id (primeiro
  // salvamento). O arquivo antigo de uma troca vira órfão — limpeza em
  // lote fica para depois; é custo de storage, não de correção.
  const caminho = `${usuario.id}/fundo-${crypto.randomUUID()}.${extensao}`;

  const { error } = await supabase.storage
    .from("mapas")
    .upload(caminho, corpo, { contentType: tipo });

  if (error) {
    console.error("Falha ao subir imagem de fundo:", error);
    return json({ erro: "Não foi possível guardar a imagem." }, 500);
  }

  const { data } = supabase.storage.from("mapas").getPublicUrl(caminho);
  return json({ url: data.publicUrl });
}
