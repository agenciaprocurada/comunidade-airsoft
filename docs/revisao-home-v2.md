# Home v2 — proposta para avaliação

Rota: `/` (promovida a home em 08/09/2026). A home anterior ficou em `/home-old`, sem indexação.

## Experiência e conteúdo

- Ação principal no topo: encontrar onde jogar. O caminho do iniciante aparece como ação secundária.
- Navegação por estado usa apenas UFs com campos publicados e encaminha para os hubs existentes. Links diretos funcionam mesmo sem JavaScript.
- Campos, lojas e armeiros organizados em três cartões com fotos e contagens reais das coleções publicadas.
- Organizador de operações abre a seção de ferramentas com a chamada “Tire sua operação do grupo de WhatsApp”, benefícios, CTA próprio e painel ilustrativo. Um atalho no hero leva diretamente ao bloco.
- Criador de mapas tem bloco próprio com exemplo do resultado; a calculadora completa a seção de ferramentas.
- O criador aponta para `/mapas-v2` para permitir avaliar a experiência visual entre as duas propostas.
- Conteúdo para iniciantes separado de uma seleção editorial estável de guias com capa. Não há reordenação aleatória no navegador.
- Convite ao WhatsApp integrado ao conteúdo, acompanhado de links para equipes, envio de campo e conta. Sem convite flutuante cobrindo a página.
- Sem superlativos de liderança ou números inventados. Consultas públicas e requisitos do editor são explicados separadamente.

## Direção visual

Fotografia de ambientação com estética militar/milsim: camuflagem, capacetes, coletes e equipamentos táticos completos, conforme a preferência do usuário. A imagem é gerada para esta versão e não representa uma equipe identificada.

Verde profundo, oliva claro e uma seção em areia criam contraste e separam descoberta, ferramentas e conteúdo. A tipografia condensada e os cantos retos mantêm a identidade do site. Animações breves respeitam movimento reduzido. Imagens responsivas, dimensões explícitas e carregamento tardio abaixo do topo.

A página usa `noindex` e fica fora do sitemap enquanto está em avaliação. Cores e estilos estão limitados à nova home.

## Validação

- Build de produção concluído; rota fora do sitemap e com meta `noindex`.
- Navegador nas larguras 320, 390, 768, 1024 e 1440 px: HTTP 200, um H1 e sem transbordamento horizontal.
- Seleção de Rio Grande do Sul encaminha para `/campos/rs`.
- Os 18 destinos públicos distintos da home responderam com HTTP 200.
- Sem JavaScript: formulário oculto, link para todos os campos e atalhos de estados disponíveis.
- Nenhum erro de JavaScript durante os testes. Inspeção visual em desktop e celular com movimento reduzido.

## Imagem gerada

Ferramenta integrada: `image_gen`. Arquivo final: `src/assets/home/equipe-em-campo-home-v2.webp`. Conversão WebP com qualidade 80, largura máxima 1536 px e sem upscale. O Astro gera as versões menores para telas menores.

Prompt final:

> Use case: photorealistic-natural. Asset type: wide cinematic homepage hero for a Brazilian AIRSOFT community, strong authentic military simulation aesthetic. Create a high-end realistic editorial photograph of a three-person adult AIRSOFT MILSIM squad in full military-style kit, grouped in the RIGHT HALF of the image, walking slowly together along a dense subtropical forest trail in southern Brazil. Waist-up to three-quarter bodies, clearly visible professional-quality tactical loadouts: woodland and multicam combat uniforms, tactical plate carriers with magazine pouches, radio headsets, ballistic-style helmets with mounts, protective eye goggles and lower face protection, gloves, backpacks. Their airsoft replicas have discreet but clearly recognizable orange muzzle tips, carried at low ready pointed toward the ground. All three look like serious milsim airsoft enthusiasts. Leading player in the right third in crisp focus, teammates just behind, military patrol feel and cohesive composition, no active shooting. Left 45 percent dark softly blurred forest with negative space for HTML headline, no people there. Powerful cinematic military editorial photography, olive drab, desaturated woodland greens, warm earthy brown, subtle golden sunlight shafts and atmospheric morning haze, realistic detailed fabric and equipment textures, premium outdoor campaign, restrained film grain. Wide landscape 3:2. No text, no logos, no flags, no UI, no watermark, no explosions or injuries. Military-inspired airsoft is the central visual identity; avoid casual hiking clothes or bare heads.
