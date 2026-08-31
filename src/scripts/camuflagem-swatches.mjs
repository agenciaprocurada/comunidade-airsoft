/**
 * Gera as amostras de padrão de camuflagem do guia "Guia de camuflagem do Brasil".
 *
 * POR QUE ISTO EXISTE, e não um download de imagens
 * -------------------------------------------------
 * As referências fotográficas desses padrões vivem em acervos com direito
 * reservado — o Camopedia, principal catálogo do assunto, declara "all rights
 * reserved" no disclaimer. Baixar e republicar aquelas fotos seria infração, e
 * as alternativas de licença livre cobrem só uma parte dos padrões, com
 * qualidade e enquadramento irregulares.
 *
 * Então as amostras são DESENHADAS aqui: ilustração original, gerada por
 * código a partir da descrição textual de cada padrão (cores e geometria). Isso
 * resolve três coisas de uma vez — não depende de licença de terceiro, cobre
 * todos os padrões com o mesmo tratamento visual, e o arquivo é minúsculo
 * porque é forma vetorial rasterizada, não fotografia.
 *
 * O QUE ELAS NÃO SÃO
 * ------------------
 * Não são foto do tecido real nem reprodução exata da matriz de impressão. São
 * aproximação da aparência, para reconhecimento visual. O guia diz isso ao
 * leitor em texto, ao lado das imagens — amostra ilustrativa apresentada como
 * se fosse o tecido oficial seria informação falsa, que é justamente o que o
 * diretório evita ao não gerar foto de campo por IA.
 *
 * Padrões comerciais protegidos (Multicam, A-TACS, MARPAT) NÃO entram aqui.
 * São desenhos de propriedade de terceiros: o guia os descreve em texto e não
 * os reproduz.
 *
 * DETERMINISMO
 * ------------
 * Todo sorteio passa por um PRNG com semente fixa derivada do id do padrão.
 * Rodar de novo produz byte a byte o mesmo arquivo — o que evita que um
 * `git status` sujo apareça só por alguém ter regerado as imagens.
 *
 * Uso:
 *   node src/scripts/camuflagem-swatches.mjs
 */

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

/** Largura do <Image> em retina 2x na coluna de leitura. Mesma regra da capa. */
const LARGURA_PADRAO = 1360;
/** Proporção de amostra de tecido: larga e baixa, para caber várias na página. */
const ALTURA_PADRAO = 460;
const QUALIDADE = 80;
const DESTINO = "src/assets/guias/camuflagem-brasil";

/* ============================================================
   Aleatoriedade determinística
   ============================================================ */

/** mulberry32 — PRNG pequeno e estável entre versões do Node. */
function prng(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semente a partir do id, para cada padrão ter o próprio desenho estável. */
function semear(id) {
  let h = 2166136261;
  for (const c of id) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ============================================================
   Motor 1 — lagarto (listras verticais orgânicas)

   É a família dominante no Brasil: Exército, Marinha e Aeronáutica usam
   variações do mesmo princípio — faixas verticais irregulares e ramificadas,
   herdadas do lizard francês via Portugal. Cada faixa serpenteia por soma de
   senoides com fase sorteada, e a largura oscila em outra frequência: é o que
   dá o contorno irregular em vez de uma listra de pijama.
   ============================================================ */

function lagarto({ base, camadas }, aleatorio, LARGURA = LARGURA_PADRAO, ALTURA = ALTURA_PADRAO) {
  const partes = [`<rect width="${LARGURA}" height="${ALTURA}" fill="${base}"/>`];

  for (const camada of camadas) {
    const { cor, faixas, largura } = camada;

    for (let i = 0; i < faixas; i++) {
      // Cada faixa tem sua própria assinatura de ondulação.
      const x0 = aleatorio() * (LARGURA + 240) - 120;
      const a1 = 18 + aleatorio() * 38;
      const a2 = 6 + aleatorio() * 18;
      const f1 = 0.006 + aleatorio() * 0.012;
      const f2 = 0.02 + aleatorio() * 0.03;
      const p1 = aleatorio() * Math.PI * 2;
      const p2 = aleatorio() * Math.PI * 2;
      const fw = 0.012 + aleatorio() * 0.02;
      const pw = aleatorio() * Math.PI * 2;
      const wBase = largura * (0.65 + aleatorio() * 0.7);

      const centro = (y) => x0 + a1 * Math.sin(y * f1 + p1) + a2 * Math.sin(y * f2 + p2);
      const meia = (y) => wBase * (0.42 + 0.58 * Math.abs(Math.sin(y * fw + pw)));

      const passo = 16;
      const esquerda = [];
      const direita = [];

      for (let y = -30; y <= ALTURA + 30; y += passo) {
        const c = centro(y);
        const w = meia(y);
        // Ruído fino nas bordas: sem ele o contorno fica liso demais e a
        // amostra parece gráfico, não tecido.
        esquerda.push([c - w + (aleatorio() - 0.5) * 9, y]);
        direita.push([c + w + (aleatorio() - 0.5) * 9, y]);
      }

      const pontos = [...esquerda, ...direita.reverse()];
      const d =
        "M " + pontos.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ") + " Z";
      partes.push(`<path d="${d}" fill="${cor}"/>`);
    }

    // Ilhas soltas da mesma cor. No tecido real as faixas se quebram; sem isso
    // o padrão fica com verticalidade rígida demais.
    const ilhas = Math.round(faixas * 1.6);
    for (let i = 0; i < ilhas; i++) {
      const cx = aleatorio() * LARGURA;
      const cy = aleatorio() * ALTURA;
      const rx = 6 + aleatorio() * 20;
      const ry = rx * (1.6 + aleatorio() * 2.4);
      const pontos = [];
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 7) {
        const r = 0.62 + aleatorio() * 0.5;
        pontos.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
      }
      const d =
        "M " + pontos.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ") + " Z";
      partes.push(`<path d="${d}" fill="${cor}"/>`);
    }
  }

  return partes.join("");
}

/* ============================================================
   Motor 2 — manchado (blotch)

   Manchas arredondadas e sobrepostas, sem direção dominante. É o desenho dos
   padrões urbanos de choque e dos woodland clássicos.
   ============================================================ */

function manchado({ base, camadas }, aleatorio, LARGURA = LARGURA_PADRAO, ALTURA = ALTURA_PADRAO) {
  const partes = [`<rect width="${LARGURA}" height="${ALTURA}" fill="${base}"/>`];

  for (const camada of camadas) {
    const { cor, faixas, largura } = camada;
    for (let i = 0; i < faixas * 5; i++) {
      const cx = aleatorio() * LARGURA;
      const cy = aleatorio() * ALTURA;
      const raio = largura * (0.7 + aleatorio() * 1.9);
      const pontos = [];
      const lados = 9 + Math.floor(aleatorio() * 5);
      for (let l = 0; l < lados; l++) {
        const a = (l / lados) * Math.PI * 2;
        const r = raio * (0.55 + aleatorio() * 0.75);
        pontos.push([cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r]);
      }
      const d =
        "M " + pontos.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ") + " Z";
      partes.push(`<path d="${d}" fill="${cor}"/>`);
    }
  }

  return partes.join("");
}

/* ============================================================
   Motor 3 — digital (pixelado)

   Grade de células coloridas por ruído de valor em duas oitavas. A oitava
   grossa cria as manchas; a fina quebra a borda em degraus, que é o que
   caracteriza o digipat.
   ============================================================ */

function digital({ base, camadas }, aleatorio, LARGURA = LARGURA_PADRAO, ALTURA = ALTURA_PADRAO) {
  const CELULA = 10;
  const colunas = Math.ceil(LARGURA / CELULA);
  const linhas = Math.ceil(ALTURA / CELULA);

  // Malha de ruído: valores aleatórios em resolução baixa, lidos com
  // interpolação suave. Duas escalas somadas.
  const malha = (largura, altura) => {
    const m = [];
    for (let y = 0; y <= altura; y++) {
      const linha = [];
      for (let x = 0; x <= largura; x++) linha.push(aleatorio());
      m.push(linha);
    }
    return m;
  };

  const suave = (t) => t * t * (3 - 2 * t);
  const ler = (m, x, y, escala) => {
    const fx = x / escala;
    const fy = y / escala;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = suave(fx - x0);
    const ty = suave(fy - y0);
    const l0 = m[y0]?.[x0] ?? 0;
    const l1 = m[y0]?.[x0 + 1] ?? 0;
    const l2 = m[y0 + 1]?.[x0] ?? 0;
    const l3 = m[y0 + 1]?.[x0 + 1] ?? 0;
    return (l0 * (1 - tx) + l1 * tx) * (1 - ty) + (l2 * (1 - tx) + l3 * tx) * ty;
  };

  const grossa = malha(Math.ceil(colunas / 14) + 2, Math.ceil(linhas / 14) + 2);
  const fina = malha(Math.ceil(colunas / 5) + 2, Math.ceil(linhas / 5) + 2);

  // A cor base é a primeira faixa; as camadas dividem o resto do intervalo.
  const cores = [base, ...camadas.map((c) => c.cor)];
  const fatia = 1 / cores.length;

  const partes = [`<rect width="${LARGURA}" height="${ALTURA}" fill="${base}"/>`];

  for (let ly = 0; ly < linhas; ly++) {
    for (let lx = 0; lx < colunas; lx++) {
      const v = ler(grossa, lx, ly, 14) * 0.72 + ler(fina, lx, ly, 5) * 0.28;
      const indice = Math.min(cores.length - 1, Math.floor(v / fatia));
      if (indice === 0) continue; // já é o fundo
      partes.push(
        `<rect x="${lx * CELULA}" y="${ly * CELULA}" width="${CELULA}" height="${CELULA}" fill="${cores[indice]}"/>`,
      );
    }
  }

  return partes.join("");
}

const MOTORES = { lagarto, manchado, digital };

/* ============================================================
   Os padrões

   Cores derivadas da descrição textual publicada de cada padrão (família de
   cor e disposição). São aproximações de aparência — ver o cabeçalho.
   ============================================================ */

const PADROES = [
  // ---- Forças Armadas ----
  {
    id: "rajada-exercito-brasileiro",
    motor: "lagarto",
    base: "#b7c096",
    camadas: [
      { cor: "#3b4a2a", faixas: 13, largura: 30 },
      { cor: "#5b4038", faixas: 11, largura: 24 },
    ],
  },
  {
    id: "lagarto-exercito-brasileiro",
    motor: "lagarto",
    base: "#c9b98f",
    camadas: [
      { cor: "#6b5334", faixas: 12, largura: 30 },
      { cor: "#3f5233", faixas: 12, largura: 26 },
      { cor: "#2b2a24", faixas: 5, largura: 13 },
    ],
  },
  {
    id: "caatinga-exercito-brasileiro",
    motor: "lagarto",
    base: "#bcc9a0",
    camadas: [
      { cor: "#8a4a37", faixas: 12, largura: 29 },
      { cor: "#7fae86", faixas: 11, largura: 25 },
    ],
  },
  {
    id: "montanha-exercito-brasileiro",
    motor: "lagarto",
    base: "#c9b58a",
    camadas: [
      { cor: "#23211d", faixas: 10, largura: 26 },
      { cor: "#8c3a2e", faixas: 9, largura: 21 },
      { cor: "#5a6340", faixas: 10, largura: 25 },
    ],
  },
  {
    id: "lagarto-marinha-do-brasil",
    motor: "lagarto",
    base: "#a9bd88",
    camadas: [
      { cor: "#2f4429", faixas: 13, largura: 30 },
      { cor: "#6a7a44", faixas: 11, largura: 25 },
    ],
  },
  {
    id: "lagarto-forca-aerea-brasileira",
    motor: "lagarto",
    base: "#bfae83",
    camadas: [
      { cor: "#33452c", faixas: 12, largura: 29 },
      { cor: "#7a4a33", faixas: 10, largura: 23 },
      { cor: "#3b5068", faixas: 8, largura: 18 },
    ],
  },

  // ---- Polícias ----
  {
    id: "lagarto-urbano-batalhoes-de-choque",
    motor: "lagarto",
    base: "#c6c6c4",
    camadas: [
      { cor: "#1f1f1f", faixas: 12, largura: 28 },
      { cor: "#7d7f80", faixas: 11, largura: 25 },
    ],
  },
  {
    id: "lagarto-vertical-choque-sao-paulo",
    motor: "lagarto",
    base: "#b6c599",
    camadas: [
      { cor: "#2f4429", faixas: 13, largura: 29 },
      { cor: "#6a7a44", faixas: 11, largura: 24 },
    ],
  },
  {
    id: "manchado-urbano-policia",
    motor: "manchado",
    base: "#c6c6c4",
    camadas: [
      { cor: "#4d4f50", faixas: 9, largura: 26 },
      { cor: "#1c1c1c", faixas: 7, largura: 20 },
      { cor: "#a89e8c", faixas: 7, largura: 22 },
    ],
  },
  {
    id: "digital-urbana-forca-nacional",
    motor: "digital",
    base: "#b5b7b5",
    camadas: [
      { cor: "#7c7f80", faixas: 0, largura: 0 },
      { cor: "#4a4d4e", faixas: 0, largura: 0 },
      { cor: "#25282a", faixas: 0, largura: 0 },
    ],
  },
  {
    id: "digital-bope-pernambuco",
    motor: "digital",
    base: "#bda97e",
    camadas: [
      { cor: "#a8814f", faixas: 0, largura: 0 },
      { cor: "#5d6b3e", faixas: 0, largura: 0 },
      { cor: "#232320", faixas: 0, largura: 0 },
    ],
  },
  {
    id: "digital-deserto-cotar-ceara",
    motor: "digital",
    base: "#d8bda8",
    camadas: [
      { cor: "#c09a84", faixas: 0, largura: 0 },
      { cor: "#a2705c", faixas: 0, largura: 0 },
      { cor: "#6f4a3d", faixas: 0, largura: 0 },
    ],
  },
  {
    id: "digital-azul-policia-militar-pernambuco",
    motor: "digital",
    base: "#4a5f7d",
    camadas: [
      { cor: "#33475f", faixas: 0, largura: 0 },
      { cor: "#1f2d3f", faixas: 0, largura: 0 },
      { cor: "#7d92ac", faixas: 0, largura: 0 },
    ],
  },
  {
    // Lagarto desenhado e depois quantizado em blocos: é literalmente como o
    // padrão nasceu — a corporação pixelou o próprio lagarto que já usava.
    id: "lagarto-pixelado-policia-ambiental",
    motor: "lagarto",
    pixelar: 10,
    base: "#b0c08d",
    camadas: [
      { cor: "#33492c", faixas: 13, largura: 30 },
      { cor: "#6d7c48", faixas: 11, largura: 25 },
    ],
  },
];

/* ============================================================
   Geração
   ============================================================ */

await mkdir(DESTINO, { recursive: true });

for (const padrao of PADROES) {
  const aleatorio = prng(semear(padrao.id));
  const corpo = MOTORES[padrao.motor](padrao, aleatorio);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGURA_PADRAO}" height="${ALTURA_PADRAO}" viewBox="0 0 ${LARGURA_PADRAO} ${ALTURA_PADRAO}">${corpo}</svg>`;

  let imagem = sharp(Buffer.from(svg));

  if (padrao.pixelar) {
    // Reduz e amplia com vizinho mais próximo: a borda vira degrau, que é o
    // efeito do digipat, sem precisar de um motor separado.
    const larguraReduzida = Math.round(LARGURA_PADRAO / padrao.pixelar);
    imagem = sharp(
      await imagem
        .resize(larguraReduzida, Math.round(ALTURA_PADRAO / padrao.pixelar), {
          kernel: "nearest",
        })
        .png()
        .toBuffer(),
    ).resize(LARGURA_PADRAO, ALTURA_PADRAO, { kernel: "nearest" });
  }

  const saida = path.join(DESTINO, `${padrao.id}.webp`);
  /**
   * Padrão de borda dura (digital e pixelado) comprime mal: em qualidade 80 o
   * WebP cria halo em volta de cada bloco e o degrau vira borrão — justamente
   * a característica que a amostra existe para mostrar. Como esses arquivos
   * são os mais leves do conjunto (4 a 8 KB), subir a qualidade neles não
   * custa nada em peso de página.
   */
  const bordaDura = padrao.motor === "digital" || padrao.pixelar;
  const info = await imagem
    .webp({ quality: bordaDura ? 92 : QUALIDADE })
    .toFile(saida);
  console.log(
    `${padrao.id}.webp — ${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} KB`,
  );
}

/* ============================================================
   Capa do guia

   Um leque de amostras: seis faixas verticais, uma por padrão das Forças
   Armadas, separadas por um fio escuro. Diz em uma imagem o que o guia é —
   um catálogo comparativo — e usa o mesmo material das amostras, então a capa
   nunca desmente o conteúdo.

   Vai para src/assets/guias/, com o slug do guia, como manda o padrão do site.
   ============================================================ */

const CAPA_LARGURA = 1360;
const CAPA_ALTURA = 765;
const NA_CAPA = [
  "rajada-exercito-brasileiro",
  "lagarto-exercito-brasileiro",
  "caatinga-exercito-brasileiro",
  "montanha-exercito-brasileiro",
  "lagarto-marinha-do-brasil",
  "lagarto-forca-aerea-brasileira",
];

const faixaLargura = Math.ceil(CAPA_LARGURA / NA_CAPA.length);
const camadas = [];

for (const [i, id] of NA_CAPA.entries()) {
  const padrao = PADROES.find((p) => p.id === id);
  const aleatorio = prng(semear(id));

  /**
   * A faixa é desenhada JÁ no formato dela (estreita e alta), em vez de
   * recortar ou girar a amostra larga.
   *
   * Girar era o caminho curto e estava errado: a assinatura do lagarto
   * brasileiro é a listra VERTICAL, e a capa girada mostrava listra
   * horizontal — a imagem desmentia o texto do guia logo abaixo dela.
   * Esticar também não serve, porque deformaria a escala do desenho.
   */
  /**
   * A contagem de faixas foi calibrada para 1360px de largura. Reaproveitada
   * numa coluna de ~227px, ela empilharia treze listras num espaço que comporta
   * três, e a cor de fundo sumiria. Então a densidade acompanha a largura — a
   * ESPESSURA de cada listra fica igual, que é o que preserva a escala do
   * desenho entre a capa e as amostras.
   */
  const proporcao = faixaLargura / LARGURA_PADRAO;
  const padraoDaFaixa = {
    ...padrao,
    camadas: padrao.camadas.map((c) => ({
      ...c,
      faixas: Math.max(3, Math.round(c.faixas * proporcao)),
    })),
  };

  const corpo = MOTORES[padrao.motor](padraoDaFaixa, aleatorio, faixaLargura, CAPA_ALTURA);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${faixaLargura}" height="${CAPA_ALTURA}" viewBox="0 0 ${faixaLargura} ${CAPA_ALTURA}">${corpo}</svg>`;

  const faixa = await sharp(Buffer.from(svg)).png().toBuffer();

  camadas.push({ input: faixa, left: i * faixaLargura, top: 0 });
}

const capa = path.join("src/assets/guias", "guia-de-camuflagem-do-brasil.webp");
const infoCapa = await sharp({
  create: {
    width: CAPA_LARGURA,
    height: CAPA_ALTURA,
    channels: 3,
    background: "#0b0d09",
  },
})
  .composite(camadas)
  .webp({ quality: QUALIDADE })
  .toFile(capa);

console.log(
  `\ncapa: guia-de-camuflagem-do-brasil.webp — ${infoCapa.width}x${infoCapa.height}, ${(infoCapa.size / 1024).toFixed(1)} KB`,
);
console.log(`${PADROES.length} amostras em ${DESTINO}`);
