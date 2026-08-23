/**
 * Leva o staging (public.campos_bruto) para public.campos.
 *
 * Por padrao NAO grava nada: imprime o relatorio do que faria. Escrever
 * exige --aplicar. Coleta automatica que escreve sozinha na tabela do
 * site e como deixar a torneira aberta.
 *
 * Regras que valem a pena saber antes de rodar:
 *
 *  - Nada entra publicado. Todo campo novo nasce 'rascunho' com
 *    confianca 'media'. Publicar continua sendo decisao humana, porque
 *    a Places sabe que o lugar existe, nao que ele opera airsoft.
 *  - Em campo que ja existe, so preenche buraco. Telefone, site e
 *    endereco que ja estavam la nao sao sobrescritos — foram conferidos
 *    a mao e valem mais que o palpite do Google.
 *  - google_nota, google_avaliacoes e place_status SEMPRE atualizam:
 *    esses sao dados do proprio Google, e a versao nova e a boa.
 *  - CLOSED_PERMANENTLY vira status 'inativo' na hora. Campo fechado
 *    exibido como aberto e o risco numero 1 do documento (§9).
 *  - O id nunca e reaproveitado entre cidades. Ver `idLivre()`.
 *
 * Uso:
 *   PGHOST=... PGPASSWORD=... node db/conciliar-places.mjs --lote=rs-2026-08
 *   PGHOST=... PGPASSWORD=... node db/conciliar-places.mjs --lote=rs-2026-08 --aplicar
 *
 * Dependencia: `pg` (npm i -D pg).
 */

import pg from "pg";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [c, v] = a.replace(/^--/, "").split("=");
    return [c, v ?? true];
  }),
);

const LOTE = String(args.lote ?? "");
const APLICAR = Boolean(args.aplicar);
if (!LOTE) {
  console.error("erro: --lote=rs-2026-08 e obrigatoria");
  process.exit(1);
}

/* -------------------------------------------------- normalizacao */

const slug = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Nome comparavel: sem acento, sem pontuacao, sem ruido de sufixo. */
const chaveNome = (s) =>
  slug(s)
    .replace(/-(ltda|me|epp|oficial|brasil)$/g, "")
    .replace(/-/g, " ")
    .trim();

function modalidadeDe(nome, consulta) {
  const t = `${nome} ${consulta}`.toLowerCase();
  const temPaintball = /paintball/.test(t);
  const temAirsoft = /airsoft/.test(t);
  if (temPaintball && temAirsoft) return "ambos";
  if (temPaintball) return "paintball";
  return "airsoft";
}

/**
 * Ruido previsivel da varredura: loja, clube de tiro, loja de esporte.
 * Nao descarta — so marca, porque a linha entre "loja com campo" e
 * "campo com loja" e real e quem decide e gente.
 */
const TIPOS_SUSPEITOS = [
  "store", "clothing_store", "sporting_goods_store", "shopping_mall",
  "restaurant", "lodging", "gym",
];

/* ------------------------------------------------------------ banco */

const cliente = new pg.Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? "postgres",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE ?? "postgres",
  ssl: { rejectUnauthorized: false },
});
await cliente.connect();

const { rows: brutos } = await cliente.query(
  `select * from public.campos_bruto
    where lote = $1 and (destino is null or destino = 'pendente')
    order by uf, cidade, nome`,
  [LOTE],
);

const { rows: existentes } = await cliente.query(
  "select id, nome, uf, cidade, cidade_slug, place_id, endereco, contato, status from public.campos",
);

if (brutos.length === 0) {
  console.log(`lote ${LOTE}: nada pendente no staging.`);
  await cliente.end();
  process.exit(0);
}

/* Indices de busca montados uma vez. */
const porPlaceId = new Map(existentes.filter((c) => c.place_id).map((c) => [c.place_id, c]));
const porNomeLocal = new Map(
  existentes.map((c) => [`${c.uf}|${slug(c.cidade)}|${chaveNome(c.nome)}`, c]),
);
const idsUsados = new Set(existentes.map((c) => c.id));

/**
 * O id vira URL e nunca muda depois de publicado (PLANO-DE-ACAO §3).
 * O gerador antigo usava so o slug do nome, o que fazia "Arena Airsoft"
 * de SP sobrescrever "Arena Airsoft" do RS no upsert. Aqui o nome so e
 * usado puro se estiver livre; senao entra cidade, depois UF.
 */
function idLivre(nome, cidade, uf) {
  const base = slug(nome);
  const candidatos = [base, `${base}-${slug(cidade)}`, `${base}-${slug(uf)}`];
  for (const c of candidatos) if (c && !idsUsados.has(c)) return c;
  let n = 2;
  while (idsUsados.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/* --------------------------------------------------------- decisao */

const plano = { novos: [], atualizados: [], fechados: [], suspeitos: 0 };

for (const b of brutos) {
  const existente =
    (b.place_id && porPlaceId.get(b.place_id)) ||
    porNomeLocal.get(`${b.uf}|${slug(b.cidade)}|${chaveNome(b.nome)}`) ||
    null;

  const suspeito = (b.tipos ?? []).some((t) => TIPOS_SUSPEITOS.includes(t));
  if (suspeito) plano.suspeitos++;

  if (existente) {
    const fechou = b.place_status === "CLOSED_PERMANENTLY";
    if (fechou) plano.fechados.push({ bruto: b, campo: existente });
    else plano.atualizados.push({ bruto: b, campo: existente });
    continue;
  }

  // Campo fechado que nem existe no diretorio nao precisa nascer.
  if (b.place_status === "CLOSED_PERMANENTLY") {
    plano.novos.push({ bruto: b, id: null, ignorar: "fechado permanentemente" });
    continue;
  }

  const id = idLivre(b.nome, b.cidade ?? "", b.uf ?? "");
  idsUsados.add(id);
  plano.novos.push({ bruto: b, id, suspeito });
}

/* ------------------------------------------------------- relatorio */

const aIgnorar = plano.novos.filter((n) => n.ignorar);
const aInserir = plano.novos.filter((n) => !n.ignorar);

console.log(`lote ${LOTE} · ${brutos.length} pendentes no staging\n`);
console.log(`  novos a inserir (rascunho): ${aInserir.length}`);
console.log(`  ja existentes, a completar: ${plano.atualizados.length}`);
console.log(`  marcados como fechados:     ${plano.fechados.length}`);
console.log(`  descartados (fechados e desconhecidos): ${aIgnorar.length}`);
console.log(`  com tipo suspeito (loja, restaurante, academia): ${plano.suspeitos}\n`);

for (const f of plano.fechados) {
  console.log(`  FECHOU  ${f.campo.id} — ${f.campo.nome} (${f.campo.cidade})`);
}
for (const n of aInserir.slice(0, 15)) {
  console.log(
    `  NOVO    ${n.id} — ${n.bruto.nome} (${n.bruto.cidade}/${n.bruto.uf})` +
      (n.suspeito ? "  [tipo suspeito]" : ""),
  );
}
if (aInserir.length > 15) console.log(`  ... +${aInserir.length - 15} novos`);

if (!APLICAR) {
  console.log("\nnada gravado. Rode de novo com --aplicar para escrever.");
  await cliente.end();
  process.exit(0);
}

/* --------------------------------------------------------- escrita */

let inseridos = 0, completados = 0, inativados = 0;

try {
  await cliente.query("begin");

  for (const { bruto: b, campo } of plano.atualizados) {
    // coalesce: so preenche o que esta vazio. O que foi conferido a mao fica.
    await cliente.query(
      `update public.campos set
         place_id = coalesce(place_id, $2),
         place_status = $3,
         place_visto_em = current_date,
         lat = coalesce(lat, $4),
         lng = coalesce(lng, $5),
         endereco = coalesce(endereco, $6),
         google_nota = coalesce($7, google_nota),
         google_avaliacoes = coalesce($8, google_avaliacoes),
         contato = contato
           || case when $9::text is not null and not (contato ? 'telefone')
                then jsonb_build_object('telefone', $9::text) else '{}'::jsonb end
           || case when $10::text is not null and not (contato ? 'site')
                then jsonb_build_object('site', $10::text) else '{}'::jsonb end
       where id = $1`,
      [
        campo.id, b.place_id, b.place_status, b.lat, b.lng, b.endereco,
        b.google_nota, b.google_avaliacoes, b.telefone, b.site,
      ],
    );
    await cliente.query(
      "update public.campos_bruto set destino='atualizado', campo_id=$2 where place_id=$1",
      [b.place_id, campo.id],
    );
    completados++;
  }

  for (const { bruto: b, campo } of plano.fechados) {
    await cliente.query(
      `update public.campos set
         status = 'inativo',
         status_original = coalesce(status_original, '') || ' | Google: fechado permanentemente',
         place_id = coalesce(place_id, $2),
         place_status = $3,
         place_visto_em = current_date
       where id = $1`,
      [campo.id, b.place_id, b.place_status],
    );
    await cliente.query(
      "update public.campos_bruto set destino='atualizado', campo_id=$2, motivo='fechado' where place_id=$1",
      [b.place_id, campo.id],
    );
    inativados++;
  }

  for (const { bruto: b, id, suspeito } of aInserir) {
    const contato = {};
    if (b.telefone) contato.telefone = b.telefone.replace(/\D/g, "");
    if (b.site) contato.site = b.site;

    await cliente.query(
      `insert into public.campos
         (id, nome, modalidade, status, uf, cidade, cidade_slug, endereco,
          lat, lng, contato, google_nota, google_avaliacoes, observacoes,
          confianca, verificado, fonte, place_id, place_status, place_visto_em)
       values ($1,$2,$3,'rascunho',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'media',false,$14,$15,$16,current_date)
       on conflict (id) do nothing`,
      [
        id, b.nome, modalidadeDe(b.nome, b.consulta), b.uf, b.cidade,
        slug(b.cidade ?? ""), b.endereco, b.lat, b.lng, JSON.stringify(contato),
        b.google_nota, b.google_avaliacoes,
        "", // descricao entra na revisao humana
        `google-places | ${b.consulta}`,
        b.place_id, b.place_status,
      ],
    );
    await cliente.query(
      "update public.campos_bruto set destino='novo', campo_id=$2, motivo=$3 where place_id=$1",
      [b.place_id, id, suspeito ? "tipo suspeito, revisar" : null],
    );
    inseridos++;
  }

  for (const { bruto: b, ignorar } of aIgnorar) {
    await cliente.query(
      "update public.campos_bruto set destino='ignorado', motivo=$2 where place_id=$1",
      [b.place_id, ignorar],
    );
  }

  await cliente.query("commit");
} catch (e) {
  await cliente.query("rollback");
  console.error("ROLLBACK —", e.message);
  await cliente.end();
  process.exit(1);
}

console.log(
  `\ninseridos (rascunho): ${inseridos} · completados: ${completados} · ` +
    `inativados: ${inativados}`,
);
console.log("revisao: filtre status='rascunho' no painel do Supabase.");
await cliente.end();
