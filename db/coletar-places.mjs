/**
 * Verifica na Google Places API (New) os campos que ja estao no banco,
 * gravando o resultado bruto em public.campos_bruto.
 *
 * NADA aqui escreve em public.campos. Este script so enche a mesa de
 * trabalho; quem move para a tabela do site e db/conciliar-places.mjs.
 *
 * ---------------------------------------------------------------
 * POR QUE SO VERIFICA, E NAO DESCOBRE
 *
 * A descoberta e feita por busca aberta (grátis) — mesmo metodo das
 * lojas. A Places entra so no que a busca aberta NAO resolve:
 *
 *   - o lugar ainda existe? (businessStatus)
 *   - onde fica exatamente? (lat/lng)
 *   - telefone e site de agora, nao de 2022
 *   - nota real do Google, nao a copia velha de agregador
 *
 * Um teste em 4 rascunhos do RS (23/08/2026) confirmou o problema:
 * busca aberta achou 0 de 4 — ela encontra PAGINAS SOBRE o campo, nao
 * o ESTADO ATUAL dele.
 *
 * Existia aqui um modo `varrer`, que fazia grade sobre a UF para
 * descobrir campos novos. Saiu: custava ~108 chamadas por estado,
 * trazia loja, restaurante e academia junto, e a busca aberta faz a
 * mesma descoberta de graca. Esta no historico do git se precisar.
 *
 * CUSTO: 1 chamada por campo sem place_id. O Brasil inteiro com ~800
 * campos cabe na franquia gratuita de 5.000/mes do SKU Pro.
 * ---------------------------------------------------------------
 *
 * Uso (a chave sai do .env; nunca da linha de comando, que fica no
 * historico do shell):
 *   node --env-file=.env db/coletar-places.mjs --lote=rs-2026-08 --uf=RS --seco
 *   node --env-file=.env db/coletar-places.mjs --lote=rs-2026-08 --uf=RS
 *
 * O .env precisa de GOOGLE_MAPS_API_KEY, PGHOST e PGPASSWORD.
 * Precisa ser CHAVE DE API (formato AIza...), nao OAuth client:
 * a Places aceita OAuth, mas por conta de servico, nao por client
 * ID de aplicativo web.
 *
 * Flags:
 *   --lote=rs-...  obrigatoria; etiqueta do lote, entra no staging
 *   --uf=RS        opcional; sem ela, verifica todos os estados
 *   --max=250      teto de chamadas. Trava de custo: para ao atingir
 *   --refazer      inclui campos que JA tem place_id (revisita anual)
 *   --completo     pede telefone e horario (SKU Enterprise, ver abaixo)
 *   --seco         nao chama a API nem grava: so lista o que faria
 *
 * SKU (conferido na pagina de precos do Google em 23/08/2026):
 *   - Padrao daqui   = Pro:        US$ 32/1.000, 5.000 gratis/mes
 *   - Com --completo = Enterprise: US$ 35/1.000, 1.000 gratis/mes
 *   O FieldMask decide o SKU e a conta e a do campo mais caro pedido.
 *   Telefone e horario sao opt-in porque derrubam a franquia para 1/5.
 *
 * Dependencia: `pg` (npm i -D pg).
 */

import pg from "pg";
import { configPg } from "./lib-campos.mjs";

/* ---------------------------------------------------------- args */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [chave, valor] = a.replace(/^--/, "").split("=");
    return [chave, valor ?? true];
  }),
);

const LOTE = String(args.lote ?? "");
const UF = args.uf ? String(args.uf).toUpperCase() : null;
const MAX = Number(args.max ?? 250);
const REFAZER = Boolean(args.refazer);
const COMPLETO = Boolean(args.completo);
const SECO = Boolean(args.seco);

if (!LOTE) {
  console.error("erro: --lote=rs-2026-08 e obrigatoria\n");
  console.error("veja o cabecalho de db/coletar-places.mjs para o uso completo");
  process.exit(1);
}
if (UF && !/^[A-Z]{2}$/.test(UF)) {
  console.error(`erro: --uf=${UF} nao e sigla de estado`);
  process.exit(1);
}

/* -------------------------------------------------------- places */

const CHAVE = process.env.GOOGLE_MAPS_API_KEY;
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

/** Campos do SKU Pro. Mexer aqui muda a conta — ver o bloco SKU. */
const CAMPOS_PRO = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.addressComponents",
  "places.businessStatus",
  "places.types",
  "places.websiteUri",
  "places.rating",
];

/** SKU Enterprise. So entram com --completo. */
const CAMPOS_ENTERPRISE = [
  "places.userRatingCount",
  "places.nationalPhoneNumber",
  "places.regularOpeningHours",
];

const FIELD_MASK = [
  ...CAMPOS_PRO,
  ...(COMPLETO ? CAMPOS_ENTERPRISE : []),
].join(",");

let chamadas = 0;

async function buscar(consulta) {
  chamadas++;
  const resposta = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": CHAVE,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: consulta,
      languageCode: "pt-BR",
      regionCode: "BR",
      // Verificacao e pergunta fechada: "este lugar existe?". Cinco
      // resultados bastam para achar o certo ou concluir que nao ha.
      pageSize: 5,
    }),
  });

  if (!resposta.ok) {
    const texto = await resposta.text();
    // 403 e 429 costumam ser faturamento desligado ou cota estourada:
    // parar cedo e melhor do que queimar o resto contra um erro fixo.
    throw new Error(`Places respondeu ${resposta.status}: ${texto.slice(0, 300)}`);
  }
  return resposta.json();
}

/* --------------------------------------------------- normalizacao */

/** A UF sai de addressComponents; o texto do endereco nao e confiavel. */
function ufDe(place) {
  const c = place.addressComponents ?? [];
  const estado = c.find((x) => (x.types ?? []).includes("administrative_area_level_1"));
  return (estado?.shortText ?? "").toUpperCase().slice(0, 2) || null;
}

function cidadeDe(place) {
  const c = place.addressComponents ?? [];
  const municipio =
    c.find((x) => (x.types ?? []).includes("administrative_area_level_2")) ??
    c.find((x) => (x.types ?? []).includes("locality"));
  return municipio?.longText ?? null;
}

function normalizar(place, consulta) {
  return {
    place_id: place.id,
    lote: LOTE,
    consulta,
    nome: place.displayName?.text ?? "(sem nome)",
    endereco: place.formattedAddress ?? null,
    uf: ufDe(place),
    cidade: cidadeDe(place),
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    telefone: place.nationalPhoneNumber ?? null,
    site: place.websiteUri ?? null,
    google_nota: place.rating ?? null,
    google_avaliacoes: place.userRatingCount ?? null,
    place_status: place.businessStatus ?? null,
    tipos: place.types ?? [],
    bruto: place,
  };
}

/* ----------------------------------------------------------- banco */

const COLUNAS = [
  "place_id", "lote", "consulta", "nome", "endereco", "uf", "cidade",
  "lat", "lng", "telefone", "site", "google_nota", "google_avaliacoes",
  "place_status", "tipos", "bruto",
];

/** `lote` fica de fora do update: quem viu primeiro leva o credito. */
const SQL_UPSERT = `insert into public.campos_bruto (${COLUNAS.join(",")}, destino)
  values (${COLUNAS.map((_, i) => `$${i + 1}`).join(",")}, 'pendente')
  on conflict (place_id) do update set
    ${COLUNAS.filter((c) => c !== "place_id" && c !== "lote")
      .map((c) => `${c}=excluded.${c}`)
      .join(", ")},
    coletado_em = now()
  returning (xmax = 0) as novo`;

/* ------------------------------------------------------------ main */

if (!SECO && !CHAVE) {
  console.error("erro: GOOGLE_MAPS_API_KEY nao esta no ambiente (ou use --seco)");
  process.exit(1);
}

const cliente = new pg.Client(configPg());
await cliente.connect();

const { rows: alvos } = await cliente.query(
  `select id, nome, cidade, uf from public.campos
    where ($1::text is null or uf = $1)
      and ($2::bool or place_id is null)
      and status <> 'inativo'
    order by uf, cidade, nome`,
  [UF, REFAZER],
);

const previstas = Math.min(alvos.length, MAX);
const precoMil = COMPLETO ? 35 : 32;

console.log(
  `lote ${LOTE} · ${UF ?? "todos os estados"} · ${alvos.length} campos a verificar · ` +
    `${previstas} dentro do teto de ${MAX}`,
);
console.log(
  `SKU ${COMPLETO ? "Enterprise" : "Pro"} · custo maximo se nada for gratuito: ` +
    `US$ ${((previstas * precoMil) / 1000).toFixed(2)} ` +
    `(franquia: ${COMPLETO ? "1.000" : "5.000"} chamadas/mes)`,
);

if (SECO) {
  console.log("\n--seco: nenhuma chamada feita, nada gravado. Amostra:");
  for (const a of alvos.slice(0, 5)) {
    console.log(`  "${a.nome}, ${a.cidade}, ${a.uf}, Brasil"`);
  }
  if (alvos.length > 5) console.log(`  ... +${alvos.length - 5}`);
  await cliente.end();
  process.exit(0);
}

let novos = 0, revistos = 0, semResultado = 0, foraDaUf = 0;

try {
  for (const alvo of alvos) {
    if (chamadas >= MAX) {
      console.log(`\nteto de ${MAX} chamadas atingido — parando aqui.`);
      break;
    }

    const consulta = `${alvo.nome}, ${alvo.cidade}, ${alvo.uf}, Brasil`;
    const places = (await buscar(consulta)).places ?? [];

    if (places.length === 0) {
      semResultado++;
      console.log(`  sem resultado: ${alvo.id}`);
    }

    // A Places completa com o que existe fora da area quando nao acha
    // o que foi pedido. Resultado de outro estado nao serve.
    const daUf = places.filter((p) => ufDe(p) === alvo.uf);
    foraDaUf += places.length - daUf.length;

    for (const place of daUf) {
      const valores = COLUNAS.map((c) => {
        const r = normalizar(place, consulta);
        return c === "bruto" ? JSON.stringify(r[c]) : r[c];
      });
      const res = await cliente.query(SQL_UPSERT, valores);
      res.rows[0].novo ? novos++ : revistos++;
    }

    // Folga entre chamadas: a Places nao publica limite por segundo,
    // mas rajada de centenas de POST costuma virar 429.
    await new Promise((r) => setTimeout(r, 200));
  }
} catch (e) {
  console.error(`\nPAROU em ${chamadas} chamadas —`, e.message);
  await cliente.end();
  process.exit(1);
}

console.log(
  `\nchamadas: ${chamadas} · novos no staging: ${novos} · atualizados: ${revistos} · ` +
    `sem resultado: ${semResultado} · descartados por UF: ${foraDaUf}`,
);
console.log(
  `custo bruto: US$ ${((chamadas * precoMil) / 1000).toFixed(2)} — zero se dentro da franquia`,
);
console.log(`\nproximo passo: node db/conciliar-places.mjs --lote=${LOTE}`);

await cliente.end();
