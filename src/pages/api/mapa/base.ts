import type { APIContext } from "astro";
import { BASE_ESCALA, BASE_PEDIDO, lerEnquadramento } from "../../../lib/mapa";

export const prerender = false;

/**
 * Imagem de satélite do enquadramento, servida pela nossa origem.
 *
 * Três problemas resolvidos pela mesma rota, e é por isso que ela
 * existe em vez de o navegador chamar o provedor direto:
 *
 * 1. CANVAS EXPORTÁVEL. A Static API não manda cabeçalho CORS. Uma
 *    imagem carregada dela direto no canvas o deixa "tainted", e aí
 *    `toBlob()` lança SecurityError — ou seja, o botão de baixar o
 *    mapa simplesmente não funcionaria. Servida daqui, é mesma origem
 *    e o canvas continua limpo.
 *
 * 2. A CHAVE NÃO VAZA. Chave de Static API no HTML é chave que
 *    qualquer um copia e gasta na conta alheia — e o faturamento é por
 *    requisição.
 *
 * 3. CACHE. Mesmo enquadramento é sempre a mesma imagem, então a
 *    resposta é imutável. O CDN passa a absorver a maior parte das
 *    aberturas de mapa e a cota real gasta no provedor cai muito.
 */

/** Um ano. A imagem de um enquadramento não muda; se mudar, muda a URL. */
const CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";

/**
 * Só o próprio site pede.
 *
 * A rota é pública porque o editor abre sem login — e sem esta checagem
 * ela vira proxy gratuito de Static Maps para qualquer site, na nossa
 * conta. Não é barreira forte (cabeçalho se falsifica), mas corta o
 * abuso oportunista, que é o caso real. O que sustenta o custo mesmo é
 * o cache acima.
 */
function daCasa(contexto: APIContext): boolean {
  if (import.meta.env.DEV) return true;
  const origem = contexto.request.headers.get("referer") ?? contexto.request.headers.get("origin");
  if (!origem) return false;
  try {
    return new URL(origem).host === contexto.url.host;
  } catch {
    return false;
  }
}

function erro(mensagem: string, status: number) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function GET(contexto: APIContext) {
  const chave =
    import.meta.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;

  if (!chave) {
    return erro(
      "GOOGLE_MAPS_API_KEY não está definida. Localmente, preencha no .env; " +
        "no deploy, cadastre nas variáveis de ambiente do projeto.",
      503,
    );
  }

  if (!daCasa(contexto)) return erro("Origem não autorizada.", 403);

  const enquadramento = lerEnquadramento(contexto.url.searchParams);
  if (!enquadramento) return erro("Coordenada inválida.", 400);

  const { lat, lng, zoom } = enquadramento;

  // Sempre quadrado e sempre `scale=2`: a rotação acontece depois, no
  // editor, e precisa de margem sobrando dos quatro lados. Ver
  // `quadroInscrito` em lib/mapa.ts.
  const alvo = new URL("https://maps.googleapis.com/maps/api/staticmap");
  alvo.searchParams.set("center", `${lat},${lng}`);
  alvo.searchParams.set("zoom", String(zoom));
  alvo.searchParams.set("size", `${BASE_PEDIDO}x${BASE_PEDIDO}`);
  alvo.searchParams.set("scale", String(BASE_ESCALA));
  alvo.searchParams.set("maptype", "satellite");
  alvo.searchParams.set("format", "png");
  alvo.searchParams.set("key", chave);

  let resposta: Response;
  try {
    resposta = await fetch(alvo, { signal: AbortSignal.timeout(12_000) });
  } catch {
    return erro("O provedor de imagem não respondeu. Tente de novo.", 504);
  }

  if (!resposta.ok) {
    // O corpo do erro do Google costuma citar a chave; nunca repassar.
    console.error("Static Maps respondeu", resposta.status, await resposta.text().catch(() => ""));
    return erro("Não foi possível carregar a imagem deste local.", 502);
  }

  return new Response(resposta.body, {
    headers: {
      "content-type": resposta.headers.get("content-type") ?? "image/png",
      "cache-control": CACHE,
      // A imagem já foi paga e cacheada; não deixar virar CDN alheio.
      "x-content-type-options": "nosniff",
    },
  });
}
