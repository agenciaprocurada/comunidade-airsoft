/**
 * Fonte dos campos do diretório: tabela `public.campos` no Supabase.
 *
 * Roda no build, não no navegador. Usa a ANON key de propósito: a RLS
 * da tabela só deixa a anon enxergar `status = 'publicado'`, então o
 * filtro de publicação é o próprio banco — não há como um rascunho
 * escapar para o HTML por esquecimento de um `.filter()` numa página.
 *
 * Se o banco não responder, o build FALHA. É intencional: publicar o
 * site com o diretório vazio é pior do que não publicar.
 */

const URL_BASE = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const CHAVE = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

/** Colunas pedidas explicitamente — `select=*` quebra calado quando a tabela muda. */
const COLUNAS = [
  "id", "nome", "modalidade", "tipo_operacao",
  "status", "status_original",
  "uf", "cidade", "cidade_slug", "regiao", "bairro", "endereco",
  "terreno", "tipo_campo_original", "precos",
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
 * Rede de segurança: o ingest (db/carregar-planilha.mjs) já grava URL
 * limpa, mas um registro editado à mão no painel do Supabase pode
 * trazer "site.com.br (não verificado)" de volta. Aqui a URL inválida
 * é descartada em vez de derrubar o build inteiro por um link.
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
        /* não é URL: some do contato, o campo continua publicado */
      }
      continue;
    }
    if (chave === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim())) continue;
    saida[chave] = valor.trim();
  }
  return saida;
}

interface LinhaCampo {
  id: string;
  nome: string;
  observacoes: string | null;
  google_nota: string | number | null;
  contato: unknown;
  [k: string]: unknown;
}

export async function carregarCampos() {
  if (!URL_BASE || !CHAVE) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_ANON_KEY não estão definidas. " +
        "Defina as duas antes de rodar o build: localmente, copie " +
        ".env.example para .env e preencha; no deploy (Vercel, Cloudflare), " +
        "cadastre-as nas variaveis de ambiente do projeto — o .env nao vai " +
        "para o repositorio de proposito.",
    );
  }

  const url = `${URL_BASE}/rest/v1/campos?select=${COLUNAS}&order=nome.asc`;
  const resposta = await fetch(url, {
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` },
  });

  if (!resposta.ok) {
    throw new Error(
      `Supabase respondeu ${resposta.status} ao listar campos: ${await resposta.text()}`,
    );
  }

  const linhas = (await resposta.json()) as LinhaCampo[];

  if (linhas.length === 0) {
    throw new Error(
      "Nenhum campo publicado voltou do Supabase. Ou a tabela está vazia, " +
        "ou a policy de leitura da anon key foi removida.",
    );
  }

  return linhas.map((linha) => {
    const { observacoes, google_nota, contato, ...resto } = linha;
    return {
      ...semNulos(resto),
      contato: contatoSaneado(contato),
      // A planilha guarda o texto livre em "Observações"; para o site
      // ele é a descrição do campo.
      descricao: observacoes ?? "",
      // numeric(2,1) chega como string no JSON.
      ...(google_nota != null ? { google_nota: Number(google_nota) } : {}),
    };
  });
}
