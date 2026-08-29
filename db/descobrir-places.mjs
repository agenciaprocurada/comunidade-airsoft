/**
 * Varre UMA CIDADE na Google Places API (New) atras de campos de
 * airsoft e paintball, gravando o resultado bruto em
 * public.campos_bruto.
 *
 * NADA aqui escreve em public.campos. Este script so enche a mesa de
 * trabalho; quem move para a tabela do site e db/conciliar-places.mjs,
 * e tudo que ele insere nasce como rascunho.
 *
 * ---------------------------------------------------------------
 * POR QUE POR CIDADE, E NAO POR ESTADO
 *
 * A varredura por grade sobre a UF (que existiu em coletar-places.mjs)
 * custava ~108 chamadas por estado e trazia loja, restaurante e
 * academia junto. Por cidade a conta muda: o municipio tem um
 * retangulo conhecido (vem da Geocoding, 1 chamada), a Text Search
 * aceita `locationRestriction` para so devolver o que esta dentro
 * dele, e cada termo pagina ate 60 resultados. Uma capital sai com
 * 8 termos x ate 3 paginas = no maximo 24 chamadas.
 *
 * O que sobra do retangulo (Guarulhos dentro da caixa de Sao Paulo,
 * por exemplo) nao e jogado fora: vai para o staging no lote
 * `<lote>-vizinhos`, pendente, para quando a onda daquela regiao
 * chegar. Dado que ja foi pago nao se coleta duas vezes.
 * ---------------------------------------------------------------
 *
 * Uso (a chave sai do .env; nunca da linha de comando):
 *   node --env-file=.env db/descobrir-places.mjs --lote=sp-capital-2026-08 --cidade="São Paulo" --uf=SP --seco
 *   node --env-file=.env db/descobrir-places.mjs --lote=sp-capital-2026-08 --cidade="São Paulo" --uf=SP --completo
 *
 * O ambiente precisa de GOOGLE_MAPS_API_KEY (chave `AIza...`, com a
 * Places API (New) e a Geocoding API ativadas no projeto), PGHOST,
 * PGUSER e PGPASSWORD.
 *
 * Flags:
 *   --lote=...       obrigatoria; etiqueta do lote, entra no staging
 *   --cidade="..."   obrigatoria; nome do municipio como o Google escreve
 *   --uf=SP          obrigatoria
 *   --termos=a,b,c   substitui a lista padrao de buscas
 *   --retangulo=sul,oeste,norte,leste
 *                    substitui o retangulo da Geocoding. Serve para o
 *                    DF: "Brasília" geocodifica so o Plano Piloto, e
 *                    Taguatinga, Ceilandia e Gama ficam de fora
 *   --paginas=3      paginas por termo (20 resultados cada; maximo 3)
 *   --max=60         teto de chamadas. Trava de custo: para ao atingir
 *   --completo       pede telefone, horario e nº de avaliacoes (SKU
 *                    Enterprise: 1.000 gratis/mes em vez de 5.000)
 *   --seco           nao chama nada nem grava: so mostra o plano
 *
 * Dependencia: `pg` (npm i -D pg).
 */

import pg from "pg";
import { configPg, slug } from "./lib-campos.mjs";
import {
  buscarTexto, ufDe, cidadeDe, normalizar, gravarBruto, lerArgs,
  precoMil, franquia,
} from "./lib-places.mjs";

/* ---------------------------------------------------------- args */

const args = lerArgs();

const LOTE = String(args.lote ?? "");
const CIDADE = String(args.cidade ?? "");
const UF = args.uf ? String(args.uf).toUpperCase() : "";
const PAGINAS = Math.min(3, Math.max(1, Number(args.paginas ?? 3)));
const MAX = Number(args.max ?? 60);
const COMPLETO = Boolean(args.completo);
const SECO = Boolean(args.seco);
const RETANGULO = args.retangulo
  ? String(args.retangulo).split(",").map(Number)
  : null;
if (RETANGULO && (RETANGULO.length !== 4 || RETANGULO.some(Number.isNaN))) {
  console.error("erro: --retangulo=sul,oeste,norte,leste (quatro numeros)");
  process.exit(1);
}

/**
 * Os termos que um jogador digita no Maps. "airsoft" sozinho pega a
 * maioria; os outros existem porque o Google ranqueia por relevancia
 * ao texto e um campo chamado "Arena X" pode nao subir em "airsoft"
 * mas sobe em "campo de airsoft". Paintball entra porque no Brasil os
 * dois dividem campo, e a ficha aceita modalidade "ambos".
 */
const TERMOS_PADRAO = [
  "campo de airsoft",
  "arena de airsoft",
  "airsoft",
  "airsoft cqb",
  "clube de airsoft",
  "campo de paintball",
  "arena de paintball",
  "paintball",
];
const TERMOS = args.termos
  ? String(args.termos).split(",").map((t) => t.trim()).filter(Boolean)
  : TERMOS_PADRAO;

if (!LOTE || !CIDADE || !UF) {
  console.error("erro: --lote=sp-capital-2026-08 --cidade=\"São Paulo\" --uf=SP sao obrigatorias\n");
  console.error("veja o cabecalho de db/descobrir-places.mjs para o uso completo");
  process.exit(1);
}
if (!/^[A-Z]{2}$/.test(UF)) {
  console.error(`erro: --uf=${UF} nao e sigla de estado`);
  process.exit(1);
}

const CHAVE = process.env.GOOGLE_MAPS_API_KEY;
const LOTE_VIZINHOS = `${LOTE}-vizinhos`;
const preco = precoMil(COMPLETO);
const previstas = Math.min(TERMOS.length * PAGINAS, MAX);

console.log(
  `lote ${LOTE} · ${CIDADE}/${UF} · ${TERMOS.length} termos x ate ${PAGINAS} paginas · ` +
    `no maximo ${previstas} chamadas (teto ${MAX})`,
);
console.log(
  `SKU ${COMPLETO ? "Enterprise" : "Pro"} · custo maximo se nada for gratuito: ` +
    `US$ ${((previstas * preco) / 1000).toFixed(2)} ` +
    `(franquia: ${franquia(COMPLETO)} chamadas/mes) · +1 chamada de Geocoding`,
);

if (SECO) {
  console.log("\n--seco: nenhuma chamada feita, nada gravado. Termos:");
  for (const t of TERMOS) console.log(`  "${t} em ${CIDADE}"`);
  console.log(`\nfora do municipio mas dentro do retangulo -> lote ${LOTE_VIZINHOS}`);
  process.exit(0);
}
if (!CHAVE) {
  console.error("erro: GOOGLE_MAPS_API_KEY nao esta no ambiente (ou use --seco)");
  process.exit(1);
}

/* ------------------------------------------------------ retangulo */

/**
 * O retangulo do municipio vem da Geocoding (a mesma API que o criador
 * de mapas ja usa). `components` trava no municipio certo: "São Paulo"
 * sem isso resolve para o estado.
 */
async function retanguloDaCidade() {
  if (RETANGULO) {
    const [sul, oeste, norte, leste] = RETANGULO;
    return {
      low: { latitude: sul, longitude: oeste },
      high: { latitude: norte, longitude: leste },
      rotulo: `--retangulo informado (${CIDADE}/${UF})`,
    };
  }
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", `${CIDADE}, ${UF}, Brasil`);
  url.searchParams.set("components", `locality:${CIDADE}|administrative_area:${UF}|country:BR`);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("key", CHAVE);

  const r = await (await fetch(url)).json();
  if (r.status !== "OK") {
    throw new Error(`Geocoding respondeu ${r.status}: ${r.error_message ?? ""}`);
  }
  const alvo = r.results.find((x) => (x.types ?? []).includes("locality")) ?? r.results[0];
  const b = alvo.geometry?.bounds ?? alvo.geometry?.viewport;
  if (!b) throw new Error(`Geocoding nao devolveu retangulo para ${CIDADE}/${UF}`);
  return {
    low: { latitude: b.southwest.lat, longitude: b.southwest.lng },
    high: { latitude: b.northeast.lat, longitude: b.northeast.lng },
    rotulo: alvo.formatted_address,
  };
}

/* ------------------------------------------------------------ main */

const cliente = new pg.Client(configPg());
await cliente.connect();

let chamadas = 0;
const vistos = new Map(); // place_id -> { nome, cidade, status, tipos, daCidade }
let novos = 0, revistos = 0, foraDaUf = 0;

try {
  const ret = await retanguloDaCidade();
  console.log(
    `\nretangulo: ${ret.rotulo} · ` +
      `${ret.low.latitude.toFixed(3)},${ret.low.longitude.toFixed(3)} a ` +
      `${ret.high.latitude.toFixed(3)},${ret.high.longitude.toFixed(3)}\n`,
  );

  termos: for (const termo of TERMOS) {
    const consulta = `${termo} em ${CIDADE}`;
    let pageToken = null;
    let pagina = 0;
    let achadosNoTermo = 0;

    do {
      if (chamadas >= MAX) {
        console.log(`\nteto de ${MAX} chamadas atingido — parando aqui.`);
        break termos;
      }
      chamadas++;
      pagina++;

      const corpo = {
        textQuery: consulta,
        pageSize: 20,
        locationRestriction: { rectangle: { low: ret.low, high: ret.high } },
      };
      // Com pageToken, o resto do corpo precisa ser identico ao da
      // primeira chamada — e regra da API.
      if (pageToken) corpo.pageToken = pageToken;

      const resposta = await buscarTexto({ chave: CHAVE, completo: COMPLETO, corpo });
      const places = resposta.places ?? [];
      achadosNoTermo += places.length;

      for (const place of places) {
        const uf = ufDe(place);
        const cidade = cidadeDe(place);

        // A restricao e geografica; o retangulo da capital pega pedaco
        // de Guarulhos e Osasco. Outro estado nao deveria acontecer,
        // mas custa nada garantir.
        if (uf !== UF) {
          foraDaUf++;
          continue;
        }
        const daCidade = slug(cidade) === slug(CIDADE);
        const lote = daCidade ? LOTE : LOTE_VIZINHOS;

        const registro = normalizar(place, { lote, consulta });
        const novo = await gravarBruto(cliente, registro);
        novo ? novos++ : revistos++;

        if (!vistos.has(place.id)) {
          vistos.set(place.id, {
            nome: registro.nome,
            cidade,
            status: registro.place_status,
            tipos: registro.tipos,
            daCidade,
          });
        }
      }

      pageToken = resposta.nextPageToken ?? null;
      // Folga entre chamadas: rajada de POST costuma virar 429.
      await new Promise((r) => setTimeout(r, 300));
    } while (pageToken && pagina < PAGINAS);

    console.log(`  "${consulta}": ${achadosNoTermo} resultados em ${pagina} pagina(s)`);
  }
} catch (e) {
  console.error(`\nPAROU em ${chamadas} chamadas —`, e.message);
  await cliente.end();
  process.exit(1);
}

/* ------------------------------------------------------- relatorio */

const naCidade = [...vistos.values()].filter((v) => v.daCidade);
const vizinhos = [...vistos.values()].filter((v) => !v.daCidade);

console.log(
  `\nchamadas: ${chamadas} · lugares distintos: ${vistos.size} · ` +
    `em ${CIDADE}: ${naCidade.length} · vizinhos: ${vizinhos.length} · ` +
    `descartados por UF: ${foraDaUf}`,
);
console.log(`staging: ${novos} novos · ${revistos} atualizados`);
console.log(
  `custo bruto: US$ ${((chamadas * preco) / 1000).toFixed(2)} — zero se dentro da franquia`,
);

console.log(`\nem ${CIDADE}:`);
for (const v of naCidade.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))) {
  const st = v.status && v.status !== "OPERATIONAL" ? `  [${v.status}]` : "";
  console.log(`  ${v.nome}${st}  (${v.tipos.slice(0, 3).join(", ")})`);
}
if (vizinhos.length) {
  const porCidade = new Map();
  for (const v of vizinhos) porCidade.set(v.cidade, (porCidade.get(v.cidade) ?? 0) + 1);
  console.log(
    `\nvizinhos (lote ${LOTE_VIZINHOS}): ` +
      [...porCidade].map(([c, n]) => `${c} ${n}`).join(" · "),
  );
}

console.log(`\nproximo passo: node db/conciliar-places.mjs --lote=${LOTE}`);
await cliente.end();
