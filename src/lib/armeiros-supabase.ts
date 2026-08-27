/**
 * Fonte dos armeiros do diretório: tabela `public.armeiros` no Supabase.
 *
 * Mesma mecânica de lojas-supabase.ts: roda no build com a ANON key,
 * e a RLS da tabela só deixa a anon enxergar `status = 'publicado'`.
 * O filtro de publicação é o banco, não um `.filter()` de página.
 *
 * Diferença de propósito em relação a campos e lojas: se a tabela
 * voltar vazia, o build NÃO falha. O diretório de armeiros nasce
 * vazio e enche por auto-cadastro — derrubar o deploy do site
 * inteiro porque ninguém se cadastrou ainda seria acoplar o que não
 * tem relação. Campo e loja já vieram de levantamento pronto; aqui
 * a lista começa do zero de propósito.
 */

const URL_BASE = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const CHAVE = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

/** Colunas explícitas — `select=*` quebra calado quando a tabela muda. */
const COLUNAS = [
  "id", "nome", "descricao", "tipo", "status",
  "uf", "cidade", "cidade_slug", "bairro", "endereco", "cep", "lat", "lng",
  "endereco_publico",
  "atende_presencial", "atende_envio", "raio_atendimento",
  "plataformas", "servicos", "marcas",
  "prazo_medio", "garantia", "emite_nota", "precos", "formas_pagamento", "horario",
  "desde", "formacao", "loja_id",
  "razao_social", "cnpj", "situacao_cadastral",
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
 * link torto. Cópia deliberada de lojas-supabase.ts — as duas tabelas
 * guardam `contato` no mesmo formato.
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
        /* não é URL: some do contato, o armeiro continua publicado */
      }
      continue;
    }
    if (chave === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim())) continue;
    saida[chave] = valor.trim();
  }
  return saida;
}

interface LinhaArmeiro {
  id: string;
  nome: string;
  descricao: string | null;
  contato: unknown;
  google_nota: string | number | null;
  lat: string | number | null;
  lng: string | number | null;
  endereco_publico: boolean;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
  [k: string]: unknown;
}

/** numeric do Postgres chega como string no JSON do PostgREST. */
function numero(v: string | number | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function carregarArmeiros() {
  if (!URL_BASE || !CHAVE) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_ANON_KEY não estão definidas. " +
        "Defina as duas antes de rodar o build: localmente, copie " +
        ".env.example para .env e preencha; no deploy (Vercel, Cloudflare), " +
        "cadastre-as nas variaveis de ambiente do projeto — o .env nao vai " +
        "para o repositorio de proposito.",
    );
  }

  const url = `${URL_BASE}/rest/v1/armeiros?select=${COLUNAS}&order=nome.asc`;
  const resposta = await fetch(url, {
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` },
  });

  /**
   * 404 aqui quer dizer uma coisa só: db/schema-armeiros.sql ainda não
   * foi aplicado neste banco. É estado esperado de quem clonou o repo
   * e ainda não rodou a migração — o site sobe sem a seção.
   *
   * Mas ele NÃO pode ser silencioso, e isso custou uma sessão de
   * depuração: um dev server subiu antes da migração, o loader devolveu
   * lista vazia sem dizer nada, o content layer cacheou esse vazio em
   * .astro/data-store.json e a página seguiu mostrando "o diretório
   * está começando agora" mesmo com 47 armeiros publicados no banco.
   * O cache não refaz o fetch sozinho — quem viu isso precisa saber
   * que a saída é apagar .astro/data-store.json e reiniciar.
   */
  if (resposta.status === 404) {
    console.warn(
      "[armeiros] A tabela public.armeiros não existe neste banco — o " +
        "diretório vai subir vazio.\n" +
        "  Para criar:  PGHOST=... PGPASSWORD=... aplique db/schema-armeiros.sql\n" +
        "  Se você JÁ aplicou e a lista continua vazia, o cache do content " +
        "layer está velho: apague .astro/data-store.json e reinicie o dev server.",
    );
    return [];
  }

  if (!resposta.ok) {
    throw new Error(
      `Supabase respondeu ${resposta.status} ao listar armeiros: ${await resposta.text()}`,
    );
  }

  const linhas = (await resposta.json()) as LinhaArmeiro[];

  /**
   * Tabela existe mas nada voltou. Ao contrário de campos e lojas,
   * isto NÃO derruba o build: o diretório enche por auto-cadastro e
   * pode legitimamente estar vazio. Mas avisa, pela mesma razão do
   * 404 acima — vazio silencioso já enganou uma vez.
   */
  if (linhas.length === 0) {
    console.warn(
      "[armeiros] Nenhum armeiro publicado voltou do Supabase. Ou não há " +
        "cadastro com status='publicado', ou a policy de leitura da anon " +
        "key foi removida.",
    );
  }

  return linhas.map((linha) => {
    const {
      id, descricao, contato, google_nota, lat, lng,
      endereco_publico, endereco, bairro, cep,
      ...resto
    } = linha;

    /**
     * O corte de privacidade acontece AQUI, na fronteira do build, e
     * não no componente.
     *
     * Tudo que sai desta função vira HTML estático publicado. Se o
     * endereço viajasse até a ficha e só lá fosse escondido por um
     * `{d.endereco_publico && ...}`, bastaria um componente novo
     * esquecer a condição para vazar o endereço residencial de um
     * armeiro que nunca autorizou. Cortando na origem, o dado
     * simplesmente não existe do outro lado.
     *
     * lat/lng entram na mesma regra: são o endereço em outro formato.
     */
    const local = endereco_publico
      ? {
          endereco_publico: true,
          ...(endereco ? { endereco } : {}),
          ...(bairro ? { bairro } : {}),
          ...(cep ? { cep } : {}),
          ...(numero(lat) != null ? { lat: numero(lat) } : {}),
          ...(numero(lng) != null ? { lng: numero(lng) } : {}),
        }
      : { endereco_publico: false };

    /**
     * `id` sai do spread e volta explícito porque `semNulos` devolve
     * `Partial<T>` — o que torna `id` opcional para o TypeScript e faz
     * o loader não bater com o contrato do content collection, que
     * exige `{ id: string }`. Os loaders de campos e lojas convivem com
     * esse erro de tipo; este não precisa nascer com ele.
     */
    return {
      id,
      ...semNulos(resto),
      ...local,
      contato: contatoSaneado(contato),
      descricao: descricao ?? "",
      ...(numero(google_nota) != null ? { google_nota: numero(google_nota) } : {}),
    };
  });
}
