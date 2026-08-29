/**
 * O que os dois scripts da Places compartilham: a chamada, a leitura
 * do endereco e a escrita no staging (public.campos_bruto).
 *
 *   db/coletar-places.mjs   verifica campo que JA esta no banco
 *   db/descobrir-places.mjs varre uma cidade atras de campo novo
 *
 * Os dois gravam na mesma mesa de trabalho, pela mesma regra, para
 * que db/conciliar-places.mjs nao precise saber de onde veio a linha.
 */

export const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

/** Campos do SKU Pro (US$ 32/1.000, 5.000 gratis/mes). */
export const CAMPOS_PRO = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.addressComponents",
  "places.businessStatus",
  "places.types",
  "places.primaryType",
  "places.websiteUri",
  "places.rating",
];

/** SKU Enterprise (US$ 35/1.000, 1.000 gratis/mes). So com --completo. */
export const CAMPOS_ENTERPRISE = [
  "places.userRatingCount",
  "places.nationalPhoneNumber",
  "places.regularOpeningHours",
];

export const precoMil = (completo) => (completo ? 35 : 32);
export const franquia = (completo) => (completo ? "1.000" : "5.000");

/**
 * Uma chamada de Text Search. `corpo` e o JSON da requisicao
 * (textQuery, pageSize, locationRestriction, pageToken...).
 * Lanca erro em resposta nao-2xx: 403 e 429 costumam ser faturamento
 * desligado ou cota estourada, e parar cedo e melhor do que queimar o
 * resto contra um erro fixo.
 */
export async function buscarTexto({ chave, completo, corpo }) {
  const fieldMask = [
    ...CAMPOS_PRO,
    ...(completo ? CAMPOS_ENTERPRISE : []),
    // Sem custo: so diz se ha mais uma pagina.
    "nextPageToken",
  ].join(",");

  const resposta = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": chave,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify({ languageCode: "pt-BR", regionCode: "BR", ...corpo }),
  });

  if (!resposta.ok) {
    const texto = await resposta.text();
    throw new Error(`Places respondeu ${resposta.status}: ${texto.slice(0, 300)}`);
  }
  return resposta.json();
}

/* --------------------------------------------------- normalizacao */

/** A UF sai de addressComponents; o texto do endereco nao e confiavel. */
export function ufDe(place) {
  const c = place.addressComponents ?? [];
  const estado = c.find((x) => (x.types ?? []).includes("administrative_area_level_1"));
  return (estado?.shortText ?? "").toUpperCase().slice(0, 2) || null;
}

/** No Brasil o municipio e o administrative_area_level_2; locality e reserva. */
export function cidadeDe(place) {
  const c = place.addressComponents ?? [];
  const municipio =
    c.find((x) => (x.types ?? []).includes("administrative_area_level_2")) ??
    c.find((x) => (x.types ?? []).includes("locality"));
  return municipio?.longText ?? null;
}

export function normalizar(place, { lote, consulta }) {
  return {
    place_id: place.id,
    lote,
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

export const COLUNAS_BRUTO = [
  "place_id", "lote", "consulta", "nome", "endereco", "uf", "cidade",
  "lat", "lng", "telefone", "site", "google_nota", "google_avaliacoes",
  "place_status", "tipos", "bruto",
];

/** `lote` fica de fora do update: quem viu primeiro leva o credito. */
const SQL_UPSERT = `insert into public.campos_bruto (${COLUNAS_BRUTO.join(",")}, destino)
  values (${COLUNAS_BRUTO.map((_, i) => `$${i + 1}`).join(",")}, 'pendente')
  on conflict (place_id) do update set
    ${COLUNAS_BRUTO.filter((c) => c !== "place_id" && c !== "lote")
      .map((c) => `${c}=excluded.${c}`)
      .join(", ")},
    coletado_em = now()
  returning (xmax = 0) as novo`;

/** Grava um registro normalizado no staging. Devolve true se era inedito. */
export async function gravarBruto(cliente, registro) {
  const valores = COLUNAS_BRUTO.map((c) =>
    c === "bruto" ? JSON.stringify(registro[c]) : registro[c],
  );
  const res = await cliente.query(SQL_UPSERT, valores);
  return res.rows[0].novo;
}

/** Le os argumentos `--chave=valor` / `--flag` da linha de comando. */
export function lerArgs() {
  return Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [chave, ...resto] = a.replace(/^--/, "").split("=");
      return [chave, resto.length ? resto.join("=") : true];
    }),
  );
}
