/// <reference types="astro/client" />

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Perfil } from "./lib/conta";

declare global {
  namespace App {
    interface Locals {
      /** Cliente autenticado como o visitante. Só existe em rotas server-side. */
      supabase: SupabaseClient;
      /** null quando ninguém está logado. */
      usuario: User | null;
      /** Só é carregado nas rotas de /conta. */
      perfil: Perfil | null;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
