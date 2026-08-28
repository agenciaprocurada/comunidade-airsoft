# Logos dos apoiadores

As logos que aparecem na faixa "Apoiadores", no fim de toda página
(`src/components/Apoiadores.astro`).

## Como entra um parceiro

1. Adicione o item em `src/lib/apoiadores.ts`:

   ```ts
   { slug: "loja-exemplo", nome: "Loja Exemplo", site: "https://lojaexemplo.com.br" },
   ```

2. Converta a logo com o script (nunca solte PNG/JPG bruto aqui):

   ```
   node src/scripts/logo-apoiador.mjs <arquivo-de-entrada> loja-exemplo
   ```

   Sai `loja-exemplo.webp`, largura máxima 480px, qualidade 85, sem upscale.
   480px é o retina 2x dos 200px em que a logo aparece no desktop.

   Logo em **SVG** pode entrar direto, com o nome `loja-exemplo.svg`, desde
   que seja pequena (< 20 kB) e sem fonte embutida.

O nome do arquivo tem que ser **igual ao `slug`**. O componente procura
`.webp`, depois `.svg`, depois `.png`. Não achou nenhum? O parceiro aparece
só com o nome, em texto — e o build passa. Nome errado não dá erro, dá
parceiro sem logo.

## O que a logo precisa ter

- **Fundo transparente.** Ela senta em `--color-papel` (#14180f), escuro.
- **Versão clara** (branca ou monocromática clara). A faixa mostra as logos
  em cinza claro e só dá cor no hover; logo preta some no fundo escuro.
- Proporção horizontal, de preferência. A caixa tem 200×56px de área útil
  no desktop; logo quadrada fica pequena.
- Sem slogan, sem texto miúdo: a 200px nada disso se lê.
