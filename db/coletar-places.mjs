/**
 * Coleta campos na Google Places API (New) para a tabela de staging
 * public.campos_bruto.
 *
 * NADA aqui escreve em public.campos. Este script so enche a mesa de
 * trabalho; quem decide o que vira ficha e db/conciliar-places.mjs,
 * e a publicacao continua sendo decisao humana.
 *
 * Dois modos:
 *
 *   --modo=conciliar   Uma busca por campo JA cadastrado no estado.
 *                      Serve para achar o place_id, a coordenada e o
 *                      status atual ("fechou?") do que ja temos.
 *
 *   --modo=varrer      Grade retangular sobre a UF (caixa vinda da API
 *                      de malhas do IBGE) com locationRestriction.
 *                      Serve para DESCOBRIR o que ainda nao temos,
 *                      inclusive campo em zona rural, que nao aparece
 *                      em busca por nome de cidade.
 *
 * Uso:
 *   GOOGLE_MAPS_API_KEY=... PGHOST=... PGPASSWORD=... \
 *     node db/coletar-places.mjs --uf=RS --lote=rs-2026-08 --modo=conciliar
 *
 *   node db/coletar-places.mjs --uf=RS --lote=rs-2026-08 --modo=varrer --grade=6 --seco
 *
 * Flags:
 *   --uf=RS         obrigatoria
 *   --lote=rs-...   obrigatoria; etiqueta do lote, entra no staging
 *   --modo=         conciliar | varrer
 *   --grade=6       so no modo varrer: divide a UF em N x N celulas
 *   --max=250       teto de chamadas. Trava de custo: o script para ao atingir
 *   --completo      pede telefone e horario (SKU Enterprise, ver abaixo)
 *   --seco          nao chama a API nem grava: so lista o que faria e o custo
 *
 * CUSTO (conferido em 22/08/2026, confirmar antes de rodar lote grande):
 *   O FieldMask decide o SKU e a conta e sempre a do campo mais caro.
 *   - Padrao daqui  = SKU Pro:        US$ 32/1.000, 5.000 chamadas gratis/mes
 *   - Com --completo = SKU Enterprise: US$ 35/1.000, 1.000 chamadas gratis/mes
 *   Por isso telefone e horario sao opt-in: em varredura nacional eles
 *   derrubam a franquia gratuita de 5.000 para 1.000.
 *
 * Dependencia: `pg` (npm i -D pg).
 */

import pg from "pg";

/* ---------------------------------------------------------- args */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [chave, valor] = a.replace(/^--/, "").split("=");
    return [chave, valor ?? true];
  }),
);

const UF = String(args.uf ?? "").toUpperCase();
const LOTE = String(args.lote ?? "");
const MODO = String(args.modo ?? "conciliar");
const GRADE = Number(args.grade ?? 6);
const MAX = Number(args.max ?? 250);
const COMPLETO = Boolean(args.completo);
const SECO = Boolean(args.seco);

if (!/^[A-Z]{2}$/.test(UF)) erroDeUso("--uf=RS e obrigatoria");
if (!LOTE) erroDeUso("--lote=rs-2026-08 e obrigatoria");
if (!["conciliar", "varrer"].includes(MODO)) erroDeUso("--modo= conciliar | varrer");

function erroDeUso(msg) {
  console.error(`erro: ${msg}\n`);
  console.error("veja o cabecalho de db/coletar-places.mjs para o uso completo");
  process.exit(1);
}

/* -------------------------------------------------------- places */

const CHAVE = process.env.GOOGLE_MAPS_API_KEY;
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

/** Campos do SKU Pro. Mexer aqui muda a conta — ver o bloco CUSTO. */
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
  "nextPageToken",
  ...CAMPOS_PRO,
  ...(COMPLETO ? CAMPOS_ENTERPRISE : []),
].join(",");

/** Termos da varredura. Airsoft e paintball dividem campo no Brasil. */
const TERMOS = ["campo de airsoft", "arena de airsoft", "paintball"];

let chamadas = 0;

async function buscar(consulta, restricao) {
  if (chamadas >= MAX) return { esgotado: true, places: [] };
  chamadas++;

  const corpo = {
    textQuery: consulta,
    languageCode: "pt-BR",
    regionCode: "BR",
    pageSize: 20,
    ...(restricao ? { locationRestriction: { rectangle: restricao } } : {}),
  };

  const resposta = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": CHAVE,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(corpo),
  });

  if (!resposta.ok) {
    const texto = await resposta.text();
    // 429 e 403 costumam ser cota ou faturamento desligado: parar cedo
    // e melhor do que queimar o resto das chamadas contra um erro fixo.
    throw new Error(`Places respondeu ${resposta.status}: ${texto.slice(0, 300)}`);
  }

  return resposta.json();
}

/* --------------------------------------------------- normalizacao */

const semAcento = (s) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

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

/* --------------------------------------------------------- grade */

/** Caixa da UF pela API de malhas do IBGE — evita tabela de bbox chumbada. */
async function caixaDaUf(uf) {
  const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}`;
  const estado = await (await fetch(url)).json();
  const malha = await (
    await fetch(
      `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${estado.id}?formato=application/vnd.geo+json`,
    )
  ).json();

  let oeste = 180, sul = 90, leste = -180, norte = -90;
  const varrer = (a) => {
    if (typeof a[0] === "number") {
      oeste = Math.min(oeste, a[0]); leste = Math.max(leste, a[0]);
      sul = Math.min(sul, a[1]); norte = Math.max(norte, a[1]);
      return;
    }
    a.forEach(varrer);
  };
  malha.features.forEach((f) => varrer(f.geometry.coordinates));
  return { sul, oeste, norte, leste };
}

/** N x N retangulos no formato que a Places espera. */
function celulas(caixa, n) {
  const alturaCelula = (caixa.norte - caixa.sul) / n;
  const larguraCelula = (caixa.leste - caixa.oeste) / n;
  const lista = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      lista.push({
        low: {
          latitude: caixa.sul + i * alturaCelula,
          longitude: caixa.oeste + j * larguraCelula,
        },
        high: {
          latitude: caixa.sul + (i + 1) * alturaCelula,
          longitude: caixa.oeste + (j + 1) * larguraCelula,
        },
      });
    }
  }
  return lista;
}

/* ----------------------------------------------------------- banco */

function conectar() {
  return new pg.Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE ?? "postgres",
    ssl: { rejectUnauthorized: false },
  });
}

const COLUNAS = [
  "place_id", "lote", "consulta", "nome", "endereco", "uf", "cidade",
  "lat", "lng", "telefone", "site", "google_nota", "google_avaliacoes",
  "place_status", "tipos", "bruto",
];

/**
 * `lote` fica de fora do update: quem viu primeiro leva o credito.
 * `destino` idem — resultado ja conciliado nao volta para a fila.
 */
const SQL_UPSERT = `insert into public.campos_bruto (${COLUNAS.join(",")}, destino)
  values (${COLUNAS.map((_, i) => `$${i + 1}`).join(",")}, 'pendente')
  on conflict (place_id) do update set
    ${COLUNAS.filter((c) => c !== "place_id" && c !== "lote")
      .map((c) => `${c}=excluded.${c}`)
      .join(", ")},
    coletado_em = now()
  returning (xmax = 0) as novo`;

async function gravar(cliente, registros) {
  let novos = 0, revistos = 0;
  for (const r of registros) {
    const valores = COLUNAS.map((c) =>
      c === "bruto" ? JSON.stringify(r[c]) : r[c],
    );
    const res = await cliente.query(SQL_UPSERT, valores);
    res.rows[0].novo ? novos++ : revistos++;
  }
  return { novos, revistos };
}

/* ------------------------------------------------------------ main */

if (!SECO && !CHAVE) {
  erroDeUso("GOOGLE_MAPS_API_KEY nao esta no ambiente (ou use --seco)");
}

const cliente = SECO ? null : conectar();
if (cliente) await cliente.connect();

/** Monta a lista de buscas ANTES de chamar a API: o --seco imprime isto. */
let planoDeBusca = [];

if (MODO === "conciliar") {
  const leitor = cliente ?? conectar();
  if (!cliente) await leitor.connect();
  const { rows } = await leitor.query(
    "select id, nome, cidade from public.campos where uf = $1 and place_id is null order by nome",
    [UF],
  );
  if (!cliente) await leitor.end();

  planoDeBusca = rows.map((c) => ({
    consulta: `${c.nome}, ${c.cidade}, ${UF}, Brasil`,
    restricao: null,
    campo_id: c.id,
  }));
} else {
  const caixa = await caixaDaUf(UF);
  console.log(
    `caixa de ${UF}: sul ${caixa.sul.toFixed(3)} · oeste ${caixa.oeste.toFixed(3)} · ` +
      `norte ${caixa.norte.toFixed(3)} · leste ${caixa.leste.toFixed(3)}`,
  );
  for (const celula of celulas(caixa, GRADE)) {
    for (const termo of TERMOS) {
      planoDeBusca.push({ consulta: termo, restricao: celula, campo_id: null });
    }
  }
}

const previstas = Math.min(planoDeBusca.length, MAX);
const precoMil = COMPLETO ? 35 : 32;
console.log(
  `lote ${LOTE} · modo ${MODO} · ${planoDeBusca.length} buscas planejadas · ` +
    `${previstas} dentro do teto de ${MAX}`,
);
console.log(
  `SKU ${COMPLETO ? "Enterprise" : "Pro"} · custo maximo se nada for gratuito: ` +
    `US$ ${((previstas * precoMil) / 1000).toFixed(2)}`,
);

if (SECO) {
  console.log("\n--seco: nenhuma chamada feita, nada gravado. Amostra do plano:");
  for (const p of planoDeBusca.slice(0, 5)) {
    console.log(
      `  "${p.consulta}"${p.restricao ? ` @ celula ${p.restricao.low.latitude.toFixed(2)},${p.restricao.low.longitude.toFixed(2)}` : ""}`,
    );
  }
  if (planoDeBusca.length > 5) console.log(`  ... +${planoDeBusca.length - 5}`);
  // Sem process.exit: sair no meio do event loop com socket aberto
  // derruba o processo com assert do libuv no Windows.
  await cliente?.end();
  process.exitCode = 0;
}

let totalNovos = 0, totalRevistos = 0, foraDaUf = 0, semResultado = 0;

try {
  if (SECO) planoDeBusca = [];
  for (const passo of planoDeBusca) {
    if (chamadas >= MAX) {
      console.log(`\nteto de ${MAX} chamadas atingido — parando aqui.`);
      break;
    }

    const resposta = await buscar(passo.consulta, passo.restricao);
    const places = resposta.places ?? [];
    if (places.length === 0) semResultado++;

    // Resultado de outro estado acontece direto na busca por nome:
    // a Places completa com o que existe fora da area quando nao acha.
    const daUf = places.filter((p) => ufDe(p) === UF);
    foraDaUf += places.length - daUf.length;

    if (daUf.length) {
      const { novos, revistos } = await gravar(
        cliente,
        daUf.map((p) => normalizar(p, passo.consulta)),
      );
      totalNovos += novos;
      totalRevistos += revistos;
    }

    // Folga entre chamadas: a Places nao publica limite por segundo,
    // mas rajada de centenas de POST costuma virar 429.
    await new Promise((r) => setTimeout(r, 200));
  }
} catch (e) {
  console.error(`\nPAROU em ${chamadas} chamadas —`, e.message);
  await cliente?.end();
  process.exit(1);
}

if (SECO) process.exit(0);

console.log(
  `\nchamadas: ${chamadas} · novos no staging: ${totalNovos} · ` +
    `atualizados: ${totalRevistos} · descartados por UF: ${foraDaUf} · ` +
    `buscas sem resultado: ${semResultado}`,
);
console.log(`custo estimado: US$ ${((chamadas * precoMil) / 1000).toFixed(2)} (antes da franquia gratuita)`);
console.log("\nproximo passo: node db/conciliar-places.mjs --lote=" + LOTE);

await cliente.end();
