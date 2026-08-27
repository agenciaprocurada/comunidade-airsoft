/**
 * Liga a tela do editor ao `EditorMapa`.
 *
 * Só este arquivo entra no bundle inicial de `/mapa`. Fabric e Leaflet
 * são carregados por `import()` — o Fabric assim que o editor monta, o
 * Leaflet só quando alguém abre o painel de reposicionamento. Quem
 * chegou do Google e leu o texto não baixa nenhum dos dois.
 */

import {
  FORMATO_PADRAO,
  PROVEDORES,
  PROVEDOR_PADRAO,
  ZOOM_MIN,
  ZOOM_PADRAO,
  ehFormato,
  metrosPorPixel,
  BASE_LADO,
  type CamadasMapa,
  type ConfigMapa,
  type Formato,
  type Mapa,
  type Traco,
} from "../../lib/mapa";
import type { TipoSimbolo } from "../../lib/simbolos";
import type { EditorMapa, Ferramenta } from "./editor";
import type { Localizador } from "./localizador";

/** Onde o rascunho espera enquanto o usuário passa pelo login. */
const CHAVE_RASCUNHO = "mapa-rascunho";

interface Estado {
  id: string | null;
  nome: string;
  lat: number;
  lng: number;
  zoom: number;
  rotacao: number;
  formato: Formato;
  camadas: CamadasMapa | null;
}

/** Centro geográfico aproximado do país — ponto de partida neutro. */
const ESTADO_INICIAL: Estado = {
  id: null,
  nome: "",
  lat: -15.78,
  lng: -47.93,
  zoom: ZOOM_PADRAO,
  rotacao: 0,
  formato: FORMATO_PADRAO,
  camadas: null,
};

export async function iniciarEditor() {
  const raiz = document.querySelector<HTMLElement>("[data-editor]");
  if (!raiz) return;

  const $ = <T extends HTMLElement>(s: string) => raiz.querySelector<T>(s)!;
  const $$ = <T extends HTMLElement>(s: string) => Array.from(raiz.querySelectorAll<T>(s));

  const chaveNavegador = raiz.dataset.chave ?? "";
  const estado: Estado = { ...ESTADO_INICIAL };

  let config: ConfigMapa = {
    provedor: PROVEDOR_PADRAO,
    atribuicao: PROVEDORES[PROVEDOR_PADRAO].atribuicao,
    zoomMax: PROVEDORES[PROVEDOR_PADRAO].zoomMax,
    viaServidor: false,
  };

  let editor: EditorMapa | null = null;
  let sujo = false;

  const aviso = $<HTMLParagraphElement>("[data-aviso]");
  const carregando = $<HTMLElement>("[data-carregando]");

  function avisar(mensagem: string) {
    aviso.textContent = mensagem;
    aviso.classList.toggle("hidden", !mensagem);
  }

  function ocupado(ligado: boolean) {
    carregando.classList.toggle("hidden", !ligado);
    carregando.classList.toggle("grid", ligado);
  }

  // ==========================================================
  // Configuração do provedor + Fabric, em paralelo
  //
  // O Fabric tem ~300 KB e a config é uma chamada de rede: esperar uma
  // coisa terminar para começar a outra somava as duas latências na
  // abertura. Disparar as duas juntas corta o tempo até o editor
  // aparecer — e o véu de "carregando" liga JÁ, para a tela nunca ficar
  // parada sem dizer o que está fazendo.
  // ==========================================================

  ocupado(true);
  const importarEditor = import("./editor");

  try {
    const resposta = await fetch("/api/mapa/config");
    if (resposta.ok) config = (await resposta.json()) as ConfigMapa;
  } catch {
    // Segue com o padrão: a Esri funciona sem nenhuma configuração.
  }

  const fatiaZoom = $<HTMLInputElement>("[data-zoom]");
  fatiaZoom.max = String(config.zoomMax);
  if (estado.zoom > config.zoomMax) estado.zoom = config.zoomMax;

  // ==========================================================
  // Editor
  // ==========================================================

  const { EditorMapa: Classe } = await importarEditor;

  const palco = $<HTMLElement>("[data-palco]");
  const alvoCanvas = $<HTMLCanvasElement>("[data-canvas]");
  const molduraPalco = $<HTMLElement>("[data-moldura-palco]");

  /** Proporção da área de trabalho — o que o formato `livre` espelha. */
  function proporcaoDaMoldura(): number {
    const largura = molduraPalco.clientWidth;
    const altura = molduraPalco.clientHeight;
    if (largura > 40 && altura > 40) return largura / altura;
    // Empilhado (sem altura própria): mesma derivação do dimensionarPalco.
    return largura > 40 ? largura / (window.innerHeight * 0.6) : 16 / 9;
  }

  editor = new Classe({
    canvas: alvoCanvas,
    palco,
    proporcaoLivre: proporcaoDaMoldura(),
    enquadramento: {
      lat: estado.lat,
      lng: estado.lng,
      zoom: estado.zoom,
      rotacao: estado.rotacao,
      formato: estado.formato,
    },
    config,
    aoMudar: () => {
      sujo = true;
      desenharCamadas();
      atualizarAcoes();
    },
    aoTerminarFerramenta: () => escolherFerramenta("selecionar"),
    aoNavegar: (zoom) => {
      $("[data-vista-valor]").textContent = `${Math.round(zoom * 100)}%`;
    },
    // Selecionar só realça no painel de camadas: não suja o rascunho.
    aoSelecionar: () => desenharCamadas(),
    // O encaixe mudou (roda, dobra ou recentragem do arrasto): zoom E
    // coordenada acompanham — o recentro muda o centro geográfico, e o
    // salvamento usa o `estado`, que não pode ficar para trás.
    aoEncaixar: ({ zoom, lat, lng }) => {
      sujo = true;
      estado.zoom = zoom;
      estado.lat = lat;
      estado.lng = lng;
      fatiaZoom.value = String(zoom);
      $("[data-zoom-valor]").textContent = String(zoom);
      atualizarResumo();
    },
  });

  /**
   * Zoom e deslocamento da vista.
   *
   * Quem faz o trabalho é o `viewportTransform` do Fabric — ver o
   * comentário no construtor do editor. Aqui só ficam os botões; a roda
   * do mouse, o espaço e o botão do meio são tratados lá dentro, porque
   * dependem do estado do canvas.
   *
   * Passo multiplicativo (×1.25) e não aditivo: perto de 20% um passo
   * fixo daria salto enorme, e perto de 300% seria imperceptível.
   */
  $("[data-vista='menos']").addEventListener("click", () =>
    editor?.aplicarZoom(editor.lerZoom() / 1.25),
  );
  $("[data-vista='mais']").addEventListener("click", () =>
    editor?.aplicarZoom(editor.lerZoom() * 1.25),
  );
  $("[data-vista='ajustar']").addEventListener("click", () => editor?.ajustarVista());

  /**
   * Recorta o palco na proporção do documento.
   *
   * A moldura externa dá o espaço disponível; o palco vira o maior
   * retângulo com a proporção do formato que cabe nela. Junto com o
   * "ajustar" a 100%, é o que faz a foto ocupar a área visível INTEIRA
   * — as faixas pretas nas laterais eram o palco largo demais para um
   * documento 4:3.
   */
  function dimensionarPalco() {
    if (!editor) return;
    const { largura, altura } = editor.lerTamanho();
    const larguraMoldura = molduraPalco.clientWidth;
    const alturaMoldura = molduraPalco.clientHeight;
    if (larguraMoldura < 40) return;

    if (alturaMoldura < 40) {
      // Abaixo do xl a moldura empilha sem altura própria: deriva a
      // altura da largura, com teto para não engolir a tela do celular.
      const alturaDerivada = Math.min(
        (larguraMoldura * altura) / largura,
        window.innerHeight * 0.6,
      );
      palco.style.width = `${Math.floor(larguraMoldura)}px`;
      palco.style.height = `${Math.floor(alturaDerivada)}px`;
    } else {
      const fator = Math.min(larguraMoldura / largura, alturaMoldura / altura);
      palco.style.width = `${Math.floor(largura * fator)}px`;
      palco.style.height = `${Math.floor(altura * fator)}px`;
    }

    editor.redimensionar();
    editor.ajustarVista();
  }

  /**
   * No formato livre o documento espelha a tela — redimensionar a
   * janela muda a proporção alvo. O ajuste espera o arrasto terminar
   * (400 ms) e só recarrega quando o desvio passa de 3%: recarregar
   * tiles a cada pixel de resize seria rede desperdiçada.
   */
  let temporizadorLivre: ReturnType<typeof setTimeout> | undefined;

  window.addEventListener("resize", () => {
    dimensionarPalco();
    if (estado.formato !== "livre" || !editor) return;
    clearTimeout(temporizadorLivre);
    temporizadorLivre = setTimeout(() => {
      const alvo = proporcaoDaMoldura();
      const { largura, altura } = editor!.lerTamanho();
      const atual = largura / altura;
      if (Math.abs(alvo - atual) / atual > 0.03) void recarregarBase(alvo);
    }, 400);
  });

  async function recarregarBase(proporcaoLivre?: number) {
    if (!editor) return;
    ocupado(true);
    try {
      await editor.reenquadrar(
        {
          lat: estado.lat,
          lng: estado.lng,
          zoom: estado.zoom,
          rotacao: estado.rotacao,
          formato: estado.formato,
        },
        proporcaoLivre,
      );
      avisar("");
    } catch (erro) {
      console.error("Falha ao carregar o satélite:", erro);
      avisar("A imagem de satélite não carregou — o desenho continua funcionando.");
    } finally {
      ocupado(false);
      atualizarResumo();
      // Trocar o formato muda a proporção do documento — o palco
      // acompanha.
      dimensionarPalco();
    }
  }

  function atualizarResumo() {
    const metros = Math.round(BASE_LADO * metrosPorPixel(estado.lat, estado.zoom, 1));
    $("[data-resumo-local]").textContent =
      `${estado.lat.toFixed(4)}, ${estado.lng.toFixed(4)} · ~${metros} m de largura`;
  }

  // ==========================================================
  // Ferramentas
  // ==========================================================

  const DICAS: Record<Ferramenta, string> = {
    selecionar: "Clique para selecionar e arraste para mover. Delete apaga.",
    mover: "Arraste para deslocar o mapa. Roda do mouse dá zoom.",
    area: "Clique em cada canto da área. Duplo-clique ou Enter fecha; Esc cancela.",
    linha: "Clique em cada ponto da linha. Duplo-clique ou Enter termina; Esc cancela.",
    rota: "Clique o caminho ponto a ponto. A seta entra no fim. Duplo-clique termina.",
    texto: "Clique onde o texto deve começar.",
    marcacao: "Clique para soltar um ponto numerado.",
  };

  /**
   * O interruptor único do modo de enquadrar.
   *
   * Três controles refletem o mesmo estado — o botão grande no rodapé
   * do palco, o "Arrastar foto" da aba Satélite e a faixa-guia sobre o
   * mapa — e todos passam por aqui, senão divergem no primeiro clique.
   *
   * Ligado: arrastar move a FOTO, a roda dimensiona a FOTO, a grade e
   * o desenho não se mexem. Fixado: a foto vira chão parado e as
   * ferramentas voltam ao normal.
   */
  function definirEncaixe(ligado: boolean) {
    editor?.definirArrasteBase(ligado);

    // O interruptor da aba Satélite é o retrato único do estado.
    ($("[data-encaixe-toggle]") as HTMLInputElement).checked = ligado;
    $("[data-faixa-encaixe]").classList.toggle("hidden", !ligado);

    $("[data-dica]").textContent = ligado
      ? "Enquadrando: arraste e role para encaixar a foto sob a grade. Desligue o encaixe quando estiver bom."
      : DICAS[ferramentaAtual];

    // Enquadrar pede o documento inteiro à vista.
    if (ligado) editor?.ajustarVista();
  }

  /** Qualquer ferramenta encerra o enquadramento. */
  function sairDoEncaixe() {
    if (editor?.emModoEncaixe()) definirEncaixe(false);
  }

  /**
   * Reflexo da trava do mapa na tela: rótulo e estado do botão, e o
   * interruptor de encaixe desabilitado — travado, nenhum gesto pode
   * deslocar a foto, então oferecer o encaixe seria botão mentiroso.
   */
  function refletirTrava() {
    const travado = Boolean(editor?.estaTravado());
    $("[data-travar]").setAttribute("aria-pressed", String(travado));
    $("[data-travar-rotulo]").textContent = travado ? "Mapa travado" : "Travar mapa";
    ($("[data-encaixe-toggle]") as HTMLInputElement).disabled = travado;
    if (travado && editor?.emModoEncaixe()) definirEncaixe(false);
  }

  $("[data-travar]").addEventListener("click", () => {
    if (!editor) return;
    editor.definirTravaMapa(!editor.estaTravado());
    refletirTrava();
    $("[data-dica]").textContent = editor.estaTravado()
      ? "Mapa travado: a foto não se desloca mais. Clique de novo para destravar."
      : DICAS[ferramentaAtual];
  });

  let ferramentaAtual: Ferramenta = "selecionar";

  function escolherFerramenta(qual: Ferramenta) {
    ferramentaAtual = qual;
    sairDoEncaixe();
    editor?.definirFerramenta(qual);
    for (const botao of $$("[data-ferramenta]")) {
      botao.setAttribute("aria-pressed", String(botao.dataset.ferramenta === qual));
    }
    $("[data-dica]").textContent = DICAS[qual];
  }

  for (const botao of $$("[data-ferramenta]")) {
    botao.addEventListener("click", () =>
      escolherFerramenta(botao.dataset.ferramenta as Ferramenta),
    );
  }

  function atualizarAcoes() {
    ($("[data-acao='desfazer']") as HTMLButtonElement).disabled = !editor?.podeDesfazer();
    ($("[data-acao='refazer']") as HTMLButtonElement).disabled = !editor?.podeRefazer();
  }

  $("[data-acao='desfazer']").addEventListener("click", () => editor?.desfazer());
  $("[data-acao='refazer']").addEventListener("click", () => editor?.refazer());
  $("[data-acao='excluir']").addEventListener("click", () => editor?.removerSelecao());

  // ==========================================================
  // Camadas
  // ==========================================================

  const listaCamadas = $<HTMLUListElement>("[data-camadas]");
  const vazioCamadas = $<HTMLElement>("[data-camadas-vazio]");

  function desenharCamadas() {
    if (!editor) return;
    const itens = editor.listarCamadas();

    listaCamadas.innerHTML = "";
    vazioCamadas.classList.toggle("hidden", itens.length > 0);
    $("[data-conta-camadas]").textContent = String(itens.length);

    for (const item of itens) {
      const li = document.createElement("li");
      li.className =
        "flex items-center gap-2 border-b border-borda px-2 py-1.5 last:border-b-0 " +
        (item.ativo ? "bg-oliva-050" : "");

      const cor = document.createElement("span");
      cor.className = "h-3 w-3 shrink-0 border border-black/40";
      cor.style.background = item.cor;
      li.appendChild(cor);

      const nome = document.createElement("button");
      nome.type = "button";
      nome.className =
        "min-w-0 flex-1 truncate text-left text-[0.875rem] text-tinta hover:text-oliva-300";
      nome.textContent = item.rotulo;
      nome.title = "Selecionar no mapa · duplo-clique renomeia";
      nome.addEventListener("click", () => editor!.selecionarCamada(item.id));
      nome.addEventListener("dblclick", () => {
        const novo = window.prompt("Nome da camada:", item.rotulo);
        if (novo !== null) {
          editor!.renomearCamada(item.id, novo);
          desenharCamadas();
        }
      });
      li.appendChild(nome);

      const olho = document.createElement("button");
      olho.type = "button";
      olho.className = "shrink-0 px-1 text-texto-2 hover:text-tinta";
      olho.title = item.visivel ? "Ocultar" : "Mostrar";
      olho.innerHTML = item.visivel
        ? '<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/></svg>'
        : '<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4l16 16M9.5 9.6A2.5 2.5 0 0 0 12 14.5M6.3 6.4C3.9 8 2 12 2 12s3.5 6 10 6c1.8 0 3.3-.4 4.6-1M20.6 15C21.6 13.7 22 12 22 12s-3.5-6-10-6c-.7 0-1.3 0-1.9.2"/></svg>';
      olho.addEventListener("click", () => {
        editor!.alternarVisibilidade(item.id);
        desenharCamadas();
      });
      li.appendChild(olho);

      for (const [rotulo, direcao, seta] of [
        ["Subir", "cima", "M12 5l6 7H6z"],
        ["Descer", "baixo", "M12 19l-6-7h12z"],
      ] as const) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "shrink-0 px-0.5 text-texto-2 hover:text-tinta";
        botao.title = rotulo;
        botao.innerHTML = `<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor"><path d="${seta}"/></svg>`;
        botao.addEventListener("click", () => {
          editor!.moverCamada(item.id, direcao);
          desenharCamadas();
        });
        li.appendChild(botao);
      }

      const apagar = document.createElement("button");
      apagar.type = "button";
      apagar.className = "shrink-0 px-1 text-texto-2 hover:text-alerta";
      apagar.title = "Apagar";
      apagar.innerHTML =
        '<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/></svg>';
      apagar.addEventListener("click", () => {
        editor!.removerCamada(item.id);
        desenharCamadas();
      });
      li.appendChild(apagar);

      listaCamadas.appendChild(li);
    }
  }

  // ==========================================================
  // Símbolos, cor e traço
  // ==========================================================

  /**
   * Abas dos painéis encaixados, escopadas por grupo.
   *
   * São DOIS grupos independentes (conteúdo em cima, ajustes embaixo),
   * então tanto as abas quanto os painéis são procurados DENTRO do
   * próprio grupo. A versão global desligava painéis do outro grupo a
   * cada clique — trocar para "Grade" escondia a lista de símbolos.
   */
  for (const grupo of $$("[data-grupo-abas]")) {
    const abas = Array.from(grupo.querySelectorAll<HTMLElement>("[data-aba]"));
    const paineis = Array.from(grupo.querySelectorAll<HTMLElement>("[data-painel-aba]"));
    for (const aba of abas) {
      aba.addEventListener("click", () => {
        for (const outra of abas) {
          outra.setAttribute("aria-pressed", String(outra === aba));
        }
        for (const painel of paineis) {
          painel.classList.toggle("hidden", painel.dataset.painelAba !== aba.dataset.aba);
        }
      });
    }
  }

  for (const botao of $$("[data-simbolo]")) {
    botao.addEventListener("click", () =>
      editor?.adicionarSimbolo(botao.dataset.simbolo as TipoSimbolo),
    );
  }

  for (const botao of $$("[data-cor]")) {
    botao.addEventListener("click", () => {
      for (const outro of $$("[data-cor]")) {
        outro.setAttribute("aria-pressed", String(outro === botao));
      }
      editor?.definirEstilo({ cor: botao.dataset.cor! });
    });
  }

  for (const botao of $$("[data-traco]")) {
    botao.addEventListener("click", () => {
      for (const outro of $$("[data-traco]")) {
        outro.setAttribute("aria-pressed", String(outro === botao));
      }
      editor?.definirEstilo({ traco: botao.dataset.traco as Traco });
    });
  }

  $("[data-espessura]").addEventListener("input", (e) => {
    const valor = Number((e.target as HTMLInputElement).value);
    $("[data-espessura-valor]").textContent = String(valor);
    editor?.definirEstilo({ espessura: valor });
  });

  $("[data-circulo]").addEventListener("click", () => editor?.adicionarElipse());

  // ==========================================================
  // Quadrícula e satélite
  // ==========================================================

  const ligarCaixa = (seletor: string, aplicar: (ligado: boolean) => void) => {
    $(seletor).addEventListener("change", (e) =>
      aplicar((e.target as HTMLInputElement).checked),
    );
  };

  ligarCaixa("[data-grade-ligada]", (v) => editor?.ajustarGrade({ ligada: v }));
  ligarCaixa("[data-grade-letras]", (v) => editor?.ajustarGrade({ letras: v }));
  ligarCaixa("[data-grade-numeros]", (v) => editor?.ajustarGrade({ numeros: v }));
  ligarCaixa("[data-grade-rotulos]", (v) => editor?.ajustarGrade({ rotulos: v }));
  ligarCaixa("[data-escala]", (v) => editor?.alternarEnfeite("escala", v));
  ligarCaixa("[data-norte]", (v) => editor?.alternarEnfeite("norte", v));

  for (const [seletor, chave] of [
    ["[data-grade-colunas]", "colunas"],
    ["[data-grade-linhas]", "linhas"],
  ] as const) {
    $(seletor).addEventListener("change", (e) => {
      const campo = e.target as HTMLInputElement;
      const valor = Math.min(
        Number(campo.max),
        Math.max(Number(campo.min), Math.round(Number(campo.value))),
      );
      campo.value = String(valor);
      editor?.ajustarGrade({ [chave]: valor });
    });
  }

  $("[data-grade-opacidade]").addEventListener("input", (e) => {
    editor?.ajustarGrade({ opacidade: Number((e.target as HTMLInputElement).value) / 100 });
  });

  $("[data-veu]").addEventListener("input", (e) => {
    editor?.ajustarVeu(Number((e.target as HTMLInputElement).value) / 100);
  });

  // ----- Encaixe da foto sob a grade -----
  //
  // O dimensionamento é pela roda do mouse no próprio mapa; aqui só
  // ficam o interruptor do modo e o reset.

  $("[data-encaixe-toggle]").addEventListener("change", (e) => {
    definirEncaixe((e.target as HTMLInputElement).checked);
  });

  $("[data-base-reset]").addEventListener("click", () => {
    editor?.ajustarBase({ escala: 1, dx: 0, dy: 0 });
  });

  // ----- Fundo do mapa: satélite ou imagem enviada -----

  /** Blob pronto para subir ao bucket na hora de salvar. */
  let imagemPropriaBlob: Blob | null = null;

  /** A tela reflete o modo de fundo: com imagem própria, o que é
   *  georreferenciado (aproximação, escala, norte, busca) some. */
  function refletirFundo() {
    const propria = Boolean(editor?.temImagemPropria());
    for (const bloco of $$("[data-so-satelite]")) {
      bloco.classList.toggle("hidden", propria);
    }
    ($("[data-abrir-local]") as HTMLButtonElement).disabled = propria;
    $("[data-abrir-local]").classList.toggle("opacity-40", propria);
    for (const botao of $$("[data-fundo]")) {
      botao.setAttribute(
        "aria-pressed",
        String((botao.dataset.fundo === "imagem") === propria),
      );
    }
    $("[data-info-imagem]").classList.toggle("hidden", !propria);
  }

  $("[data-fundo='imagem']").addEventListener("click", () => {
    ($("[data-arquivo-imagem]") as HTMLInputElement).click();
  });

  $("[data-fundo='satelite']").addEventListener("click", () => {
    if (!editor?.temImagemPropria()) return;
    void editor.limparImagemPropria().then(() => {
      imagemPropriaBlob = null;
      refletirFundo();
    });
  });

  $("[data-arquivo-imagem]").addEventListener("change", async (e) => {
    const arquivo = (e.target as HTMLInputElement).files?.[0];
    (e.target as HTMLInputElement).value = "";
    if (!arquivo || !editor) return;

    try {
      /**
       * Reamostra para no máximo 2048 px e converte para WebP.
       *
       * Dois motivos num passo só: foto de celular vem com 4000+ px e
       * estouraria memória de canvas à toa, e o bucket só aceita
       * PNG/WebP — o WebP a 85% segura a qualidade com fração do peso.
       */
      const bitmap = await createImageBitmap(arquivo);
      const fator = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
      const tela = document.createElement("canvas");
      tela.width = Math.round(bitmap.width * fator);
      tela.height = Math.round(bitmap.height * fator);
      tela.getContext("2d")!.drawImage(bitmap, 0, 0, tela.width, tela.height);
      bitmap.close();

      imagemPropriaBlob = await new Promise<Blob | null>((r) =>
        tela.toBlob(r, "image/webp", 0.85),
      );

      await editor.usarImagemPropria(tela);
      $("[data-info-imagem]").textContent = `Imagem: ${arquivo.name}`;
      refletirFundo();
      // Fundo novo pede enquadramento do zero: destrava e entra no encaixe.
      editor.definirTravaMapa(false);
      refletirTrava();
      definirEncaixe(true);
      avisar("");
    } catch (erro) {
      console.error("Falha ao ler a imagem:", erro);
      avisar("Não foi possível abrir essa imagem. Tente um PNG ou JPG comum.");
    }
  });

  /**
   * Rotação e zoom recarregam o satélite, então são aplicados no
   * `change` (quando a pessoa solta o controle) e não no `input`.
   * Arrastar o slider dispararia uma montagem de mosaico por pixel.
   */
  const fatiaRotacao = $<HTMLInputElement>("[data-rotacao]");
  fatiaRotacao.addEventListener("input", () => {
    $("[data-rotacao-valor]").textContent = `${fatiaRotacao.value}°`;
  });
  fatiaRotacao.addEventListener("change", () => {
    estado.rotacao = Number(fatiaRotacao.value);
    void recarregarBase();
  });

  for (const atalho of $$("[data-rotacao-atalho]")) {
    atalho.addEventListener("click", () => {
      estado.rotacao = Number(atalho.dataset.rotacaoAtalho);
      fatiaRotacao.value = String(estado.rotacao);
      $("[data-rotacao-valor]").textContent = `${estado.rotacao}°`;
      void recarregarBase();
    });
  }

  fatiaZoom.addEventListener("input", () => {
    $("[data-zoom-valor]").textContent = fatiaZoom.value;
  });
  fatiaZoom.addEventListener("change", () => {
    estado.zoom = Number(fatiaZoom.value);
    void recarregarBase();
  });

  for (const botao of $$("[data-formato]")) {
    botao.addEventListener("click", () => {
      const escolhido = botao.dataset.formato;
      if (!ehFormato(escolhido)) return;
      estado.formato = escolhido;
      for (const outro of $$("[data-formato]")) {
        outro.setAttribute("aria-pressed", String(outro === botao));
      }
      // Voltar ao livre readota a proporção da tela de agora.
      void recarregarBase(escolhido === "livre" ? proporcaoDaMoldura() : undefined);
    });
  }

  // ==========================================================
  // Busca de local
  // ==========================================================

  const formBusca = $<HTMLFormElement>("[data-busca]");
  const listaResultados = $<HTMLUListElement>("[data-resultados]");

  interface LocalAchado {
    nome: string;
    detalhe?: string;
    lat: number;
    lng: number;
  }

  const fecharResultados = () => listaResultados.classList.add("hidden");

  /**
   * Coordenada colada não vai ao geocodificador.
   *
   * Quem já tem a coordenada — copiada do Google Maps, de um GPS ou da
   * ficha do campo — tem o dado mais preciso que existe, e converter
   * texto que já é número seria consulta desperdiçada. Aceita vírgula
   * ou ponto porque o teclado brasileiro produz os dois.
   */
  function lerCoordenadaColada(texto: string) {
    const casou = texto
      .trim()
      .replace(/\s+/g, " ")
      .match(/^(-?\d{1,3}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/);
    if (!casou) return null;
    const lat = Number(casou[1].replace(",", "."));
    const lng = Number(casou[2].replace(",", "."));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
  }

  function irPara(lat: number, lng: number, zoom = Math.max(estado.zoom, 17)) {
    estado.lat = lat;
    estado.lng = lng;
    estado.zoom = Math.min(config.zoomMax, Math.max(ZOOM_MIN, zoom));
    fatiaZoom.value = String(estado.zoom);
    $("[data-zoom-valor]").textContent = String(estado.zoom);
    void recarregarBase();
  }

  function mostrarResultados(locais: LocalAchado[]) {
    listaResultados.innerHTML = "";
    listaResultados.classList.toggle("hidden", locais.length === 0);

    for (const local of locais) {
      const li = document.createElement("li");
      li.className = "border-b border-borda last:border-b-0";

      const botao = document.createElement("button");
      botao.type = "button";
      botao.className =
        "block w-full px-4 py-2.5 text-left transition-colors duration-150 hover:bg-oliva-050";

      const nome = document.createElement("span");
      nome.className = "block text-[0.9375rem] leading-snug text-tinta";
      nome.textContent = local.nome;
      botao.appendChild(nome);

      if (local.detalhe) {
        const detalhe = document.createElement("span");
        detalhe.className = "block text-[0.8125rem] leading-snug text-texto-2";
        detalhe.textContent = local.detalhe;
        botao.appendChild(detalhe);
      }

      botao.addEventListener("click", () => {
        irPara(local.lat, local.lng);
        fecharResultados();
      });

      li.appendChild(botao);
      listaResultados.appendChild(li);
    }
  }

  formBusca.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const campo = formBusca.querySelector<HTMLInputElement>('input[name="q"]')!;
    const busca = campo.value.trim();
    if (!busca) return;

    const coordenada = lerCoordenadaColada(busca);
    if (coordenada) {
      irPara(coordenada.lat, coordenada.lng);
      fecharResultados();
      avisar("");
      return;
    }

    // O formulário não tem mais botão de enviar (a lupa + Enter são a
    // interface); o estado de "buscando" vai no próprio campo.
    campo.readOnly = true;

    try {
      const perto = `${estado.lat},${estado.lng}`;
      const resposta = await fetch(
        `/api/mapa/local?q=${encodeURIComponent(busca)}&perto=${perto}`,
      );
      const corpo = (await resposta.json()) as { locais?: LocalAchado[]; erro?: string };

      if (!resposta.ok) {
        avisar(corpo.erro ?? "Não foi possível buscar este endereço.");
        return;
      }
      if (!corpo.locais?.length) {
        avisar(
          "Nada encontrado com esse nome. Tente a cidade mais próxima e use " +
            "“Reposicionar satélite” para arrastar até o terreno — ou cole a coordenada " +
            "(no Google Maps, clique com o botão direito no lugar e copie os números).",
        );
        mostrarResultados([]);
        return;
      }
      avisar("");
      mostrarResultados(corpo.locais);
    } catch {
      avisar("A busca não respondeu. Verifique a conexão e tente de novo.");
    } finally {
      campo.readOnly = false;
    }
  });

  document.addEventListener("click", (evento) => {
    const alvo = evento.target as Node;
    if (!listaResultados.contains(alvo) && !formBusca.contains(alvo)) fecharResultados();
  });

  // ==========================================================
  // Painel de reposicionamento
  // ==========================================================

  const modal = $<HTMLElement>("[data-modal-local]");
  const caixaMapa = $<HTMLElement>("[data-mapa-vivo]");
  const visor = $<HTMLElement>("[data-visor]");
  const areaVisor = $<HTMLElement>("[data-area-visor]");

  let mapaVivo: Localizador | null = null;
  let zoomDoMapa = ZOOM_PADRAO;
  let escolhido = { lat: estado.lat, lng: estado.lng, zoom: estado.zoom };

  /**
   * Acerta a moldura e o zoom de captura a partir do que está na tela.
   *
   * O mapa arrastável ocupa o espaço que tiver; a moldura é uma fração
   * dele; e o zoom de captura é derivado —
   * `zoomDoMapa + log2(BASE_LADO / lado da moldura)`. A imagem final
   * tem sempre 1280 px, e o quanto de terreno cabe neles é o que a
   * moldura mostra.
   *
   * Como zoom de tile é inteiro, ele é arredondado e a moldura é então
   * REDIMENSIONADA para o tamanho exato daquele zoom. Sem esse segundo
   * passo a moldura mentiria por até 40% de área.
   */
  function ajustarVisor() {
    const caixa = caixaMapa.getBoundingClientRect();
    const menorLado = Math.min(caixa.width, caixa.height);
    if (menorLado < 40) return;

    const desejado = menorLado * 0.86;
    const bruto = zoomDoMapa + Math.log2(BASE_LADO / desejado);
    const zoomCaptura = Math.min(config.zoomMax, Math.max(ZOOM_MIN, Math.round(bruto)));
    const lado = BASE_LADO * 2 ** (zoomDoMapa - zoomCaptura);

    visor.style.height = `${Math.round(Math.min(lado, menorLado))}px`;

    escolhido = { lat: escolhido.lat, lng: escolhido.lng, zoom: zoomCaptura };

    const metros = Math.round(BASE_LADO * metrosPorPixel(escolhido.lat, zoomCaptura, 1));
    areaVisor.textContent = `Área capturada: ~${metros} m · imagem ${BASE_LADO} px`;
  }

  async function abrirLocal() {
    modal.classList.remove("hidden");
    modal.classList.add("grid");
    escolhido = { lat: estado.lat, lng: estado.lng, zoom: estado.zoom };
    zoomDoMapa = estado.zoom;

    if (mapaVivo) {
      /**
       * O Leaflet mediu o container na primeira abertura. Se a janela
       * mudou de tamanho com o painel fechado (`display:none`), essa
       * medida está velha e os tiles saem deslocados ou cinzas. O
       * `invalidar` remede — e vai num timeout porque o navegador só
       * tem o tamanho novo depois de aplicar o layout desta abertura.
       */
      setTimeout(() => {
        mapaVivo?.invalidar?.();
        mapaVivo?.centralizar(estado.lat, estado.lng, zoomDoMapa);
        ajustarVisor();
      }, 60);
      return;
    }

    const { criarLocalizador } = await import("./localizador");
    mapaVivo = await criarLocalizador({
      alvo: caixaMapa,
      inicial: { lat: estado.lat, lng: estado.lng, zoom: zoomDoMapa },
      zoomMax: config.zoomMax,
      provedor: config.provedor,
      chaveGoogle: chaveNavegador,
      aoMover: (lat, lng, zoom) => {
        escolhido = { ...escolhido, lat, lng };
        zoomDoMapa = zoom;
        ajustarVisor();
      },
    });

    if (!mapaVivo) {
      $("[data-mapa-indisponivel]").classList.remove("hidden");
      $("[data-mapa-indisponivel]").classList.add("grid");
      visor.classList.add("hidden");
      return;
    }
    ajustarVisor();
  }

  function fecharLocal() {
    modal.classList.add("hidden");
    modal.classList.remove("grid");
  }

  $("[data-abrir-local]").addEventListener("click", () => void abrirLocal());
  for (const botao of $$("[data-fechar-local]")) {
    botao.addEventListener("click", fecharLocal);
  }
  $("[data-confirmar-local]").addEventListener("click", () => {
    fecharLocal();
    irPara(escolhido.lat, escolhido.lng, escolhido.zoom);
  });

  // ==========================================================
  // Saída
  // ==========================================================

  $("[data-baixar]").addEventListener("click", async () => {
    if (!editor) return;
    try {
      const blob = await editor.exportarBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(estado.nome || "mapa").replace(/[^\w-]+/g, "-").toLowerCase()}.png`;
      link.click();
      // Revogar só depois do clique: na mesma volta do laço, alguns
      // navegadores cancelam o download.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (erro) {
      console.error("Falha ao exportar:", erro);
      avisar("Não foi possível gerar o PNG. Recarregue a página e tente de novo.");
    }
  });

  /**
   * PDF pela impressão do navegador.
   *
   * Uma biblioteca de PDF pesaria ~350 KB — mais que o Leaflet inteiro,
   * numa página que já carrega o Fabric. A janela de impressão do
   * navegador salva em PDF nativamente, em qualquer sistema, de graça.
   */
  $("[data-imprimir]").addEventListener("click", async () => {
    if (!editor) return;
    const dataUrl = editor.exportarPNG(2);
    const janela = window.open("", "_blank");
    if (!janela) {
      avisar("O navegador bloqueou a janela de impressão. Libere o pop-up e tente de novo.");
      return;
    }
    janela.document.write(
      `<!doctype html><title>${estado.nome || "Mapa de operação"}</title>` +
        "<style>@page{margin:10mm}body{margin:0}img{width:100%;height:auto;display:block}</style>" +
        `<img src="${dataUrl}" onload="window.focus();window.print()">`,
    );
    janela.document.close();
  });

  // ==========================================================
  // Salvar
  // ==========================================================

  const botaoSalvar = $<HTMLButtonElement>("[data-salvar]");
  const campoNome = $<HTMLInputElement>("[data-nome-mapa]");

  // O campo do cabeçalho é a fonte da verdade do nome. `estado.nome`
  // acompanha para o rascunho e o nome do arquivo baixado.
  campoNome.addEventListener("input", () => {
    estado.nome = campoNome.value.trim().slice(0, 80);
  });

  function guardarRascunho() {
    if (!editor) return;
    try {
      sessionStorage.setItem(
        CHAVE_RASCUNHO,
        JSON.stringify({ ...estado, nome: campoNome.value.trim(), camadas: editor.serializar() }),
      );
    } catch {
      // Aba anônima com storage bloqueado: nada a fazer além de não quebrar.
    }
  }

  /** Troca só o TEXTO do botão, preservando o ícone de disquete. */
  function rotularSalvar(texto: string) {
    const ultimo = botaoSalvar.lastChild;
    if (ultimo && ultimo.nodeType === Node.TEXT_NODE) ultimo.textContent = ` ${texto}`;
    else botaoSalvar.append(` ${texto}`);
  }

  /**
   * Salvar e Duplicar são o mesmo caminho: a diferença é que duplicar
   * grava SEM id (nasce um registro novo) e renomeia com "(cópia)".
   */
  async function salvarMapa(comoNovo: boolean) {
    if (!editor) return;

    estado.nome = campoNome.value.trim().slice(0, 80);
    if (estado.nome.length < 2) {
      avisar("Dê um nome ao mapa no campo do topo antes de salvar.");
      campoNome.focus();
      return;
    }

    const nomeFinal = comoNovo ? `${estado.nome} (cópia)`.slice(0, 80) : estado.nome;

    botaoSalvar.disabled = true;
    rotularSalvar("Salvando…");

    try {
      /**
       * Imagem própria sobe ANTES do registro: o jsonb de `dados` só
       * carrega a URL. Se o upload exigir login, o fluxo é o mesmo do
       * salvar — rascunho + volta —, com o aviso honesto de que o
       * arquivo local não sobrevive à viagem.
       */
      if (editor.temImagemPropria() && imagemPropriaBlob) {
        const envio = await fetch("/api/mapa/imagem", {
          method: "POST",
          headers: { "content-type": "image/webp" },
          body: imagemPropriaBlob,
        });
        if (envio.status === 401) {
          guardarRascunho();
          avisar(
            "Entre para salvar. Atenção: a imagem enviada não acompanha o login — " +
              "reenvie-a depois de entrar.",
          );
          window.location.href = "/entrar?destino=%2Fmapa";
          return;
        }
        const corpoEnvio = (await envio.json()) as { url?: string; erro?: string };
        if (!envio.ok || !corpoEnvio.url) {
          avisar(corpoEnvio.erro ?? "Não foi possível guardar a imagem de fundo.");
          return;
        }
        editor.definirImagemPropriaUrl(corpoEnvio.url);
        imagemPropriaBlob = null;
      }

      const resposta = await fetch("/api/mapa/salvar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: comoNovo ? null : estado.id,
          nome: nomeFinal,
          lat: estado.lat,
          lng: estado.lng,
          zoom: estado.zoom,
          rotacao: estado.rotacao,
          formato: estado.formato,
          dados: editor.serializar(),
        }),
      });

      const corpo = (await resposta.json()) as { mapa?: Mapa; erro?: string; entrar?: string };

      // Sem sessão: guarda o trabalho ANTES de sair da página. Perder o
      // mapa por causa do cadastro seria o pior momento possível.
      if (resposta.status === 401) {
        guardarRascunho();
        window.location.href = corpo.entrar ?? "/entrar?destino=%2Fmapa";
        return;
      }

      if (!resposta.ok || !corpo.mapa) {
        avisar(corpo.erro ?? "Não foi possível salvar.");
        return;
      }

      if (comoNovo) {
        // A cópia vira o mapa aberto: recarregar pela URL evita estado
        // meio-termo entre o original e a cópia.
        sujo = false;
        window.location.href = `/mapa?id=${corpo.mapa.id}`;
        return;
      }

      estado.id = corpo.mapa.id;
      sujo = false;
      sessionStorage.removeItem(CHAVE_RASCUNHO);
      avisar("");
      rotularSalvar("Salvo ✓");
      setTimeout(() => rotularSalvar("Salvar mapa"), 2500);
    } catch {
      avisar("A conexão falhou. Baixe o PNG para não perder o trabalho e tente de novo.");
    } finally {
      botaoSalvar.disabled = false;
    }
  }

  botaoSalvar.addEventListener("click", () => void salvarMapa(false));
  $("[data-duplicar]").addEventListener("click", () => void salvarMapa(true));

  $("[data-excluir]").addEventListener("click", async () => {
    if (!window.confirm("Excluir este mapa? Isso não tem volta.")) return;
    if (estado.id) {
      const resposta = await fetch(`/api/mapa/${estado.id}`, { method: "DELETE" });
      if (!resposta.ok) {
        avisar("Não foi possível excluir. Tente pela lista de mapas.");
        return;
      }
      sujo = false;
      window.location.href = "/conta/mapas";
      return;
    }
    // Nunca foi salvo: excluir é só descartar o rascunho.
    sujo = false;
    sessionStorage.removeItem(CHAVE_RASCUNHO);
    window.location.href = "/mapa";
  });

  $("[data-novo]").addEventListener("click", () => {
    if (sujo && !window.confirm("Começar um mapa novo? O que não foi salvo se perde.")) return;
    // A pessoa acabou de confirmar que quer descartar: derrubar `sujo`
    // evita que o `beforeunload` pergunte a MESMA coisa de novo.
    sujo = false;
    sessionStorage.removeItem(CHAVE_RASCUNHO);
    window.location.href = "/mapa";
  });

  window.addEventListener("beforeunload", (evento) => {
    if (!sujo) return;
    evento.preventDefault();
    evento.returnValue = "";
  });

  // ==========================================================
  // Barra do aplicativo e menu ⋮
  // ==========================================================

  const botaoMenu = $<HTMLButtonElement>("[data-menu]");
  const listaMenu = $<HTMLElement>("[data-menu-lista]");

  function fecharMenu() {
    listaMenu.classList.add("hidden");
    botaoMenu.setAttribute("aria-expanded", "false");
  }

  botaoMenu.addEventListener("click", (evento) => {
    evento.stopPropagation();
    const abrir = listaMenu.classList.contains("hidden");
    listaMenu.classList.toggle("hidden", !abrir);
    botaoMenu.setAttribute("aria-expanded", String(abrir));
  });

  // Qualquer clique — fora ou num item — fecha; os itens têm handlers
  // próprios que rodam antes pela ordem de captura do bubbling.
  document.addEventListener("click", (evento) => {
    if (!listaMenu.contains(evento.target as Node) || (evento.target as HTMLElement).closest(".item-menu")) {
      if (evento.target !== botaoMenu && !botaoMenu.contains(evento.target as Node)) fecharMenu();
    }
  });

  $("[data-telacheia]").addEventListener("click", () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  });

  $("[data-editar-nome]").addEventListener("click", () => {
    campoNome.focus();
    campoNome.select();
  });

  // O × da busca aparece quando há texto e limpa num clique.
  const campoBusca = $<HTMLInputElement>("#busca-local");
  const botaoLimparBusca = $<HTMLButtonElement>("[data-limpar-busca]");

  campoBusca.addEventListener("input", () => {
    botaoLimparBusca.classList.toggle("hidden", campoBusca.value.length === 0);
  });

  botaoLimparBusca.addEventListener("click", () => {
    campoBusca.value = "";
    botaoLimparBusca.classList.add("hidden");
    fecharResultados();
    campoBusca.focus();
  });

  // ==========================================================
  // Teclado
  // ==========================================================

  document.addEventListener("keydown", (evento) => {
    if (!editor) return;
    const alvo = evento.target as HTMLElement | null;
    // Dentro de campo de texto, o teclado é do campo.
    if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
    if (alvo?.isContentEditable) return;

    const comando = evento.ctrlKey || evento.metaKey;

    if (comando && evento.key.toLowerCase() === "z") {
      evento.preventDefault();
      void (evento.shiftKey ? editor.refazer() : editor.desfazer());
      return;
    }
    if (comando && evento.key.toLowerCase() === "y") {
      evento.preventDefault();
      void editor.refazer();
      return;
    }
    if (comando) return;

    if (evento.key === "Escape") {
      if (!modal.classList.contains("hidden")) fecharLocal();
      else editor.cancelarTraco();
      return;
    }
    if (evento.key === "Enter") {
      evento.preventDefault();
      editor.fecharTraco();
      return;
    }
    if (evento.key === "Delete" || evento.key === "Backspace") {
      evento.preventDefault();
      editor.removerSelecao();
      return;
    }

    const atalhos: Record<string, Ferramenta> = {
      v: "selecionar",
      h: "mover",
      a: "area",
      l: "linha",
      r: "rota",
      t: "texto",
      p: "marcacao",
    };
    const ferramenta = atalhos[evento.key.toLowerCase()];
    if (ferramenta) {
      evento.preventDefault();
      escolherFerramenta(ferramenta);
    }
  });

  // ==========================================================
  // Arranque
  // ==========================================================

  async function carregarExistente(id: string) {
    const resposta = await fetch(`/api/mapa/${id}`);
    if (!resposta.ok) {
      avisar("Não foi possível abrir este mapa. Ele pode ter sido apagado.");
      return false;
    }
    const { mapa } = (await resposta.json()) as { mapa: Mapa };
    Object.assign(estado, {
      id: mapa.id,
      nome: mapa.nome,
      lat: mapa.lat,
      lng: mapa.lng,
      zoom: mapa.zoom,
      rotacao: mapa.rotacao,
      formato: mapa.formato,
      camadas: mapa.dados ?? null,
    });
    return true;
  }

  function recuperarRascunho(): boolean {
    let bruto: string | null = null;
    try {
      bruto = sessionStorage.getItem(CHAVE_RASCUNHO);
    } catch {
      return false;
    }
    if (!bruto) return false;
    try {
      Object.assign(estado, JSON.parse(bruto) as Estado);
      return true;
    } catch {
      sessionStorage.removeItem(CHAVE_RASCUNHO);
      return false;
    }
  }

  const parametros = new URLSearchParams(window.location.search);
  const id = parametros.get("id");

  // A ficha do diretório manda coordenada e nome pela URL: o mapa nasce
  // enquadrado no campo em vez de no meio do Brasil.
  const latUrl = Number(parametros.get("lat"));
  const lngUrl = Number(parametros.get("lng"));
  if (Number.isFinite(latUrl) && Number.isFinite(lngUrl) && (latUrl !== 0 || lngUrl !== 0)) {
    estado.lat = latUrl;
    estado.lng = lngUrl;
    estado.zoom = Math.min(config.zoomMax, 17);
  }
  const nomeUrl = parametros.get("nome");
  if (nomeUrl) estado.nome = nomeUrl.slice(0, 80);

  let recuperado = false;
  if (id) recuperado = await carregarExistente(id);
  else recuperado = recuperarRascunho();

  // Reflete o estado nos controles antes do primeiro desenho.
  campoNome.value = estado.nome;
  fatiaRotacao.value = String(estado.rotacao);
  $("[data-rotacao-valor]").textContent = `${estado.rotacao}°`;
  fatiaZoom.value = String(estado.zoom);
  $("[data-zoom-valor]").textContent = String(estado.zoom);
  for (const botao of $$("[data-formato]")) {
    botao.setAttribute("aria-pressed", String(botao.dataset.formato === estado.formato));
  }

  ocupado(true);
  try {
    /**
     * REENQUADRAR, nunca só carregar a base: o editor foi criado antes
     * de a URL, o rascunho ou o mapa salvo serem lidos, então o
     * enquadramento dele ainda é o inicial. Chamar `carregarBase`
     * direto era um bug de verdade — mapa salvo em Itu reabria com a
     * foto do ponto padrão e o rodapé mostrando a coordenada certa por
     * cima da imagem errada.
     *
     * Num mapa `livre` salvo, a proporção vem das dimensões gravadas:
     * o desenho foi feito naquelas coordenadas de documento e a tela
     * de agora pode ser outra.
     */
    await editor.reenquadrar(
      {
        lat: estado.lat,
        lng: estado.lng,
        zoom: estado.zoom,
        rotacao: estado.rotacao,
        formato: estado.formato,
      },
      estado.formato === "livre"
        ? estado.camadas?.doc
          ? estado.camadas.doc.largura / estado.camadas.doc.altura
          : proporcaoDaMoldura()
        : undefined,
    );
  } catch (erro) {
    console.error("Falha ao carregar a base:", erro);
    avisar("A imagem de satélite não carregou — o desenho continua funcionando.");
  } finally {
    ocupado(false);
  }

  if (estado.camadas) await editor.restaurar(estado.camadas);
  else editor.redesenharEnfeites();

  escolherFerramenta("selecionar");
  dimensionarPalco();
  refletirFundo();
  refletirTrava();
  desenharCamadas();
  atualizarAcoes();
  atualizarResumo();

  if (recuperado && !id) {
    avisar("Seu rascunho foi recuperado. Clique em Salvar mapa para guardá-lo.");
  }

  /**
   * Mapa NOVO nasce no modo de enquadrar: o primeiro trabalho é sempre
   * encaixar o terreno sob a grade, então a ferramenta já abre nele —
   * com a faixa-guia dizendo o que fazer e o botão primário sendo
   * "Fixar enquadramento". Mapa salvo ou rascunho recuperado abre
   * travado: aquele enquadramento já foi decidido.
   */
  if (!recuperado) definirEncaixe(true);
  else definirEncaixe(false);

  // O arranque dispara os mesmos callbacks de uma edição; nada disso
  // foi mudança da pessoa. Sem esta linha, abrir um mapa já acionava o
  // aviso de "alterações não salvas" ao sair.
  sujo = false;
}
