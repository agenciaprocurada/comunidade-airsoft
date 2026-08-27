# Product

## Register

brand

> A área logada (`/conta/*`, `/reivindicar`) é a exceção declarada: ali o
> registro é **product**. Ver "Os dois dialetos" em Design Principles.

## Users

**Jogador ativo.** Já joga, tem equipamento, procura operação nova, campo novo,
peça de reposição. Alta frequência, sabe o jargão. Abre o site do celular, muitas
vezes no campo, com sinal ruim.

**Iniciante.** Comprou ou quer comprar a primeira réplica e não sabe onde jogar,
com quem, nem se é legalizado. É o maior volume de busca no Google e o pior
atendido hoje — é a porta de entrada orgânica do produto. Não conhece o jargão e
se intimida com estética dura demais.

**Dono de campo, lojista, organizador.** Não é o usuário do dia a dia, mas é o
cliente pagante da Fase 2. Chega pela reivindicação da própria página.

## Product Purpose

Responder as três perguntas de quem joga airsoft no Brasil — onde eu jogo, onde
eu compro, com quem eu jogo — de graça e num lugar só. O mercado é grande e
apaixonado, mas a informação está espalhada em grupo de WhatsApp, perfil de
Instagram e grupo regional de Facebook.

Território neutro por decisão estratégica: não somos loja, não somos campo, não
somos equipe. É isso que deixa lojas e campos concorrentes coexistirem na
plataforma sem enxergar a gente como ameaça.

Sucesso nos primeiros 90 dias não é tráfego bruto: é campo reivindicado pelo
dono, cadastro por semana e entrada no grupo regional.

## Brand Personality

**Tático, direto, confiável.**

Tático no vocabulário e na forma — base escura, oliva, tipografia condensada,
sem arredondamento. Direto na escrita: frase curta, sem enrolação, sem
publicidade. Confiável porque diz o que sabe e o que não sabe: a ficha mostra a
data da última conferência e o selo de não verificado em vez de fingir certeza.

Nunca condescendente com o iniciante e nunca puxa-saco do veterano.

## Anti-references

**Loja / e-commerce.** Vitrine, preço em destaque, botão de comprar, selo de
frete. Os Termos dizem que a plataforma não vende nem intermedia produto
controlado — parecer loja é risco jurídico, não só estético.

**Tático agressivo / arma de fogo.** Caveira, sangue, mira vermelha, camuflagem
por toda parte, estética militar pesada. Reforça exatamente a confusão
regulatória que o documento de projeto lista como risco alto, e afasta o
iniciante que é o maior público.

**Dashboard SaaS genérico** (na área logada). Número grande com rótulo pequeno,
grade de cartões idênticos, gráfico decorativo, cartão de "em breve" ocupando a
dobra.

## Design Principles

**Os dois dialetos.** O mesmo design system fala de dois jeitos. No diretório
público ele é expressivo: display condensado em caixa alta, escala fluida,
chanfro, desgaste. Na área logada ele é operacional: uma família de texto,
escala fixa em rem, densidade maior, display reservado ao título da página.
Aplicar o dialeto público numa tela de formulário é o erro mais fácil de cometer
aqui — e o mais caro.

**Conteúdo é isca, conta é para ação.** O usuário cria conta quando quer *fazer*
algo, nunca para *ver* algo. Nenhuma página indexável pode depender de login.

**Admitir a incerteza.** Data da última conferência visível, selo de não
verificado, "reportar desatualizado" em toda ficha. Dado velho sem aviso destrói
a confiança que sustenta o diretório inteiro.

**A tela mostra o que precisa de ação.** Fila de moderação, cadastro incompleto,
pedido aguardando. O que ainda não existe não ocupa espaço nobre.

**Nunca prometer o que o produto não é.** Sem gamificação, sem ranking, sem
vitrine de preço. O visual não pode sugerir uma funcionalidade que o roadmap
adiou de propósito.

## Accessibility & Inclusion

Sem meta formal de WCAG declarada pelo projeto.

O CSS base já assume dois compromissos, e eles continuam valendo: **foco sempre
visível** (`:focus-visible` com contorno oliva) e **mínimo de 15px em texto de
leitura**. Contraste legível e navegação por teclado entram como padrão de
acabamento, não como requisito auditado.

Restrição real de contexto: celular e conexão ruim. Muita gente abre o site no
campo, longe da cidade. Peso de página e dependência de JavaScript são decisões
de acessibilidade neste projeto.
