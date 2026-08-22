// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

/**
 * Rotas que NÃO entram no sitemap.
 *
 * Duas famílias:
 *  - páginas sem valor de busca (termos, privacidade, formulários);
 *  - placeholders "em construção", que já são noindex no HTML.
 *
 * Sitemap e meta robots precisam concordar: anunciar no sitemap uma
 * página marcada noindex é sinal contraditório para o Google.
 *
 * IMPORTANTE: remover a rota daqui quando a página real for construída.
 */
const FORA_DO_SITEMAP = [
  '/termos',
  '/privacidade',
  '/reivindicar',
  '/reportar',
  '/enviar-campo',
  // placeholders — remover conforme cada um vira página de verdade
  '/lojas',
  '/operacoes',
  '/grupos',
];

// https://astro.build/config
export default defineConfig({
  // Obrigatório para sitemap, URLs canônicas e JSON-LD.
  // Trocar quando o domínio definitivo estiver apontado.
  site: 'https://comunidadeairsoft.com.br',

  trailingSlash: 'never',

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    mdx(),
    sitemap({
      filter: (pagina) => {
        const caminho = new URL(pagina).pathname.replace(/\/$/, '');
        return !FORA_DO_SITEMAP.includes(caminho);
      },
    }),
  ],
});
