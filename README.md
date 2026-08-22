# Comunidade Airsoft

Diretório de campos, lojas, operações e equipes de airsoft no Brasil.

- Plano de trabalho: [PLANO-DE-ACAO.md](./PLANO-DE-ACAO.md)
- Documento de projeto: [_uploads/comunidade-airsoft-documento-de-projeto.md](./_uploads/comunidade-airsoft-documento-de-projeto.md)
- Design System v1.1: `_uploads/Design System Airsoft Community.zip`

## Rodar

```bash
npm install
npm run dev      # servidor local
npm run build    # gera o site em dist/
npm run preview  # serve o build
npm run check    # valida tipos e templates
```

## Como o projeto está montado

Site **estático**. Nenhuma página depende de JavaScript para exibir conteúdo —
essa é a razão de ser da escolha do Astro, já que o canal de aquisição do
projeto é busca orgânica.

```
src/
  content.config.ts       schema das coleções (validado no build)
  content/
    campos/*.json         um arquivo por campo — o nome do arquivo é o slug
    lojas/*.json
    guias/*.md            conteúdo editorial
  pages/
    campos/[uf]/[cidade]/[slug].astro   ficha do campo
    campos/[uf]/[cidade]/index.astro    hub municipal
    campos/[uf]/index.astro             hub estadual
    guias/[...slug].astro
  components/             primitivos do design system
  layouts/Base.astro      <head>, SEO, JSON-LD
  styles/global.css       tokens do design system
  lib/uf.ts               estados, slug, rótulos
```

## Regras que não podem ser quebradas

1. **URL publicada não muda.** O nome do arquivo em `src/content/campos/`
   vira a URL. Renomear depois de publicado destrói o histórico de busca
   daquela página.
2. **Nenhum conteúdo atrás de login.** Página que exige conta não é indexada,
   e sem indexação não há tráfego. O login entra na Entrega 3 e cobre apenas
   ações, nunca leitura.
3. **Tokens de estilo saem do design system.** Cor ou fonte nova entra em
   `src/styles/global.css`, nunca solta no componente.
4. **Placeholder é `noindex` e fica fora do sitemap.** Página vazia indexada
   prejudica o domínio inteiro. Ver `FORA_DO_SITEMAP` em `astro.config.mjs`.
5. **`verificado_em` é data de conferência humana.** Não preencher
   automaticamente.

## Pendências conhecidas

- Os campos com "exemplo" no nome são semente de desenvolvimento. Apagar antes
  do lançamento.
- `/termos` e `/privacidade` são **rascunhos** e precisam de revisão jurídica
  antes de qualquer cadastro.
- Falta imagem de Open Graph padrão (`public/og-padrao.png`).
- Falta analytics.
