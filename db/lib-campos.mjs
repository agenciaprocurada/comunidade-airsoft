/**
 * Regras compartilhadas pelos carregadores de campos.
 *
 * Existe para que a descoberta (busca aberta) e a verificacao (Places)
 * gerem id, slug e modalidade pela MESMA regra. Duas implementacoes da
 * mesma regra e como o "Arena Airsoft" de SP acabaria sobrescrevendo o
 * do RS: ninguem percebe ate o dado sumir.
 */

export const slug = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Nome comparavel: sem acento, sem pontuacao, sem sufixo de ruido. */
export const chaveNome = (s) =>
  slug(s)
    .replace(/-(ltda|me|epp|oficial|brasil)$/g, "")
    .replace(/-/g, " ")
    .trim();

/**
 * O id vira URL e nunca muda depois de publicado (PLANO-DE-ACAO §3).
 *
 * O gerador antigo (db/carregar-planilha.mjs) usava so o slug do nome.
 * Isso funciona enquanto o diretorio tem um estado so; com o Brasil
 * inteiro, "Arena Airsoft" existe em SP, PR e BA, e um upsert por id
 * faria um sobrescrever o outro em silencio. Aqui o nome puro so e
 * usado se estiver livre; depois entra cidade, depois UF, depois numero.
 *
 * `usados` e um Set com os ids que ja existem — passe o do banco.
 */
export function idLivre(nome, cidade, uf, usados) {
  const base = slug(nome);
  const candidatos = [base, `${base}-${slug(cidade)}`, `${base}-${slug(uf)}`];
  for (const c of candidatos) if (c && !usados.has(c)) return c;
  let n = 2;
  while (usados.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Airsoft e paintball dividem campo no Brasil; o nome costuma entregar. */
export function modalidadeDe(...textos) {
  const t = textos.filter(Boolean).join(" ").toLowerCase();
  const temPaintball = /paintball/.test(t);
  const temAirsoft = /airsoft/.test(t);
  if (temPaintball && temAirsoft) return "ambos";
  if (temPaintball) return "paintball";
  return "airsoft";
}

/** "Tipo de campo" e texto livre; deriva o vocabulario fechado de terreno. */
export function terrenoDe(txt) {
  if (!txt) return [];
  const t = String(txt).toLowerCase();
  const r = new Set();
  if (/mata|selva|floresta|bosque|outdoor|nativa|arvore|árvore|campo aberto/.test(t)) r.add("mata");
  if (/cqb|speedball|inflav|infláv|indoor|coberto|arena fechada|galpao|galpão/.test(t)) r.add("cqb");
  if (/urban|cenario|cenário|vila|city|predio|prédio/.test(t)) r.add("urbano");
  if (/misto|hibrido|híbrido/.test(t)) r.add("misto");
  return [...r];
}

/** So digitos, com DDD. Menos de 10 nao e telefone: descarta. */
export function telefoneLimpo(v) {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d : null;
}

/**
 * Devolve URL valida ou null. A anotacao do levantamento
 * ("site.com.br (nao verificado)") nao e endereco.
 */
export function urlLimpa(v) {
  let t = String(v ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (!t) return null;
  if (!/^https?:\/\//i.test(t)) {
    if (!/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(t)) return null;
    t = `https://${t}`;
  }
  try {
    return new URL(t).href;
  } catch {
    return null;
  }
}

/** Cliente Postgres com as mesmas variaveis de ambiente em todo script. */
export function configPg() {
  return {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE ?? "postgres",
    ssl: { rejectUnauthorized: false },
  };
}
