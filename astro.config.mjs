// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

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
  '/armeiros/cadastrar',
  '/entrar',
  // placeholders — remover conforme cada um vira página de verdade
  '/operacoes',
  '/grupos',
];

/**
 * Ramos inteiros de fora, por prefixo.
 *
 * A área logada entra por prefixo e não item a item porque ela cresce: quando
 * /conta/equipes e /conta/operacoes nasceram, vazaram para o sitemap justamente
 * por não constarem na lista fixa. Prefixo cobre a próxima tela sem depender de
 * alguém lembrar de vir aqui.
 */
// `/convite` guarda os links exclusivos de evento fechado: anunciar
// isso num sitemap publico seria entregar a chave de porta em porta.
const RAMOS_FORA_DO_SITEMAP = ['/conta', '/convite'];

// https://astro.build/config
export default defineConfig({
  // Obrigatório para sitemap, URLs canônicas e JSON-LD.
  //
  // COM www: o dominio sem www responde 308 e joga para o www. Anunciar a
  // versao sem www em canonical e sitemap era apontar tudo para enderecos
  // que redirecionam. Aqui a config passa a dizer o mesmo que o servidor
  // ja faz.
  site: 'https://www.comunidadeairsoft.com.br',

  trailingSlash: 'never',

  // 'static' continua sendo o padrão: TODA página do diretório é gerada
  // no build e servida como HTML puro. O adapter existe só para as
  // rotas de conta, que declaram `prerender = false` uma a uma.
  // Nenhuma página indexável passa a depender de servidor.
  output: 'static',
  adapter: vercel(),

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    mdx(),
    sitemap({
      filter: (pagina) => {
        const caminho = new URL(pagina).pathname.replace(/\/$/, '');
        if (FORA_DO_SITEMAP.includes(caminho)) return false;
        return !RAMOS_FORA_DO_SITEMAP.some(
          (ramo) => caminho === ramo || caminho.startsWith(ramo + '/')
        );
      },
    }),
  ],
});
