/**
 * Fonte das lojas do diretório: tabela `public.lojas` no Supabase.
 *
 * Mesma mecânica de campos-supabase.ts: roda no build com a ANON key,
 * e a RLS da tabela só deixa a anon enxergar `status = 'publicado'`.
 * O filtro de publicação é o banco, não um `.filter()` de página.
 *
 * Se o banco não responder, o build FALHA de propósito.
 */

const URL_BASE = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const CHAVE = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

/** Colunas explícitas — `select=*` quebra calado quando a tabela muda. */
const COLUNAS = [
  "id", "nome", "razao_social", "cnpj", "situacao_cadastral",
  "descricao", "tipo", "status",
  "uf", "cidade", "cidade_slug", "bairro", "endereco", "cep", "lat", "lng",
  "categorias", "marcas", "faz_manutencao", "faz_customizacao",
  "entrega_nacional", "formas_pagamento", "desconto_avista", "cupom", "horario",
  "contato", "google_nota", "google_avaliacoes",
  "observacoes", "confianca", "verificado", "verificado_em", "fonte",
  "foto_url",
].join(",");

/** PostgREST devolve `null`; o zod do content collection espera ausência. */
function semNulos<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined),
  ) as Partial<T>;
}

/**
 * Rede de segurança contra registro editado à mão no painel: URL
 * inválida é descartada em vez de derrubar o build inteiro por um
 * link torto.
 */
function contatoSaneado(contato: unknown): Record<string, string> {
  if (!contato || typeof contato !== "object") return {};
  const saida: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(contato as Record<string, unknown>)) {
    if (typeof valor !== "string" || !valor.trim()) continue;
    if (chave === "site" || chave === "facebook") {
      const limpo = valor.replace(/\s*\([^)]*\)\s*$/, "").trim();
      const comProtocolo = /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`;
      try {
        saida[chave] = new URL(comProtocolo).href;
      } catch {
        /* não é URL: some do contato, a loja continua publicada */
      }
      continue;
    }
    if (chave === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim())) continue;
    saida[chave] = valor.trim();
  }
  return saida;
}

interface LinhaLoja {
  id: string;
  nome: string;
  descricao: string | null;
  contato: unknown;
  google_nota: string | number | null;
  lat: string | number | null;
  lng: string | number | null;
  [k: string]: unknown;
}

/** numeric do Postgres chega como string no JSON do PostgREST. */
function numero(v: string | number | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function carregarLojas() {
  if (!URL_BASE || !CHAVE) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_ANON_KEY não estão definidas. " +
        "Defina as duas antes de rodar o build: localmente, copie " +
        ".env.example para .env e preencha; no deploy (Vercel, Cloudflare), " +
        "cadastre-as nas variaveis de ambiente do projeto — o .env nao vai " +
        "para o repositorio de proposito.",
    );
  }

  const url = `${URL_BASE}/rest/v1/lojas?select=${COLUNAS}&order=nome.asc`;
  const resposta = await fetch(url, {
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` },
  });

  if (!resposta.ok) {
    throw new Error(
      `Supabase respondeu ${resposta.status} ao listar lojas: ${await resposta.text()}`,
    );
  }

  const linhas = (await resposta.json()) as LinhaLoja[];

  if (linhas.length === 0) {
    throw new Error(
      "Nenhuma loja publicada voltou do Supabase. Ou a tabela está vazia, " +
        "ou a policy de leitura da anon key foi removida.",
    );
  }

  return linhas.map((linha) => {
    const { descricao, contato, google_nota, lat, lng, ...resto } = linha;
    return {
      ...semNulos(resto),
      contato: contatoSaneado(contato),
      descricao: descricao ?? "",
      ...(numero(google_nota) != null ? { google_nota: numero(google_nota) } : {}),
      ...(numero(lat) != null ? { lat: numero(lat) } : {}),
      ...(numero(lng) != null ? { lng: numero(lng) } : {}),
    };
  });
}
