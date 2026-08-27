/// <reference types="astro/client" />
/**
 * Tipos da Maps JavaScript API. Só o passo de enquadramento do criador
 * de mapa a usa, e ela é carregada por <script> em tempo de execução —
 * a referência aqui existe para o TypeScript conhecer `google.maps`
 * sem que nada seja importado no bundle.
 */
/// <reference types="google.maps" />

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Perfil } from "./lib/conta";

declare global {
  namespace App {
    interface Locals {
      /** Cliente autenticado como o visitante. Só existe em rotas server-side. */
      supabase: SupabaseClient;
      /** null quando ninguém está logado. */
      usuario: User | null;
      /** Só é carregado nas rotas protegidas (/conta e /reivindicar). */
      perfil: Perfil | null;
      /** true quando o usuário está em `public.administradores`. */
      admin: boolean;
      /** Quantas reivindicações dele já foram aprovadas. */
      paginas: number;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;

  /**
   * Chave do Google Maps Platform usada SÓ no servidor, pelas rotas
   * /api/mapa/*. Fica secreta: o faturamento é por requisição e chave
   * exposta é cota gasta na conta alheia.
   *
   * No Google Cloud, restringir por API (Maps Static + Geocoding) e
   * NÃO por referrer — quem chama é o servidor, que não manda referrer.
   */
  readonly GOOGLE_MAPS_API_KEY: string;

  /**
   * Chave separada, para o mapa arrastável do passo de enquadramento.
   *
   * É outra chave de propósito: esta vai no HTML e não tem como não
   * ir. A proteção dela é restrição por referrer no Google Cloud e
   * escopo mínimo (só Maps JavaScript API). Misturar as duas seria
   * publicar a chave do servidor junto.
   */
  readonly PUBLIC_GOOGLE_MAPS_BROWSER_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
