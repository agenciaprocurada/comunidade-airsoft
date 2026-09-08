# Revisão da landing page do criador de mapas

Versão para avaliação: `/mapas-v2`. Original preservada: `/criador-de-mapas`.

Revisão heurística baseada no código, no fluxo de acesso e na inspeção em navegador. As melhorias são hipóteses de usabilidade, não resultados de teste com usuários ou de conversão.

| Problema observado na original | Mudança na v2 | Objetivo |
| --- | --- | --- |
| Ilustração vem antes do título e do CTA no celular | Proposta e ação aparecem primeiro | Explicar o produto antes de exigir rolagem |
| Hero mostra uma representação decorativa | Exemplo existente de mapa com ampliação | Permitir avaliar o resultado antes do cadastro |
| Grande volume de catálogo e especificações | Recursos agrupados por uso; formatos em seção expansível | Facilitar a leitura rápida |
| Cadastro de réplica aparece apenas no trajeto final; FAQ omite essa etapa | Requisitos junto ao primeiro CTA, seção de acesso e FAQ coerentes | Evitar surpresa ao entrar no editor |
| Promessas de tempo e precisão sem evidência de validação | Textos descrevem ações e capacidades verificáveis | Ajustar expectativas |
| Recomendação de computador fica no FAQ | Orientação no hero e junto à ação final | Ajudar quem chega pelo celular |
| Convite flutuante do WhatsApp compete com o objetivo da landing | Convite desativado apenas na v2; links do rodapé preservados | Manter o foco na criação do mapa |
| Muitas seções sem navegação direta | Links para funcionamento, recursos, acesso e dúvidas | Facilitar consulta e retorno |

A v2 usa os ativos WebP existentes, imagens responsivas, vídeo com reprodução manual e `preload="none"`, links acessíveis para ampliar imagens e elementos `details` nativos. Limites, formatos e símbolos vêm dos módulos do editor. A página está marcada como `noindex` e excluída do sitemap enquanto é avaliada.

Próxima avaliação sugerida: pedir a um organizador para identificar o que recebe, explicar os requisitos de acesso e encontrar como compartilhar o mapa; comparar essas tarefas nas duas versões. Medir separadamente cliques no CTA e chegada ao editor, pois o cadastro intermediário pode influenciar a conclusão.

## Segunda rodada: direção visual

- Hero com fotografia aérea gerada para ambientação, sobreposição escura e mapa de exemplo em primeiro plano.
- Paleta local com oliva mais claro, fundo verde profundo e seção em areia. As cores das demais páginas permanecem as mesmas.
- Títulos com maior presença, composição assimétrica, ilustrações vetoriais das etapas e painéis com hierarquia mais clara.
- Alternância dos exemplos de satélite e ilustrado com botões nativos, estado acessível e operação por teclado. Sem JavaScript, o exemplo de satélite continua visível e ampliável.
- Movimento de entrada breve, desativado para quem prefere movimento reduzido.
- Validado em navegador nas larguras 320, 390, 768, 1024 e 1440 px, sem transbordamento horizontal. Troca de exemplos, teclado, FAQ e encaminhamento do CTA para login verificados. Build de produção aprovado.

### Imagem de ambientação

Arquivo: `src/assets/mapas/terreno-aereo-mapas-v2.webp` (1536 × 1024, aproximadamente 231 KiB). Gerado pela ferramenta integrada `image_gen`, convertido para WebP qualidade 80 e servido pelo pipeline responsivo do Astro. A cena é fictícia e decorativa; os exemplos de mapas são os ativos existentes do projeto.

Prompt final utilizado:

> Use case: photorealistic-natural. Asset type: cinematic website hero background for a Brazilian recreational airsoft field map creator. Create a wide 3:2 editorial drone photograph, directly overhead, of a lush subtropical woodland recreation field in southern Brazil. A winding narrow ochre dirt path crosses between deep olive forest canopy, a small clearing with a few simple weathered wood field obstacles in the right half, no people and no weapons. Natural early morning light with a very subtle haze at the upper edge. Rich authentic canopy textures, muted olive and warm sand colors, restrained contrast, high-end outdoor editorial photography. Composition: left third mostly dark continuous forest canopy with quieter detail so HTML typography can overlay; terrain and path detail concentrated in right two thirds. Edge-to-edge landscape, realistic drone photography, no UI, no map markings, no grid, no lettering, no logos, no watermarks, no frames. This is atmosphere only, not a screenshot or actual product output.
