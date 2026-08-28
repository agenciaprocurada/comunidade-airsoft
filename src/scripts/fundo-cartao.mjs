/**
 * Converte a foto de fundo de um cartão do gateway da home.
 *
 * Irmão de capa-guia.mjs, com dois números diferentes e uma pasta
 * diferente. A separação é de propósito: a capa de um guia é conteúdo,
 * aparece no Google e merece 1360px; isto aqui é decoração de interface
 * atrás de um cartão de 400px, onde 1360px seria peso jogado fora.
 *
 * Largura máxima 840px = retina 2x do cartão no desktop, que é o maior
 * `widths` pedido pelo <Image> em src/pages/index.astro. Acima disso o
 * navegador não usa um pixel sequer.
 *
 * Uso:
 *   node src/scripts/fundo-cartao.mjs <arquivo-de-entrada> <nome>
 *
 * Os nomes válidos estão em src/assets/home/README.md — errar o nome não
 * dá erro, só deixa o cartão sem foto.
 *
 * Exemplo:
 *   node src/scripts/fundo-cartao.mjs _uploads/loja.png onde-comprar
 */

import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

const LARGURA_MAXIMA = 840;
const QUALIDADE = 80;
const DESTINO = "src/assets/home";

/** Os seis cartões do gateway. Fora desta lista, o arquivo seria ignorado. */
const NOMES = [
  "criador-de-mapa",
  "onde-jogar",
  "onde-comprar",
  "onde-arrumar",
  "operacoes",
  "guia-de-airsoft",
];

const [entrada, nome] = process.argv.slice(2);

if (!entrada || !nome) {
  console.error("Uso: node src/scripts/fundo-cartao.mjs <entrada> <nome>");
  console.error(`Nomes: ${NOMES.join(", ")}`);
  process.exit(1);
}

/*
 * A validação existe porque o erro contrário é silencioso: nome fora da
 * lista gera um .webp que o glob até encontra, mas que nenhum cartão
 * procura. O arquivo fica lá, ninguém vê, e a impressão é de bug no site.
 */
if (!NOMES.includes(nome)) {
  console.error(`Nome inválido: "${nome}".`);
  console.error(`Use um destes: ${NOMES.join(", ")}`);
  process.exit(1);
}

const saida = path.join(DESTINO, `${nome}.webp`);

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
console.log(`          ${depois.width}x${depois.height} webp · ${kb(pesoDepois)}`);
