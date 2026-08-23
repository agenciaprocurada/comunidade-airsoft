/**
 * Carrega db/lojas.json para public.lojas.
 *
 * Idempotente: a chave e o `id` (slug que entra na URL), entao rodar
 * de novo atualiza o registro em vez de duplicar. O slug nunca muda
 * depois de publicado — ver PLANO-DE-ACAO.md §3.
 *
 * Uso:
 *   PGPASSWORD=... PGHOST=db.<ref>.supabase.co node db/carregar-lojas.mjs
 *
 * As credenciais vem do ambiente de proposito: este arquivo vai para
 * o git. Dependencia: `pg` (npm i -D pg).
 */

import pg from "pg";
import { readFile } from "node:fs/promises";

const ARQUIVO = new URL("./lojas.json", import.meta.url);

const CATEGORIAS = ["replicas", "upgrade", "vestuario", "consumivel", "acessorio"];

/**
 * Publica loja com confianca alta ou media.
 *
 * A regra e mais frouxa que a de `campos` de proposito: campo errado
 * manda o jogador dirigir 80 km para um portao fechado; loja online
 * errada custa um clique. O que separa alta de media aqui e ter ou
 * nao CNPJ conferido na Receita — e isso aparece na ficha.
 */
function statusPublicacao(loja) {
  return loja.confianca === "baixa" ? "rascunho" : "publicado";
}

function validar(loja, indice) {
  const erro = (msg) => {
    throw new Error(`lojas.json[${indice}] (${loja.id ?? "sem id"}): ${msg}`);
  };

  if (!loja.id || !/^[a-z0-9-]+$/.test(loja.id)) erro("id ausente ou fora do padrao de slug");
  if (!loja.nome) erro("nome ausente");
  if (!["fisica", "online", "ambas"].includes(loja.tipo)) erro(`tipo invalido: ${loja.tipo}`);
  if (!Array.isArray(loja.categorias) || loja.categorias.length === 0) erro("sem categoria");

  const forasteiras = loja.categorias.filter((c) => !CATEGORIAS.includes(c));
  if (forasteiras.length) erro(`categoria fora do vocabulario: ${forasteiras.join(", ")}`);

  // Espelha a constraint do banco — falhar aqui da mensagem melhor.
  if (loja.tipo !== "online" && !(loja.uf && loja.cidade && loja.cidade_slug)) {
    erro("loja com atendimento presencial precisa de uf, cidade e cidade_slug");
  }
  if (loja.uf && !/^[A-Z]{2}$/.test(loja.uf)) erro(`uf invalida: ${loja.uf}`);
}

const COLUNAS = [
  "id", "nome", "razao_social", "cnpj", "situacao_cadastral", "descricao", "tipo", "status",
  "uf", "cidade", "cidade_slug", "bairro", "endereco", "cep",
  "categorias", "marcas", "faz_manutencao", "faz_customizacao",
  "entrega_nacional", "formas_pagamento", "desconto_avista", "cupom", "horario",
  "contato", "observacoes", "confianca", "verificado", "fonte",
];

const lojas = JSON.parse(await readFile(ARQUIVO, "utf8"));
lojas.forEach(validar);

const ids = new Set();
for (const l of lojas) {
  if (ids.has(l.id)) throw new Error(`id duplicado em lojas.json: ${l.id}`);
  ids.add(l.id);
}

const registros = lojas.map((l) => ({
  ...l,
  status: statusPublicacao(l),
  marcas: l.marcas ?? [],
  faz_manutencao: Boolean(l.faz_manutencao),
  faz_customizacao: Boolean(l.faz_customizacao),
  // `verificado` so vira true depois de falar com o lojista. Coletar
  // do site oficial nao e verificar com o dono.
  verificado: false,
  // Contato so guarda o que existe: null no jsonb vira campo vazio na
  // ficha e link quebrado no HTML.
  contato: Object.fromEntries(
    Object.entries(l.contato ?? {}).filter(([, v]) => v != null && String(v).trim() !== ""),
  ),
}));

console.log(`lojas.json: ${registros.length} lojas`);

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
const SQL = `insert into public.lojas (${COLUNAS.join(",")})
  values (${COLUNAS.map((_, i) => `$${i + 1}`).join(",")})
  on conflict (id) do update set ${atualizaveis.map((c) => `${c}=excluded.${c}`).join(", ")}
  returning (xmax = 0) as inserido`;

let inseridos = 0, atualizados = 0;
try {
  // Tudo ou nada: meia carga e pior que nenhuma.
  await cliente.query("begin");
  for (const r of registros) {
    const vals = COLUNAS.map((c) => {
      if (c === "contato") return JSON.stringify(r[c] ?? {});
      return r[c] ?? null;
    });
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
