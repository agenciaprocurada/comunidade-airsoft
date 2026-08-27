/**
 * Como a imagem de satélite de um enquadramento é obtida.
 *
 * Mora fora do editor porque duas telas precisam da MESMA imagem: o
 * passo de alinhamento, que a mostra girando atrás da moldura, e o
 * editor, que a usa de fundo. Quando isso vivia só dentro do editor, a
 * prévia continuou pedindo a rota do Google e ficava preta sempre que
 * o provedor era outro.
 */

import { BASE_LADO, PROVEDORES, montarMosaico, type ConfigMapa, type Enquadramento } from "../../lib/mapa";

/** Fundo do mosaico: aparece onde um tile faltar. */
const VAZIO = "#0b0d09";

/**
 * Monta a base a partir dos tiles do provedor, no próprio navegador.
 *
 * Cada tile vem de um servidor que manda `access-control-allow-origin:
 * *`, e são carregados com `crossOrigin: anonymous` — as duas coisas
 * juntas são o que mantém o canvas limpo. Se qualquer uma faltar, o
 * canvas fica *tainted* e o botão de baixar quebra com SecurityError.
 *
 * Um tile que falha não derruba o mosaico: fica um quadrado escuro no
 * lugar e o resto do mapa continua utilizável. É o comportamento certo
 * para conexão ruim, que é o caso comum aqui.
 */
export async function montarBaseDeTiles(
  enquadramento: Pick<Enquadramento, "lat" | "lng" | "zoom">,
  config: ConfigMapa,
  lado = BASE_LADO,
): Promise<HTMLCanvasElement> {
  const provedor = PROVEDORES[config.provedor];
  if (!provedor.urlTile) throw new Error(`Provedor ${config.provedor} não serve tiles.`);

  const tela = document.createElement("canvas");
  tela.width = lado;
  tela.height = lado;

  const pincel = tela.getContext("2d")!;
  pincel.fillStyle = VAZIO;
  pincel.fillRect(0, 0, lado, lado);

  const pecas = montarMosaico(enquadramento.lat, enquadramento.lng, enquadramento.zoom, lado);

  const carregadas = await Promise.all(
    pecas.map(
      (peca) =>
        new Promise<{ peca: (typeof pecas)[number]; img: HTMLImageElement } | null>((resolver) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolver({ peca, img });
          img.onerror = () => resolver(null);
          img.src = provedor.urlTile!(peca.z, peca.x, peca.y);
        }),
    ),
  );

  let falhas = 0;
  for (const item of carregadas) {
    if (!item) {
      falhas++;
      continue;
    }
    pincel.drawImage(item.img, item.peca.esquerda, item.peca.topo);
  }

  if (falhas === pecas.length) throw new Error("Nenhum tile carregou.");
  return tela;
}

/**
 * A base pronta, do tamanho pedido, venha ela de onde vier.
 *
 * O editor chama só esta função e não precisa saber qual provedor está
 * ativo. A diferença que ela esconde:
 *
 *   Esri   — tiles avulsos, e o mosaico é montado no tamanho exato.
 *   Google — a Static API devolve uma imagem pronta de no máximo
 *            1280×1280 e não aceita pedir maior. Quando o documento
 *            girado precisa de mais que isso, a imagem é ampliada para
 *            cobrir. Perde nitidez, e é o preço de usar um provedor que
 *            entrega quadro fechado em vez de tiles.
 *
 * Devolve sempre um canvas de mesma origem, o que mantém o canvas do
 * editor exportável.
 */
export async function obterBase(
  enquadramento: Pick<Enquadramento, "lat" | "lng" | "zoom">,
  config: ConfigMapa,
  lado = BASE_LADO,
): Promise<HTMLCanvasElement> {
  if (!config.viaServidor) return await montarBaseDeTiles(enquadramento, config, lado);

  const { lat, lng, zoom } = enquadramento;
  const url = `/api/mapa/base?lat=${lat}&lng=${lng}&z=${zoom}`;

  const imagem = await new Promise<HTMLImageElement>((resolver, rejeitar) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolver(img);
    img.onerror = () => rejeitar(new Error("A imagem de satélite não carregou."));
    img.src = url;
  });

  const tela = document.createElement("canvas");
  tela.width = lado;
  tela.height = lado;
  const pincel = tela.getContext("2d")!;
  pincel.fillStyle = VAZIO;
  pincel.fillRect(0, 0, lado, lado);
  pincel.drawImage(imagem, 0, 0, lado, lado);
  return tela;
}
