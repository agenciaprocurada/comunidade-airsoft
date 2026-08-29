# Vídeo do Criador de Mapa Operacional

15 s · 1920×1080 · 30 fps (450 frames) · tema escuro do Design System v2.0.

```
npm run dev      # Remotion Studio
npm run render   # out/gerador-de-mapas-1920x1080.mp4
npm run tiles    # rebaixa os tiles de satélite (só se apagar public/tiles/)
```

## O roteiro, frame a frame

| Frames | Tempo | Cena | Arquivo |
| --- | --- | --- | --- |
| 0–66 | 0–2 s | A marca surge | `src/cenas/Abertura.tsx` |
| 60–246 | 2–8 s | Entrar na ferramenta e desenhar a área de respawn | `src/cenas/CriarArea.tsx` |
| 240–306 | 8–10 s | Reposicionar o satélite | `src/cenas/Reposicionar.tsx` |
| 300–396 | 10–13 s | O campo se monta, peça por peça | `src/cenas/Revelacao.tsx` |
| 390–450 | 13–15 s | Chamada e botão | `src/cenas/Chamada.tsx` |

As cenas se sobrepõem em 6 frames para a troca ser dissolvência e não corte.
Cada uma também está registrada sozinha na pasta "Cenas" do Studio.

## A interface é RECRIADA, não gravada

Remotion não grava tela. A casca do editor (`src/componentes/Editor.tsx`) é
uma reconstrução em React de `/mapa` do site, com as mesmas barras, a mesma
paleta e os mesmos ícones.

Não foi preciosismo: o roteiro pede que o campo apareça **peça por peça** e que
os marcadores de respawn **pulsem**. Nenhuma das duas coisas sai de uma captura
de vídeo — cada elemento precisa ser um nó controlável pelo frame atual. A
tipografia da interface está um passo maior que no site porque em vídeo o
espectador está longe da tela.

## O mapa é REAL

O conteúdo vem do mapa `Bengazi-final` (`mapas.id =
1aefb84b-7f37-4628-a960-e65095535a6e`): quatro áreas, cinco símbolos,
enquadramento em −29,8341 / −51,172118, zoom 19, rotação 59°, documento
1280×720, véu 0,18, grade 10×10.

- `scripts/gerar-dados.mjs` converteu a linha do banco em `src/dados/mapa.ts`.
- `scripts/baixar-tiles.mjs` baixou os tiles da Esri com a **mesma** geometria
  de `src/lib/mapa.ts` do site (`paraPixelGlobal` + `montarMosaico`) e gravou
  `src/dados/tiles.json`. Os tiles ficam em `public/tiles/`, versionados: um
  tile que falha no meio de 450 frames vira quadrado preto no vídeo final, e
  isso só aparece depois de renderizar tudo.
- A base é um quadrado de 1632 px girado 59° — o mesmo `lado` que
  `carregarBase()` calcula para este documento nesta rotação. Mexer nisso
  desalinha o desenho do terreno.

### O que NÃO veio do banco

1. **As duas áreas de respawn e seus marcadores** (`src/dados/respawn.ts`). O
   mapa salvo não tem respawn nenhum, e o roteiro mostra a criação de um. As
   coordenadas foram escolhidas em espaço vazio do enquadramento real.
2. **A escala mínima dos símbolos** (`ESCALA_MINIMA_VIDEO = 0.85`). No mapa
   salvo, Estacionamento e Safe zone estão em ~0,53 e o rótulo fica com 9 px
   numa tela de 1920 — correto no produto, ilegível em vídeo. Quem já estava
   maior (CQB, Torre, Trincheira) ficou como o dono do mapa deixou.
3. O nome na barra ("Bengazi — Operação Fênix") e o endereço no painel de
   reposicionamento, que são texto de vitrine.

## Onde mexer

- **Tempo de cada cena**: `src/Video.tsx` (as durações estão inline de
  propósito, para o Studio deixar arrastar).
- **Cores e fontes**: `src/tema.ts` — cópia dos tokens de
  `src/styles/global.css` do site. Valor novo aqui só entra se entrar lá antes.
- **Ritmo dos cliques**: `CLIQUES_VERTICE` e `PARADAS` em `CriarArea.tsx`.
- **Ordem em que as peças aparecem**: `ENTRADA_AREA` / `ENTRADA_SIMBOLO` em
  `Revelacao.tsx`.
- **Posição do ponteiro**: as `Parada[]` de cada cena, em pixels de tela.
  `docParaTela()` (em `Editor.tsx`) converte coordenada do documento para
  coordenada de tela — é por isso que a altura do palco é FIXA e não `flex: 1`.
