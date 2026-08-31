/**
 * Converte o registro do mapa "Bengazi-final" (tabela `mapas`) no
 * arquivo de dados do vídeo.
 *
 * Roda uma vez, a partir do dump em C:/tmp/pgrun/bengazi.json. Fica
 * versionado como .ts para o render não depender do banco.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dados = JSON.parse(fs.readFileSync("C:/tmp/pgrun/bengazi.json", "utf8"));

const areas = [];
const simbolos = [];

for (const o of dados.objetos) {
  if (o.tipoCamada === "area") {
    areas.push({
      pontos: o.points.map((p) => [Number(p.x.toFixed(1)), Number(p.y.toFixed(1))]),
      traco: o.stroke,
      preenchimento: typeof o.fill === "string" ? o.fill : "transparent",
      espessura: o.strokeWidth,
      tracejado: o.strokeDashArray ?? null,
    });
  }
  if (o.tipoCamada === "simbolo") {
    const circulo = o.objects.find((f) => f.type === "Circle");
    const texto = o.objects.find((f) => f.type === "Text");
    simbolos.push({
      x: Number(o.left.toFixed(1)),
      y: Number(o.top.toFixed(1)),
      escala: Number((o.scaleX ?? 1).toFixed(4)),
      cor: circulo?.fill ?? "#8b8f8a",
      rotulo: texto?.text ?? o.rotuloCamada,
      larguraGrupo: Number(o.width.toFixed(1)),
    });
  }
}

const saida = `// GERADO por scripts/gerar-dados.mjs — não editar à mão.
// Origem: linha da tabela \`mapas\`, id 1aefb84b-7f37-4628-a960-e65095535a6e.

export const DOC = { largura: ${dados.doc.largura}, altura: ${dados.doc.altura} } as const;

/** Enquadramento salvo: é o que amarra os tiles ao desenho. */
export const ENQUADRAMENTO = {
  lat: -29.8341,
  lng: -51.172118,
  zoom: 19,
  rotacao: 59,
  escalaBase: ${dados.base.escala},
} as const;

export const VEU = ${dados.veu};

export const GRADE = ${JSON.stringify(dados.grade, null, 2)} as const;

export interface AreaMapa {
  pontos: [number, number][];
  traco: string;
  preenchimento: string;
  espessura: number;
  tracejado: number[] | null;
}

export const AREAS: AreaMapa[] = ${JSON.stringify(areas, null, 2)};

export interface SimboloMapa {
  x: number;
  y: number;
  escala: number;
  cor: string;
  rotulo: string;
  larguraGrupo: number;
}

export const SIMBOLOS_MAPA: SimboloMapa[] = ${JSON.stringify(simbolos, null, 2)};
`;

fs.writeFileSync(path.join(RAIZ, "src", "dados", "mapa.ts"), saida);
console.log(`areas: ${areas.length}, simbolos: ${simbolos.length}`);
