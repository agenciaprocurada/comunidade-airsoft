# Coleta nacional de campos — como rodar um lote

O diretório saiu do RS (79 campos coletados à mão) para o Brasil inteiro.
Fazer isso à mão 26 vezes não termina.

O método é **híbrido**, decidido em 23/08/2026:

> **Busca aberta descobre. Places verifica. Gente publica.**

---

## Por que híbrido

### A busca aberta descobre bem — e verifica mal

Teste real em 4 rascunhos do RS, feito em 23/08/2026:

| Campo | O que a busca aberta trouxe |
|---|---|
| Airsoft Garage (Bento Gonçalves) | Um evento de 2022. Sem endereço, telefone ou status |
| Airsoft Factory Field (Arroio do Meio) | Nada — resultados vieram de SP |
| 3 Fronteiras Paintball (Passo Fundo) | Nada |
| Adrenalina Paintball (Viamão) | Só o bairro e uma nota do Google revendida pelo Buser |

**0 de 4 confirmados.** A razão é estrutural: busca aberta acha *páginas
sobre* o campo, não o *estado atual* dele. Um post de 2022 não prova que
abre no sábado que vem. E campo de airsoft raramente tem site — vive no
Instagram e no WhatsApp, que não indexam bem.

Detalhe revelador: **23 dos 79 registros do RS vieram de agregadores**
(Buser, Solutudo, ListaAmarela, TripAdvisor). Esses sites revendem dado
do Google Maps. A coleta manual já consumia dado do Google — só que de
segunda mão, velho e sem o único campo que resolve rascunho.

### A Places verifica bem — e descobre caro

A varredura por grade sobre o estado (que existiu aqui e foi removida)
custava ~108 chamadas por UF e trazia loja, restaurante e academia junto.
Descoberta a busca aberta faz de graça.

O que só a Places entrega:

- `businessStatus` — **se o lugar fechou**. É o que destrava os 44
  rascunhos do RS
- `lat` / `lng` — necessários para o mapa da Entrega 4
- telefone, site e nota **de agora**, não a cópia de 2022

### Custo

**1 chamada por campo.** O RS são 73 chamadas; o Brasil inteiro com ~800
campos são ~800. Conferido na página de preços do Google em 23/08/2026:

| SKU | Text Search | Grátis por mês |
|---|---|---|
| **Pro** (padrão daqui) | US$ 32/1.000 | **5.000 chamadas** |
| **Enterprise** (`--completo`) | US$ 35/1.000 | 1.000 chamadas |

A franquia é **por SKU**, e não existe mais o crédito de US$ 200/mês do
modelo antigo. O `FieldMask` decide o SKU: telefone e horário são opt-in
porque derrubam a franquia de 5.000 para 1.000.

Ainda assim é preciso ativar faturamento no projeto do Google Cloud,
mesmo usando só a parte gratuita. **Definir teto de orçamento com alerta.**

---

## As ondas

Não é por ordem alfabética de UF — é por demanda de busca. Cada onda vai
ao ar sozinha, porque o site é estático e o build é por lote. Publicar
cedo adianta o relógio de indexação do Google, que leva de 2 a 4 meses.

| Onda | Alvo | Situação |
|---|---|---|
| **0** | **RS — verificar os 73 que já existem** | tooling pronto, falta a chave |
| 1 | Grande São Paulo | |
| 2 | Interior de SP + RJ | |
| 3 | MG + ES | |
| 4 | PR + SC | |
| 5 | GO/DF + MT/MS | |
| 6 | Nordeste (BA, PE, CE, PB, RN, AL, SE, MA, PI) | |
| 7 | Norte (PA, AM, TO, RO, AC, AP, RR) | |

SP não cabe em um lote só: quebrar em Grande SP, Campinas,
Ribeirão/Sorocaba e Vale/Litoral.

**Nome do lote:** `<uf-ou-regiao>-<ano>-<mês>` — ex.: `rs-2026-08`,
`sp-grande-2026-09`. Entra no staging e é como se rastreia de onde veio
cada registro.

---

## O ciclo de um lote

### 1. Descobrir — busca aberta, grátis

Varrer portais regionais, blogs de airsoft, perfis de Instagram, grupos
de Facebook e listas de eventos da região. O resultado vai para
`db/campos-descobertos.json`, um objeto por campo:

```json
{
  "nome": "Arena Exemplo Airsoft",
  "uf": "SP", "cidade": "Guarulhos", "bairro": "Cumbica",
  "endereco": "Estrada do Exemplo, km 3",
  "tipo_campo": "mata com área de CQB",
  "precos": "R$ 70 o day use",
  "whatsapp": "11988887777",
  "instagram": "@arenaexemplo",
  "site": "https://arenaexemplo.com.br",
  "observacoes": "Texto que vira a descrição da ficha.",
  "confianca": "media",
  "fonte": "https://portal-regional.com.br/campos | https://instagram.com/arenaexemplo"
}
```

`fonte` é obrigatória. Sem ela não dá para auditar de onde veio o dado —
é o que separa diretório de boato.

### 1b. Descobrir — varredura por cidade na Places

Para capital e cidade grande, onde a busca aberta engasga no volume, a
Places faz a descoberta barata: o município tem um retângulo (vem da
Geocoding, 1 chamada), a Text Search aceita `locationRestriction` para
só devolver o que está dentro dele, e cada termo pagina até 60
resultados. São Paulo capital: 8 termos × até 3 páginas = **no máximo
24 chamadas**.

```
node --env-file=.env db/descobrir-places.mjs --lote=sp-capital-2026-08 --cidade="São Paulo" --uf=SP --seco
node --env-file=.env db/descobrir-places.mjs --lote=sp-capital-2026-08 --cidade="São Paulo" --uf=SP --completo
```

- O resultado vai para o staging (`campos_bruto`), igual ao passo 3.
  Nada entra em `campos` sem passar pela conciliação (passo 4).
- O que cai dentro do retângulo mas é de outro município (Guarulhos,
  Osasco…) vai para o lote `<lote>-vizinhos`, pendente. É dado já
  pago; fica esperando a onda daquela região.
- `--completo` vale a pena aqui: são poucas chamadas e o telefone é o
  que vira WhatsApp na ficha. Franquia do Enterprise: 1.000/mês.
- Varredura traz loja, clube de tiro e academia junto. A conciliação
  marca com `motivo = 'tipo suspeito'`; a revisão humana (passo 5)
  decide.

### 2. Carregar o descoberto

```
node db/carregar-descobertos.mjs
node db/carregar-descobertos.mjs --aplicar
```

Tudo entra como **rascunho**, teto de confiança `media`. Campo que já
existe só tem buraco preenchido. Campo já revisado por humano
(`verificado = true` ou `confianca = 'alta'`) é **pulado** — coleta
automática não apaga trabalho de gente.

### 3. Verificar na Places

```
node db/coletar-places.mjs --lote=sp-grande-2026-09 --uf=SP --seco
node db/coletar-places.mjs --lote=sp-grande-2026-09 --uf=SP
```

Uma chamada por campo sem `place_id`. Sempre rodar `--seco` antes: ele
imprime quantas chamadas fará e o custo máximo, sem gastar nada.
`--max=250` é o teto e existe para não haver surpresa na fatura.

`--refazer` inclui quem já tem `place_id` — é a revisita anual, para
pegar quem fechou depois.

### 4. Conciliar staging → campos

```
node db/conciliar-places.mjs --lote=sp-grande-2026-09
node db/conciliar-places.mjs --lote=sp-grande-2026-09 --aplicar
```

Sem `--aplicar` ele só relata. Com `--aplicar`:

- campo que já existe tem **buraco preenchido** — telefone e endereço
  conferidos à mão não são sobrescritos;
- nota e nº de avaliações do Google sempre atualizam (é dado dele);
- `CLOSED_PERMANENTLY` vira `status = 'inativo'` na hora;
- resultado que não bate com nada conhecido entra como rascunho novo
  (a Places às vezes devolve o vizinho certo quando o alvo não existe).

### 5. Revisão humana

No painel do Supabase, filtrar `status = 'rascunho'` e `uf = <estado>`.
Por registro, 2 a 5 minutos:

- [ ] É campo de airsoft/paintball mesmo? (vem marcado com
      `motivo = 'tipo suspeito'` quando o Google classifica como loja,
      restaurante ou academia)
- [ ] Sinal de vida nos últimos 6 meses?
- [ ] `descricao` escrita — a Places não dá; sem ela a ficha fica muda
- [ ] `terreno`, `precos`, `aceita_iniciante`, `tem_aluguel` quando der
- [ ] `confianca` ajustada: `alta` só com sinal recente de operação

### 6. Publicar e buildar

Só vira `publicado` o que for **ativo + confiança alta**. Campo fechado
exibido como aberto manda o jogador dirigir 80 km para um portão
trancado — risco §9 do documento de projeto.

```
npx astro build
```

**Meta por lote: publicar ao menos 50% do coletado.** No RS deram 37%
(29 de 79); o resto ficou em rascunho por falta de confirmação — que é
exatamente o que o passo 3 resolve.

---

## O que mudou no schema (já aplicado)

`db/migracao-campos-places.sql`:

- `lat` / `lng` — a Places dá de graça; sem gravar agora, seria varrer
  tudo de novo quando o mapa da Entrega 4 entrar;
- `place_id` (único) — chave de deduplicação global;
- `place_status` / `place_visto_em` — quando o Google confirmou pela
  última vez que o lugar existe;
- tabela `campos_bruto` — staging. Dado bruto de API não cai direto na
  tabela que alimenta o site.

### A armadilha do id

O id vira URL e nunca muda depois de publicado (PLANO-DE-ACAO §3). O
gerador antigo usava só o slug do nome, o que funciona com um estado só
— mas "Arena Airsoft" existe em SP, PR e BA, e um upsert por id faria um
**sobrescrever o outro em silêncio**.

`idLivre()` em `db/lib-campos.mjs` resolve: nome puro se estiver livre,
senão nome+cidade, senão nome+UF, senão numerado. Os dois carregadores
novos usam essa função.

> ⚠️ **`db/carregar-planilha.mjs` (a planilha do RS) ainda usa a regra
> velha.** Não rodar aquela planilha depois que outro estado entrar — ou
> trocar o gerador dela por `idLivre()` antes.

---

## Chave da API

Tem que ser **chave de API** (formato `AIza...`), não OAuth client ID.
A Places aceita OAuth, mas por conta de serviço — para script em lote é
complexidade sem ganho. O client ID + secret de aplicativo web, que serve
para "login com Google", **não funciona aqui**.

1. Google Cloud Console → projeto
2. APIs e serviços → Biblioteca → ativar **Places API (New)**
3. Ativar **faturamento** no projeto (obrigatório mesmo para usar só a
   franquia gratuita)
4. APIs e serviços → Credenciais → Criar credenciais → **Chave de API**
5. Editar a chave → Restrições de API → só Places API (New)
6. Faturamento → Orçamentos e alertas → **teto com alerta por e-mail**

A chave vai no `.env`, que não vai para o repositório:

```
GOOGLE_MAPS_API_KEY=AIza...
```

E os scripts leem de lá com a flag nativa do Node:

```
node --env-file=.env db/coletar-places.mjs --lote=rs-2026-08 --uf=RS --seco
```

Assim a chave não aparece na linha de comando nem no histórico do shell.
