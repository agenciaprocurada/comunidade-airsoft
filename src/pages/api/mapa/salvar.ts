import type { APIContext } from "astro";
import {
  COLUNAS_MAPA,
  ZOOM_MAX,
  ZOOM_MIN,
  ehFormato,
  FORMATO_PADRAO,
} from "../../../lib/mapa";

export const prerender = false;

/**
 * Cria ou atualiza um mapa do usuário logado.
 *
 * Esta rota é o portão da funcionalidade: montar e baixar o mapa é
 * livre e sem conta — o que exige login é GUARDAR. É o mesmo princípio
 * do resto do produto (conteúdo é isca, conta é para ação), e por isso
 * a resposta de não-logado é 401 com um destino de volta, não um
 * redirect: quem chama é um `fetch` do editor, e redirect no fetch faz
 * o editor receber HTML de login onde esperava JSON.
 */

/**
 * Teto do documento de camadas.
 *
 * Sem teto, um mapa com centenas de formas vira uma linha de vários MB
 * no Postgres, e o custo aparece em toda listagem do painel. 256 KB
 * comporta com folga uma grade cheia e algumas dezenas de áreas — é
 * generoso para o uso real e barra o acidente.
 */
const LIMITE_DADOS = 256 * 1024;

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

interface Envio {
  id?: string;
  nome?: string;
  campo_id?: string | null;
  lat?: number;
  lng?: number;
  zoom?: number;
  rotacao?: number;
  formato?: string;
  dados?: unknown;
}

export async function POST(contexto: APIContext) {
  const { supabase, usuario } = contexto.locals;

  if (!usuario) {
    return json(
      { erro: "sem-sessao", entrar: "/entrar?destino=" + encodeURIComponent("/mapa") },
      401,
    );
  }

  let envio: Envio;
  try {
    envio = (await contexto.request.json()) as Envio;
  } catch {
    return json({ erro: "Corpo inválido." }, 400);
  }

  const nome = (envio.nome ?? "").trim();
  if (nome.length < 2 || nome.length > 80) {
    return json({ erro: "Dê um nome de 2 a 80 caracteres ao mapa." }, 400);
  }

  const lat = Number(envio.lat);
  const lng = Number(envio.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return json({ erro: "Coordenada inválida." }, 400);
  }

  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(Number(envio.zoom))));
  if (!Number.isFinite(zoom)) return json({ erro: "Zoom inválido." }, 400);

  const rotacaoCrua = Math.round(Number(envio.rotacao));
  const rotacao = Number.isFinite(rotacaoCrua) ? ((rotacaoCrua % 360) + 360) % 360 : 0;

  const formato = ehFormato(envio.formato) ? envio.formato : FORMATO_PADRAO;

  const dados = envio.dados ?? {};
  if (JSON.stringify(dados).length > LIMITE_DADOS) {
    return json({ erro: "O desenho ficou grande demais. Remova algumas formas." }, 413);
  }

  const registro = {
    nome,
    campo_id: envio.campo_id ?? null,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    zoom,
    rotacao,
    formato,
    dados,
  };

  // Atualizar: o `eq(usuario_id)` é cinto e suspensório junto da RLS —
  // se a policy for afrouxada um dia, o filtro continua aqui.
  if (envio.id) {
    const { data, error } = await supabase
      .from("mapas")
      .update(registro)
      .eq("id", envio.id)
      .eq("usuario_id", usuario.id)
      .select(COLUNAS_MAPA)
      .maybeSingle();

    if (error) {
      console.error("Falha ao atualizar mapa:", error);
      return json({ erro: "Não foi possível salvar." }, 500);
    }
    if (!data) return json({ erro: "Mapa não encontrado." }, 404);
    return json({ mapa: data });
  }

  const { data, error } = await supabase
    .from("mapas")
    .insert({ ...registro, usuario_id: usuario.id })
    .select(COLUNAS_MAPA)
    .maybeSingle();

  if (error) {
    // O gatilho `mapas_teto` sobe como check_violation. Traduzir aqui,
    // senão o editor mostra "erro ao salvar" para um limite que tem
    // solução óbvia (apagar um mapa velho).
    if (error.code === "23514" || /limite de 30/i.test(error.message)) {
      return json(
        { erro: "Você chegou ao limite de 30 mapas. Apague um antigo no seu painel." },
        409,
      );
    }
    console.error("Falha ao criar mapa:", error);
    return json({ erro: "Não foi possível salvar." }, 500);
  }

  return json({ mapa: data });
}
