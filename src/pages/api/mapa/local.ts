import type { APIContext } from "astro";

export const prerender = false;

/**
 * Endereço digitado → coordenada.
 *
 * O caso de uso aqui não é "achar a Av. Paulista": é achar o SÍTIO onde
 * a operação vai rolar. Isso é endereço rural, nome de propriedade e
 * estrada vicinal — exatamente o que um geocodificador sozinho erra.
 *
 * Medido antes de escrever isto, com sete buscas típicas:
 *   Nominatim  — não achou NADA em 3 das 7 ("Sítio Santa Rita",
 *                "Campo de airsoft Itu", "Estrada do Cachoeirão").
 *   Photon     — achou quase todas, mas mandou "Campo de airsoft" para
 *                a Catalunha e "Estrada do Cachoeirão, Mairiporã" para
 *                o Espírito Santo.
 *
 * Nenhuma das duas resolve sozinha, e por isso esta rota consulta
 * VÁRIAS fontes e junta os resultados. As três correções que fazem a
 * diferença:
 *
 * 1. VIÉS DE PROXIMIDADE. O parâmetro `perto` traz o centro do mapa que
 *    a pessoa está olhando. Quem digita "Sítio Santa Rita" já está com
 *    a tela em Itu, e priorizar o que é perto resolve a maior parte das
 *    ambiguidades sem ela precisar escrever mais.
 * 2. CEP TEM CAMINHO PRÓPRIO. A BrasilAPI resolve CEP muito melhor que
 *    qualquer geocodificador estrangeiro, e devolve coordenada.
 * 3. NUNCA UMA RESPOSTA SÓ. A lista mostra cidade e estado em cada
 *    linha, porque escolher entre cinco é trivial e adivinhar qual dos
 *    cinco o sistema escolheu é impossível.
 */

const CACHE = "public, max-age=3600, s-maxage=86400";

/** Exigido pela política do Nominatim: precisa identificar quem chama. */
const AGENTE =
  "ComunidadeAirsoft/1.0 (+https://www.comunidadeairsoft.com.br; contato via site)";

/** Caixa que contém o Brasil inteiro, para cortar resultado de outro país. */
const CAIXA_BRASIL = { oeste: -74.0, sul: -34.0, leste: -34.0, norte: 6.0 };

export interface LocalEncontrado {
  nome: string;
  /** Cidade/UF em linha separada: é o que desempata duas linhas parecidas. */
  detalhe: string;
  lat: number;
  lng: number;
  fonte: string;
}

const arredondar = (n: number) => Number(n.toFixed(6));

function json(corpo: unknown, status = 200, cache?: string) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(cache ? { "cache-control": cache } : {}),
    },
  });
}

function daCasa(contexto: APIContext): boolean {
  if (import.meta.env.DEV) return true;
  const origem = contexto.request.headers.get("referer") ?? contexto.request.headers.get("origin");
  if (!origem) return false;
  try {
    return new URL(origem).host === contexto.url.host;
  } catch {
    return false;
  }
}

function dentroDoBrasil(lat: number, lng: number) {
  return (
    lat >= CAIXA_BRASIL.sul &&
    lat <= CAIXA_BRASIL.norte &&
    lng >= CAIXA_BRASIL.oeste &&
    lng <= CAIXA_BRASIL.leste
  );
}

/** Distância aproximada em km. Serve para ordenar, não para navegar. */
function distanciaKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = (aLat - bLat) * 111;
  const dLng = (aLng - bLng) * 111 * Math.cos((aLat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

// ------------------------------------------------------------
// CEP — BrasilAPI
// ------------------------------------------------------------

/** Oito dígitos, com ou sem traço, e nada mais na string. */
function lerCep(texto: string): string | null {
  const so = texto.replace(/[\s.-]/g, "");
    return /^\d{8}$/.test(so) ? so : null;
}

async function buscarCep(cep: string): Promise<LocalEncontrado[]> {
  const resposta = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, {
    signal: AbortSignal.timeout(6_000),
  });
  if (!resposta.ok) return [];

  const corpo = (await resposta.json()) as {
    street?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    location?: { coordinates?: { latitude?: string; longitude?: string } };
  };

  const lat = Number(corpo.location?.coordinates?.latitude);
  const lng = Number(corpo.location?.coordinates?.longitude);
  // Nem todo CEP tem coordenada na base — CEP geral de cidade quase
  // nunca tem. Sem ela o resultado não serve para centralizar o mapa.
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  return [
    {
      nome: [corpo.street, corpo.neighborhood].filter(Boolean).join(", ") || `CEP ${cep}`,
      detalhe: [corpo.city, corpo.state].filter(Boolean).join(" — "),
      lat: arredondar(lat),
      lng: arredondar(lng),
      fonte: "cep",
    },
  ];
}

// ------------------------------------------------------------
// Photon — bom com texto livre e nome de lugar
// ------------------------------------------------------------

interface FeicaoPhoton {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

async function buscarNoPhoton(
  busca: string,
  perto: { lat: number; lng: number } | null,
): Promise<LocalEncontrado[]> {
  const alvo = new URL("https://photon.komoot.io/api");
  alvo.searchParams.set("q", busca);
  alvo.searchParams.set("limit", "8");
  alvo.searchParams.set("lang", "default");
  // Sem a caixa, "campo de airsoft" volta da Catalunha.
  alvo.searchParams.set(
    "bbox",
    `${CAIXA_BRASIL.oeste},${CAIXA_BRASIL.sul},${CAIXA_BRASIL.leste},${CAIXA_BRASIL.norte}`,
  );
  if (perto) {
    alvo.searchParams.set("lat", String(perto.lat));
    alvo.searchParams.set("lon", String(perto.lng));
  }

  const resposta = await fetch(alvo, { signal: AbortSignal.timeout(7_000) });
  if (!resposta.ok) return [];

  const corpo = (await resposta.json()) as { features?: FeicaoPhoton[] };

  return (corpo.features ?? [])
    .filter((f) => !f.properties.country || /bra[sz]il/i.test(f.properties.country))
    .map((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties;
      const rua = [p.street, p.housenumber].filter(Boolean).join(", ");
      return {
        nome: p.name || rua || "Sem nome",
        detalhe: [p.city ?? p.county, p.state].filter(Boolean).join(" — "),
        lat: arredondar(lat),
        lng: arredondar(lng),
        fonte: "photon",
      };
    })
    .filter((l) => dentroDoBrasil(l.lat, l.lng));
}

// ------------------------------------------------------------
// Nominatim — melhor com endereço formal completo
// ------------------------------------------------------------

interface ResultadoNominatim {
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

async function buscarNoNominatim(busca: string): Promise<LocalEncontrado[]> {
  const alvo = new URL("https://nominatim.openstreetmap.org/search");
  alvo.searchParams.set("q", busca);
  alvo.searchParams.set("format", "jsonv2");
  alvo.searchParams.set("countrycodes", "br");
  alvo.searchParams.set("accept-language", "pt-BR");
  alvo.searchParams.set("addressdetails", "1");
  alvo.searchParams.set("limit", "6");

  const resposta = await fetch(alvo, {
    headers: { "user-agent": AGENTE, accept: "application/json" },
    signal: AbortSignal.timeout(7_000),
  });
  if (!resposta.ok) return [];

  const corpo = (await resposta.json()) as ResultadoNominatim[];

  return corpo.map((item) => {
    const partes = item.display_name.split(", ");
    const e = item.address ?? {};
    return {
      nome: partes.slice(0, 2).join(", "),
      detalhe: [e.city ?? e.town ?? e.municipality ?? e.village, e.state]
        .filter(Boolean)
        .join(" — "),
      lat: arredondar(Number(item.lat)),
      lng: arredondar(Number(item.lon)),
      fonte: "nominatim",
    };
  });
}

// ------------------------------------------------------------
// Google — só quando há chave; sozinho já é melhor que os dois
// ------------------------------------------------------------

interface ResultadoGoogle {
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  address_components?: { long_name: string; short_name: string; types: string[] }[];
}

async function buscarNoGoogle(busca: string, chave: string): Promise<LocalEncontrado[]> {
  const alvo = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  alvo.searchParams.set("address", busca);
  alvo.searchParams.set("components", "country:BR");
  alvo.searchParams.set("language", "pt-BR");
  alvo.searchParams.set("region", "br");
  alvo.searchParams.set("key", chave);

  const resposta = await fetch(alvo, { signal: AbortSignal.timeout(8_000) });
  if (!resposta.ok) throw new Error(`Geocoding respondeu ${resposta.status}`);

  const corpo = (await resposta.json()) as { status: string; results?: ResultadoGoogle[] };
  if (corpo.status !== "OK" && corpo.status !== "ZERO_RESULTS") {
    throw new Error(`Geocoding em estado ${corpo.status}`);
  }

  return (corpo.results ?? []).map((item) => {
    const pedaco = (tipo: string) =>
      item.address_components?.find((c) => c.types.includes(tipo))?.long_name;
    const partes = item.formatted_address.split(", ");
    return {
      nome: partes.slice(0, 2).join(", "),
      detalhe: [
        pedaco("administrative_area_level_2"),
        pedaco("administrative_area_level_1"),
      ]
        .filter(Boolean)
        .join(" — "),
      lat: arredondar(item.geometry.location.lat),
      lng: arredondar(item.geometry.location.lng),
      fonte: "google",
    };
  });
}

// ------------------------------------------------------------

/**
 * Junta as listas removendo o que é o mesmo lugar.
 *
 * "Mesmo lugar" aqui é 150 m, não coordenada idêntica: duas fontes
 * quase nunca concordam na casa decimal, e mostrar a mesma esquina
 * duas vezes com nomes diferentes faz a lista parecer quebrada.
 *
 * Quando há centro de referência, ordena pelo mais perto — é a peça
 * que faz "Sítio Santa Rita" achar o de Itu, e não o de outro estado.
 */
function juntar(
  listas: LocalEncontrado[][],
  perto: { lat: number; lng: number } | null,
): LocalEncontrado[] {
  const saida: LocalEncontrado[] = [];

  for (const lista of listas) {
    for (const item of lista) {
      const repetido = saida.some(
        (j) => distanciaKm(j.lat, j.lng, item.lat, item.lng) < 0.15,
      );
      if (!repetido) saida.push(item);
    }
  }

  if (perto) {
    saida.sort(
      (a, b) =>
        distanciaKm(perto.lat, perto.lng, a.lat, a.lng) -
        distanciaKm(perto.lat, perto.lng, b.lat, b.lng),
    );
  }

  return saida.slice(0, 6);
}

function lerPerto(cru: string | null) {
  if (!cru) return null;
  const [lat, lng] = cru.split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export async function GET(contexto: APIContext) {
  if (!daCasa(contexto)) return json({ erro: "Origem não autorizada." }, 403);

  const busca = (contexto.url.searchParams.get("q") ?? "").trim();
  if (busca.length < 3) return json({ locais: [] });
  if (busca.length > 200) return json({ erro: "Busca longa demais." }, 400);

  const perto = lerPerto(contexto.url.searchParams.get("perto"));
  const chave = import.meta.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;

  // CEP não precisa de geocodificador nenhum, e a resposta é exata.
  const cep = lerCep(busca);
  if (cep) {
    const achados = await buscarCep(cep).catch(() => []);
    if (achados.length) return json({ locais: achados }, 200, CACHE);
    // Sem coordenada na base do CEP, segue para a busca por texto.
  }

  /**
   * As fontes correm em paralelo e uma que falhe não derruba a busca —
   * daí cada `catch` devolver lista vazia em vez de propagar. Com
   * quatro fontes possíveis, o caso "todas caíram" é raro o bastante
   * para ser o único que vira erro na tela.
   */
  const listas = await Promise.all(
    [
      chave ? buscarNoGoogle(busca, chave) : null,
      buscarNoPhoton(busca, perto),
      buscarNoNominatim(busca),
    ]
      .filter(Boolean)
      .map((p) => (p as Promise<LocalEncontrado[]>).catch(() => [] as LocalEncontrado[])),
  );

  const locais = juntar(listas, perto);
  return json({ locais }, 200, CACHE);
}
