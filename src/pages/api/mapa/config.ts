import type { APIContext } from "astro";
import { PROVEDORES, type ConfigMapa, type Provedor } from "../../../lib/mapa";

export const prerender = false;

/**
 * Qual provedor de satélite está ativo nesta instalação.
 *
 * Existe porque a página `/mapa` é estática, gerada no build, e a
 * escolha do provedor depende de uma variável de ambiente lida em
 * tempo de execução. Sem esta rota o cliente teria que adivinhar — e
 * adivinhar errado significa imprimir a atribuição do provedor errado
 * no mapa exportado, que é justamente o que não pode acontecer.
 *
 * Uma chamada por sessão, de ~120 bytes.
 */

/** Só o servidor sabe se a chave existe; a resposta em si não é segredo. */
export function provedorAtivo(): Provedor {
  const chave = import.meta.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
  return chave ? "google" : "esri";
}

export async function GET(_contexto: APIContext) {
  const provedor = provedorAtivo();
  const { atribuicao, zoomMax } = PROVEDORES[provedor];

  const corpo: ConfigMapa = {
    provedor,
    atribuicao,
    zoomMax,
    // Só o Google: a Static API não manda CORS e a chave não pode ir
    // ao navegador. Os tiles da Esri têm `allow-origin: *`, então o
    // cliente busca direto e o servidor nem entra na conta.
    viaServidor: provedor === "google",
  };

  return new Response(JSON.stringify(corpo), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Curto: trocar de provedor é mexer em variável de ambiente e
      // reimplantar, mas um cache longo deixaria abas antigas
      // desenhando a atribuição errada por horas.
      "cache-control": "public, max-age=300",
    },
  });
}
