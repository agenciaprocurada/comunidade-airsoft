/**
 * Carrega db/armeiros.json para public.armeiros.
 *
 * Idempotente: a chave e o `id` (slug que entra na URL), entao rodar
 * de novo atualiza o registro em vez de duplicar. O slug nunca muda
 * depois de publicado — ver PLANO-DE-ACAO.md §3.
 *
 * Este script e a via da CURADORIA: cadastro que voce mesmo levantou,
 * conferiu por telefone ou recebeu por indicacao. O caminho do proprio
 * armeiro e /armeiros/cadastrar, que grava rascunho direto do site.
 *
 * Uso:
 *   PGPASSWORD=... PGHOST=db.<ref>.supabase.co node db/carregar-armeiros.mjs
 *
 * As credenciais vem do ambiente de proposito: este arquivo vai para
 * o git. Dependencia: `pg` (npm i -D pg).
 */

import pg from "pg";
import { readFile } from "node:fs/promises";

const ARQUIVO = new URL("./armeiros.json", import.meta.url);

const PLATAFORMAS = ["aeg", "aep", "gbb", "gbbr", "hpa", "spring", "ptw"];

const GEARBOXES = ["v2", "v3", "v6", "v7"];

const SERVICOS = [
  "manutencao", "reparo", "upgrade", "shimming", "aoe",
  "hop-up", "eletronica", "solda", "customizacao", "pintura",
];

const TIPOS = ["autonomo", "oficina", "loja"];

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
  "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

/**
 * Slugs que a rota /armeiros/[slug] ja usa para outra coisa. Espelha
 * SLUGS_RESERVADOS de src/lib/armeiro.ts. Um armeiro com slug "sp"
 * nao daria erro: ele simplesmente ficaria inacessivel, escondido
 * atras do hub estadual — falha silenciosa, a pior categoria.
 */
const RESERVADOS = new Set([
  "cadastrar",
  "indicar",
  ...UFS.map((uf) => uf.toLowerCase()),
]);

/**
 * Publica com confianca alta ou media; baixa fica em rascunho.
 *
 * A regra e mais APERTADA que a de `lojas`, e de proposito. Loja errada
 * custa um clique. Armeiro errado custa a rede de um equipamento de
 * milhares de reais na mao de alguem que talvez nem exista. Aqui
 * "alta" quer dizer: falamos com a pessoa.
 *
 * `status` explicito no JSON tem precedencia sobre essa regra.
 *
 * Existe para nao forcar a mentira do caminho contrario: para publicar
 * o levantamento inicial sem esta chave seria preciso escrever
 * `confianca: "media"` em 47 registros que continuam sendo confianca
 * BAIXA — ninguem falou com essas pessoas ainda. Assim a confianca
 * segue dizendo a verdade sobre o dado, e o status diz a decisao de
 * quem publicou.
 */
function statusPublicacao(armeiro) {
  if (armeiro.status) return armeiro.status;
  return armeiro.confianca === "baixa" ? "rascunho" : "publicado";
}

function validar(armeiro, indice) {
  const erro = (msg) => {
    throw new Error(`armeiros.json[${indice}] (${armeiro.id ?? "sem id"}): ${msg}`);
  };

  if (!armeiro.id || !/^[a-z0-9-]+$/.test(armeiro.id)) {
    erro("id ausente ou fora do padrao de slug");
  }
  if (RESERVADOS.has(armeiro.id)) {
    erro(`id reservado pela rota /armeiros/[slug]: ${armeiro.id}`);
  }
  if (armeiro.id.length < 3) erro("id curto demais: colide com sigla de UF");
  if (!armeiro.nome) erro("nome ausente");
  if (!TIPOS.includes(armeiro.tipo)) erro(`tipo invalido: ${armeiro.tipo}`);

  if (!UFS.includes(armeiro.uf)) erro(`uf invalida: ${armeiro.uf}`);
  if (!armeiro.cidade || !armeiro.cidade_slug) erro("cidade e cidade_slug sao obrigatorias");

  // Espelham as constraints do banco — falhar aqui da mensagem melhor.
  if (!armeiro.atende_presencial && !armeiro.atende_envio) {
    erro("precisa atender presencialmente, por envio, ou os dois");
  }
  if (armeiro.endereco_publico && !armeiro.endereco) {
    erro("endereco_publico sem endereco");
  }
  if (armeiro.endereco_publico && !armeiro.atende_presencial) {
    erro("endereco_publico sem atendimento presencial");
  }

  const plataformas = armeiro.plataformas ?? [];
  const plataformasForasteiras = plataformas.filter((p) => !PLATAFORMAS.includes(p));
  if (plataformasForasteiras.length) {
    erro(`plataforma fora do vocabulario: ${plataformasForasteiras.join(", ")}`);
  }

  const gearboxes = armeiro.gearboxes ?? [];
  const gearboxesForasteiras = gearboxes.filter((g) => !GEARBOXES.includes(g));
  if (gearboxesForasteiras.length) {
    erro(`gearbox fora do vocabulario: ${gearboxesForasteiras.join(", ")}`);
  }

  const servicos = armeiro.servicos ?? [];
  const servicosForasteiros = servicos.filter((s) => !SERVICOS.includes(s));
  if (servicosForasteiros.length) {
    erro(`servico fora do vocabulario: ${servicosForasteiros.join(", ")}`);
  }

  if (armeiro.status && !["rascunho", "publicado", "inativo"].includes(armeiro.status)) {
    erro(`status invalido: ${armeiro.status}`);
  }

  // Gearbox versionada so existe em AEG — espelha a constraint.
  if (gearboxes.length && !plataformas.includes("aeg")) {
    erro("gearbox declarada sem a plataforma 'aeg'");
  }

  // NAO ha checagem de completude para publicar. Ela existiu ate
  // 25/08/2026 e saiu junto com as constraints do banco — ver o
  // comentario longo em db/schema-armeiros.sql.

  if (armeiro.verificado && !armeiro.verificado_em) {
    erro("verificado sem verificado_em");
  }
}

const COLUNAS = [
  "id", "nome", "descricao", "tipo", "status",
  "uf", "cidade", "cidade_slug", "bairro", "endereco", "cep", "lat", "lng",
  "endereco_publico",
  "atende_presencial", "atende_envio", "raio_atendimento",
  "plataformas", "gearboxes", "servicos", "marcas",
  "prazo_medio", "garantia", "emite_nota", "precos", "formas_pagamento", "horario",
  "desde", "formacao", "loja_id",
  "razao_social", "cnpj", "situacao_cadastral",
  "contato", "observacoes", "confianca", "verificado", "verificado_em", "fonte",
];

/** Colunas que sao array de texto no banco. */
const ARRAYS = new Set(["plataformas", "gearboxes", "servicos", "marcas"]);

const armeiros = JSON.parse(await readFile(ARQUIVO, "utf8"));
armeiros.forEach(validar);

const ids = new Set();
for (const a of armeiros) {
  if (ids.has(a.id)) throw new Error(`id duplicado em armeiros.json: ${a.id}`);
  ids.add(a.id);
}

if (armeiros.length === 0) {
  console.log("armeiros.json esta vazio — nada a carregar.");
  process.exit(0);
}

const cliente = new pg.Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? "postgres",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE ?? "postgres",
  ssl: { rejectUnauthorized: false },
});

await cliente.connect();

const atualizaveis = COLUNAS.filter((c) => c !== "id")
  .map((c) => `${c} = excluded.${c}`)
  .join(",\n    ");

let inseridos = 0;

try {
  for (const armeiro of armeiros) {
    const valores = COLUNAS.map((coluna) => {
      if (coluna === "status") return statusPublicacao(armeiro);
      const valor = armeiro[coluna];
      if (valor === undefined) return ARRAYS.has(coluna) ? [] : null;
      if (coluna === "contato") return JSON.stringify(valor ?? {});
      return valor;
    });

    const marcadores = COLUNAS.map((_, i) => `$${i + 1}`).join(", ");

    await cliente.query(
      `insert into public.armeiros (${COLUNAS.join(", ")})
       values (${marcadores})
       on conflict (id) do update set
    ${atualizaveis}`,
      valores,
    );

    inseridos++;
  }

  console.log(`${inseridos} armeiro(s) carregado(s).`);
} finally {
  await cliente.end();
}
