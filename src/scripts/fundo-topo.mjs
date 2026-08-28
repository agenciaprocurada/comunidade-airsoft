/**
 * Converte a foto de fundo do topo das páginas de listagem (campos,
 * lojas, armeiros, operações, guias e os hubs de estado/cidade).
 *
 * Irmão de capa-guia.mjs e fundo-cartao.mjs. Aqui saem DOIS arquivos de
 * uma foto só, porque o topo muda de forma entre desktop e celular:
 *
 *   topo-fundo.webp         1600px de largura, foto inteira. Vai como
 *                           `background-size: cover` numa faixa larga
 *                           e baixa. 1600 é o teto porque a origem tem
 *                           1672 — e a foto é escura e sem detalhe fino,
 *                           então o esticão de 20% num monitor de 1920
 *                           não aparece.
 *   topo-fundo-mobile.webp  recorte vertical (4:5) centrado no soldado,
 *                           720px de largura = retina 2x de uma tela de
 *                           360. No celular o texto ocupa a largura toda
 *                           e a foto vira clima atrás dele; um recorte
 *                           largo reescalado deixaria o soldado com
 *                           três dedos de altura.
 *
 * Qualidade 72: a arte é quase toda sombra, e nesse tipo de imagem o
 * WebP não perde nada visível abaixo de 80 — só peso.
 *
 * Uso:
 *   node src/scripts/fundo-topo.mjs <arquivo-de-entrada>
 *
 * Exemplo:
 *   node src/scripts/fundo-topo.mjs _uploads/fundo-topo.png
 */

import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

const DESTINO = "src/assets";
const QUALIDADE = 72;

const DESKTOP = { largura: 1600, nome: "topo-fundo.webp" };
/**
 * Proporção 4:5 e a fração da largura da ORIGEM onde o recorte é centrado.
 * O soldado está a ~37% da origem; centrar o recorte em 30% joga ele para
 * a metade direita do recorte, e o título (que fica à esquerda) não o cobre.
 */
const MOBILE = { largura: 720, proporcao: 4 / 5, centroX: 0.3, nome: "topo-fundo-mobile.webp" };

const [entrada] = process.argv.slice(2);

if (!entrada) {
  console.error("Uso: node src/scripts/fundo-topo.mjs <entrada>");
  process.exit(1);
}

await mkdir(DESTINO, { recursive: true });

const meta = await sharp(entrada).metadata();
const kb = (n) => `${Math.round(n / 1024)} kB`;

console.log(`entrada : ${entrada}`);
console.log(`          ${meta.width}x${meta.height} ${meta.format} · ${kb((await stat(entrada)).size)}`);

/* ---- desktop: foto inteira, só reduzida ---- */
const saidaDesktop = path.join(DESTINO, DESKTOP.nome);
await sharp(entrada)
  .resize({ width: DESKTOP.largura, withoutEnlargement: true })
  .webp({ quality: QUALIDADE })
  .toFile(saidaDesktop);

/* ---- mobile: recorte vertical em volta do assunto ---- */
const alturaRecorte = meta.height;
const larguraRecorte = Math.min(meta.width, Math.round(alturaRecorte * MOBILE.proporcao));
const esquerda = Math.max(
  0,
  Math.min(meta.width - larguraRecorte, Math.round(meta.width * MOBILE.centroX - larguraRecorte / 2)),
);

const saidaMobile = path.join(DESTINO, MOBILE.nome);
await sharp(entrada)
  .extract({ left: esquerda, top: 0, width: larguraRecorte, height: alturaRecorte })
  .resize({ width: MOBILE.largura, withoutEnlargement: true })
  .webp({ quality: QUALIDADE })
  .toFile(saidaMobile);

for (const saida of [saidaDesktop, saidaMobile]) {
  const depois = await sharp(saida).metadata();
  console.log(`saída   : ${saida}`);
  console.log(`          ${depois.width}x${depois.height} webp · ${kb((await stat(saida)).size)}`);
}
