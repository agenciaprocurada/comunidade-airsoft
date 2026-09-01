# Vídeos das ferramentas do Comunidade Airsoft

Projeto Remotion único para os vídeos do site. A pasta se chamava
`video-gerador-mapa/` enquanto só existia um; virou `videos/` quando entrou o
segundo. Tudo compartilha `src/tema.ts` (a cópia dos tokens de
`src/styles/global.css` do site) — é isso que impede dois vídeos da mesma marca
de terem duas paletas.

| Composição | Formato | Duração | Onde é usado |
| --- | --- | --- | --- |
| `VideoGeradorMapa` | 1920×1080 | 15 s | bloco de vídeo da `/criador-de-mapas` |
| `VideoVertical` | 1080×1920 | 30 s | Reels / TikTok / Shorts do criador de mapas |
| `VideoOperacoes` | 1920×1080 | 26 s | bloco de vídeo da `/organizador-de-operacoes` |
| `VideoOperacoesVertical` | 1080×1920 | 30 s | Reels / TikTok / Shorts do organizador |

```
npm run dev                        # Remotion Studio (todas as composições)
npm run render                     # out/gerador-de-mapas-1920x1080.mp4
npm run render:vertical            # out/gerador-de-mapas-1080x1920.mp4
npm run render:operacoes           # out/organizador-de-operacoes-1920x1080.mp4
npm run render:operacoes-vertical  # out/organizador-de-operacoes-1080x1920.mp4
npm run tiles                      # rebaixa os tiles de satélite (só se apagar public/tiles/)
```

Depois de renderizar, o MP4 do site é gerado à parte (1280×720, sem áudio) — o
comando está no comentário do bloco de vídeo de cada landing.

---

# Vídeo do Criador de Mapa Operacional

15 s · 1920×1080 · 30 fps (450 frames) · tema escuro do Design System v2.0.

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

---

# Versão 9:16 para redes sociais

30 s · 1080×1920 · 30 fps (900 frames) · cortada em compassos de 120 BPM.

```
npm run render:vertical   # out/gerador-de-mapas-1080x1920.mp4
```

Composição `VideoVertical` no Studio; as sete cenas também estão soltas na
pasta "Cenas-Vertical".

## O roteiro

| Frames | Tempo | Cena | Legenda na tela |
| --- | --- | --- | --- |
| 0–60 | 0–2 s | Gancho: o mapa pronto atrás da marca | — |
| 60–210 | 2–7 s | Digita o endereço, o satélite chega | "Ache o campo pelo endereço" → "A foto do terreno já vem junto" |
| 210–390 | 7–13 s | Desenha a área de respawn, clique a clique | "Desenhe as áreas clicando" → "Área de respawn no mapa" |
| 390–510 | 13–17 s | Os 17 símbolos passando em fita | "Base, safe, CQB, torre…" |
| 510–630 | 17–21 s | Grade de 6 a 12 colunas e véu ao vivo | "'Inimigo no B4'" |
| 630–780 | 21–26 s | O plano abre e o campo se monta | "Pronto para imprimir" |
| 780–900 | 26–30 s | Chamada e botão | — |

Os cortes são **secos** e caem no compasso (múltiplos de 30 frames). A
continuidade fica por conta do mapa: o enquadramento de uma cena termina onde o
da seguinte começa (`src/vertical/enquadramentos.ts`), então o mapa não pula.

## A música NÃO está incluída

`public/guia-120bpm.mp3` é uma **batida-guia** gerada por
`scripts/gerar-batida-guia.mjs` — metrônomo com bumbo, chimbau e caixa. Serve
para conferir se o corte cai no tempo, e só.

Para publicar:

1. Ponha a faixa licenciada em `public/` (Epidemic Sound, Artlist, Pixabay
   Music ou a biblioteca de áudio do YouTube — as duas últimas têm faixas
   liberadas de graça).
2. Em `src/vertical/ritmo.ts`, aponte `TRILHA` para o arquivo novo.
3. Se o andamento não for 120 BPM, ajuste `BPM` no mesmo arquivo e confira que
   todo valor de `LIMITES` continua múltiplo de `MEIO_COMPASSO`.
4. `TRILHA = null` deixa o vídeo mudo.

Licenciar música é decisão de quem publica o canal — por isso o projeto vem
preparado, mas não escolhido.

## Como o 16:9 virou 9:16

Não foi corte: o documento é 16:9 e a tela é 9:16, não existe encaixe honesto.

- **A janela é um recorte** (`src/vertical/Janela.tsx`). Ela mostra o pedaço do
  mapa que interessa, e as cenas passeiam por ele. Só na revelação a escala cai
  para 0,84 e o mapa inteiro aparece — as faixas que sobram em cima e embaixo
  viram a ficha do mapa e os botões de exportar, não vazio.
- **Os painéis viraram cartões** (`src/vertical/cartoes.tsx`). No site as
  ferramentas são uma coluna de 86 px à esquerda e os ajustes um dock de 340 px
  à direita; numa tela de 1080 de largura isso ficaria ilegível dos dois lados.
  O conteúdo é o mesmo: as 7 ferramentas, os 17 símbolos, os controles de grade.
- **As margens são das plataformas.** Todo texto vive entre y=120 e y=1660 —
  Instagram e TikTok desenham a interface deles por cima dos ~250 px de baixo e
  dos ~120 px de cima.

## Onde mexer

- **Tempo das cenas**: `src/vertical/ritmo.ts` (`LIMITES`).
- **Passeio da câmera**: `src/vertical/enquadramentos.ts` — leia as duas regras
  no cabeçalho antes de mudar número, principalmente o limite de 1,556.
- **Ordem em que o mapa é construído**: `src/vertical/pecas.tsx`. É uma lista
  só, e as três cenas que constroem o mapa leem dela.
- **Textos das legendas**: dentro de cada cena, no componente `<Legenda>`.

---

# Vídeos do Organizador de Operações

## 16:9 — 26 s · 1920×1080 · 30 fps (780 frames)

```
npm run render:operacoes   # out/organizador-de-operacoes-1920x1080.mp4
```

Composição `VideoOperacoes`; as sete cenas também estão soltas na pasta
"Cenas-Operacoes" do Studio.

| Frames | Tempo | Cena | Arquivo |
| --- | --- | --- | --- |
| 0–66 | 0–2 s | A marca surge | `src/operacoes/cenas/Abertura.tsx` |
| 60–246 | 2–8 s | Abrir a operação: campo, data, lados, lotes, publicar | `src/operacoes/cenas/Criar.tsx` |
| 240–366 | 8–12 s | O link vai para o grupo da equipe | `src/operacoes/cenas/Link.tsx` |
| 360–486 | 12–16 s | Alguém abre o link no celular e confirma presença | `src/operacoes/cenas/Confirmar.tsx` |
| 480–636 | 16–21 s | A lista se enche e alguém cai na espera | `src/operacoes/cenas/Lista.tsx` |
| 630–726 | 21–24 s | No portão: pago e presente | `src/operacoes/cenas/NoDia.tsx` |
| 720–780 | 24–26 s | Chamada e botão | `src/operacoes/cenas/Chamada.tsx` |

As cenas se sobrepõem em 6 frames, então a troca é dissolvência e não corte.

## 9:16 — 30 s · 1080×1920 · 30 fps (900 frames)

```
npm run render:operacoes-vertical   # out/organizador-de-operacoes-1080x1920.mp4
```

Sete cenas, cortes SECOS caindo no compasso de 120 BPM
(`src/operacoes/vertical/ritmo.ts`),
mesma regra do vertical do criador de mapas. Cenas em
`src/operacoes/vertical/cenas.tsx` — um arquivo só, porque cada uma delas é uma
variante de enquadramento da cena equivalente do 16:9, não um roteiro novo.

## A interface é RECRIADA, não gravada

Remotion não grava tela. `src/operacoes/pecas.tsx` é uma reconstrução em React
do painel de `/conta/operacoes` e da página pública da operação: painel, chips,
barra de vagas, linha da lista, caixa do link, botão, moldura de celular e
opção de lado.

A cena `Confirmar.tsx` exporta as duas telas do celular (`ChatNoCelular` e
`PaginaDoEvento`) porque o 9:16 mostra as MESMAS telas — muda o tamanho do
aparelho e o ritmo, não o que está escrito nelas. Por isso os marcos de tempo
(`militar`, `confirmar`) entram por prop.

Não é preciosismo: o roteiro pede que a barra de vagas ENCHA, que os nomes
CAIAM um a um e que o chip de "pago" ACENDA no clique. Nada disso sai de uma
captura — cada elemento precisa ser um nó que responde ao frame atual. A
tipografia está um passo maior que no site porque em vídeo o espectador está
longe da tela.

## Os números são a mesma conta do produto

`src/operacoes/dados.ts` é a fonte única dos dois formatos: a operação, os dois
lados com teto próprio, os jogadores e o peso de quem leva acompanhante.
`confirmadosDo()` calcula a barra e a contagem do topo com a MESMA regra, e quem
está na espera não entra na soma. Sem isso, a tela se contradiz no meio da
animação — o vertical dizendo 20 enquanto o horizontal diz 21.

Os nomes são fictícios. Lista de presença de verdade tem gente de verdade
dentro, e isso não vai para vídeo de divulgação.

A Ana é a primeira da lista de propósito: é ela quem confirma na cena do
celular, e a lista da cena seguinte abre com ela já dentro. Sem isso a contagem
caía de 14 para 13 na troca de cena — o tipo de detalhe que ninguém sabe
explicar mas todo mundo sente.

## Onde mexer

- **Tempo das cenas**: `src/operacoes/VideoOperacoes.tsx` (16:9) e
  `src/operacoes/vertical/ritmo.ts` (9:16, tudo múltiplo de meio compasso).
- **Dados da operação**: `src/operacoes/dados.ts`.
- **Peças de interface**: `src/operacoes/pecas.tsx` — muda nos dois formatos.
- **Posição do ponteiro**: as `Parada[]` de cada cena. No 16:9 são coordenadas
  de tela (o painel começa em x=700); no 9:16 são coordenadas DO PAINEL, porque
  o cursor mora dentro do `Palco` escalado.
