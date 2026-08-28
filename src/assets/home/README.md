# Fundos dos cartões do gateway da home

As seis fotos que ficam **atrás** dos cartões em `src/pages/index.astro`.

O nome do arquivo é o que liga a foto ao cartão. `index.astro` varre esta
pasta com `import.meta.glob` e usa o que encontrar — nada é importado por
nome fixo. Consequência prática:

- Faltou o arquivo? O cartão renderiza no fundo escuro, sem foto, **e o
  build passa**. Um `import` direto quebraria o site inteiro.
- Chegou o arquivo com o nome certo? Aparece no próximo build, sem
  ninguém tocar em `index.astro`.

## Os seis nomes

| Arquivo | Cartão |
| --- | --- |
| `criador-de-mapa.webp` | Criador de mapa estratégico |
| `onde-jogar.webp` | Onde jogar |
| `onde-comprar.webp` | Onde comprar |
| `onde-arrumar.webp` | Onde arrumar |
| `operacoes.webp` | Operações |
| `guia-de-airsoft.webp` | Guia de airsoft |

Nome errado = cartão sem foto, silenciosamente. Confira a tabela.

## Como converter

Nunca solte PNG/JPG aqui. Passe pelo script:

```
node src/scripts/fundo-cartao.mjs <arquivo-de-entrada> <nome-da-tabela>
```

Ele faz WebP qualidade 80, largura máxima 840px e sem upscale. 840px é o
retina 2x de um cartão de 400px no desktop — acima disso o navegador não
usa um pixel sequer, só baixa peso à toa.

É irmão de `capa-guia.mjs`, que serve às capas de guia (1360px, outra
pasta). São scripts separados de propósito: a capa de um guia é conteúdo
e aparece no Google; isto aqui é decoração de interface.

## O que a foto precisa ter

O texto do cartão vive na **esquerda**, sobre uma vinheta que apaga o
fundo daquele lado. Então:

- O assunto da foto tem que estar à **direita** ou ao centro-direita.
  Assunto à esquerda some debaixo da vinheta.
- Foto escura. Ela entra em cima de `--color-papel` (#14180f) e não tem
  filtro por cima além da vinheta.
- Sem texto, sem logo, sem marca d'água — vira ruído ilegível a 400px.

Estas imagens são decorativas: entram com `alt=""` e não são anunciadas
por leitor de tela. O sentido do cartão está no título e no parágrafo.
