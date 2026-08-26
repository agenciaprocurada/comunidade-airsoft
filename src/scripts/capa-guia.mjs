/**
 * Converte a capa de um guia para o formato que o site publica.
 *
 * Regra (ver CLAUDE.md): WebP, qualidade 80, largura máxima 1360px — que é o
 * maior `widths` pedido pelo <Image> em src/pages/guias/[...slug].astro, ou
 * seja, o retina 2x da coluna de leitura no desktop. Imagem menor que isso
 * NÃO é ampliada: upscale só inventa pixel e engorda o arquivo.
 *
 * Uso:
 *   node src/scripts/capa-guia.mjs <arquivo-de-entrada> <slug-do-guia>
 *
 * Exemplo:
 *   node src/scripts/capa-guia.mjs _uploads/foo.png bateria-lipo-airsoft-c-rating-e-mah
 */

import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

const LARGURA_MAXIMA = 1360;
const QUALIDADE = 80;
const DESTINO = "src/assets/guias";

const [entrada, slug] = process.argv.slice(2);

if (!entrada || !slug) {
  console.error("Uso: node src/scripts/capa-guia.mjs <entrada> <slug-do-guia>");
  process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`Slug inválido: "${slug}". Use apenas minúsculas, números e hífen.`);
  process.exit(1);
}

const saida = path.join(DESTINO, `${slug}.webp`);

await mkdir(DESTINO, { recursive: true });

const original = sharp(entrada);
const meta = await original.metadata();

await original
  .resize({
    width: LARGURA_MAXIMA,
    /** Sem upscale: se a origem já é menor, mantém o tamanho dela. */
    withoutEnlargement: true,
  })
  .webp({ quality: QUALIDADE })
  .toFile(saida);

const depois = await sharp(saida).metadata();
const pesoAntes = (await stat(entrada)).size;
const pesoDepois = (await stat(saida)).size;

const kb = (n) => `${Math.round(n / 1024)} kB`;

console.log(`entrada : ${entrada}`);
console.log(`          ${meta.width}x${meta.height} ${meta.format} · ${kb(pesoAntes)}`);
console.log(`saída   : ${saida}`);
console.log(`          ${depois.width}x${depois.height} webp q${QUALIDADE} · ${kb(pesoDepois)}`);
console.log(`redução : ${Math.round((1 - pesoDepois / pesoAntes) * 100)}%`);
console.log("");
console.log("No frontmatter do guia:");
console.log(`  imagem: "../../assets/guias/${slug}.webp"`);
console.log(`  imagem_alt: "descreva a cena em uma frase, sem repetir o título"`);
