/**
 * Converte a logo de um apoiador para a faixa "Apoiadores".
 *
 * Irmão de fundo-cartao.mjs e capa-guia.mjs, com os números de uma logo:
 * largura máxima 480px (retina 2x dos 200px em que ela aparece), qualidade
 * 85 (logo tem borda nítida e sofre mais com compressão do que foto) e
 * WebP com transparência preservada.
 *
 * Uso:
 *   node src/scripts/logo-apoiador.mjs <arquivo-de-entrada> <slug>
 *
 * O slug tem que ser o mesmo de src/lib/apoiadores.ts — se não bater, o
 * arquivo fica na pasta e nenhum parceiro o encontra.
 *
 * Exemplo:
 *   node src/scripts/logo-apoiador.mjs _uploads/loja.png loja-exemplo
 */

import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

const LARGURA_MAXIMA = 480;
const QUALIDADE = 85;
const DESTINO = "src/assets/apoiadores";

const [entrada, slug] = process.argv.slice(2);

if (!entrada || !slug) {
  console.error("Uso: node src/scripts/logo-apoiador.mjs <entrada> <slug>");
  process.exit(1);
}

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error(`Slug inválido: "${slug}". Use minúsculas, números e hífen: loja-exemplo`);
  process.exit(1);
}

const saida = path.join(DESTINO, `${slug}.webp`);

await mkdir(DESTINO, { recursive: true });

const original = sharp(entrada);
const meta = await original.metadata();

await original
  .resize({ width: LARGURA_MAXIMA, withoutEnlargement: true })
  .webp({ quality: QUALIDADE })
  .toFile(saida);

const depois = await sharp(saida).metadata();
const kb = (n) => `${Math.round(n / 1024)} kB`;

console.log(`entrada : ${entrada}`);
console.log(`          ${meta.width}x${meta.height} ${meta.format} · ${kb((await stat(entrada)).size)}`);
console.log(`saída   : ${saida}`);
console.log(`          ${depois.width}x${depois.height} webp · ${kb((await stat(saida)).size)}`);
console.log(`\nAgora confira se "${slug}" está em src/lib/apoiadores.ts.`);
