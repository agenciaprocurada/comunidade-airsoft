/**
 * O mapa arrastável do passo "Encontrar" — a única peça da ferramenta
 * que muda de biblioteca conforme o provedor.
 *
 * Ele NÃO é a imagem final: serve só para a pessoa escolher onde e com
 * quanto zoom. O que sai daqui são três números (lat, lng, zoom), e é
 * por isso que trocar Google por Leaflet não afeta mais nada do editor.
 *
 * As duas implementações vivem atrás da mesma interface para o
 * orquestrador não precisar saber qual está rodando.
 */

import { PROVEDORES, ZOOM_MIN, type Provedor } from "../../lib/mapa";

export interface Localizador {
  centralizar(lat: number, lng: number, zoom: number): void;
  /** Re-mede o container — chamar ao reabrir um painel que estava oculto. */
  invalidar?(): void;
  destruir(): void;
}

export interface OpcoesLocalizador {
  alvo: HTMLElement;
  inicial: { lat: number; lng: number; zoom: number };
  zoomMax: number;
  provedor: Provedor;
  /** Chave do navegador. Só usada quando o provedor é o Google. */
  chaveGoogle: string;
  /** Chamado quando a pessoa para de arrastar ou muda o zoom. */
  aoMover: (lat: number, lng: number, zoom: number) => void;
}

const arredondar = (n: number) => Number(n.toFixed(6));

// ------------------------------------------------------------
// Leaflet + tiles do provedor (caminho padrão)
// ------------------------------------------------------------

async function comLeaflet(opcoes: OpcoesLocalizador): Promise<Localizador> {
  // O CSS vem junto no mesmo chunk dinâmico: sem ele o Leaflet
  // renderiza os tiles empilhados num canto, que parece bug de rede.
  const [L] = await Promise.all([
    import("leaflet"),
    import("leaflet/dist/leaflet.css"),
  ]);

  const fonte = PROVEDORES[opcoes.provedor];

  const mapa = L.map(opcoes.alvo, {
    center: [opcoes.inicial.lat, opcoes.inicial.lng],
    zoom: opcoes.inicial.zoom,
    minZoom: ZOOM_MIN,
    maxZoom: opcoes.zoomMax,
    // O mapa é o objeto principal da tela; exigir Ctrl para dar zoom
    // aqui só atrapalha.
    scrollWheelZoom: true,
    zoomControl: true,
    attributionControl: true,
  });

  if (!fonte.padraoTile) throw new Error(`Provedor ${opcoes.provedor} não serve tiles.`);

  L.tileLayer(fonte.padraoTile, {
    maxZoom: opcoes.zoomMax,
    // Atribuição na tela além da que vai impressa no PNG: a licença
    // pede o crédito onde a imagem aparece, e ela aparece aqui também.
    attribution: fonte.atribuicao,
  }).addTo(mapa);

  const avisar = () => {
    const centro = mapa.getCenter();
    opcoes.aoMover(arredondar(centro.lat), arredondar(centro.lng), mapa.getZoom());
  };

  mapa.on("moveend", avisar);
  mapa.on("zoomend", avisar);

  return {
    centralizar(lat, lng, zoom) {
      mapa.setView([lat, lng], zoom);
    },
    invalidar() {
      mapa.invalidateSize();
    },
    destruir() {
      mapa.remove();
    },
  };
}

// ------------------------------------------------------------
// Maps JavaScript API (só quando há chave do Google)
// ------------------------------------------------------------

function carregarScriptGoogle(chave: string): Promise<typeof google.maps | null> {
  if (window.google?.maps) return Promise.resolve(window.google.maps);

  return new Promise((resolver) => {
    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js" +
      `?key=${encodeURIComponent(chave)}&language=pt-BR&region=BR&loading=async&v=weekly`;
    script.async = true;
    script.onload = () => resolver(window.google?.maps ?? null);
    script.onerror = () => resolver(null);
    document.head.appendChild(script);
  });
}

async function comGoogle(opcoes: OpcoesLocalizador): Promise<Localizador | null> {
  const maps = await carregarScriptGoogle(opcoes.chaveGoogle);
  if (!maps) return null;

  const mapa = new maps.Map(opcoes.alvo, {
    center: { lat: opcoes.inicial.lat, lng: opcoes.inicial.lng },
    zoom: opcoes.inicial.zoom,
    minZoom: ZOOM_MIN,
    maxZoom: opcoes.zoomMax,
    mapTypeId: "satellite",
    // A imagem final é sempre de cima: deixar inclinar aqui mostraria
    // uma vista 3D que o mapa exportado não tem.
    tilt: 0,
    rotateControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    gestureHandling: "greedy",
  });

  mapa.addListener("idle", () => {
    const centro = mapa.getCenter();
    if (!centro) return;
    opcoes.aoMover(arredondar(centro.lat()), arredondar(centro.lng()), mapa.getZoom() ?? opcoes.inicial.zoom);
  });

  return {
    centralizar(lat, lng, zoom) {
      mapa.setCenter({ lat, lng });
      mapa.setZoom(zoom);
    },
    destruir() {
      // A Maps JS API não expõe destruição; soltar o container basta
      // para o mapa parar de responder e ser coletado.
      opcoes.alvo.replaceChildren();
    },
  };
}

// ------------------------------------------------------------

/**
 * Devolve `null` quando nenhum mapa arrastável pôde subir. Nesse caso
 * a ferramenta continua utilizável pela coordenada digitada — é estado
 * previsto, não erro fatal.
 */
export async function criarLocalizador(
  opcoes: OpcoesLocalizador,
): Promise<Localizador | null> {
  try {
    if (opcoes.provedor === "google" && opcoes.chaveGoogle) {
      const google = await comGoogle(opcoes);
      if (google) return google;
      // Chave presente mas o script não subiu (bloqueador, rede, chave
      // inválida): cair no Leaflet é melhor que ficar sem mapa. Os
      // tiles da Esri não pedem chave nenhuma.
      console.warn("Maps JS não carregou; usando Leaflet.");
      return await comLeaflet({ ...opcoes, provedor: "esri" });
    }
    return await comLeaflet(opcoes);
  } catch (erro) {
    console.error("Nenhum mapa arrastável disponível:", erro);
    return null;
  }
}
