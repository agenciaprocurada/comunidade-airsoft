/**
 * Editor do mapa de operação.
 *
 * Roda só no navegador: o Fabric é a dependência mais pesada do site e
 * é carregado por `import()` quando a ferramenta abre.
 *
 * A ideia central é a separação entre DOCUMENTO e VISTA. O documento
 * tem tamanho fixo em pixels (1280 no lado maior) e é o que sai no PNG;
 * a vista é o quanto dele cabe na tela, e muda com a janela e com o
 * zoom. Sem essa separação, redimensionar a janela mudaria o tamanho da
 * imagem exportada — e o desenho junto.
 *
 * Divisão com `lib/mapa.ts`: lá ficam as regras que servidor e cliente
 * compartilham; aqui, só o que depende de canvas.
 */

import {
  Canvas,
  Circle,
  Ellipse,
  FabricImage,
  FabricObject,
  FabricText,
  Group,
  Line,
  Path,
  Point,
  Polygon,
  Polyline,
  Rect,
  Shadow,
  Textbox,
  type TPointerEventInfo,
} from "fabric";

import {
  BASE_LADO,
  GRADE_PADRAO,
  PROVEDORES,
  PROVEDOR_PADRAO,
  REGUA,
  barraDeEscala,
  camadasIniciais,
  ladoDaBase,
  letraDaColuna,
  paraPixelGlobal,
  LADO_TILE,
  padraoDoTraco,
  tamanhoDoDocumento,
  type CamadasMapa,
  type ConfigMapa,
  type Enquadramento,
  type Grade,
  type Traco,
} from "../../lib/mapa";
import { SIMBOLOS, type TipoSimbolo } from "../../lib/simbolos";
import { obterBase } from "./base-imagem";
import logoUrl from "../../assets/logo.webp";

/**
 * O logo, em silhueta branca, pronto para o canvas.
 *
 * O arquivo é o mesmo do cabeçalho do site — preto sobre fundo claro —
 * e a inversão usa a MESMA receita do CSS (`.logo`: brightness(0) +
 * invert(1)), para a marca no mapa ser a mesma marca do site. Branco
 * com sombra escura é a única combinação que lê sobre satélite, que
 * tem áreas claras e escuras na mesma imagem.
 *
 * Cache de módulo: o bitmap invertido é gerado uma vez por sessão,
 * não a cada redesenho de enfeites.
 */
let marcaBranca: HTMLCanvasElement | null = null;
let marcaPromessa: Promise<HTMLCanvasElement | null> | null = null;

function carregarMarca(): Promise<HTMLCanvasElement | null> {
  if (marcaBranca) return Promise.resolve(marcaBranca);
  marcaPromessa ??= new Promise((resolver) => {
    const imagem = new Image();
    imagem.onload = () => {
      const tela = document.createElement("canvas");
      tela.width = imagem.naturalWidth;
      tela.height = imagem.naturalHeight;
      const pincel = tela.getContext("2d")!;
      pincel.filter = "brightness(0) invert(1)";
      pincel.drawImage(imagem, 0, 0);
      marcaBranca = tela;
      resolver(tela);
    };
    imagem.onerror = () => resolver(null);
    // Vem do bundle (mesma origem): o canvas continua exportável. O
    // import de imagem no Astro entrega metadados; a URL fica em .src.
    imagem.src = logoUrl.src;
  });
  return marcaPromessa;
}

/**
 * Propriedades próprias que o Fabric precisa conhecer para serializar.
 *
 * `ehEnfeite` marca o que o editor gera sozinho (grade, régua, escala,
 * norte, véu): são recalculados a partir de meia dúzia de números e
 * ficam fora do JSON salvo. `rotuloCamada` é o nome que aparece no
 * painel de camadas.
 */
declare module "fabric" {
  interface FabricObject {
    ehEnfeite?: boolean;
    rotuloCamada?: string;
    tipoCamada?: TipoCamada;
  }
}

FabricObject.customProperties = ["rotuloCamada", "tipoCamada"];

export type TipoCamada = "area" | "linha" | "rota" | "texto" | "marcacao" | "simbolo";

export type Ferramenta =
  | "selecionar"
  | "mover"
  | "area"
  | "linha"
  | "rota"
  | "texto"
  | "marcacao";

export interface EstiloAtual {
  cor: string;
  traco: Traco;
  espessura: number;
}

export interface ItemCamada {
  id: string;
  rotulo: string;
  tipo: TipoCamada;
  cor: string;
  visivel: boolean;
  ativo: boolean;
}

export interface OpcoesEditor {
  canvas: HTMLCanvasElement;
  /** Container do canvas. Dá o tamanho da área visível. */
  palco?: HTMLElement;
  enquadramento: Enquadramento;
  camadas?: CamadasMapa;
  config?: ConfigMapa;
  /** Desenho mudou — a tela liga o botão de salvar e redesenha camadas. */
  aoMudar?: () => void;
  /** Ferramenta terminou o traço e volta para "selecionar". */
  aoTerminarFerramenta?: () => void;
  /** Zoom mudou — a tela atualiza o indicador de porcentagem. */
  aoNavegar?: (zoom: number) => void;
  /** Seleção mudou — o painel de camadas destaca o item ativo. */
  aoSelecionar?: () => void;
  /** O encaixe mudou (roda, dobra ou recentragem) — a tela sincroniza. */
  aoEncaixar?: (info: { zoom: number; lat: number; lng: number }) => void;
  /** Proporção da área de trabalho, usada quando o formato é `livre`. */
  proporcaoLivre?: number;
  /**
   * Dimensões exatas do documento, se já se sabe (mapa `livre` salvo
   * noutra tela). Vence a conta por formato: o desenho foi feito
   * naquelas coordenadas.
   */
  tamanho?: { largura: number; altura: number };
}

/** Limites do zoom da vista. Não afetam a imagem exportada. */
const ZOOM_VISTA_MIN = 0.1;
const ZOOM_VISTA_MAX = 4;

const CONFIG_PADRAO: ConfigMapa = {
  provedor: PROVEDOR_PADRAO,
  atribuicao: PROVEDORES[PROVEDOR_PADRAO].atribuicao,
  zoomMax: PROVEDORES[PROVEDOR_PADRAO].zoomMax,
  viaServidor: false,
};

/** Contorno escuro atrás do texto: satélite tem fundo claro e escuro na mesma imagem. */
function sombraDeLeitura() {
  return new Shadow({ color: "rgba(0,0,0,0.9)", blur: 6, offsetX: 0, offsetY: 1 });
}

/** `#rrggbb` + alfa em hexadecimal, que é o formato que o Fabric aceita em `fill`. */
function comAlfa(cor: string, alfa: number) {
  const inteiro = Math.round(Math.min(1, Math.max(0, alfa)) * 255);
  return `${cor}${inteiro.toString(16).padStart(2, "0")}`;
}

export class EditorMapa {
  readonly canvas: Canvas;

  private enquadramento: Enquadramento;
  private camadas: CamadasMapa;
  private config: ConfigMapa;

  private enfeites: FabricObject[] = [];
  private aoMudar?: () => void;
  private aoTerminarFerramenta?: () => void;
  private aoNavegar?: (zoom: number) => void;
  private aoSelecionar?: () => void;
  private aoEncaixar?: (info: { zoom: number; lat: number; lng: number }) => void;

  /** Tamanho do documento — o que sai no PNG. Não muda com a janela. */
  private largura: number;
  private altura: number;

  private ferramenta: Ferramenta = "selecionar";
  private estilo: EstiloAtual = { cor: "#8fae4b", traco: "tracejado", espessura: 3 };

  /** Vértices do traço em andamento (área, linha, rota). */
  private pontos: Point[] = [];
  private previa: FabricObject[] = [];

  private historico: string[] = [];
  private posicaoHistorico = -1;
  private restaurando = false;

  private proximaMarcacao = 1;

  constructor(opcoes: OpcoesEditor) {
    this.enquadramento = opcoes.enquadramento;
    this.camadas = { ...camadasIniciais(), ...(opcoes.camadas ?? {}) };
    this.config = opcoes.config ?? CONFIG_PADRAO;
    this.aoMudar = opcoes.aoMudar;
    this.aoTerminarFerramenta = opcoes.aoTerminarFerramenta;
    this.aoNavegar = opcoes.aoNavegar;
    this.aoSelecionar = opcoes.aoSelecionar;
    this.aoEncaixar = opcoes.aoEncaixar;

    const tamanho =
      opcoes.tamanho ?? tamanhoDoDocumento(this.enquadramento.formato, opcoes.proporcaoLivre);
    this.largura = tamanho.largura;
    this.altura = tamanho.altura;

    /**
     * O canvas tem o tamanho do PALCO, não o do documento.
     *
     * O documento vive dentro dele através do `viewportTransform` — a
     * matriz que o Fabric aplica a tudo que desenha. É o que permite
     * ampliar sem borrar: ao contrário de um `transform: scale` no CSS,
     * que estica o bitmap já pronto, aqui o Fabric REDESENHA tudo na
     * escala nova, então linha continua fina e texto continua nítido em
     * 300%.
     *
     * O preço é que exportar exige neutralizar a matriz antes de gerar
     * o PNG. Ver `exportarPNG`.
     */
    this.canvas = new Canvas(opcoes.canvas, {
      width: opcoes.palco?.clientWidth || this.largura,
      height: opcoes.palco?.clientHeight || this.altura,
      // Fora do documento é a mesa de trabalho, não o mapa.
      backgroundColor: "#070a06",
      preserveObjectStacking: true,
      enableRetinaScaling: false,
      // Caixa azul de selecao multipla DESLIGADA: arrastar no vazio move
      // a foto (regra do produto), entao a caixa so piscava sem funcao.
      // Multi-selecao continua por shift+clique e pela lista de camadas.
      selection: false,
    });

    this.palco = opcoes.palco ?? null;
    if (this.camadas.base) this.ajusteBase = { ...this.camadas.base };
    this.configurarNavegacao();

    // A marca chega quando chegar; o redesenho a incorpora sem travar
    // a montagem do editor.
    void carregarMarca().then((pronta) => {
      if (pronta) this.agendarEnfeites();
    });

    /**
     * SÓ objeto do usuário marca mudança — e isso é a linha mais
     * importante de desempenho do editor.
     *
     * A grade 10×10 tem ~250 objetos gerados (linhas, réguas, rótulos
     * de célula) e a prévia de traço adiciona e remove objetos a cada
     * movimento do mouse. Todos disparam `object:added`/`removed`. Na
     * primeira versão cada disparo caía no histórico de desfazer, que
     * serializava o canvas — e serializar o canvas converte a imagem
     * de satélite em base64 de ~3 MB. Medido: mexer no slider de véu
     * levava MINUTOS, porque um tick redesenhava a grade inteira e
     * causava ~500 serializações da imagem.
     */
    for (const evento of ["object:modified", "object:added", "object:removed"] as const) {
      this.canvas.on(evento, (e) => {
        if (this.restaurando) return;
        const alvo = (e as { target?: FabricObject }).target;
        if (alvo && (alvo.ehEnfeite || alvo.excludeFromExport)) return;
        this.marcarMudanca();
      });
    }

    this.canvas.on("mouse:down", (e) => this.aoClicar(e));
    this.canvas.on("mouse:move", (e) => this.aoMover(e));
    this.canvas.on("mouse:dblclick", () => this.fecharTraco());

    // Selecionar não é mudar: entra num callback próprio para o painel
    // de camadas destacar o ativo SEM sujar o rascunho nem registrar
    // histórico — senão abrir o mapa e clicar numa forma já acionava o
    // aviso de "alterações não salvas".
    this.canvas.on("selection:created", () => this.aoSelecionar?.());
    this.canvas.on("selection:updated", () => this.aoSelecionar?.());
    this.canvas.on("selection:cleared", () => this.aoSelecionar?.());
  }

  // ==========================================================
  // Navegação da vista — zoom e deslocamento
  //
  // Tudo aqui mexe só em como o documento é MOSTRADO. Nenhuma destas
  // ações altera um pixel do PNG exportado, e é por isso que o zoom da
  // vista e o zoom do satélite são controles separados na tela: um é
  // lupa, o outro muda a foto.
  // ==========================================================

  private palco: HTMLElement | null = null;
  private arrastandoVista = false;
  private ultimoPonteiro = { x: 0, y: 0 };
  private espacoPressionado = false;

  /**
   * Encaixe da foto sob a grade — a grade não se move NUNCA.
   *
   * `modoArrasteBase` é ligado pelo botão "Arrastar imagem" da aba
   * Satélite: enquanto ativo, arrastar o canvas desloca a FOTO, não a
   * vista nem as formas. dx/dy em pixels do documento; escala 0.5–3.
   */
  private ajusteBase = { escala: 1, dx: 0, dy: 0 };
  private modoArrasteBase = false;
  private arrastandoBase = false;

  /** O espaço só vira "mão" quando o ponteiro está sobre o palco. */
  private ponteiroNoPalco = false;

  /**
   * Trava do mapa: com ela ligada, NENHUM gesto desloca a foto — nem o
   * arrasto no vazio, nem o modo de encaixe. Existe porque, achado o
   * enquadramento, o resto da sessão é desenhar por cima, e um arrasto
   * distraído no vazio arruinaria o alinhamento. Persiste no registro:
   * mapa salvo travado reabre travado.
   */
  private mapaTravado = false;

  estaTravado(): boolean {
    return this.mapaTravado;
  }

  definirTravaMapa(travado: boolean) {
    this.mapaTravado = travado;
    this.camadas.travado = travado;
    if (travado) this.definirArrasteBase(false);
    this.aoMudar?.();
  }

  private configurarNavegacao() {
    /**
     * Roda do mouse dá zoom no ponto sob o cursor.
     *
     * Ampliar sempre pelo centro obriga a pessoa a alternar zoom e
     * deslocamento para chegar num canto do mapa. Ancorar no cursor é o
     * que faz a navegação parecer direta.
     *
     * O fator exponencial mantém o passo perceptivo constante: somar um
     * valor fixo daria saltos enormes perto de 10% e imperceptíveis
     * perto de 400%.
     */
    this.canvas.on("mouse:wheel", (opcoes) => {
      const evento = opcoes.e as WheelEvent;
      evento.preventDefault();
      evento.stopPropagation();

      // Enquadrando, a roda dimensiona a FOTO — ancorada no cursor,
      // como qualquer mapa. Fora do modo, ela é a lupa da vista.
      if (this.modoArrasteBase) {
        this.escalarBaseEmPonto(0.999 ** evento.deltaY, this.canvas.getScenePoint(evento));
        return;
      }

      const alvo = this.canvas.getZoom() * 0.999 ** evento.deltaY;
      this.zoomEmPonto(alvo, new Point(evento.offsetX, evento.offsetY));
    });

    this.canvas.on("mouse:down", (opcoes) => {
      const evento = opcoes.e as MouseEvent;

      // Modo de encaixe: o arrasto move a FOTO sob a grade. Vem antes
      // do pan para o botão esquerdo ser dele enquanto o modo durar.
      if (this.modoArrasteBase && !this.mapaTravado && evento.button === 0 && !this.espacoPressionado) {
        evento.preventDefault();
        this.arrastandoBase = true;
        this.ultimoPonteiro = { x: evento.clientX, y: evento.clientY };
        this.canvas.setCursor("grabbing");
        return;
      }

      /**
       * Arrasto livre da foto no VAZIO — regra definida pelo dono do
       * produto: posicionar o mapa no canvas é o gesto principal e não
       * pode depender de interruptor. Com a ferramenta de seleção,
       * clicar numa forma continua movendo a forma; clicar no vazio
       * agarra a foto. O retângulo de seleção múltipla fica suprimido
       * nesse gesto (quem precisa dele seleciona pela lista de
       * camadas), e o clique-no-vazio segue desmarcando, porque o
       * arrasto de zero pixels não move nada.
       */
      if (
        this.ferramenta === "selecionar" &&
        !this.mapaTravado &&
        evento.button === 0 &&
        !this.espacoPressionado &&
        !opcoes.target
      ) {
        evento.preventDefault();
        this.canvas.discardActiveObject();
        this.canvas.selection = false;
        this.arrastandoBase = true;
        this.ultimoPonteiro = { x: evento.clientX, y: evento.clientY };
        this.canvas.setCursor("grabbing");
        return;
      }

      // Botão do meio sempre desloca, qualquer que seja a ferramenta —
      // é o gesto que todo editor entende e não custa uma ferramenta.
      const botaoDoMeio = evento.button === 1;
      if (botaoDoMeio || this.espacoPressionado || this.ferramenta === "mover") {
        evento.preventDefault();
        this.arrastandoVista = true;
        this.ultimoPonteiro = { x: evento.clientX, y: evento.clientY };
        this.canvas.selection = false;
        this.canvas.setCursor("grabbing");
      }
    });

    this.canvas.on("mouse:move", (opcoes) => {
      const evento = opcoes.e as MouseEvent;

      if (this.arrastandoBase) {
        // Delta em pixels de tela → pixels de documento: divide pelo
        // zoom da vista, senão a foto anda mais devagar que o mouse
        // quando ampliado e dispara quando afastado.
        const zoom = this.canvas.getZoom();
        this.moverBase(
          (evento.clientX - this.ultimoPonteiro.x) / zoom,
          (evento.clientY - this.ultimoPonteiro.y) / zoom,
        );
        this.ultimoPonteiro = { x: evento.clientX, y: evento.clientY };
        this.canvas.setCursor("grabbing");
        return;
      }

      if (!this.arrastandoVista) return;
      this.canvas.relativePan(
        new Point(evento.clientX - this.ultimoPonteiro.x, evento.clientY - this.ultimoPonteiro.y),
      );
      this.ultimoPonteiro = { x: evento.clientX, y: evento.clientY };
      this.canvas.setCursor("grabbing");
    });

    const soltar = () => {
      if (this.arrastandoBase) {
        this.arrastandoBase = false;
        // No arrasto-no-vazio a seleção múltipla foi suprimida; devolve.
        // selecao por caixa permanece desligada — ver o construtor.
        this.canvas.setCursor(this.modoArrasteBase ? "grab" : this.cursorDaFerramenta());
        // Uma marca de mudança por arrasto INTEIRO, não por movimento:
        // o histórico não guarda o encaixe, mas o rascunho sim.
        this.aoMudar?.();
        // E o traço encerrado vira novo centro geográfico — é o que
        // torna o arrasto ilimitado. Ver `recentrarBase`.
        void this.recentrarBase();
        return;
      }
      if (!this.arrastandoVista) return;
      this.arrastandoVista = false;
      // selecao por caixa permanece desligada — ver o construtor.
      this.canvas.setCursor(this.cursorDaFerramenta());
    };

    this.canvas.on("mouse:up", soltar);
    // O ponteiro pode sair do canvas no meio do arrasto; sem isto o
    // editor fica preso em modo de deslocamento.
    window.addEventListener("mouseup", soltar);

    /**
     * Espaço segurado desloca, como em qualquer editor gráfico.
     *
     * Vive em `window` e não no canvas porque o canvas raramente tem o
     * foco do teclado — a pessoa acabou de clicar num botão da barra.
     */
    // Onde o ponteiro está decide de quem é o espaço: sobre o palco,
    // ele é a mão do editor; fora, continua rolando a página — o texto
    // de como usar mora logo abaixo e também merece a tecla.
    if (this.palco) {
      this.palco.addEventListener("pointerenter", () => (this.ponteiroNoPalco = true));
      this.palco.addEventListener("pointerleave", () => (this.ponteiroNoPalco = false));
    } else {
      this.ponteiroNoPalco = true;
    }

    window.addEventListener("keydown", (evento) => {
      if (evento.code !== "Space") return;
      const alvo = evento.target as HTMLElement | null;
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
      if (alvo?.isContentEditable) return;
      if (!this.ponteiroNoPalco && !this.espacoPressionado) return;

      /**
       * SEMPRE prevenir — inclusive nos repeats da tecla segurada.
       *
       * Tecla segurada dispara `keydown` repetidos, e a primeira versão
       * só prevenia a primeira descida: os repetidos saíam cedo (o modo
       * já estava ligado) SEM preventDefault, e cada um rolava a página
       * uma tela — segurar o espaço para deslocar o mapa levava a
       * página até o fim.
       */
      evento.preventDefault();
      if (this.espacoPressionado) return;

      this.espacoPressionado = true;
      // `skipTargetFind` é o que impede o Fabric de agarrar a forma sob
      // o cursor: sem ele, espaço+arraste em cima de uma área movia a
      // ÁREA em vez da vista — e a pessoa só percebia depois, com o
      // desenho fora do lugar.
      this.canvas.skipTargetFind = true;
      this.canvas.defaultCursor = "grab";
      this.canvas.setCursor("grab");
    });

    window.addEventListener("keyup", (evento) => {
      if (evento.code !== "Space") return;
      this.espacoPressionado = false;
      this.canvas.skipTargetFind = this.ferramenta === "mover";
      this.canvas.defaultCursor = this.cursorDaFerramenta();
      this.canvas.setCursor(this.cursorDaFerramenta());
    });
  }

  private cursorDaFerramenta(): string {
    if (this.ferramenta === "mover") return "grab";
    if (this.ferramenta === "selecionar") return "default";
    return "crosshair";
  }

  /** Zoom em que o documento cabe inteiro na área visível. */
  private zoomDeAjuste(): number {
    return Math.min(
      this.canvas.getWidth() / this.largura,
      this.canvas.getHeight() / this.altura,
    );
  }

  private zoomEmPonto(nivel: number, ponto: Point) {
    const alvo = Math.min(ZOOM_VISTA_MAX, Math.max(ZOOM_VISTA_MIN, nivel));

    /**
     * Ímã do encaixe: chegou perto do "cabe inteiro", cola nele.
     *
     * Sem isto a vista parava em estados como 101% — um fio do
     * documento cortado em cada borda, com a régua e a barra de escala
     * pela metade, parecendo defeito. Perto do ajuste (±4%), a vista
     * vai para o encaixe exato e centrado; e abaixo dele nem faz
     * sentido ir, porque só sobra mesa vazia em volta.
     */
    if (alvo < this.zoomDeAjuste() * 1.04) {
      this.ajustarVista();
      return;
    }

    this.canvas.zoomToPoint(ponto, alvo);
    this.aoNavegar?.(alvo);
  }

  /** Zoom pelo centro da área visível — o que os botões +/− usam. */
  aplicarZoom(nivel: number) {
    this.zoomEmPonto(
      nivel,
      new Point(this.canvas.getWidth() / 2, this.canvas.getHeight() / 2),
    );
  }

  lerZoom(): number {
    return this.canvas.getZoom();
  }

  /**
   * Enquadra o documento inteiro na área visível, centralizado.
   *
   * Sem margem: o palco agora É dimensionado na proporção do documento
   * (ver dimensionarPalco na ferramenta), então caber 100% significa a
   * foto ocupando a área inteira, sem faixa de mesa nas laterais.
   */
  ajustarVista() {
    const larguraPalco = this.canvas.getWidth();
    const alturaPalco = this.canvas.getHeight();
    const escala = Math.min(larguraPalco / this.largura, alturaPalco / this.altura);
    const nivel = Math.min(ZOOM_VISTA_MAX, Math.max(ZOOM_VISTA_MIN, escala));

    this.canvas.setViewportTransform([
      nivel,
      0,
      0,
      nivel,
      (larguraPalco - this.largura * nivel) / 2,
      (alturaPalco - this.altura * nivel) / 2,
    ]);
    this.canvas.requestRenderAll();
    this.aoNavegar?.(nivel);
  }

  /** Acompanha o palco quando a janela muda de tamanho. */
  redimensionar() {
    if (!this.palco) return;
    const largura = this.palco.clientWidth;
    const altura = this.palco.clientHeight;
    if (largura < 40 || altura < 40) return;
    this.canvas.setDimensions({ width: largura, height: altura });
    this.canvas.requestRenderAll();
  }

  // ==========================================================
  // Base
  // ==========================================================

  /**
   * Carrega o satélite e o encaixa girado atrás do desenho.
   *
   * A base é pedida no tamanho que `ladoDaBase` calcula — grande o
   * bastante para cobrir o documento na rotação atual. É o que permite
   * girar sem canto preto e sem o documento mudar de tamanho.
   */
  /** Lado do bitmap da base atual — a trava de cobertura depende dele. */
  private ladoBitmap = BASE_LADO;

  /**
   * Imagem que o usuário enviou para ser o fundo, no lugar do satélite.
   *
   * Vive fora de `camadas` enquanto não é salva: o arquivo local só
   * vira URL (bucket `mapas`) na hora de salvar, via /api/mapa/imagem.
   * Com ela ativa, escala, norte e crédito de provedor somem — seriam
   * mentira sobre uma imagem sem georreferência.
   */
  private imagemPropriaLocal: HTMLImageElement | HTMLCanvasElement | null = null;
  /** Fator "cover" da imagem própria; o encaixe multiplica por cima. */
  private coberturaPropria = 1;

  temImagemPropria(): boolean {
    return Boolean(this.imagemPropriaLocal || this.camadas.imagemPropria);
  }

  async usarImagemPropria(fonte: HTMLImageElement | HTMLCanvasElement): Promise<void> {
    this.imagemPropriaLocal = fonte;
    // Fundo novo, encaixe do zero: o ajuste da foto anterior não diz
    // nada sobre esta imagem.
    this.ajusteBase = { escala: 1, dx: 0, dy: 0 };
    await this.carregarBase();
    this.redesenharEnfeites();
    this.aoMudar?.();
  }

  /** Chamado após o upload no salvamento: a URL passa a viajar no registro. */
  definirImagemPropriaUrl(url: string) {
    this.camadas.imagemPropria = url;
  }

  async limparImagemPropria(): Promise<void> {
    this.imagemPropriaLocal = null;
    delete this.camadas.imagemPropria;
    this.ajusteBase = { escala: 1, dx: 0, dy: 0 };
    await this.carregarBase();
    this.redesenharEnfeites();
    this.aoMudar?.();
  }

  private async bitmapPropria(): Promise<HTMLImageElement | HTMLCanvasElement> {
    if (this.imagemPropriaLocal) return this.imagemPropriaLocal;
    // Reabrindo um mapa salvo: busca do bucket. O storage do Supabase
    // manda CORS aberto, então o canvas segue exportável.
    const url = this.camadas.imagemPropria!;
    const imagem = await new Promise<HTMLImageElement>((resolver, rejeitar) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolver(img);
      img.onerror = () => rejeitar(new Error("A imagem enviada não carregou."));
      img.src = url;
    });
    this.imagemPropriaLocal = imagem;
    return imagem;
  }

  async carregarBase(): Promise<void> {
    const { rotacao } = this.enquadramento;

    if (this.temImagemPropria()) {
      const fonte = await this.bitmapPropria();
      const imagem = new FabricImage(fonte);
      const larguraFonte = "naturalWidth" in fonte ? fonte.naturalWidth : fonte.width;
      const alturaFonte = "naturalHeight" in fonte ? fonte.naturalHeight : fonte.height;

      // Nasce cobrindo o documento (modo "cover"), como um papel de
      // parede; o encaixe fino continua com o usuário.
      const cobertura = Math.max(this.largura / larguraFonte, this.altura / alturaFonte);

      imagem.set({
        originX: "center",
        originY: "center",
        angle: rotacao,
        scaleX: cobertura,
        scaleY: cobertura,
        selectable: false,
        evented: false,
      });
      // A escala do encaixe multiplica por cima desta base "cover".
      this.coberturaPropria = cobertura;
      this.ladoBitmap = Math.min(larguraFonte, alturaFonte);

      this.canvas.backgroundImage = imagem;
      this.aplicarEncaixeBase();
      this.canvas.renderAll();
      return;
    }

    const { lat, lng, zoom } = this.enquadramento;

    /**
     * A base é buscada com FOLGA além do mínimo geométrico.
     *
     * O mínimo (`ladoDaBase`) cobre o documento exatamente com a foto
     * centrada em escala 1 — qualquer arrasto ou redução já abriria
     * célula de grade vazia. A folga é dimensionada pela REGRA DA
     * COBERTURA: o círculo inscrito no bitmap (raio = lado·escala/2)
     * precisa conter os quatro cantos do documento. Com o lado em
     * 2×meia-diagonal/0,9, a cobertura fecha para qualquer rotação com
     * escala até 0,9 — e abaixo disso quem age é a dobra de zoom, não
     * o encolhimento do bitmap.
     */
    const meiaDiagonal = Math.hypot(this.largura, this.altura) / 2;
    const lado = Math.min(
      2048,
      Math.ceil(Math.max(ladoDaBase(this.largura, this.altura, rotacao), (2 * meiaDiagonal) / 0.9)),
    );
    this.ladoBitmap = lado;

    const tela = await obterBase({ lat, lng, zoom }, this.config, lado);
    const imagem = new FabricImage(tela);

    imagem.set({
      originX: "center",
      originY: "center",
      angle: rotacao,
      selectable: false,
      evented: false,
    });

    this.canvas.backgroundImage = imagem;
    // O que quer que tenha chegado (rascunho antigo, escala herdada de
    // outro zoom), entra já dentro da regra de cobertura.
    this.travarCobertura();
    this.aplicarEncaixeBase();
    this.canvas.renderAll();
  }

  /**
   * A trava de cobertura: nenhuma célula da grade pode ficar sem foto.
   *
   * Duas partes. A escala tem um piso — abaixo dele nem centrada a
   * foto cobre o documento. E o deslocamento é puxado de volta: cada
   * canto do documento precisa caber no círculo inscrito da foto
   * (raio = lado·escala/2, válido para QUALQUER rotação); se um canto
   * escapa, o centro da foto anda na direção dele só o necessário.
   * Três passadas bastam para os quatro cantos convergirem.
   */
  private travarCobertura() {
    // Imagem propria nao tem obrigacao de cobrir: ela pode ter as
    // proprias margens, e a mesa aparecendo em volta e informacao.
    if (this.temImagemPropria()) return;

    /**
     * O vínculo é o RETÂNGULO do documento projetado nos eixos da
     * foto — nunca mais o círculo inscrito.
     *
     * O círculo foi medido ao vivo (docs/bugarrastemapa.md): jogava
     * fora ~21% da foto, deixava só 63 px de folga de arraste num
     * documento de 1020, zerava a folga no estado inicial ("a foto não
     * move nada") e, na borda, projetava o movimento radialmente — o
     * mouse ia para a direita e a foto escorregava de lado.
     *
     * A foto é um QUADRADO de lado `ladoBitmap·escala`, girado por
     * `rotacao` em torno do próprio centro. Ela cobre o documento se,
     * e somente se, cada canto do documento cai dentro do quadrado —
     * o que, nos eixos da foto, vira duas desigualdades de eixo
     * independentes: |u| ≤ lado/2 − hx e |v| ≤ lado/2 − hy, onde
     * (hx, hy) são as meias-extensões do documento GIRADO para o
     * referencial da foto e (u, v) é o centro da foto nesse mesmo
     * referencial. É exato (os extremos acontecem nos cantos), X e Y
     * ficam independentes, e com rotação 0° a conta se reduz ao clamp
     * retangular puro da seção 5 do diagnóstico.
     */
    const radianos = (this.enquadramento.rotacao * Math.PI) / 180;
    const cos = Math.cos(radianos);
    const sen = Math.sin(radianos);

    // Meias-extensões do documento no referencial (girado) da foto.
    const meioX = (this.largura * Math.abs(cos) + this.altura * Math.abs(sen)) / 2;
    const meioY = (this.largura * Math.abs(sen) + this.altura * Math.abs(cos)) / 2;

    // Piso de escala: o quadrado precisa engolir a MAIOR das duas
    // extensões. Em 0° isso é max(largura, altura)/ladoBitmap — no caso
    // medido, 0,625 em vez dos 0,717 do círculo: menos zoom forçado.
    const escalaMinima = (2 * Math.max(meioX, meioY)) / this.ladoBitmap;
    if (this.ajusteBase.escala < escalaMinima) this.ajusteBase.escala = escalaMinima;

    const meioLado = (this.ladoBitmap * this.ajusteBase.escala) / 2;
    const limiteU = meioLado - meioX;
    const limiteV = meioLado - meioY;

    // Deslocamento do centro da foto, levado para o referencial dela
    // (rotação por −θ), grampeado eixo a eixo, e trazido de volta.
    const u = cos * this.ajusteBase.dx + sen * this.ajusteBase.dy;
    const v = -sen * this.ajusteBase.dx + cos * this.ajusteBase.dy;

    const uTravado = Math.min(limiteU, Math.max(-limiteU, u));
    const vTravado = Math.min(limiteV, Math.max(-limiteV, v));

    this.ajusteBase.dx = cos * uTravado - sen * vTravado;
    this.ajusteBase.dy = sen * uTravado + cos * vTravado;
  }

  // ----------------------------------------------------------
  // Encaixe da foto sob a grade
  // ----------------------------------------------------------

  /** Reaplica escala e deslocamento na imagem de fundo atual. */
  private aplicarEncaixeBase() {
    const imagem = this.canvas.backgroundImage;
    if (!imagem) return;
    const fator = this.temImagemPropria() ? this.coberturaPropria : 1;
    imagem.set({
      left: this.largura / 2 + this.ajusteBase.dx,
      top: this.altura / 2 + this.ajusteBase.dy,
      scaleX: this.ajusteBase.escala * fator,
      scaleY: this.ajusteBase.escala * fator,
    });
  }

  /** Caminho leve do arrasto: só a imagem, sem redesenhar enfeites. */
  private moverBase(dx: number, dy: number) {
    this.ajusteBase.dx += dx;
    this.ajusteBase.dy += dy;
    // Arrasto tambem respeita a cobertura: a foto para na borda.
    this.travarCobertura();
    this.aplicarEncaixeBase();
    this.canvas.requestRenderAll();
  }

  /**
   * Dimensiona a foto ancorada num ponto do documento.
   *
   * Ancorar no cursor é o que faz "rolar para dimensionar" parecer um
   * mapa de verdade: o terreno sob o mouse fica parado enquanto o resto
   * cresce ao redor. A conta compensa o deslocamento — o centro da foto
   * se afasta do ponto de âncora na mesma razão da escala.
   */
  private escalarBaseEmPonto(fator: number, ponto: Point) {
    const propria = this.temImagemPropria();
    const meiaDiagonal = Math.hypot(this.largura, this.altura) / 2;
    // Propria: faixa larga e sem piso de cobertura — reduzir para caber
    // uma prancheta inteira dentro da grade e uso legitimo.
    const escalaMinima = propria ? 0.2 : (2 * meiaDiagonal) / this.ladoBitmap;

    const atual = this.ajusteBase.escala;
    const alvo = Math.min(3, Math.max(escalaMinima, atual * fator));
    const razao = alvo / atual;

    if (razao !== 1) {
      const centroX = this.largura / 2 + this.ajusteBase.dx;
      const centroY = this.altura / 2 + this.ajusteBase.dy;

      this.ajusteBase = {
        escala: alvo,
        dx: ponto.x + (centroX - ponto.x) * razao - this.largura / 2,
        dy: ponto.y + (centroY - ponto.y) * razao - this.altura / 2,
      };

      this.travarCobertura();
      this.aplicarEncaixeBase();
      this.canvas.requestRenderAll();
      this.agendarEnfeites();
      this.aoEncaixar?.({ zoom: this.enquadramento.zoom, lat: this.enquadramento.lat, lng: this.enquadramento.lng });
    }

    /**
     * A DOBRA DE ZOOM é o que faz "reduzir" significar "ver mais
     * terreno" em vez de "foto menor que a grade".
     *
     * Encostou no piso de cobertura querendo reduzir mais? O nível de
     * zoom de tile desce um degrau — cada degrau dobra os metros por
     * pixel — e a escala visual dobra junto, então NADA muda na tela:
     * o mesmo terreno, no mesmo lugar, só que agora com o dobro de
     * margem para continuar reduzindo. Ampliando muito, o inverso, que
     * devolve nitidez nativa. A barra de escala nem percebe: ela usa
     * zoom + log2(escala), que é invariante sob a dobra.
     */
    // Dobra de zoom e coisa de tile: imagem propria nao tem niveis.
    if (propria) return;

    const querReduzirMais = fator < 1 && alvo <= escalaMinima + 0.02;
    const querAmpliarMais = alvo > 2.2;

    if (querReduzirMais && this.enquadramento.zoom > 15) this.agendarDobra(-1);
    else if (querAmpliarMais && this.enquadramento.zoom < this.config.zoomMax) this.agendarDobra(1);
  }

  private dobraAgendada: ReturnType<typeof setTimeout> | undefined;
  private dobrando = false;

  private agendarDobra(direcao: 1 | -1) {
    clearTimeout(this.dobraAgendada);
    this.dobraAgendada = setTimeout(() => void this.dobrarZoom(direcao), 220);
  }

  private async dobrarZoom(direcao: 1 | -1) {
    if (this.dobrando) return;
    this.dobrando = true;
    try {
      this.enquadramento.zoom += direcao;
      this.ajusteBase.escala *= direcao === -1 ? 2 : 0.5;
      // O centro geográfico é o mesmo; dx/dy continuam válidos porque a
      // foto nova é renderizada com o dobro (ou metade) da escala.
      await this.carregarBase();
      this.agendarEnfeites();
      this.aoEncaixar?.({ zoom: this.enquadramento.zoom, lat: this.enquadramento.lat, lng: this.enquadramento.lng });
    } catch (erro) {
      console.error("Falha na dobra de zoom:", erro);
    } finally {
      this.dobrando = false;
    }
  }

  emModoEncaixe(): boolean {
    return this.modoArrasteBase;
  }

  /**
   * O que torna o arrasto ILIMITADO: ao fim de cada traço, o
   * deslocamento acumulado vira um novo centro geográfico, tiles novos
   * são buscados em volta dele e dx/dy voltam a zero — o próximo traço
   * nasce com a folga inteira outra vez.
   *
   * A troca é invisível de propósito: o bitmap antigo permanece na
   * tela até o novo estar pronto, e o novo — centrado no ponto novo,
   * com deslocamento zero — desenha o MESMO terreno no MESMO lugar (a
   * menos do arredondamento de 6 casas, ~11 cm, subpixel em qualquer
   * zoom). Sem isto a trava de cobertura vira parede: o usuário
   * arrasta, chega na borda do bitmap e "trava do nada".
   */
  private recentrando = false;
  private recentrarPendente = false;

  private async recentrarBase(): Promise<void> {
    // Imagem própria não tem geografia para recentrar.
    if (this.temImagemPropria()) return;
    if (this.recentrando || this.dobrando) {
      // Um traço terminou no meio da recentragem anterior (a busca dos
      // tiles leva algumas centenas de ms): fica anotado e roda assim
      // que ela terminar. Sem a fila, o deslocamento desse traço
      // morava no clamp e o traço seguinte nascia já na parede.
      this.recentrarPendente = true;
      return;
    }

    const { dx, dy, escala } = this.ajusteBase;
    // Traço minúsculo (clique de desmarcar, tremida) não paga reload.
    if (Math.hypot(dx, dy) < 12) return;

    const { lat, lng, zoom, rotacao } = this.enquadramento;
    const radianos = (rotacao * Math.PI) / 180;
    const cos = Math.cos(radianos);
    const sen = Math.sin(radianos);

    // Pixels de documento → pixels do bitmap (desfaz rotação e escala)
    // → pixels globais de Mercator, a malha dos tiles. Foto arrastada
    // para +x mostra terreno que estava a −x do centro: sinal negativo.
    const bitX = (cos * dx + sen * dy) / escala;
    const bitY = (-sen * dx + cos * dy) / escala;

    const centro = paraPixelGlobal(lat, lng, zoom);
    const mundo = LADO_TILE * 2 ** zoom;
    const novaLng = ((centro.x - bitX) / mundo) * 360 - 180;
    const novaLat =
      (Math.atan(Math.sinh(Math.PI * (1 - (2 * (centro.y - bitY)) / mundo))) * 180) / Math.PI;

    this.recentrando = true;
    try {
      this.enquadramento.lat = Number(novaLat.toFixed(6));
      this.enquadramento.lng = Number(novaLng.toFixed(6));
      this.ajusteBase.dx = 0;
      this.ajusteBase.dy = 0;
      await this.carregarBase();
      this.aoEncaixar?.({
        zoom,
        lat: this.enquadramento.lat,
        lng: this.enquadramento.lng,
      });
    } catch (erro) {
      // Falhou a busca dos tiles novos: desfazer o recentro deixaria o
      // estado inconsistente; o bitmap antigo continua na tela e o
      // próximo traço tenta de novo.
      console.error("Falha ao recentralizar a base:", erro);
    } finally {
      this.recentrando = false;
      if (this.recentrarPendente) {
        this.recentrarPendente = false;
        void this.recentrarBase();
      }
    }
  }

  ajustarBase(mudanca: Partial<{ escala: number; dx: number; dy: number }>) {
    this.ajusteBase = { ...this.ajusteBase, ...mudanca };
    this.ajusteBase.escala = Math.min(3, Math.max(0.5, this.ajusteBase.escala));
    this.travarCobertura();
    this.aplicarEncaixeBase();
    this.canvas.requestRenderAll();
    // A escala muda quantos metros cabem num pixel: a barra de escala
    // precisa acompanhar, senão vira régua mentirosa.
    this.agendarEnfeites();
    this.aoMudar?.();
  }

  lerAjusteBase() {
    return { ...this.ajusteBase };
  }

  definirArrasteBase(ligado: boolean) {
    // Mapa travado nao entra em modo de encaixe — destrave primeiro.
    if (ligado && this.mapaTravado) return;
    this.modoArrasteBase = ligado;
    this.canvas.skipTargetFind = ligado || this.ferramenta === "mover";
    this.canvas.defaultCursor = ligado ? "grab" : this.cursorDaFerramenta();
    if (ligado) this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  // ==========================================================
  // Enfeites: véu, grade, réguas, escala, norte, crédito
  // ==========================================================

  /**
   * Agenda um redesenho de enfeites para o próximo quadro.
   *
   * Os sliders (véu, intensidade da grade) disparam dezenas de eventos
   * por segundo, e cada redesenho recria ~250 objetos. Colapsar tudo
   * num redesenho por quadro de animação mantém o arrasto fluido sem
   * mudar nada no resultado — o último valor é o que vale.
   */
  private enfeitesAgendados = false;

  private agendarEnfeites(): void {
    if (this.enfeitesAgendados) return;
    this.enfeitesAgendados = true;
    requestAnimationFrame(() => {
      this.enfeitesAgendados = false;
      this.redesenharEnfeites();
    });
  }

  redesenharEnfeites(): void {
    for (const objeto of this.enfeites) this.canvas.remove(objeto);
    this.enfeites = [];

    if (this.camadas.veu) this.desenharVeu(this.camadas.veu);
    if (this.camadas.grade?.ligada) this.desenharGrade(this.camadas.grade);
    // Escala, norte e credito de provedor so fazem sentido sobre
    // satelite georreferenciado — sobre imagem enviada seriam mentira.
    const georreferenciado = !this.temImagemPropria();
    if (georreferenciado && this.camadas.escala) this.desenharEscala();
    if (georreferenciado && this.camadas.norte) this.desenharNorte();
    if (georreferenciado) this.desenharAtribuicao();
    // Sempre também: a marca do gerador acompanha todo mapa.
    this.desenharMarca();
    this.desenharLimite();

    /**
     * Referência vai para trás do desenho, para nunca cobrir um rótulo
     * que a pessoa escreveu.
     *
     * DE TRÁS PARA A FRENTE, e isso não é detalhe: `sendObjectToBack`
     * empurra cada objeto para a posição 0, então percorrer a lista na
     * ordem normal deixa a pilha INVERTIDA — o primeiro registrado
     * acaba por cima de todos. Foi o que fez o fundo da barra de escala
     * cobrir a própria régua.
     */
    for (let i = this.enfeites.length - 1; i >= 0; i--) {
      this.canvas.sendObjectToBack(this.enfeites[i]);
    }
    this.canvas.renderAll();
  }

  private registrar(objeto: FabricObject) {
    objeto.set({
      selectable: false,
      evented: false,
      excludeFromExport: true,
      ehEnfeite: true,
    });
    this.enfeites.push(objeto);
    this.canvas.add(objeto);
  }

  /**
   * Escurecimento sobre o satélite.
   *
   * Satélite cru é claro e ruidoso, e linha fina de grade sobre telhado
   * branco simplesmente some. O véu resolve isso sem tocar no desenho —
   * e fica ajustável porque terreno de mata fechada já é escuro e não
   * precisa de nenhum.
   */
  private desenharVeu(forca: number) {
    this.registrar(
      new Rect({
        left: 0,
        top: 0,
        width: this.largura,
        height: this.altura,
        fill: `rgba(6,8,5,${forca})`,
      }),
    );
  }

  /** Área útil do mapa, já descontando as réguas. */
  private area() {
    const g = this.camadas.grade;
    const esquerda = g?.ligada && g.numeros ? REGUA : 0;
    const topo = g?.ligada && g.letras ? REGUA : 0;
    return {
      esquerda,
      topo,
      largura: this.largura - esquerda,
      altura: this.altura - topo,
    };
  }

  private desenharGrade(grade: Grade) {
    const area = this.area();
    const passoX = area.largura / grade.colunas;
    const passoY = area.altura / grade.linhas;

    const traco = {
      stroke: grade.cor,
      strokeWidth: grade.espessura,
      opacity: grade.opacidade,
      strokeUniform: true,
    };

    for (let coluna = 1; coluna < grade.colunas; coluna++) {
      const x = Math.round(area.esquerda + coluna * passoX);
      this.registrar(new Line([x, area.topo, x, this.altura], traco));
    }
    for (let linha = 1; linha < grade.linhas; linha++) {
      const y = Math.round(area.topo + linha * passoY);
      this.registrar(new Line([area.esquerda, y, this.largura, y], traco));
    }

    // ----- Réguas -----
    //
    // Faixa opaca dentro do documento, não moldura da interface: ver o
    // comentário de REGUA em lib/mapa.ts.
    const fundoRegua = "rgba(9,11,7,0.88)";

    if (grade.letras) {
      this.registrar(
        new Rect({ left: 0, top: 0, width: this.largura, height: REGUA, fill: fundoRegua }),
      );
      for (let coluna = 0; coluna < grade.colunas; coluna++) {
        this.registrar(
          new FabricText(letraDaColuna(coluna), {
            left: area.esquerda + coluna * passoX + passoX / 2,
            top: REGUA / 2,
            originX: "center",
            originY: "center",
            fontSize: 15,
            fontFamily: "Share Tech Mono, ui-monospace, monospace",
            fill: grade.cor,
          }),
        );
      }
    }

    if (grade.numeros) {
      this.registrar(
        new Rect({ left: 0, top: 0, width: REGUA, height: this.altura, fill: fundoRegua }),
      );
      for (let linha = 0; linha < grade.linhas; linha++) {
        this.registrar(
          new FabricText(String(linha + 1), {
            left: REGUA / 2,
            top: area.topo + linha * passoY + passoY / 2,
            originX: "center",
            originY: "center",
            fontSize: 15,
            fontFamily: "Share Tech Mono, ui-monospace, monospace",
            fill: grade.cor,
          }),
        );
      }
    }

    if (!grade.rotulos) return;

    /**
     * Marca dentro de cada célula, além das réguas de borda.
     *
     * Régua só funciona em mapa que se lê inteiro de uma vez. No campo
     * a pessoa olha um pedaço da tela e precisa saber onde está sem
     * seguir a linha até a borda com o dedo — por isso "B4" também fica
     * dentro do B4.
     */
    const corpo = Math.max(10, Math.min(18, Math.round(Math.min(passoX, passoY) / 5)));
    for (let linha = 0; linha < grade.linhas; linha++) {
      for (let coluna = 0; coluna < grade.colunas; coluna++) {
        this.registrar(
          new FabricText(`${letraDaColuna(coluna)}${linha + 1}`, {
            left: area.esquerda + coluna * passoX + 5,
            top: area.topo + linha * passoY + 4,
            fontSize: corpo,
            fontFamily: "Share Tech Mono, ui-monospace, monospace",
            fill: grade.cor,
            opacity: Math.min(1, grade.opacidade + 0.2),
          }),
        );
      }
    }
  }

  private desenharEscala() {
    /**
     * O encaixe entra na conta: ampliar a foto em 2× corta pela metade
     * os metros que cabem num pixel. Somar log2(escala) ao zoom produz
     * exatamente esse efeito — cada nível de zoom de tile também dobra
     * o detalhe — e mantém a régua honesta.
     */
    const zoomEfetivo = this.enquadramento.zoom + Math.log2(this.ajusteBase.escala);
    const { metros, pixels } = barraDeEscala(
      this.enquadramento.lat,
      zoomEfetivo,
      this.largura / 5,
    );

    const x = this.area().esquerda + 16;
    const y = this.altura - 24;

    for (const parte of [
      new Rect({
        left: x - 8,
        top: y - 20,
        width: pixels + 16,
        height: 32,
        fill: "rgba(0,0,0,0.55)",
      }),
      new Line([x, y, x + pixels, y], { stroke: "#fff", strokeWidth: 3 }),
      new Line([x, y - 6, x, y + 4], { stroke: "#fff", strokeWidth: 3 }),
      new Line([x + pixels, y - 6, x + pixels, y + 4], { stroke: "#fff", strokeWidth: 3 }),
      new FabricText(`${metros} m`, {
        left: x,
        top: y - 19,
        fontSize: 13,
        fontFamily: "Share Tech Mono, ui-monospace, monospace",
        fill: "#fff",
      }),
    ]) {
      this.registrar(parte);
    }
  }

  private desenharNorte() {
    const x = this.largura - 38;
    // Abaixo da marca d'água, que agora mora no canto superior direito.
    const y = this.area().topo + 92;

    /**
     * A rosa compensa a rotação da base.
     *
     * A imagem foi girada `rotacao` graus para alinhar o campo, então o
     * norte geográfico saiu do topo exatamente nessa medida. Girar a
     * seta em `-rotacao` é o que a faz continuar apontando o norte de
     * verdade — sem isso ela vira decoração mentirosa, pior que não ter.
     */
    const grupo = new Group(
      [
        new Polygon(
          [
            { x: 0, y: -16 },
            { x: 7, y: 10 },
            { x: 0, y: 5 },
            { x: -7, y: 10 },
          ],
          { fill: "#fff", stroke: "rgba(0,0,0,0.8)", strokeWidth: 1.5 },
        ),
        new FabricText("N", {
          fontSize: 13,
          fontFamily: "Share Tech Mono, ui-monospace, monospace",
          fill: "#fff",
          originX: "center",
          originY: "center",
          top: 20,
          shadow: sombraDeLeitura(),
        }),
      ],
      { left: x, top: y, originX: "center", originY: "center", angle: -this.enquadramento.rotacao },
    );

    this.registrar(grupo);
  }

  /**
   * Contorno do documento — onde a imagem exportada termina.
   *
   * Com o zoom afastado sobra mesa em volta do mapa, e sem uma linha
   * marcando a borda não dá para saber o que entra no PNG e o que ficou
   * de fora. `excludeFromExport` garante que a própria linha não apareça
   * na imagem: ela é referência de tela, não conteúdo.
   */
  private limite: FabricObject | null = null;

  private desenharLimite() {
    const contorno = new Rect({
      left: 0,
      top: 0,
      width: this.largura,
      height: this.altura,
      fill: "transparent",
      stroke: "rgba(143,174,75,0.65)",
      strokeWidth: 1,
      strokeUniform: true,
    });
    this.registrar(contorno);

    /**
     * Guardado à parte porque é o ÚNICO enfeite que não pode sair no
     * PNG.
     *
     * `excludeFromExport` não serve aqui: ele governa a serialização em
     * JSON, não o desenho — `toDataURL` pinta tudo que está visível no
     * canvas. Grade, escala, norte e crédito se aproveitam disso e
     * aparecem na imagem sem serem salvos no registro. O contorno é o
     * oposto: existe só para a tela, e por isso é escondido à mão na
     * hora de exportar.
     */
    this.limite = contorno;
  }

  /**
   * A marca da comunidade, fixa no canto superior esquerdo do mapa.
   *
   * Pequena mas legível: 30 px de altura num documento de 1280 dá o
   * tamanho de um selo — presente sem disputar com o conteúdo. É o
   * único canto livre: o norte mora no direito, a escala embaixo à
   * esquerda e o crédito da imagem embaixo à direita.
   *
   * Se o bitmap ainda não carregou, o construtor agenda um redesenho
   * para quando chegar; nenhum quadro fica esperando por ele.
   */
  private desenharMarca() {
    if (!marcaBranca) return;
    // 42px e 30% de opacidade (70% transparente): presença de marca
    // d'água — maior que antes, mas recuada o bastante para nunca
    // competir com o desenho tático por cima.
    const alturaMarca = 42;
    const escala = alturaMarca / marcaBranca.height;

    const marca = new FabricImage(marcaBranca, {
      originX: "right",
      originY: "top",
      left: this.largura - 10,
      top: this.area().topo + 10,
      scaleX: escala,
      scaleY: escala,
      opacity: 0.3,
      shadow: sombraDeLeitura(),
    });
    this.registrar(marca);
  }

  private desenharAtribuicao() {
    this.registrar(
      new FabricText(this.config.atribuicao, {
        fontSize: 11,
        fontFamily: "Barlow, system-ui, sans-serif",
        fill: "rgba(255,255,255,0.82)",
        originX: "right",
        originY: "bottom",
        left: this.largura - 8,
        top: this.altura - 5,
        shadow: sombraDeLeitura(),
      }),
    );
  }

  // ==========================================================
  // Ferramentas de traço livre
  // ==========================================================

  definirFerramenta(qual: Ferramenta) {
    this.cancelarTraco();
    this.ferramenta = qual;

    const selecionando = qual === "selecionar";
    // (selecao por caixa fica sempre desligada; ver o construtor)
    // A mão nunca deve agarrar uma forma — ver o comentário no handler
    // de espaço.
    this.canvas.skipTargetFind = qual === "mover";
    this.canvas.defaultCursor = this.cursorDaFerramenta();
    for (const objeto of this.canvas.getObjects()) {
      if (!objeto.ehEnfeite) objeto.selectable = selecionando;
    }
    if (!selecionando) this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  definirEstilo(mudanca: Partial<EstiloAtual>) {
    this.estilo = { ...this.estilo, ...mudanca };

    // Se há algo selecionado, o estilo se aplica a ele — é o que se
    // espera de qualquer editor, e evita ter que apagar e refazer só
    // para trocar a cor.
    const ativos = this.canvas.getActiveObjects();
    for (const objeto of ativos) {
      objeto.set({
        stroke: this.estilo.cor,
        strokeWidth: this.estilo.espessura,
        strokeDashArray: padraoDoTraco(this.estilo.traco),
      });
      if (objeto.tipoCamada === "area") objeto.set({ fill: comAlfa(this.estilo.cor, 0.22) });
      if (objeto.tipoCamada === "texto") objeto.set({ fill: this.estilo.cor, stroke: undefined });
    }
    if (ativos.length) {
      this.canvas.renderAll();
      this.marcarMudanca();
    }
  }

  lerEstilo(): EstiloAtual {
    return { ...this.estilo };
  }

  lerFerramenta(): Ferramenta {
    return this.ferramenta;
  }

  private aoClicar(evento: TPointerEventInfo) {
    if (this.ferramenta === "selecionar" || this.ferramenta === "mover") return;
    // Encaixando a foto, o clique pertence ao encaixe — nada de largar
    // vértice no meio do ajuste.
    if (this.modoArrasteBase || this.arrastandoBase) return;
    // Espaço segurado ou botão do meio: o gesto é de deslocar a vista,
    // não de largar um vértice.
    if (this.arrastandoVista || this.espacoPressionado) return;
    if ((evento.e as MouseEvent).button === 1) return;

    // `getScenePoint` converte a posição do ponteiro para coordenadas do
    // DOCUMENTO, desfazendo zoom e deslocamento. Sem ela, desenhar com a
    // vista ampliada colocaria as formas longe do cursor.
    const ponto = this.canvas.getScenePoint(evento.e);

    if (this.ferramenta === "texto") {
      this.criarTexto(ponto);
      return;
    }
    if (this.ferramenta === "marcacao") {
      this.criarMarcacao(ponto);
      return;
    }

    // Área, linha e rota: vértice a vértice.
    this.pontos.push(ponto);
    this.desenharPrevia();
  }

  private aoMover(evento: TPointerEventInfo) {
    if (this.ferramenta === "selecionar" || this.ferramenta === "mover") return;
    if (this.arrastandoVista || this.pontos.length === 0) return;
    this.desenharPrevia(this.canvas.getScenePoint(evento.e));
  }

  /**
   * Rastro do traço em andamento.
   *
   * Redesenhado inteiro a cada movimento do mouse. Parece desperdício e
   * não é: um traço tem poucas dezenas de vértices, e a alternativa —
   * atualizar um objeto persistente — deixa resíduo na tela toda vez
   * que o usuário desfaz um vértice.
   */
  private desenharPrevia(ate?: Point) {
    for (const objeto of this.previa) this.canvas.remove(objeto);
    this.previa = [];

    const pontos = ate ? [...this.pontos, ate] : this.pontos;
    if (pontos.length < 2) {
      if (pontos.length === 1) this.marcarVertice(pontos[0]);
      this.canvas.renderAll();
      return;
    }

    const linha = new Polyline(
      pontos.map((p) => ({ x: p.x, y: p.y })),
      {
        fill: this.ferramenta === "area" ? comAlfa(this.estilo.cor, 0.18) : "transparent",
        stroke: this.estilo.cor,
        strokeWidth: this.estilo.espessura,
        strokeDashArray: padraoDoTraco(this.estilo.traco),
        strokeUniform: true,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        objectCaching: false,
      },
    );

    this.canvas.add(linha);
    this.previa.push(linha);
    for (const p of this.pontos) this.marcarVertice(p);
    this.canvas.renderAll();
  }

  private marcarVertice(ponto: Point) {
    const marca = new Circle({
      left: ponto.x,
      top: ponto.y,
      radius: 4,
      originX: "center",
      originY: "center",
      fill: "#fff",
      stroke: this.estilo.cor,
      strokeWidth: 2,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    this.canvas.add(marca);
    this.previa.push(marca);
  }

  /** Fecha o traço em andamento e o transforma em objeto de verdade. */
  fecharTraco() {
    if (this.ferramenta === "selecionar" || this.pontos.length < 2) {
      this.cancelarTraco();
      return;
    }

    const pontos = this.pontos.map((p) => ({ x: p.x, y: p.y }));
    const dash = padraoDoTraco(this.estilo.traco);
    const comum = {
      stroke: this.estilo.cor,
      strokeWidth: this.estilo.espessura,
      strokeDashArray: dash,
      strokeUniform: true,
      objectCaching: false,
    };

    this.limparPrevia();

    if (this.ferramenta === "area") {
      const area = new Polygon(pontos, { ...comum, fill: comAlfa(this.estilo.cor, 0.22) });
      area.rotuloCamada = "Área";
      area.tipoCamada = "area";
      this.acrescentar(area);
    } else if (this.ferramenta === "linha") {
      const linha = new Polyline(pontos, { ...comum, fill: "transparent" });
      linha.rotuloCamada = "Linha";
      linha.tipoCamada = "linha";
      this.acrescentar(linha);
    } else if (this.ferramenta === "rota") {
      this.acrescentar(this.montarRota(pontos, comum));
    }

    this.pontos = [];
    this.aoTerminarFerramenta?.();
  }

  /**
   * Rota é a linha mais a ponta de seta no fim.
   *
   * As duas viram um grupo só para o usuário arrastar o conjunto — uma
   * seta que se separa da linha ao mover é pior que nenhuma seta.
   */
  private montarRota(
    pontos: { x: number; y: number }[],
    comum: Record<string, unknown>,
  ): FabricObject {
    const linha = new Polyline(pontos, { ...comum, fill: "transparent" });

    const fim = pontos[pontos.length - 1];
    const antes = pontos[pontos.length - 2];
    const angulo = (Math.atan2(fim.y - antes.y, fim.x - antes.x) * 180) / Math.PI;
    const tamanho = Math.max(12, this.estilo.espessura * 4);

    const ponta = new Polygon(
      [
        { x: 0, y: -tamanho },
        { x: tamanho * 1.6, y: 0 },
        { x: 0, y: tamanho },
      ],
      {
        left: fim.x,
        top: fim.y,
        originX: "center",
        originY: "center",
        angle: angulo,
        fill: this.estilo.cor,
        // A ponta é sólida mesmo em rota tracejada: seta tracejada não
        // lê como direção, lê como sujeira.
        strokeWidth: 0,
      },
    );

    const grupo = new Group([linha, ponta]);
    grupo.rotuloCamada = "Rota";
    grupo.tipoCamada = "rota";
    return grupo;
  }

  cancelarTraco() {
    this.limparPrevia();
    this.pontos = [];
  }

  /** Remove o último vértice do traço em andamento. */
  desfazerVertice() {
    if (!this.pontos.length) return;
    this.pontos.pop();
    this.desenharPrevia();
  }

  private limparPrevia() {
    for (const objeto of this.previa) this.canvas.remove(objeto);
    this.previa = [];
    this.canvas.renderAll();
  }

  // ==========================================================
  // Objetos pontuais
  // ==========================================================

  private acrescentar(objeto: FabricObject) {
    this.canvas.add(objeto);
    this.canvas.setActiveObject(objeto);
    this.canvas.renderAll();
    this.marcarMudanca();
  }

  private criarTexto(ponto: Point) {
    const texto = new Textbox("Escreva aqui", {
      left: ponto.x,
      top: ponto.y,
      width: 240,
      originX: "center",
      originY: "center",
      fontSize: 24,
      fontFamily: "Barlow, system-ui, sans-serif",
      fontWeight: "600",
      fill: this.estilo.cor,
      textAlign: "center",
      shadow: sombraDeLeitura(),
    });
    texto.rotuloCamada = "Texto";
    texto.tipoCamada = "texto";
    this.acrescentar(texto);
    this.aoTerminarFerramenta?.();
    // Entra em edição na hora: quem escolheu a ferramenta de texto quer
    // digitar, não quer clicar duas vezes para começar.
    this.canvas.setActiveObject(texto);
    texto.enterEditing();
    texto.selectAll();
  }

  private criarMarcacao(ponto: Point) {
    const numero = this.proximaMarcacao++;
    const grupo = new Group(
      [
        new Circle({
          radius: 17,
          fill: this.estilo.cor,
          stroke: "rgba(0,0,0,0.8)",
          strokeWidth: 2,
          originX: "center",
          originY: "center",
        }),
        new FabricText(String(numero), {
          fontSize: 19,
          fontFamily: "Share Tech Mono, ui-monospace, monospace",
          fill: "#0b0d09",
          originX: "center",
          originY: "center",
        }),
      ],
      { left: ponto.x, top: ponto.y, originX: "center", originY: "center" },
    );
    grupo.rotuloCamada = `Ponto ${numero}`;
    grupo.tipoCamada = "marcacao";
    this.acrescentar(grupo);
    this.aoTerminarFerramenta?.();
  }

  /**
   * Símbolo tático: disco colorido, ícone e rótulo ao lado.
   *
   * Nasce no centro do que está VISÍVEL, com cascata: quatro símbolos
   * seguidos no mesmo ponto se cobrem e a pessoa acha que só o último
   * foi criado.
   */
  private cascata = 0;

  /**
   * Centro da área visível, em coordenadas do documento.
   *
   * O centro do DOCUMENTO não serve: com a vista ampliada num canto do
   * mapa, um símbolo criado no centro do documento nasce fora da tela e
   * a pessoa conclui que o botão não funcionou. A conta desfaz a matriz
   * de viewport, e o resultado é grampeado para dentro do documento —
   * com a vista sobre a mesa vazia, a forma ainda nasce no mapa.
   */
  private centroVisivel() {
    const vpt = this.canvas.viewportTransform;
    const x = (this.canvas.getWidth() / 2 - vpt[4]) / vpt[0];
    const y = (this.canvas.getHeight() / 2 - vpt[5]) / vpt[3];
    const margem = 80;
    return {
      x: Math.min(this.largura - margem, Math.max(margem, x)),
      y: Math.min(this.altura - margem, Math.max(margem, y)),
    };
  }

  adicionarSimbolo(tipo: TipoSimbolo) {
    const { rotulo, desenho, cor } = SIMBOLOS[tipo];
    const desvio = (this.cascata++ % 6) * 44;
    const centro = this.centroVisivel();
    const x = centro.x + desvio;
    const y = centro.y + desvio;

    /**
     * Todos os filhos em `originX/Y: "left"/"top"`, com coordenadas
     * explícitas.
     *
     * Misturar origens dentro de um Group é o que deixava o rótulo
     * caindo por cima do disco: o Fabric calcula o bounding box do
     * grupo a partir da posição dos filhos, e um filho com origem
     * central declara uma caixa deslocada de metade do próprio
     * tamanho. Com todos no canto superior esquerdo, a montagem vira
     * aritmética simples e o resultado é previsível.
     */
    const RAIO = 19;
    const LADO_ICONE = 21;

    const disco = new Circle({
      left: 0,
      top: 0,
      radius: RAIO,
      fill: cor,
      stroke: "rgba(0,0,0,0.7)",
      strokeWidth: 2,
      originX: "left",
      originY: "top",
    });

    const icone = new Path(desenho, {
      fill: "",
      stroke: "#0b0d09",
      strokeWidth: 1.8,
      strokeLineCap: "square",
      originX: "left",
      originY: "top",
    });
    // O path vem em caixa 24; encolher e centralizar no disco. A escala
    // é aplicada ANTES de posicionar, senão o cálculo usa o tamanho
    // antigo e o ícone sai torto.
    icone.scaleToWidth(LADO_ICONE);
    icone.set({
      left: RAIO - icone.getScaledWidth() / 2,
      top: RAIO - icone.getScaledHeight() / 2,
    });

    const texto = new FabricText(rotulo.toUpperCase(), {
      left: RAIO * 2 + 9,
      top: 0,
      fontSize: 17,
      fontFamily: "Barlow, system-ui, sans-serif",
      fontWeight: "700",
      charSpacing: 40,
      fill: "#fff",
      originX: "left",
      originY: "top",
      shadow: sombraDeLeitura(),
    });
    // Centro do texto na altura do centro do disco.
    texto.set({ top: RAIO - texto.height / 2 });

    const grupo = new Group([disco, icone, texto], {
      left: x,
      top: y,
      originX: "center",
      originY: "center",
    });
    grupo.rotuloCamada = rotulo;
    grupo.tipoCamada = "simbolo";
    this.acrescentar(grupo);
  }

  adicionarElipse() {
    const centro = this.centroVisivel();
    const elipse = new Ellipse({
      rx: 90,
      ry: 70,
      left: centro.x,
      top: centro.y,
      originX: "center",
      originY: "center",
      fill: comAlfa(this.estilo.cor, 0.18),
      stroke: this.estilo.cor,
      strokeWidth: this.estilo.espessura,
      strokeDashArray: padraoDoTraco(this.estilo.traco),
      strokeUniform: true,
    });
    elipse.rotuloCamada = "Círculo";
    elipse.tipoCamada = "area";
    this.acrescentar(elipse);
  }

  removerSelecao() {
    const ativos = this.canvas.getActiveObjects();
    if (!ativos.length) return;
    for (const objeto of ativos) this.canvas.remove(objeto);
    this.canvas.discardActiveObject();
    this.canvas.renderAll();
    this.marcarMudanca();
  }

  // ==========================================================
  // Camadas
  // ==========================================================

  /**
   * Lista para o painel lateral, do topo da pilha para baixo.
   *
   * A ordem é invertida em relação ao Fabric porque no canvas o último
   * objeto é o que fica por cima, e num painel de camadas o de cima da
   * lista é o de cima do desenho — é o que todo editor faz e o que a
   * pessoa espera ao arrastar para reordenar.
   */
  /**
   * Cor que representa o objeto na lista de camadas.
   *
   * Um Group — símbolo, ponto numerado, rota — não tem `stroke` próprio:
   * a cor vive nos filhos. Sem descer até eles, todas essas camadas
   * apareciam com a mesma cor da ferramenta ativa, e o quadradinho de
   * cor deixava de servir para reconhecer o quê é o quê.
   */
  private corDoObjeto(objeto: FabricObject): string {
    const direta = objeto.stroke ?? objeto.fill;
    if (typeof direta === "string" && direta !== "transparent" && direta !== "") {
      // Descarta o alfa do preenchimento de área: o quadradinho tem que
      // ser sólido para se distinguir do fundo escuro do painel.
      return direta.length === 9 ? direta.slice(0, 7) : direta;
    }
    if (objeto instanceof Group) {
      for (const filho of objeto.getObjects()) {
        const cor = this.corDoObjeto(filho);
        if (cor) return cor;
      }
    }
    return this.estilo.cor;
  }

  listarCamadas(): ItemCamada[] {
    const ativos = new Set(this.canvas.getActiveObjects());
    return this.canvas
      .getObjects()
      .filter((o) => !o.ehEnfeite)
      .map((objeto, indice) => ({
        id: String(indice),
        rotulo: objeto.rotuloCamada ?? "Objeto",
        tipo: objeto.tipoCamada ?? "area",
        cor: this.corDoObjeto(objeto),
        visivel: objeto.visible !== false,
        ativo: ativos.has(objeto),
      }))
      .reverse();
  }

  private objetoDaCamada(id: string): FabricObject | undefined {
    return this.canvas.getObjects().filter((o) => !o.ehEnfeite)[Number(id)];
  }

  alternarVisibilidade(id: string) {
    const objeto = this.objetoDaCamada(id);
    if (!objeto) return;
    objeto.visible = objeto.visible === false;
    if (!objeto.visible) this.canvas.discardActiveObject();
    this.canvas.renderAll();
    this.marcarMudanca();
  }

  selecionarCamada(id: string) {
    const objeto = this.objetoDaCamada(id);
    if (!objeto || objeto.visible === false) return;
    this.definirFerramenta("selecionar");
    this.canvas.setActiveObject(objeto);
    this.canvas.renderAll();
  }

  removerCamada(id: string) {
    const objeto = this.objetoDaCamada(id);
    if (!objeto) return;
    this.canvas.remove(objeto);
    this.canvas.renderAll();
    this.marcarMudanca();
  }

  moverCamada(id: string, direcao: "cima" | "baixo") {
    const objeto = this.objetoDaCamada(id);
    if (!objeto) return;
    if (direcao === "cima") this.canvas.bringObjectForward(objeto);
    else this.canvas.sendObjectBackwards(objeto);
    this.canvas.renderAll();
    this.marcarMudanca();
  }

  renomearCamada(id: string, nome: string) {
    const objeto = this.objetoDaCamada(id);
    if (!objeto) return;
    objeto.rotuloCamada = nome.trim().slice(0, 40) || "Objeto";
    this.marcarMudanca();
  }

  // ==========================================================
  // Desfazer e refazer
  //
  // O Fabric não traz isso pronto. A implementação guarda o JSON do
  // desenho a cada mudança — não o canvas inteiro, que incluiria a
  // imagem de fundo em base64 e estouraria a memória em poucos passos.
  //
  // O teto de 40 estados é o que equilibra: cobre uma sessão de trabalho
  // real e mantém o consumo na casa de poucos MB.
  // ==========================================================

  private static readonly TETO_HISTORICO = 40;

  private marcarMudanca() {
    this.registrarHistorico();
    this.aoMudar?.();
  }

  /**
   * Serializa SÓ os objetos do usuário, um a um.
   *
   * Nunca `canvas.toObject()`: ele serializa o canvas inteiro, e isso
   * inclui converter a imagem de satélite de fundo em data-URL — uma
   * string base64 de vários MB gerada a cada chamada. Era daí que
   * vinha a lentidão generalizada da primeira versão: cada registro de
   * histórico pagava essa conversão sem usar o resultado, porque o
   * fundo nem entra no histórico (ele é reconstruído do enquadramento).
   */
  private objetosSerializados(): unknown[] {
    return this.canvas
      .getObjects()
      .filter((o) => !o.ehEnfeite && !o.excludeFromExport)
      .map((o) => o.toObject(["rotuloCamada", "tipoCamada"]));
  }

  private registrarHistorico() {
    if (this.restaurando) return;
    const estado = JSON.stringify(this.objetosSerializados());

    // Nada mudou de fato (um clique que só selecionou, por exemplo).
    if (estado === this.historico[this.posicaoHistorico]) return;

    // Uma ação nova apaga o futuro: é o comportamento de qualquer editor.
    this.historico = this.historico.slice(0, this.posicaoHistorico + 1);
    this.historico.push(estado);

    if (this.historico.length > EditorMapa.TETO_HISTORICO) this.historico.shift();
    this.posicaoHistorico = this.historico.length - 1;
  }

  podeDesfazer() {
    return this.posicaoHistorico > 0;
  }

  podeRefazer() {
    return this.posicaoHistorico < this.historico.length - 1;
  }

  async desfazer() {
    if (!this.podeDesfazer()) return;
    this.posicaoHistorico--;
    await this.aplicarHistorico();
  }

  async refazer() {
    if (!this.podeRefazer()) return;
    this.posicaoHistorico++;
    await this.aplicarHistorico();
  }

  private async aplicarHistorico() {
    const estado = this.historico[this.posicaoHistorico];
    if (!estado) return;

    this.restaurando = true;
    try {
      await this.carregarObjetos(JSON.parse(estado));
    } finally {
      this.restaurando = false;
    }
    this.aoMudar?.();
  }

  /**
   * Troca os objetos do canvas preservando a imagem de fundo.
   *
   * `loadFromJSON` limpa o canvas INTEIRO, e um payload sem `background`
   * apaga junto o satélite e a cor de fundo. O sintoma é traiçoeiro: na
   * tela o canvas continua parecendo certo por um instante, mas o PNG
   * exportado sai com fundo transparente — que a maioria dos
   * visualizadores mostra como cinza claro, e não como erro.
   *
   * Por isso o fundo é guardado antes e reposto depois. Recarregar a
   * base da rede a cada desfazer seria a alternativa, e é lenta demais
   * para uma ação que precisa ser instantânea.
   */
  private async carregarObjetos(objetos: unknown[]): Promise<void> {
    const fundo = this.canvas.backgroundImage;
    const corDeFundo = this.canvas.backgroundColor;

    await this.canvas.loadFromJSON({ objects: objetos });

    this.canvas.backgroundImage = fundo;
    this.canvas.backgroundColor = corDeFundo;

    this.redesenharEnfeites();
    this.canvas.renderAll();
  }

  // ==========================================================
  // Configuração
  // ==========================================================

  ajustarGrade(mudanca: Partial<Grade>) {
    this.camadas.grade = { ...(this.camadas.grade ?? GRADE_PADRAO), ...mudanca };
    this.agendarEnfeites();
    this.aoMudar?.();
  }

  alternarEnfeite(qual: "escala" | "norte", ligado: boolean) {
    this.camadas[qual] = ligado;
    this.agendarEnfeites();
    this.aoMudar?.();
  }

  ajustarVeu(forca: number) {
    this.camadas.veu = Math.min(0.75, Math.max(0, forca));
    this.agendarEnfeites();
    this.aoMudar?.();
  }

  lerGrade(): Grade {
    return { ...(this.camadas.grade ?? GRADE_PADRAO) };
  }

  lerCamadasConfig(): CamadasMapa {
    return { ...this.camadas };
  }

  lerEnquadramento(): Enquadramento {
    return { ...this.enquadramento };
  }

  lerTamanho() {
    return { largura: this.largura, altura: this.altura };
  }

  /**
   * Troca o enquadramento sem perder o desenho.
   *
   * Mudar o FORMATO reposiciona as formas proporcionalmente — sem isso,
   * passar de paisagem a retrato jogaria metade do desenho para fora da
   * tela. Mudar só lat/lng/zoom/rotação mantém tudo onde está, o que é
   * o certo: o desenho é do terreno, e reenquadrar é olhar o mesmo
   * terreno de outro jeito.
   */
  async reenquadrar(novo: Partial<Enquadramento>, proporcaoLivre?: number) {
    const mudouFormato = novo.formato !== undefined && novo.formato !== this.enquadramento.formato;

    this.enquadramento = { ...this.enquadramento, ...novo };

    // No formato livre o documento também muda quando a proporção da
    // área de trabalho muda (janela redimensionada) — não só quando o
    // formato troca de nome. Sem proporção informada, o livre MANTÉM
    // as dimensões atuais: girar ou trocar o zoom do satélite não pode
    // redimensionar o documento por efeito colateral.
    const tamanho =
      this.enquadramento.formato === "livre" && proporcaoLivre === undefined
        ? { largura: this.largura, altura: this.altura }
        : tamanhoDoDocumento(this.enquadramento.formato, proporcaoLivre);
    const mudouTamanho =
      mudouFormato || tamanho.largura !== this.largura || tamanho.altura !== this.altura;

    if (mudouTamanho) {
      const antesL = this.largura;
      const antesA = this.altura;
      this.largura = tamanho.largura;
      this.altura = tamanho.altura;

      // O canvas em si tem o tamanho do palco; só as formas precisam
      // acompanhar a mudança do documento.
      const fatorX = this.largura / antesL;
      const fatorY = this.altura / antesA;
      for (const objeto of this.canvas.getObjects()) {
        if (objeto.ehEnfeite) continue;
        objeto.set({ left: (objeto.left ?? 0) * fatorX, top: (objeto.top ?? 0) * fatorY });
        objeto.setCoords();
      }
    }

    await this.carregarBase();
    this.redesenharEnfeites();
    this.aoMudar?.();
  }

  // ==========================================================
  // Entrada e saída
  // ==========================================================

  serializar(): CamadasMapa {
    // Mesmo caminho do histórico: objeto a objeto, sem tocar no fundo.
    // O encaixe da foto vai junto: reabrir o mapa tem que devolver o
    // terreno exatamente onde a pessoa o deixou sob a grade.
    return {
      ...this.camadas,
      base: { ...this.ajusteBase },
      // As dimensões exatas viajam junto: um mapa `livre` salvo numa
      // tela larga reabre com o MESMO documento noutra tela qualquer.
      doc: { largura: this.largura, altura: this.altura },
      objetos: this.objetosSerializados(),
    };
  }

  async restaurar(camadas: CamadasMapa): Promise<void> {
    this.camadas = { ...camadasIniciais(), ...camadas };
    this.mapaTravado = camadas.travado ?? false;
    if (camadas.base) {
      this.ajusteBase = { ...camadas.base };
      // O clamp de cobertura TAMBÉM na restauração: um registro antigo
      // (ou corrompido) com escala abaixo do piso ou deslocamento fora
      // dos limites entraria vivo na tela e só seria corrigido no
      // primeiro arrasto — cantos descobertos até lá.
      this.travarCobertura();
      this.aplicarEncaixeBase();
    }

    const objetos = camadas.objetos ?? [];
    this.restaurando = true;
    try {
      // Passa mesmo com a lista vazia: é o caminho que repõe o fundo e
      // redesenha os enfeites com a configuração recém-carregada.
      await this.carregarObjetos(objetos);
    } finally {
      this.restaurando = false;
    }
    this.registrarHistorico();
  }

  /**
   * PNG do documento, pronto para baixar.
   *
   * A seleção é descartada antes: os puxadores de redimensionar são
   * interface e saem impressos na imagem se o objeto continuar ativo.
   * O traço em andamento também some — exportar no meio de um polígono
   * levaria os vértices soltos junto.
   */
  exportarPNG(multiplicador = 1): string {
    this.cancelarTraco();
    this.canvas.discardActiveObject();

    /**
     * Neutraliza a vista antes de gerar a imagem.
     *
     * O canvas tem o tamanho do palco e o documento vive dentro dele
     * pela matriz de viewport. Exportar sem desfazer isso produziria
     * exatamente o que está na tela — com a mesa em volta, cortado no
     * zoom em que a pessoa estava, e de tamanho variável conforme a
     * janela. O PNG tem que ser o DOCUMENTO, sempre igual.
     *
     * Guardar e repor no `finally` porque `toDataURL` pode lançar (por
     * canvas sujo, por memória) e deixar o editor preso num estado
     * torto seria pior que a falha em si.
     */
    const vistaAnterior = [...this.canvas.viewportTransform] as typeof this.canvas.viewportTransform;
    const larguraAnterior = this.canvas.getWidth();
    const alturaAnterior = this.canvas.getHeight();

    /**
     * O crédito do gerador só existe na IMAGEM BAIXADA.
     *
     * Na tela ele seria ruído permanente; no arquivo que circula no
     * grupo é a assinatura que diz de onde o mapa veio. Entra antes do
     * `toDataURL` e sai no `finally` — nunca fica no canvas, nunca é
     * salvo no registro.
     */
    const credito = new FabricText(
      "Mapa criado pelo Gerador de Mapas: comunidadeairsoft.com.br",
      {
        fontSize: 14,
        fontFamily: "Barlow, system-ui, sans-serif",
        fontWeight: "600",
        fill: "#ffffff",
        originX: "center",
        originY: "bottom",
        left: this.largura / 2,
        top: this.altura - 6,
        shadow: sombraDeLeitura(),
        selectable: false,
        evented: false,
      },
    );
    // Fora do histórico e fora do JSON salvo, como todo enfeite.
    credito.ehEnfeite = true;
    credito.excludeFromExport = true;

    try {
      if (this.limite) this.limite.visible = false;
      this.canvas.add(credito);
      this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      this.canvas.setDimensions({ width: this.largura, height: this.altura });
      this.canvas.renderAll();

      return this.canvas.toDataURL({
        format: "png",
        multiplier: multiplicador,
        enableRetinaScaling: false,
      });
    } finally {
      this.canvas.remove(credito);
      if (this.limite) this.limite.visible = true;
      this.canvas.setDimensions({ width: larguraAnterior, height: alturaAnterior });
      this.canvas.setViewportTransform(vistaAnterior);
      this.canvas.renderAll();
    }
  }

  async exportarBlob(multiplicador = 1): Promise<Blob> {
    return await (await fetch(this.exportarPNG(multiplicador))).blob();
  }

  destruir() {
    this.canvas.dispose();
  }
}

export { BASE_LADO };
