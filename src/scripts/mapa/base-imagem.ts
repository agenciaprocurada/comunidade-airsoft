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
 *   Google — a Static API devolve no máximo 1280 px de cobertura por
 *            chamada. Para um `lado` maior, a busca desce níveis de
 *            zoom (cada nível dobra a área por pixel) e o recorte
 *            central é reamplificado na potência de 2 exata.
 *
 * O CONTRATO desta função é geométrico e inegociável: no canvas
 * devolvido, 1 pixel = 1 pixel da malha global de Mercator no `zoom`
 * pedido. A recentragem do arrasto, a trava de cobertura, a dobra de
 * zoom e a barra de escala fazem conta em cima disso. A primeira
 * versão esticava os 1280 do Google direto para o `lado` (1632) — a
 * régua ficava ~27% mentirosa e, pior, a recentragem convertia o
 * arrasto com o fator errado: soltar o mouse fazia o mapa "pular" para
 * um lugar 27% aquém do arrastado.
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

  /**
   * A COBERTURA da Static API com size=640 e scale=2 é de 640 px
   * globais — o scale=2 dobra os pixels, NÃO a área ("same coverage
   * area", e foi MEDIDO aqui contra tiles Esri do mesmo centro:
   * g = 0,500 cravado). Cada pixel da imagem vale 0,5·2^níveis px
   * globais do zoom pedido. lado=1632 → 2 níveis (cobre 2560).
   */
  const niveis = Math.max(0, Math.ceil(Math.log2(lado / 640)));
  const zoomBusca = zoom - niveis;
  const url = `/api/mapa/base?lat=${lat}&lng=${lng}&z=${zoomBusca}`;

  const imagem = await new Promise<HTMLImageElement>((resolver, rejeitar) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolver(img);
    img.onerror = () => rejeitar(new Error("A imagem de satélite não carregou."));
    img.src = url;
  });

  // Pixel da imagem = 0,5·2^niveis px globais do zoom pedido, então o
  // recorte central de `2·lado / 2^niveis` px de imagem cobre
  // exatamente `lado` px globais, e a ampliação devolve o contrato.
  const fonteLado = (2 * lado) / 2 ** niveis;
  const origemX = (imagem.naturalWidth - fonteLado) / 2;
  const origemY = (imagem.naturalHeight - fonteLado) / 2;

  const tela = document.createElement("canvas");
  tela.width = lado;
  tela.height = lado;
  const pincel = tela.getContext("2d")!;
  pincel.fillStyle = VAZIO;
  pincel.fillRect(0, 0, lado, lado);
  pincel.drawImage(imagem, origemX, origemY, fonteLado, fonteLado, 0, 0, lado, lado);
  return tela;
}
