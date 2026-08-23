/**
 * Carrega a planilha de levantamento de locais para public.campos.
 *
 * Idempotente: roda quantas vezes quiser. A chave e o slug do nome,
 * entao rodar de novo atualiza o registro em vez de duplicar.
 *
 * Uso:
 *   PGPASSWORD=... PGHOST=db.<ref>.supabase.co node db/carregar-planilha.mjs
 *
 * As credenciais vem do ambiente de proposito. Nao colar senha aqui:
 * este arquivo vai para o git.
 *
 * Dependencia: `pg`. Nao esta no package.json porque o site e estatico
 * e nao fala com o banco — instale sob demanda com `npm i -D pg`.
 */

import pg from "pg";

const PLANILHA = "1W8PLqhejXK3mOdXgCcMirYE75MRpDzWRCwfsq2GW7kg";
const CSV = `https://docs.google.com/spreadsheets/d/${PLANILHA}/export?format=csv`;

/* ---------------------------------------------------------- CSV */

function parseCSV(s) {
  const linhas = [];
  let campo = "", linha = [], aspas = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (aspas) {
      if (c === '"' && s[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n") { linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
    else if (c !== "\r") campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

/* -------------------------------------------------- normalizacao */

const vazio = (v) => !v || /^n\/d$/i.test(String(v).trim()) || !String(v).trim();
const limpo = (v) => (vazio(v) ? null : String(v).trim());
const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** "Tipo de campo" e texto livre; deriva o vocabulario fechado de terreno. */
function terreno(txt) {
  if (vazio(txt)) return [];
  const t = txt.toLowerCase(), r = new Set();
  if (/mata|selva|floresta|bosque|outdoor|nativa|arvore|árvore|campo aberto/.test(t)) r.add("mata");
  if (/cqb|speedball|inflav|infláv|indoor|coberto|arena fechada|galpao|galpão/.test(t)) r.add("cqb");
  if (/urban|cenario|cenário|vila|city|predio|prédio/.test(t)) r.add("urbano");
  if (/misto|hibrido|híbrido/.test(t)) r.add("misto");
  return [...r];
}

function modalidade(v) {
  const t = (v || "").toLowerCase();
  if (/ambos/.test(t)) return "ambos";
  if (/paintball/.test(t)) return "paintball";
  return "airsoft";
}

/**
 * So vira 'publicado' o que esta ativo E tem confianca alta.
 * Dado podre publicado manda jogador para campo fechado — o risco
 * numero 1 do documento de projeto (§9).
 */
function statusPublicacao(s, confianca) {
  const t = (s || "").toLowerCase();
  if (/fechado|encerrad|inativ/.test(t)) return "inativo";
  if (/^ativo/.test(t) && confianca === "alta") return "publicado";
  return "rascunho";
}

/**
 * A coluna Site/Facebook mistura URL com anotacao do levantamento:
 * "www.exemplo.com.br (nao verificado)", "https://x.com/ (retornou 404)",
 * "Grupo de WhatsApp (link no Google Maps)".
 * Devolve URL valida ou null — anotacao nao e endereco.
 */
function url(v) {
  let t = limpo(v);
  if (!t) return null;
  t = t.replace(/\s*\([^)]*\)\s*$/, "").trim();       // tira o parentese final
  if (!/^https?:\/\//i.test(t)) {
    if (!/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(t)) return null;  // nao e dominio
    t = `https://${t}`;
  }
  try { new URL(t); return t; } catch { return null; }
}

function email(v) {
  const t = (limpo(v) || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : null;
}

const telefone = (v) => { const d = (limpo(v) || "").replace(/\D/g, ""); return d.length >= 10 ? d : null; };
const nota = (v) => { const n = parseFloat((limpo(v) || "").replace(",", ".")); return Number.isFinite(n) && n <= 5 ? n : null; };
const inteiro = (v) => { const n = parseInt((limpo(v) || "").replace(/\D/g, ""), 10); return Number.isFinite(n) ? n : null; };

function normalizar(csv) {
  const l = parseCSV(csv);
  const cab = l[1];                     // linha 0 e o titulo da planilha
  const ix = Object.fromEntries(cab.map((c, i) => [c, i]));
  const brutos = l.slice(2).filter((r) => r[1] && r[1].trim());

  const usados = new Map();
  return brutos.map((r) => {
    const g = (c) => r[ix[c]] ?? "";
    let id = slug(g("Nome do local"));
    if (usados.has(id)) { const n = usados.get(id) + 1; usados.set(id, n); id = `${id}-${n}`; }
    else usados.set(id, 1);

    const conf = g("Confiança do dado").trim().toLowerCase().replace("é", "e");

    const contato = {};
    const wa = telefone(g("Telefone / WhatsApp"));
    if (wa) contato.whatsapp = wa;
    const em = email(g("E-mail"));
    if (em) contato.email = em;
    const site = url(g("Site"));
    if (site) contato.site = site;
    const fb = url(g("Facebook"));
    if (fb) contato.facebook = fb;
    const ig = limpo(g("Instagram"));
    if (ig) contato.instagram = ig;

    return {
      id,
      nome: g("Nome do local").trim(),
      modalidade: modalidade(g("Modalidade")),
      modalidade_original: g("Modalidade").trim(),
      tipo_operacao: limpo(g("Tipo de operação")),
      status: statusPublicacao(g("Status"), conf),
      status_original: g("Status").trim(),
      uf: "RS",
      cidade: g("Cidade").trim(),
      cidade_slug: slug(g("Cidade")),
      regiao: limpo(g("Região")),
      bairro: limpo(g("Bairro / Localidade")),
      endereco: limpo(g("Endereço")),
      terreno: terreno(g("Tipo de campo")),
      tipo_campo_original: limpo(g("Tipo de campo")),
      precos: limpo(g("Preços / Pacotes")),
      contato,
      google_nota: nota(g("Nota Google")),
      google_avaliacoes: inteiro(g("Nº avaliações")),
      observacoes: limpo(g("Observações")),
      confianca: ["alta", "media", "baixa"].includes(conf) ? conf : null,
      verificado: false,
      fonte: limpo(g("Fonte")),
    };
  });
}

/* ------------------------------------------------------- carga */

const COLUNAS = [
  "id", "nome", "modalidade", "modalidade_original", "tipo_operacao", "status", "status_original",
  "uf", "cidade", "cidade_slug", "regiao", "bairro", "endereco", "terreno", "tipo_campo_original",
  "precos", "contato", "google_nota", "google_avaliacoes", "observacoes", "confianca", "verificado", "fonte",
];

const resposta = await fetch(CSV);
if (!resposta.ok) throw new Error(`planilha respondeu ${resposta.status}`);
const registros = normalizar(await resposta.text());
console.log(`planilha: ${registros.length} locais`);

const cliente = new pg.Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? "postgres",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE ?? "postgres",
  ssl: { rejectUnauthorized: false },
});
await cliente.connect();

const atualizaveis = COLUNAS.filter((c) => c !== "id");
const SQL = `insert into public.campos (${COLUNAS.join(",")})
  values (${COLUNAS.map((_, i) => `$${i + 1}`).join(",")})
  on conflict (id) do update set ${atualizaveis.map((c) => `${c}=excluded.${c}`).join(", ")}
  returning (xmax = 0) as inserido`;

let inseridos = 0, atualizados = 0;
try {
  // Tudo ou nada: uma planilha meio carregada e pior que nenhuma.
  await cliente.query("begin");
  for (const r of registros) {
    const vals = COLUNAS.map((c) => (c === "contato" ? JSON.stringify(r[c]) : r[c]));
    const res = await cliente.query(SQL, vals);
    res.rows[0].inserido ? inseridos++ : atualizados++;
  }
  await cliente.query("commit");
} catch (e) {
  await cliente.query("rollback");
  console.error("ROLLBACK —", e.message);
  await cliente.end();
  process.exit(1);
}

console.log(`inseridos: ${inseridos} | atualizados: ${atualizados}`);
await cliente.end();
