/**
 * Baixa os tiles de satélite do mapa "Bengazi-final" para public/tiles/.
 *
 * A geometria é a MESMA de src/lib/mapa.ts do site (paraPixelGlobal +
 * montarMosaico) — o vídeo não pode inventar enquadramento, senão a
 * grade e as áreas desenhadas caem fora do lugar.
 *
 * Roda uma vez: `node scripts/baixar-tiles.mjs`. Os tiles ficam
 * versionados em public/ para o render não depender da rede.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LADO_TILE = 256;

const URL_TILE = (z, x, y) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

function paraPixelGlobal(lat, lng, zoom) {
  const mundo = LADO_TILE * 2 ** zoom;
  const rad = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * mundo,
    y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * mundo,
  };
}

function montarMosaico(lat, lng, zoom, lado) {
  const centro = paraPixelGlobal(lat, lng, zoom);
  const origemX = centro.x - lado / 2;
  const origemY = centro.y - lado / 2;
  const primeiroX = Math.floor(origemX / LADO_TILE);
  const primeiroY = Math.floor(origemY / LADO_TILE);
  const ultimoX = Math.floor((origemX + lado - 1) / LADO_TILE);
  const ultimoY = Math.floor((origemY + lado - 1) / LADO_TILE);
  const limite = 2 ** zoom;
  const pecas = [];
  for (let ty = primeiroY; ty <= ultimoY; ty++) {
    if (ty < 0 || ty >= limite) continue;
    for (let tx = primeiroX; tx <= ultimoX; tx++) {
      const x = ((tx % limite) + limite) % limite;
      pecas.push({
        z: zoom,
        x,
        y: ty,
        esquerda: tx * LADO_TILE - origemX,
        topo: ty * LADO_TILE - origemY,
      });
    }
  }
  return pecas;
}

// Enquadramento do mapa salvo (tabela `mapas`, id 1aefb84b…).
const LAT = -29.8341;
const LNG = -51.172118;

/**
 * z19 é a base do editor (lado 1632 = o que `carregarBase` calcula para
 * um documento 1280x720 girado 59°). Os zooms menores servem à cena do
 * reposicionamento, que chega voando de longe.
 */
const CAMADAS = [
  { zoom: 19, lado: 1632 },
  { zoom: 17, lado: 1024 },
  { zoom: 15, lado: 1024 },
];

const manifesto = {};

for (const { zoom, lado } of CAMADAS) {
  const pecas = montarMosaico(LAT, LNG, zoom, lado);
  const pasta = path.join(RAIZ, "public", "tiles", `z${zoom}`);
  fs.mkdirSync(pasta, { recursive: true });

  let baixados = 0;
  for (const p of pecas) {
    const arquivo = path.join(pasta, `${p.x}_${p.y}.jpg`);
    if (!fs.existsSync(arquivo)) {
      const resposta = await fetch(URL_TILE(p.z, p.x, p.y));
      if (!resposta.ok) {
        console.warn(`  falhou z${p.z} ${p.x},${p.y}: ${resposta.status}`);
        continue;
      }
      fs.writeFileSync(arquivo, Buffer.from(await resposta.arrayBuffer()));
    }
    baixados++;
  }

  manifesto[`z${zoom}`] = {
    zoom,
    lado,
    tiles: pecas.map((p) => ({ x: p.x, y: p.y, esquerda: p.esquerda, topo: p.topo })),
  };
  console.log(`z${zoom}: ${baixados}/${pecas.length} tiles, mosaico ${lado}px`);
}

fs.writeFileSync(
  path.join(RAIZ, "src", "dados", "tiles.json"),
  JSON.stringify(manifesto, null, 2),
);
console.log("manifesto escrito em src/dados/tiles.json");
