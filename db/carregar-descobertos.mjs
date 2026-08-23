/**
 * Carrega db/campos-descobertos.json para public.campos.
 *
 * Este e o lado GRATIS do pipeline hibrido: campos achados por busca
 * aberta (portais regionais, blogs, Instagram, grupos), no mesmo metodo
 * usado nas 20 lojas. A verificacao vem depois, pela Places
 * (db/coletar-places.mjs), que e quem sabe dizer se o lugar fechou.
 *
 * Regras:
 *  - Tudo entra como 'rascunho'. Busca aberta acha PAGINA SOBRE o campo,
 *    nao prova que ele opera. Publicar continua sendo decisao humana.
 *  - O id nunca colide entre cidades: usa idLivre() de lib-campos.mjs.
 *  - Idempotente: rodar de novo atualiza pelo id, nao duplica. Registro
 *    que ja passou por revisao humana NAO e sobrescrito (ver ABAIXO).
 *
 * IMPORTANTE — o que este script nao toca:
 * campo com verificado=true ou confianca='alta' e pulado. Sao os que
 * alguem ja conferiu; deixar um JSON de coleta reescrever por cima
 * apagaria trabalho humano.
 *
 * Uso:
 *   PGHOST=... PGPASSWORD=... node db/carregar-descobertos.mjs
 *   PGHOST=... PGPASSWORD=... node db/carregar-descobertos.mjs --aplicar
 *
 * Dependencia: `pg` (npm i -D pg).
 */

import pg from "pg";
import { readFile } from "node:fs/promises";
import {
  slug, chaveNome, idLivre, modalidadeDe, terrenoDe,
  telefoneLimpo, urlLimpa, configPg,
} from "./lib-campos.mjs";

const ARQUIVO = new URL("./campos-descobertos.json", import.meta.url);
const APLICAR = process.argv.includes("--aplicar");

const UFS = new Set([
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB",
  "PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
]);

/* ------------------------------------------------------- validacao */

function validar(campo, i) {
  const erro = (m) => {
    throw new Error(`campos-descobertos.json[${i}] (${campo.nome ?? "sem nome"}): ${m}`);
  };
  if (!campo.nome) erro("nome ausente");
  if (!UFS.has(campo.uf)) erro(`uf invalida: ${campo.uf}`);
  if (!campo.cidade) erro("cidade ausente");
  // Sem fonte nao da para auditar de onde veio o dado — e o que separa
  // diretorio de boato.
  if (!campo.fonte) erro("fonte ausente");
}

const descobertos = JSON.parse(await readFile(ARQUIVO, "utf8"));
descobertos.forEach(validar);

if (descobertos.length === 0) {
  console.log("campos-descobertos.json esta vazio — nada a fazer.");
  process.exit(0);
}

/* ----------------------------------------------------------- banco */

const cliente = new pg.Client(configPg());
await cliente.connect();

const { rows: existentes } = await cliente.query(
  `select id, nome, uf, cidade, cidade_slug, verificado, confianca, status
     from public.campos`,
);

const porNomeLocal = new Map(
  existentes.map((c) => [`${c.uf}|${slug(c.cidade)}|${chaveNome(c.nome)}`, c]),
);
const idsUsados = new Set(existentes.map((c) => c.id));

const plano = { novos: [], atualiza: [], protegidos: [] };

for (const d of descobertos) {
  const existente = porNomeLocal.get(`${d.uf}|${slug(d.cidade)}|${chaveNome(d.nome)}`);

  if (existente) {
    // Trabalho humano tem precedencia sobre coleta automatica.
    if (existente.verificado || existente.confianca === "alta") {
      plano.protegidos.push({ d, existente });
    } else {
      plano.atualiza.push({ d, existente });
    }
    continue;
  }

  const id = idLivre(d.nome, d.cidade, d.uf, idsUsados);
  idsUsados.add(id);
  plano.novos.push({ d, id });
}

console.log(`campos-descobertos.json: ${descobertos.length} registros\n`);
console.log(`  novos a inserir (rascunho):     ${plano.novos.length}`);
console.log(`  existentes a completar:         ${plano.atualiza.length}`);
console.log(`  pulados (revisados por humano): ${plano.protegidos.length}\n`);

for (const { d, id } of plano.novos.slice(0, 20)) {
  console.log(`  NOVO   ${id} — ${d.nome} (${d.cidade}/${d.uf})`);
}
if (plano.novos.length > 20) console.log(`  ... +${plano.novos.length - 20}`);
for (const { existente } of plano.protegidos) {
  console.log(`  PULA   ${existente.id} — ja revisado`);
}

if (!APLICAR) {
  console.log("\nnada gravado. Rode de novo com --aplicar para escrever.");
  await cliente.end();
  process.exit(0);
}

/* --------------------------------------------------------- escrita */

/** Só o que tem valor; null vira ausencia, nao string vazia. */
function contatoDe(d) {
  const c = {};
  const wa = telefoneLimpo(d.whatsapp);
  if (wa) c.whatsapp = wa;
  const tel = telefoneLimpo(d.telefone);
  if (tel) c.telefone = tel;
  if (d.instagram) c.instagram = d.instagram;
  const site = urlLimpa(d.site);
  if (site) c.site = site;
  const fb = urlLimpa(d.facebook);
  if (fb) c.facebook = fb;
  return c;
}

let inseridos = 0, completados = 0;

try {
  await cliente.query("begin");

  for (const { d, id } of plano.novos) {
    await cliente.query(
      `insert into public.campos
         (id, nome, modalidade, status, uf, cidade, cidade_slug, regiao, bairro,
          endereco, terreno, tipo_campo_original, precos, contato, observacoes,
          confianca, verificado, fonte)
       values ($1,$2,$3,'rascunho',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,false,$16)
       on conflict (id) do nothing`,
      [
        id,
        d.nome,
        d.modalidade ?? modalidadeDe(d.nome, d.tipo_campo, d.observacoes),
        d.uf,
        d.cidade,
        slug(d.cidade),
        d.regiao ?? null,
        d.bairro ?? null,
        d.endereco ?? null,
        d.terreno ?? terrenoDe(d.tipo_campo),
        d.tipo_campo ?? null,
        d.precos ?? null,
        JSON.stringify(contatoDe(d)),
        d.observacoes ?? "",
        // Busca aberta nao confirma operacao: o teto aqui e 'media'.
        d.confianca === "alta" ? "media" : (d.confianca ?? "baixa"),
        d.fonte,
      ],
    );
    inseridos++;
  }

  for (const { d, existente } of plano.atualiza) {
    // coalesce em tudo: preenche buraco, nunca sobrescreve.
    await cliente.query(
      `update public.campos set
         bairro = coalesce(bairro, $2),
         endereco = coalesce(endereco, $3),
         precos = coalesce(precos, $4),
         tipo_campo_original = coalesce(tipo_campo_original, $5),
         terreno = case when terreno = '{}' then $6::text[] else terreno end,
         observacoes = case when coalesce(observacoes,'') = '' then $7 else observacoes end,
         contato = $8::jsonb || contato,
         fonte = case when fonte is null then $9
                      when position($9 in fonte) > 0 then fonte
                      else fonte || ' | ' || $9 end
       where id = $1`,
      [
        existente.id,
        d.bairro ?? null,
        d.endereco ?? null,
        d.precos ?? null,
        d.tipo_campo ?? null,
        d.terreno ?? terrenoDe(d.tipo_campo),
        d.observacoes ?? "",
        JSON.stringify(contatoDe(d)),
        d.fonte,
      ],
    );
    completados++;
  }

  await cliente.query("commit");
} catch (e) {
  await cliente.query("rollback");
  console.error("ROLLBACK —", e.message);
  await cliente.end();
  process.exit(1);
}

console.log(`\ninseridos: ${inseridos} · completados: ${completados}`);
console.log("proximo passo: verificar na Places com db/coletar-places.mjs");
await cliente.end();
