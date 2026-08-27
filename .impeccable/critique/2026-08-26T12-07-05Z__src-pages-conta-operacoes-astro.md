---
target: formulário de cadastro de evento (/conta/operacoes)
total_score: 24
p0_count: 1
p1_count: 2
timestamp: 2026-08-26T12-07-05Z
slug: src-pages-conta-operacoes-astro
---
## Nota de saúde do design

| # | Heurística | Nota | Problema principal |
|---|-----------|-------|--------------|
| 1 | Visibilidade do estado | 2 | Nenhum resumo de erro; envio falho recarrega no topo de um formulário de 1500px sem dizer o que falhou |
| 2 | Linguagem do mundo real | 3 | Vocabulário excelente ("Portão", "Briefing", "Lados"), mas o rótulo "Até" e a opção vazia "—" são crípticos |
| 3 | Controle e liberdade | 3 | Tem rascunho e cancelar; não tem recuperação se sair no meio |
| 4 | Consistência e padrões | 2 | Quatro aparências diferentes para "escolha uma opção"; legenda de seção idêntica a rótulo de campo |
| 5 | Prevenção de erro | 1 | Um único `required` em 25 controles; aceita data no passado; não checa fim > início |
| 6 | Reconhecer em vez de lembrar | 3 | Rótulos visíveis quase sempre; em "Lados e vagas" são `sr-only` e só o placeholder aparece |
| 7 | Flexibilidade e eficiência | 2 | Sem duplicar operação anterior — e o organizador repete o mesmo evento todo mês |
| 8 | Estético e minimalista | 2 | 25 retângulos idênticos numa coluna só, sem ritmo; filete lateral proibido no painel de acesso |
| 9 | Recuperação de erro | 2 | Mensagens ótimas, mas sem âncora, sem foco, e o erro de "Valor" cai longe do campo que errou |
| 10 | Ajuda e documentação | 4 | Cada grupo explica a consequência com honestidade. Melhor que a média do mercado |
| **Total** | | **24/40** | **Aceitável, com uma falha estrutural** |

## Veredito de anti-padrões

**Avaliação própria.** Não parece IA — parece um formulário escrito por quem joga. A voz é o ativo mais forte da tela. O problema não é slop, é monotonia: 25 controles com a mesma borda, a mesma altura e quase a mesma largura, empilhados numa coluna. O olho não tem onde descansar e não consegue distinguir o que é campo, o que é grupo e o que é escolha.

Uma violação de ban confirmada: filete lateral (`border-l-2`) nos painéis de "Quem pode entrar", linhas 1385 e 1393.

**Varredura determinística.** `detect.mjs` rodou em `src/pages/conta/operacoes.astro` e depois em `src/pages` + `src/components`: zero achados nos dois casos. Não confirma limpeza — o `border-l-2` que verifiquei por grep passou batido, então o detector não está pegando classe Tailwind em `.astro`.

**Overlay no navegador.** Não apliquei overlay. Usei o navegador para medir estrutura e contraste na página real e para capturar as duas telas.

## Impressão geral

A escrita é excelente e a lógica é sólida. O que está quebrado é a **gramática visual**: tudo tem a mesma forma, então nada tem posto. Some a isso um formulário longo que só descobre os erros depois de ir ao servidor e voltar sem apontar onde — e a maior chance de abandono é justamente na hora de publicar.

Contraste está bom em toda parte (7,7:1 nos rótulos de 13px, 6,6:1 no mono de 11px). Sem estouro horizontal no celular.

## O que está funcionando

- **A escrita.** "Vagas em branco = sem limite; quando lota, quem chega entra na lista de espera e sobe sozinho se alguém desistir." Isso explica uma regra de produto inteira numa frase, sem jargão.
- **Divulgação progressiva nas duas escolhas grandes.** Aba do campo e "Quem pode entrar" mostram só o painel da opção escolhida, em CSS puro. O organizador de evento aberto nunca vê o campo de WhatsApp de convite.
- **Honestidade como padrão.** "O pagamento é direto com você. A plataforma não recebe nem intermedia."

## Problemas por prioridade

### [P0] Erro sem resumo, sem âncora e sem foco

O formulário tem 1500px de altura no desktop e **um único campo com `required`** (a data). Tudo o mais é validado no servidor. Resultado: a pessoa aperta "Publicar evento", a página recarrega no topo, e não há nem lista do que falhou nem rolagem até o campo. Se o erro foi em "Lados e vagas", ela precisa varrer o formulário inteiro para achar.

**Corrigir:** caixa de resumo com `role="alert"`, foco automático e link para cada campo — o mesmo padrão que acabou de entrar no cadastro de armeiro. Mais `required` nos campos que já são obrigatórios no servidor, para o navegador barrar antes da viagem.

**Comando:** `/impeccable harden`

### [P1] Quatro aparências para o mesmo ato de escolher

É a confusão que você apontou. No mesmo formulário:

| Onde | Como aparece |
|---|---|
| Aba do campo | rádio invisível + sublinhado amarelo |
| Filtro UF / Modalidade / Estilo | `<select>` nativo, só uma setinha diferencia |
| Lista de campos | rádio visível dentro de uma caixa rolável |
| Quem pode entrar | rádio invisível dentro de um retângulo igual a um campo de texto |

"Público aberto" e "Só por convite" são dois retângulos com borda, do mesmo tamanho de um input — não há nada dizendo "clique para escolher". E a caixa da lista de campos parece um textarea grande.

**Corrigir:** dois vocabulários no máximo. `<select>` para escolha fechada e curta; caixa com rádio visível para escolha que precisa de explicação. A aba fica como está — ela é navegação, não campo. E os retângulos de "Quem pode entrar" precisam do rádio visível, igual às linhas da lista de campos.

**Comando:** `/impeccable layout`

### [P1] Legenda de seção com o mesmo peso do rótulo de campo

`ROTULO_CAMPO` (15px semibold) é usado para "Data" (um campo) e para "Horários" (um grupo de quatro). Visualmente têm o mesmo posto, então o formulário lê como uma lista solta de 15 rótulos em vez de 6 blocos. É a causa direta da sensação de bagunça.

**Corrigir:** as legendas de seção sobem um degrau — o `TITULO_SECAO` que já existe em `estilos-form.ts` — e ganham um fio separador acima, como ficou o cadastro de armeiro. Os rótulos de campo continuam onde estão.

**Comando:** `/impeccable typeset`

### [P2] Prevenção de erro quase ausente

Três buracos confirmados no código:

1. **Data no passado passa.** A validação é só `if (!enviado.data)`, e o input não tem `min`. Dá para publicar um evento para ontem — ele some da agenda sozinho e o organizador não entende por quê.
2. **Fim antes do início passa.** Não existe comparação entre os quatro horários.
3. **Só a data tem `required`.** Campo, lados e o resto dependem da ida ao servidor.

**Comando:** `/impeccable harden`

### [P2] Falta duplicar a operação anterior

Quem organiza roda o mesmo evento no mesmo campo todo mês: mesmos lados, mesmo preço, mesma forma de pagar. Hoje preenche os 25 controles de novo, toda vez. Um botão "Repetir esta operação" no card de uma operação passada, que abre o formulário preenchido só com a data em branco, corta o trabalho em 90% para o usuário que mais importa.

**Comando:** `/impeccable shape`

## Onde cada persona trava

**Alex (organizador veterano, 3ª operação do mês).** Preenche 25 campos idênticos do zero pela terceira vez porque não há "duplicar". Erra o formato do preço, aperta publicar, volta ao topo sem saber onde errou, rola 1500px procurando a borda vermelha. Na quarta vez manda no grupo do WhatsApp e não usa mais o site.

**Jordan (primeira operação).** Chega em "Quem pode entrar" e não percebe que "Público aberto" e "Só por convite" são clicáveis — parecem dois campos de texto. Aceita o padrão sem decidir. Depois em "Lados e vagas" vê duas caixas escritas "Vagas" sem entender se é obrigatório; o texto de ajuda está acima e ela já passou.

**Dono de campo (cadastra o próprio evento).** Não acha o campo na lista porque o filtro é só JavaScript e a lista rola sem aviso. Vai para a aba de cadastro e cria um campo duplicado.

## Observações menores

- "Até", entre "Antecipado" e "No dia", parece o fim de uma faixa de preço; é a data limite do lote.
- A opção vazia do "Estilo" é "—". Em "Modalidade" é "Escolha". Escolher um dos dois.
- Erros de "Valor" aparecem todos no fim do grupo: o erro de "Antecipado" fica abaixo de "No dia".
- "+ Acrescentar lado" usa `BOTAO_SECUNDARIO`, o mesmo peso de "Salvar como rascunho" — ação de campo com peso de ação de formulário.
- Em "Lados e vagas" os rótulos são `sr-only`: quem digita perde o placeholder e fica sem referência.
- A lista de campos rola sem nenhuma pista visual de que rola.

## Perguntas que valem pensar

- O formulário precisa mesmo ser uma tela só? Data + campo + lados resolvem 80% dos casos; preço, horários e pagamento poderiam vir depois de publicar.
- Se "duplicar operação" existisse, quantos campos deste formulário alguém preencheria de fato numa segunda-feira comum?
- "Quem pode entrar" está no fim, mas é a decisão que mais muda o que acontece com o evento. Por que não no começo, junto do campo?
