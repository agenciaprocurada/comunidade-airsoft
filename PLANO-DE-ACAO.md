# Comunidade Airsoft — Plano de Ação

Base: `_uploads/comunidade-airsoft-documento-de-projeto.md` + Design System v1.1.
Este plano reordena o MVP do documento original. Justificativas na seção 1.

---

## 1. Ajustes ao documento original

| # | Doc original | Ajuste proposto | Motivo |
|---|---|---|---|
| 1 | Login é a funcionalidade #1 do MVP | Login vai para a Entrega 3 | O canal é SEO. Nada que exige login gera tráfego. Login serve à conversão, que só existe depois que há tráfego. |
| 2 | Mapa integrado é a #2 | Mapa vai para a Entrega 4 | É o item mais caro e o único que não indexa. Substituído por navegação geográfica em URLs (`/campos/sp/campinas`), que indexa. |
| 3 | "Só divulgar após massa crítica" | Publicar cedo, divulgar depois | Indexação leva 2–4 meses. Publicar sem divulgar é grátis e adianta o relógio do Google. |
| 4 | Coleta de dados citada na Etapa 0 | Trilha paralela, contínua, desde a semana 1 | É o gargalo real: ~100 campos coletados à mão. Não pode ser sequencial ao desenvolvimento. |

---

## 2. Stack

Decidida em 21/08/2026: **Astro**. O produto tem duas naturezas — conteúdo
(Fase 1) e aplicação (Fase 2). Astro é a melhor escolha para a primeira; a
segunda vai exigir React dentro do Astro ou um app separado. Trade-off aceito
conscientemente.

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | **Astro 7** | Gera HTML estático puro, quase sem JavaScript. Melhor cenário possível para SEO e Core Web Vitals. |
| Estilo | **Tailwind 4 + tokens do DS** | Os tokens da seção 05 do design system viraram `@theme` em `src/styles/global.css`. |
| Dados (Fase 1) | **Content collections** (JSON no repositório) | Ver seção 3. |
| Conteúdo (guias) | **Markdown / MDX** | Versionado no git, validado por schema no build. |
| Hospedagem | **Vercel** ou **Cloudflare Pages** | Site estático: custo zero e entrega por CDN. |
| Banco (a partir da Entrega 3) | **Supabase** (Postgres) | Entra quando houver submissão da comunidade e login. |

Custo até a Entrega 2: **R$ 0/mês**.

**Não construir:** meio de pagamento próprio, mapa custom, CMS próprio.

---

## 3. Modelo de dados

### Fase 1 — arquivos, não banco

Na Fase 1 os campos e lojas são **arquivos JSON dentro do repositório**, lidos
pelas content collections do Astro. Um arquivo por campo.

Motivo: a Fase 1 é 100% leitura, com cerca de 100 campos. Um banco não resolve
nenhum problema dessa fase e adiciona infraestrutura, custo e um ponto de
falha. Com arquivos:

- o site é 100% estático — rápido e praticamente sem custo;
- todo dado fica versionado, com histórico de quem mudou o quê;
- correção de campo vira commit, e revisão vira pull request;
- o schema é validado **no build**: dado inválido quebra o build de propósito;
- a importação da planilha de coleta vira um script que gera os JSONs.

**Quando migrar para Postgres:** na Entrega 3, quando a comunidade passar a
submeter dados e houver login. Aí o banco alimenta o build, e as fichas
continuam estáticas.

O schema vive em `src/content.config.ts` e reproduz as entidades do documento
de projeto (§4). Decisões estruturais que evitam retrabalho:

- **`status` + `verificado` + `verificado_em`** em toda entidade de diretório.
  A data da última conferência aparece na ficha — mitigação do risco de dado
  desatualizado (§9).
- **`fonte`** registra de onde veio o dado (instagram, maps, submissão).
- **`lat`/`lng`** desde já, mesmo sem mapa.
- **O nome do arquivo é o slug** e nunca muda depois de publicado.
- **`consentimentos` será tabela separada** quando o banco entrar — uma linha
  por consentimento, com data, hora, IP e versão do texto. Consentimento como
  booleano no usuário inviabiliza a LGPD e a monetização da Fase 2.

### URLs (definidas, não mudam)

```
/campos/[uf]/[cidade]/[slug]        ficha do campo
/campos/[uf]                        hub estadual (página de SEO)
/campos/[uf]/[cidade]               hub municipal (página de SEO)
/lojas/[slug]        ·  /lojas/[uf]
/operacoes/[slug]    ·  /operacoes/[uf]
/equipes/[uf]  ·  /grupos/[uf]  ·  /influencers  ·  /tecnicos/[uf]
/guias/[slug]
```

Os hubs estaduais e municipais são gerados automaticamente e são o principal
ativo de SEO do projeto — capturam "campo de airsoft em [cidade]".

---

## 4. Entregas

### Entrega 0 — Fundação ✅ concluída em 21/08/2026
- [x] Projeto Astro 7 + Tailwind 4 com os tokens do DS
- [x] Schema das coleções (campos, lojas, guias) + dados de exemplo
- [x] Layout base: header com menu mobile, rodapé, tipografia, botão, etiqueta, card, selo de verificação, trilha
- [x] Estrutura de URLs e hubs geográficos funcionando
- [x] `robots.txt`, `sitemap.xml`, canônicas, Open Graph, JSON-LD
- [x] Página 404 e placeholders `noindex` para rotas ainda não construídas
- [ ] Termos de Uso e Política de Privacidade — **rascunho no ar, falta revisão jurídica**
- [ ] Analytics
- [ ] Deploy

### Entrega 1 — Núcleo público e indexável (semanas 2–4)
**Meta: o Google tem o que indexar.** Nenhuma tela exige login.
- [x] Ficha de campo completa, com contato **visível** nesta fase
- Ficha de loja, página de evento, listagem de influencers
- **Dados reais** substituindo os campos de exemplo
- [x] Hubs `/campos/[uf]` e `/campos/[uf]/[cidade]`
- 6 guias (1 rascunho pronto, faltam 5)
- Dados estruturados schema.org (`SportsActivityLocation`, `LocalBusiness`, `Event`, `FAQPage`) — alavanca desproporcional para diretório
- Formulários de "Reivindicar" e "Reportar" (os botões já existem nas fichas) → sem conta, dispara e-mail

> **Publicar ao vivo ao fim desta entrega, sem divulgar.**

### Entrega 2 — Busca e navegação (semanas 5–6)
- Busca e filtros server-side em campos (terreno, estrutura, aceita iniciante, aluguel, faixa de preço) e lojas (categoria, física/online)
- Agenda de eventos por data e região
- Diretório de grupos de WhatsApp por região e tema

### Entrega 3 — Conta e conversão (semanas 7–9)
**Aqui o muro sobe.** A partir daqui, contato direto exige login.
- Login (Google + e-mail) e onboarding: cidade, nível, estilo
- Consentimento LGPD granular e registrado, com canal de exclusão
- Muro leve: contato do campo, entrada no grupo oficial, favoritar
- Submissão de campo/loja/evento pela comunidade + painel de moderação
- Convite automático para o grupo da região no onboarding

### Entrega 4 — Expansão (semanas 10–14)
- Mapa com camadas filtráveis (Leaflet/MapLibre), montado sobre a busca já existente
- Avaliações — só de conta verificada, com regra de moderação publicada
- Equipes/pelotões e técnicos/armeiros
- Alerta de operação por região (e-mail)

### Fase 2 — só depois de validado
Iniciar quando a métrica "campos reivindicados pelos donos" provar demanda. Split de pagamento via Asaas ou Pagar.me.

---

## 5. Trilha paralela — dados e comunidade (começa na semana 1)

Roda ao lado do desenvolvimento, não depois.

| Semana | Ação |
|---|---|
| 1 | Grupo oficial de WhatsApp criado; planilha de coleta com as colunas exatas do schema |
| 1–5 | Coleta: 80–120 campos, 40–60 lojas, 30 influencers, 20–30 grupos |
| 2–4 | Redação dos 6 guias (bloco jurídico primeiro: maior busca, menor concorrência) |
| 3–6 | Grupo chega a 200–300 pessoas via influencers e grupos regionais |
| 6 | Importação da planilha: script gera um JSON por campo em src/content/campos/ |
| 7+ | Beta com o grupo; abordagem ativa de donos de campo para reivindicação |

**Regra:** a planilha usa exatamente os nomes de coluna do schema. Planilha livre gera dias de limpeza na importação.

---

## 6. Design system — o que falta fechar

O DS entregue cobre cores, tipografia, tokens, botões, etiquetas, patentes, formulário, card de operação, navegação e faixa escura. Lacunas para a Fase 1:

- [x] Ficha de campo (layout completo, desktop e mobile) — feita na Entrega 0
- Card e lista de resultado de busca; barra de filtros
- [x] Página de artigo/guia (tipografia de leitura longa) — feita na Entrega 0
- **Comportamento mobile do que ainda vem** — o DS está desenhado em grid de 1240px; o que já foi construído está responsivo e testado
- Estados vazios, carregando, erro, 404
- [x] Selos "verificado" / "não verificado" e o botão de reivindicação — feitos na Entrega 0
- Ícones (o DS não define um conjunto)

Os tokens da seção 05 do DS já estão em `src/styles/global.css` (bloco `@theme`). Tailwind 4 dispensa `tailwind.config`: a configuração vive no CSS. Alterou o DS? Alterar lá, sem inventar valor novo.

---

## 7. Primeiros 5 passos (esta semana)

1. Confirmar se `comunidadeairsoft.com.br` foi liberado (o doc previa 19/08) e apontar o DNS
2. Criar o grupo oficial de WhatsApp e iniciar a captação
3. Criar a planilha de coleta com as colunas do schema
4. Subir repositório + Next.js + Supabase + Vercel com o layout base
5. Iniciar a redação dos guias jurídicos

---

## 8. Riscos de execução (além dos já listados no doc)

| Risco | Mitigação |
|---|---|
| Coleta de dados atrasa e o site fica vazio | Trilha paralela desde a semana 1; meta semanal de 20 campos |
| Escopo do MVP incha e nada vai ao ar | Entrega 1 é intocável: só páginas públicas |
| URL muda depois do lançamento | Estrutura definida na seção 3, congelada |
| DS não cobre mobile e o front improvisa | Fechar as lacunas da seção 6 antes da Entrega 1 |
| Conteúdo público sem dono vira dado podre | `verificado_em` visível + "reportar desatualizado" desde o dia 1 |
