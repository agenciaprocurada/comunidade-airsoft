# Coleta nacional de campos — como rodar um lote

O diretório saiu do RS (79 campos coletados à mão) para o Brasil inteiro.
Fazer isso à mão 26 vezes não termina. Este documento é o processo que
substitui a planilha: **Google Places descobre e preenche, gente confirma
e publica.**

Decidido em 23/08/2026.

---

## Por que Places e não planilha

A Places devolve, em uma chamada, quase todas as colunas que o schema já
tem: nome, endereço completo, coordenada, telefone, site, nota do Google,
número de avaliações e — o mais importante — `businessStatus`, que diz se
o lugar fechou. Isso é justamente o que faltava para tirar os 44 rascunhos
do RS do limbo.

O que a Places **não** sabe e continua sendo trabalho humano: tipo de
terreno, limite de FPS, preço, se aceita iniciante, se tem aluguel. Esses
campos vêm do Instagram e do WhatsApp do campo, na etapa de revisão.

### Custo

O `FieldMask` decide o SKU, e a cobrança é sempre a do campo mais caro
pedido. Conferido em 22/08/2026 — confirmar antes de um lote grande:

| SKU | O que inclui | Preço | Grátis por mês |
|---|---|---|---|
| **Pro** (padrão daqui) | nome, endereço, coordenada, status, nota, site, tipos | US$ 32/1.000 | 5.000 |
| **Enterprise** (`--completo`) | + telefone, horário, nº de avaliações | US$ 35/1.000 | 1.000 |

Telefone é opt-in de propósito: numa varredura nacional ele derruba a
franquia gratuita de 5.000 para 1.000 chamadas.

Ordem de grandeza real: o RS inteiro (conciliar + varrer) são **187
chamadas**. O Brasil todo, espalhado pelas ondas abaixo, cabe na franquia
gratuita se não concentrar tudo no mesmo mês.

---

## As ondas

Não é por ordem alfabética de UF — é por demanda de busca. Cada onda vai
ao ar sozinha, porque o site é estático e o build é por lote. Publicar
cedo adianta o relógio de indexação do Google, que leva de 2 a 4 meses.

| Onda | Alvo | Situação |
|---|---|---|
| **0** | **RS — fechar o que já existe** | em andamento |
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

Sempre os mesmos cinco passos. Os dois primeiros são máquina, os três
últimos são gente.

### 1. Conciliar o que já existe

Busca cada campo já cadastrado do estado pelo nome, para pegar
`place_id`, coordenada e status atual.

```
node db/coletar-places.mjs --uf=RS --lote=rs-2026-08 --modo=conciliar --seco
node db/coletar-places.mjs --uf=RS --lote=rs-2026-08 --modo=conciliar
```

Sempre rodar `--seco` antes: ele imprime quantas chamadas fará e o custo
máximo, sem gastar nada.

### 2. Varrer para descobrir

Divide o estado numa grade e busca dentro de cada célula. Pega campo em
zona rural, que não aparece em busca por nome de cidade.

```
node db/coletar-places.mjs --uf=RS --lote=rs-2026-08 --modo=varrer --grade=6 --seco
node db/coletar-places.mjs --uf=RS --lote=rs-2026-08 --modo=varrer --grade=6
```

`--grade=6` são 36 células. Estado grande e denso (SP) pede 8 ou 10;
estado pequeno, 4. Cada busca devolve no máximo 60 resultados — se uma
célula vier cheia, aumente a grade nela.

`--max=250` é o teto de chamadas e existe para não haver surpresa na
fatura. O script para ao atingir.

### 3. Conciliar staging → campos

```
node db/conciliar-places.mjs --lote=rs-2026-08
node db/conciliar-places.mjs --lote=rs-2026-08 --aplicar
```

Sem `--aplicar` ele só relata. Com `--aplicar`:

- campo novo entra como **rascunho**, confiança **média**, nunca publicado;
- campo que já existe só tem **buraco preenchido** — telefone e endereço
  conferidos à mão não são sobrescritos;
- nota e nº de avaliações do Google sempre atualizam (são dado dele);
- `CLOSED_PERMANENTLY` vira `status = 'inativo'` na hora.

### 4. Revisão humana

No painel do Supabase, filtrar `status = 'rascunho'` e `uf = <estado>`.
Por registro, em 2 a 5 minutos:

- [ ] É campo de airsoft/paintball mesmo? (a varredura traz loja, clube
      de tiro e restaurante — vêm marcados com `motivo = 'tipo suspeito'`)
- [ ] Perfil ou site com sinal de vida nos últimos 6 meses?
- [ ] `descricao` escrita (a Places não dá; sem ela a ficha fica muda)
- [ ] `terreno`, `precos`, `aceita_iniciante`, `tem_aluguel` quando der
- [ ] `confianca` ajustada: `alta` só com sinal recente de operação

### 5. Publicar e buildar

Só vira `publicado` o que for **ativo + confiança alta**. É a mesma regra
dos campos do RS, e ela existe porque campo fechado exibido como aberto
manda o jogador dirigir 80 km para um portão trancado — risco §9 do
documento de projeto.

```
npx astro build
```

**Meta por lote: publicar ao menos 50% do que foi coletado.** No RS deram
37% (29 de 79); o resto ficou em rascunho por falta de confirmação.

---

## O que muda no schema (já aplicado)

`db/migracao-campos-places.sql` adicionou:

- `lat` / `lng` — a Places dá de graça; sem gravar agora, seria varrer
  tudo de novo quando o mapa da Entrega 4 entrar;
- `place_id` (único) — chave de deduplicação global. Antes a chave era o
  slug do nome, que colide entre estados: "Arena Airsoft" existe em SP,
  PR e BA, e o upsert antigo faria um sobrescrever o outro em silêncio;
- `place_status` / `place_visto_em` — quando foi a última vez que o
  Google confirmou que o lugar existe;
- tabela `campos_bruto` — staging. Dado bruto de API não cai direto na
  tabela que alimenta o site.

> **Atenção ao id:** `db/carregar-planilha.mjs` (a carga da planilha do
> RS) ainda gera id só com o slug do nome. Enquanto ela existir, não
> rodar aquela planilha depois que outro estado entrar — ou corrigir o
> gerador para usar o mesmo `idLivre()` de `conciliar-places.mjs`.

---

## Chave da API

O coletor lê `GOOGLE_MAPS_API_KEY` do ambiente. Para criar:

1. Google Cloud Console → novo projeto
2. Ativar **Places API (New)**
3. Credenciais → criar chave de API
4. Restringir a chave: API Restriction → só Places API (New)
5. **Definir um teto de orçamento** no Billing, com alerta por e-mail

A chave não vai para o repositório. Local: `.env`. No deploy: variável de
ambiente do projeto.
