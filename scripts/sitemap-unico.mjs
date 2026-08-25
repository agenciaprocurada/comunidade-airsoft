/**
 * Junta os sitemaps do @astrojs/sitemap em um unico /sitemap.xml.
 *
 * Por que existe: a integracao publica /sitemap-index.xml + /sitemap-0.xml.
 * O endereco que anunciamos e divulgamos e /sitemap.xml — um so arquivo,
 * facil de lembrar e de colar no Search Console. Este script roda depois do
 * build e escreve esse arquivo a partir do que a integracao ja gerou, entao
 * a lista de paginas continua saindo de um lugar so (o build), sem
 * ninguem manter URL na mao.
 *
 * Os arquivos originais continuam no ar de proposito: eles ja foram
 * enviados ao Google e apagar viraria 404 para quem ja os conhece.
 *
 * Limite do formato: 50.000 URLs por arquivo. Passando disso, o unico
 * arquivo deixa de ser valido e o script para o build em vez de publicar
 * um sitemap que o Google vai recusar em silencio.
 */
import fs from "node:fs";
import path from "node:path";

const LIMITE = 50000;

// Com o adapter da Vercel os arquivos estaticos saem em .vercel/output/static;
// sem adapter, em dist/. Pegamos o que existir.
const CANDIDATOS = [".vercel/output/static", "dist"];
const saida = CANDIDATOS.find((d) => fs.existsSync(d));

if (!saida) {
  console.error("[sitemap] pasta de build nao encontrada — rode o astro build antes.");
  process.exit(1);
}

const partes = fs
  .readdirSync(saida)
  .filter((f) => /^sitemap-\d+\.xml$/.test(f))
  .sort();

if (partes.length === 0) {
  console.error(`[sitemap] nenhum sitemap-N.xml em ${saida}/ — a integracao nao rodou?`);
  process.exit(1);
}

// Cada parte e um <urlset> completo; queremos so os <url>...</url> de dentro.
const urls = partes.flatMap((parte) => {
  const xml = fs.readFileSync(path.join(saida, parte), "utf8");
  return xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
});

if (urls.length === 0) {
  console.error("[sitemap] as partes existem mas nao tem nenhuma <url> dentro.");
  process.exit(1);
}

if (urls.length > LIMITE) {
  console.error(
    `[sitemap] ${urls.length} URLs passam do limite de ${LIMITE} por arquivo. ` +
      "Um unico /sitemap.xml deixou de servir — publique o indice no lugar."
  );
  process.exit(1);
}

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => `  ${u}`).join("\n") +
  "\n</urlset>\n";

fs.writeFileSync(path.join(saida, "sitemap.xml"), xml, "utf8");
console.log(`[sitemap] ${saida}/sitemap.xml — ${urls.length} URLs de ${partes.length} arquivo(s).`);
