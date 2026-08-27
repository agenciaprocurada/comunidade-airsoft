/**
 * Regras do criador de mapa de operação. Compartilhadas entre a página
 * pública de enquadramento, o editor, o proxy de imagem e o painel —
 * os quatro precisam concordar sobre o que é um enquadramento válido.
 *
 * Vocabulário desta funcionalidade:
 *   ENQUADRAMENTO — lat, lng, zoom, rotação e formato. É o que o banco
 *     guarda no lugar da imagem, e o que reconstrói a base idêntica.
 *   BASE — a imagem de satélite crua, sempre quadrada, antes do corte.
 *   QUADRO — o recorte final, já rotacionado, no formato escolhido.
 *   CAMADAS — o desenho por cima (grade, áreas, rótulos, setas).
 */

/** Teto do gatilho `mapas_teto` no banco. Repetido aqui para a tela avisar antes de falhar. */
export const LIMITE_MAPAS = 30;

/**
 * Faixa de zoom aceita. O piso não é estético: abaixo de 15 o quadro
 * pega o município inteiro e nenhum setor de airsoft é legível. O teto
 * é limite de disponibilidade — acima dele boa parte do Brasil rural
 * não tem imagem e o provedor devolve tile cinza, o que parece bug do
 * site e não falta de foto. Cada provedor tem o seu (ver PROVEDORES).
 */
export const ZOOM_MIN = 15;
export const ZOOM_MAX = 20;
export const ZOOM_PADRAO = 18;

/**
 * Lado da base em pixels, sempre quadrada.
 *
 * 1280 é o teto imposto pelo Google: `size` para em 640 e `scale=2`
 * dobra a saída sem mudar a área coberta. A Esri não teria esse limite
 * — tile é livre —, mas os dois provedores usam o mesmo lado de
 * propósito: assim um mapa salvo abre igual em qualquer um dos dois, e
 * o recorte de `quadroInscrito` não muda de resultado por baixo do
 * usuário.
 *
 * Quadrada mesmo para formato largo: é a margem que a rotação precisa.
 * Girar um quadro já cortado deixaria canto vazio; girar dentro do
 * quadrado, não.
 */
export const BASE_PEDIDO = 640;
export const BASE_ESCALA = 2;
export const BASE_LADO = BASE_PEDIDO * BASE_ESCALA;

// ------------------------------------------------------------
// Provedor da imagem de satélite
//
// Dois, e a escolha é automática: se `GOOGLE_MAPS_API_KEY` existir no
// ambiente, o site usa Google; senão, Esri. Não há tela de
// configuração e nem deve haver — a decisão é de operação, não de
// usuário.
//
// A Esri é o padrão porque funciona com ZERO configuração: sem chave,
// sem cadastro, sem cartão. O site inteiro sobe num clone novo e o
// criador de mapa já funciona.
//
// A diferença que importa entre os dois não é qualidade de imagem, é
// COMO a imagem chega:
//
//   Google  — uma requisição devolve a imagem pronta, no máximo
//             1280x1280, e sem cabeçalho CORS. Precisa passar pelo
//             nosso servidor (ver api/mapa/base.ts).
//   Esri    — tiles de 256px com `access-control-allow-origin: *`. O
//             navegador busca direto e monta o mosaico, sem servidor
//             no meio e sem gastar execução na Vercel. Como não há
//             limite de uma requisição, a base pode ser maior que a
//             do Google.
// ------------------------------------------------------------

export const PROVEDORES = {
  esri: {
    rotulo: "Esri World Imagery",
    /** Vai impressa no rodapé do mapa exportado. Não é opcional. */
    atribuicao: "Imagem: Esri, Maxar, Earthstar Geographics",
    /**
     * 19 e não 20: em oito pontos do Brasil testados, o zoom 20 não
     * existe em nenhum e o 19 falha em parte do interior. Oferecer um
     * nível que devolve tile cinza faz o usuário achar que o site
     * quebrou.
     */
    zoomMax: 19,
    /**
     * Note a ordem: o caminho da Esri é /{z}/{y}/{x} — linha antes de
     * coluna, ao contrário da convenção XYZ da maioria dos provedores.
     * Trocar os dois devolve tiles de outro lugar do planeta, com
     * status 200, o que é bem pior que um erro.
     */
    urlTile: (z: number, x: number, y: number) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    /** O mesmo endereço no formato de template que o Leaflet espera. */
    padraoTile:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  },
  google: {
    rotulo: "Google Maps",
    atribuicao: "Imagem: Google",
    zoomMax: 20,
    // A Static API entrega a imagem inteira numa requisição, não em
    // tiles — e sem CORS, por isso passa pelo nosso servidor.
    urlTile: null,
    padraoTile: null,
  },
} as const;

export type Provedor = keyof typeof PROVEDORES;

export const PROVEDOR_PADRAO: Provedor = "esri";

export function ehProvedor(valor: unknown): valor is Provedor {
  return typeof valor === "string" && valor in PROVEDORES;
}

/** O que `/api/mapa/config` devolve, e de onde o cliente tira tudo. */
export interface ConfigMapa {
  provedor: Provedor;
  atribuicao: string;
  zoomMax: number;
  /** Só o Google precisa passar pelo nosso servidor. */
  viaServidor: boolean;
}

export const LADO_TILE = 256;

/**
 * Coordenada geográfica → pixel global em Web Mercator.
 *
 * "Pixel global" é o sistema em que o mundo inteiro tem
 * `256 * 2^zoom` pixels de lado. É nele que a conta de mosaico fecha:
 * o tile (x, y) ocupa os pixels de `x*256` a `x*256+255`, então saber
 * o pixel do centro é o bastante para descobrir quais tiles pedir e
 * onde desenhar cada um.
 */
export function paraPixelGlobal(lat: number, lng: number, zoom: number) {
  const mundo = LADO_TILE * 2 ** zoom;
  const radianos = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * mundo,
    y:
      ((1 - Math.log(Math.tan(radianos) + 1 / Math.cos(radianos)) / Math.PI) / 2) *
      mundo,
  };
}

export interface PecaDoMosaico {
  z: number;
  x: number;
  y: number;
  /** Onde desenhar no canvas da base. */
  esquerda: number;
  topo: number;
}

/**
 * Quais tiles buscar e onde colar cada um para montar uma base
 * quadrada de `lado` pixels centrada em (lat, lng).
 *
 * O recorte não cai em múltiplo de tile quase nunca, então as bordas
 * do mosaico ficam para fora do canvas de propósito — desenhar o tile
 * inteiro e deixar o canvas cortar é mais simples e mais exato do que
 * calcular recorte parcial por tile.
 */
export function montarMosaico(
  lat: number,
  lng: number,
  zoom: number,
  lado = BASE_LADO,
): PecaDoMosaico[] {
  const centro = paraPixelGlobal(lat, lng, zoom);
  const origemX = centro.x - lado / 2;
  const origemY = centro.y - lado / 2;

  const primeiroX = Math.floor(origemX / LADO_TILE);
  const primeiroY = Math.floor(origemY / LADO_TILE);
  const ultimoX = Math.floor((origemX + lado - 1) / LADO_TILE);
  const ultimoY = Math.floor((origemY + lado - 1) / LADO_TILE);

  const limite = 2 ** zoom;
  const pecas: PecaDoMosaico[] = [];

  for (let ty = primeiroY; ty <= ultimoY; ty++) {
    // Fora do intervalo vertical não existe mundo — perto dos polos o
    // mosaico simplesmente tem menos linhas.
    if (ty < 0 || ty >= limite) continue;
    for (let tx = primeiroX; tx <= ultimoX; tx++) {
      // Na horizontal o mundo dá a volta: tile -1 é o último da fila.
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

/**
 * Formatos do quadro final.
 *
 * Quatro porque o mapa tem quatro destinos reais e cada um quer uma
 * proporção: WhatsApp e story (retrato), folha impressa (paisagem),
 * projetor do briefing (largo) e grade de setores, que fica quadrada
 * porque setor retangular confunde na hora de chamar coordenada.
 */
export const FORMATOS = {
  /**
   * `proporcao: null` = a proporção vem da TELA de quem edita. É o
   * padrão porque foi o pedido mais repetido do dono do produto: o
   * mapa ocupando toda a área de trabalho, sem sobra nas laterais.
   * Os formatos fixos continuam existindo para quem exporta com
   * destino certo (impressão, story, projetor).
   */
  livre: { rotulo: "Livre", ajuda: "Preenche a tela", proporcao: null },
  quadrado: { rotulo: "Quadrado", ajuda: "Grade de setores", proporcao: 1 },
  paisagem: { rotulo: "Paisagem", ajuda: "Folha impressa", proporcao: 4 / 3 },
  largo: { rotulo: "Largo", ajuda: "Projetor, briefing", proporcao: 16 / 9 },
  retrato: { rotulo: "Retrato", ajuda: "Celular, story", proporcao: 9 / 16 },
} as const;

export type Formato = keyof typeof FORMATOS;

export const FORMATO_PADRAO: Formato = "largo";

export function ehFormato(valor: unknown): valor is Formato {
  return typeof valor === "string" && valor in FORMATOS;
}

// ------------------------------------------------------------
// Registro
// ------------------------------------------------------------

export interface Mapa {
  id: string;
  usuario_id: string;
  nome: string;
  campo_id: string | null;
  lat: number;
  lng: number;
  zoom: number;
  rotacao: number;
  formato: Formato;
  /** Documento do editor. Ver `CamadasMapa`. */
  dados: CamadasMapa;
  publicado_url: string | null;
  publicado_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export const COLUNAS_MAPA =
  "id, usuario_id, nome, campo_id, lat, lng, zoom, rotacao, formato, dados, " +
  "publicado_url, publicado_em, criado_em, atualizado_em";

/**
 * O desenho, como o editor grava.
 *
 * `objetos` é o JSON nativo do Fabric — não reescrevemos esse formato
 * porque ele já é estável entre versões e é o que o editor consegue
 * recarregar sem tradução. A grade fica FORA dele de propósito: ela é
 * gerada a partir de três números, e serializar 90 linhas e 90 rótulos
 * que dá para recalcular seria inchar o registro à toa.
 */
export interface CamadasMapa {
  grade?: Grade;
  /** Objetos do Fabric (áreas, rótulos, setas, pinos). */
  objetos?: unknown[];
  /** Barra de escala impressa no canto do quadro. */
  escala?: boolean;
  /** Rosa dos ventos, já compensando a rotação da base. */
  norte?: boolean;
  /** Escurecimento aplicado sobre o satélite, 0 a 1. */
  veu?: number;
  /**
   * Encaixe fino da foto SOB a grade: escala e deslocamento em pixels
   * do documento. Existe porque a grade é fixa — é o vocabulário do
   * jogo ("B4") — e quem se ajusta para o terreno cair bonito nas
   * células é a imagem, nunca o contrário.
   */
  base?: { escala: number; dx: number; dy: number };
  /** Trava do mapa: nada desloca a foto enquanto ligada. */
  travado?: boolean;
  /**
   * Dimensões exatas do documento quando o formato é `livre` — a
   * proporção era a da tela de quem salvou, e reabrir noutra tela não
   * pode deslocar o desenho. Formatos fixos ignoram este campo.
   */
  doc?: { largura: number; altura: number };
  /**
   * URL pública (bucket `mapas`) da imagem que o usuário enviou para
   * usar como fundo no lugar do satélite. Presente = modo imagem
   * própria; escala, norte e crédito de provedor não se aplicam.
   */
  imagemPropria?: string;
}

/**
 * Estilos de traço, compartilhados por área, linha e rota.
 *
 * Os valores são `strokeDashArray` do Fabric. Existem como constante
 * porque o painel de estilos, o desenho e o carregamento de um mapa
 * salvo precisam concordar sobre o que "tracejado" significa — dois
 * lugares definindo o mesmo padrão sempre divergem na primeira mudança.
 */
export const TRACOS = {
  solido: { rotulo: "Sólido", padrao: null },
  tracejado: { rotulo: "Tracejado", padrao: [12, 8] },
  pontilhado: { rotulo: "Pontilhado", padrao: [2, 7] },
  traco_ponto: { rotulo: "Traço e ponto", padrao: [14, 6, 2, 6] },
} as const;

export type Traco = keyof typeof TRACOS;

/**
 * Padrão do traço numa cópia mutável.
 *
 * O `as const` acima congela os arrays, e o Fabric declara
 * `strokeDashArray` como `number[]` — passar o readonly direto não
 * compila. Copiar também evita o problema pior: um objeto do canvas
 * guardando referência à constante e alterando o padrão de todos os
 * outros ao ser modificado.
 */
export function padraoDoTraco(traco: Traco): number[] | undefined {
  const padrao = TRACOS[traco].padrao;
  return padrao ? [...padrao] : undefined;
}

/** Paleta do editor. Curta de propósito: mapa com dez cores não se lê. */
export const CORES = [
  { chave: "oliva", rotulo: "Oliva", valor: "#8fae4b" },
  { chave: "vermelho", rotulo: "Vermelho", valor: "#ef4444" },
  { chave: "ambar", rotulo: "Âmbar", valor: "#f2b705" },
  { chave: "azul", rotulo: "Azul", valor: "#3b82f6" },
  { chave: "branco", rotulo: "Branco", valor: "#ffffff" },
  { chave: "roxo", rotulo: "Roxo", valor: "#a855f7" },
] as const;

/**
 * Grade de setores.
 *
 * Colunas viram letra (A, B, C...) e linhas viram número (1, 2, 3...),
 * que é como o pessoal já chama posição no rádio — "inimigo no B4".
 * Inverter isso obrigaria a reaprender o vocabulário do próprio jogo.
 */
export interface Grade {
  ligada: boolean;
  colunas: number;
  linhas: number;
  cor: string;
  espessura: number;
  /** 0 a 1. A grade tem que orientar sem esconder o terreno embaixo. */
  opacidade: number;
  /** Marca dentro de cada célula ("B4"), além das réguas de borda. */
  rotulos: boolean;
  /** Régua de letras no topo. */
  letras: boolean;
  /** Régua de números na lateral. */
  numeros: boolean;
}

export const GRADE_PADRAO: Grade = {
  ligada: true,
  colunas: 10,
  linhas: 10,
  cor: "#f2b705",
  espessura: 1.5,
  opacidade: 0.55,
  rotulos: true,
  letras: true,
  numeros: true,
};

/**
 * Largura da faixa de régua, em pixels do documento.
 *
 * A régua é desenhada DENTRO do mapa exportado, e não como moldura da
 * interface. Parece detalhe e não é: uma régua que só existe na tela do
 * editor some do PNG, e aí quem recebe o mapa no grupo não consegue
 * usar "inimigo no B4" — que é a razão de a grade existir.
 */
export const REGUA = 30;

/** Mais que isso vira hachura: as células ficam menores que o rótulo. */
export const GRADE_MAX = 12;
export const GRADE_MIN = 2;

/** A, B, ... Z, AA, AB... — mesma contagem de coluna de planilha. */
export function letraDaColuna(indice: number): string {
  let restante = indice;
  let saida = "";
  do {
    saida = String.fromCharCode(65 + (restante % 26)) + saida;
    restante = Math.floor(restante / 26) - 1;
  } while (restante >= 0);
  return saida;
}

// ------------------------------------------------------------
// Áreas — o vocabulário pronto
//
// O organizador não deve ter que inventar nome nem escolher cor para
// marcar o estacionamento. Preset com cor fixa também faz mapas de
// campos diferentes ficarem legíveis pela mesma convenção: safe é
// sempre azul, respawn é sempre verde do lado dele.
// ------------------------------------------------------------

export const AREAS = {
  estacionamento: { rotulo: "Estacionamento", cor: "#8b8f8a" },
  concentracao: { rotulo: "Concentração", cor: "#f2b705" },
  safe: { rotulo: "Safe zone", cor: "#3b82f6" },
  cqb: { rotulo: "CQB", cor: "#ef4444" },
  respawn: { rotulo: "Respawn", cor: "#22c55e" },
  objetivo: { rotulo: "Objetivo", cor: "#a855f7" },
  proibido: { rotulo: "Área proibida", cor: "#dc2626" },
  cronografo: { rotulo: "Cronógrafo", cor: "#f97316" },
} as const;

export type TipoArea = keyof typeof AREAS;

// ------------------------------------------------------------
// Enquadramento
// ------------------------------------------------------------

export interface Enquadramento {
  lat: number;
  lng: number;
  zoom: number;
  rotacao: number;
  formato: Formato;
}

/**
 * Sanear o que veio da URL.
 *
 * Isso não é paranoia de tipagem: `/api/mapa/base` gasta cota de uma
 * API paga a cada chamada, e os parâmetros chegam da querystring. Sem
 * saneamento, um zoom absurdo ou um lat inventado vira requisição
 * cobrada que devolve erro. Aqui tudo é grampeado para a faixa válida
 * em vez de rejeitado, porque o caso comum de valor fora de faixa é
 * arredondamento do próprio front, não ataque.
 */
export function lerEnquadramento(params: URLSearchParams): Enquadramento | null {
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const zoomCru = Math.round(Number(params.get("z")));
  // O piso do PROXY fica dois níveis abaixo do piso da interface: o
  // cliente busca a base do Google em zoom−nível para manter 1 px =
  // 1 px global (ver obterBase). Grampear aqui em ZOOM_MIN devolveria
  // silenciosamente outro zoom e reintroduziria o desvio geométrico.
  const zoom = Number.isFinite(zoomCru)
    ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN - 2, zoomCru))
    : ZOOM_PADRAO;

  const rotacaoCrua = Math.round(Number(params.get("r")));
  const rotacao = Number.isFinite(rotacaoCrua) ? ((rotacaoCrua % 360) + 360) % 360 : 0;

  const formatoCru = params.get("f");
  const formato = ehFormato(formatoCru) ? formatoCru : FORMATO_PADRAO;

  // 6 casas ≈ 11 cm. Cortar aqui faz coordenadas praticamente iguais
  // virarem a MESMA URL, e é o que deixa o cache do CDN funcionar em
  // vez de buscar de novo por causa da décima segunda casa decimal.
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    zoom,
    rotacao,
    formato,
  };
}

/**
 * Lado que a base precisa ter para cobrir o documento mesmo girada.
 *
 * É o problema do `quadroInscrito` de cabeça para baixo. Lá o documento
 * encolhia para caber na base; aqui o documento tem tamanho fixo — é o
 * que permite girar sem a área de trabalho mudar de tamanho debaixo do
 * desenho — e quem cresce é a base.
 *
 * Um retângulo w×h girado por θ tem bounding box
 *   (w·|cos| + h·|sen|) × (w·|sen| + h·|cos|)
 * e a base é quadrada, então o lado precisa ser o maior dos dois. Sem
 * isso, girar 45° deixaria triângulos pretos nos quatro cantos.
 *
 * O teto de 2048 é prudência com memória: são 4 milhões de pixels por
 * canvas, e o navegador de celular começa a falhar acima disso.
 */
export function ladoDaBase(largura: number, altura: number, rotacao: number): number {
  const radianos = (rotacao * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radianos));
  const sen = Math.abs(Math.sin(radianos));
  const preciso = Math.max(largura * cos + altura * sen, largura * sen + altura * cos);
  return Math.min(2048, Math.ceil(preciso));
}

/**
 * Maior quadro do formato pedido que cabe na base girada.
 *
 * O problema: girar uma imagem quadrada e recortar um retângulo dela
 * deixa canto vazio se o retângulo for grande demais. A conta abaixo
 * devolve o maior recorte que NÃO deixa canto vazio.
 *
 * Como se chega nela: um retângulo w×h centrado e girado por θ dentro
 * de um quadrado de lado L tem seus extremos em
 *   x = ±(w·cos θ + h·sen θ)/2   e   y = ±(w·sen θ + h·cos θ)/2
 * Estar dentro do quadrado é exatamente os dois ficarem ≤ L/2. Com
 * h = w/proporção, isola-se w e sobra o divisor abaixo. É exato, não
 * uma margem de segurança chutada — em 0° o quadro usa a base inteira.
 */
export function quadroInscrito(formato: Formato, rotacao: number, lado = BASE_LADO) {
  // Livre nao passa por aqui; o fallback so protege o tipo.
  const proporcao = FORMATOS[formato].proporcao ?? 16 / 9;
  const radianos = (rotacao * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radianos));
  const sen = Math.abs(Math.sin(radianos));

  const divisor = Math.max(cos + sen / proporcao, sen + cos / proporcao);
  const largura = lado / divisor;

  return {
    largura: Math.floor(largura),
    altura: Math.floor(largura / proporcao),
  };
}

/**
 * Metros por pixel na base, para a barra de escala.
 *
 * 156543.03392 é a circunferência da Terra em metros dividida por 256
 * (o lado do tile em Web Mercator). O cosseno da latitude entra porque
 * Mercator estica o mapa conforme afasta do equador — sem ele, um campo
 * no Rio Grande do Sul sairia com escala errada por quase 30%.
 */
export function metrosPorPixel(lat: number, zoom: number, escala = BASE_ESCALA): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / (2 ** zoom * escala);
}

/** Régua com número redondo: 50 m em vez de 47 m. */
export function barraDeEscala(lat: number, zoom: number, larguraMaxPx: number) {
  const mpp = metrosPorPixel(lat, zoom);
  const alvo = mpp * larguraMaxPx;
  const passos = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
  const metros = passos.filter((p) => p <= alvo).pop() ?? passos[0];
  return { metros, pixels: Math.round(metros / mpp) };
}

/**
 * O que o editor grava quando o mapa ainda não tem desenho nenhum.
 * Existe para o painel e o editor nunca lidarem com `dados` vazio.
 */
export function camadasIniciais(): CamadasMapa {
  return {
    grade: { ...GRADE_PADRAO },
    objetos: [],
    escala: true,
    norte: true,
    // Um véu leve por padrão: satélite cru é claro e ruidoso, e linha
    // fina de grade sobre telhado branco some. 0.18 escurece o
    // suficiente para o desenho ler sem apagar o terreno.
    veu: 0.18,
  };
}

/**
 * Dimensões do documento para um formato. Sempre 1280 no lado maior.
 *
 * Para o formato `livre`, a proporção vem de fora (a da área de
 * trabalho de quem edita); o 16/9 é só o fallback de quem chamar sem
 * medir a tela. A proporção é grampeada a [0.5, 2.4] para um monitor
 * ultrawide não gerar um documento-fita inutilizável.
 */
export function tamanhoDoDocumento(formato: Formato, proporcaoLivre = 16 / 9) {
  const fixa = FORMATOS[formato].proporcao;
  const proporcao =
    fixa ?? Math.min(2.4, Math.max(0.5, proporcaoLivre));
  return proporcao >= 1
    ? { largura: BASE_LADO, altura: Math.round(BASE_LADO / proporcao) }
    : { largura: Math.round(BASE_LADO * proporcao), altura: BASE_LADO };
}

/** Nome sugerido quando o mapa nasce a partir de uma ficha do diretório. */
export function nomeSugerido(campo: string | null, cidade: string | null): string {
  if (campo) return campo.slice(0, 80);
  if (cidade) return `Mapa — ${cidade}`.slice(0, 80);
  return "Mapa sem nome";
}
