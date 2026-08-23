# Área de usuários — como ligar

O código está pronto. Faltam três passos manuais que só você pode fazer,
porque envolvem sua conta no Google e no Supabase.

---

## 1. Criar as tabelas no Supabase

No painel do Supabase → **SQL Editor** → cole e execute o arquivo
`db/schema-usuarios.sql` inteiro.

Ele cria:

- `perfis` — um por usuário, criado sozinho na primeira entrada
- `consentimentos` — histórico de LGPD, append-only
- `consentimentos_atuais` — view com o estado atual de cada permissão
- as políticas de RLS (cada pessoa só enxerga a si mesma)

Para conferir depois: `select * from public.perfis;` deve rodar sem erro e
voltar vazio.

---

## 2. Criar o cliente OAuth no Google

**Google Cloud Console** → https://console.cloud.google.com

1. Crie um projeto (ou use um existente)
2. **APIs e serviços → Tela de permissão OAuth**
   - Tipo: **Externo**
   - Nome do app: `Comunidade Airsoft`
   - E-mail de suporte e de contato: o seu
   - Domínios autorizados: `comunidadeairsoft.com.br` e `supabase.co`
   - Escopos: só os padrão (`email`, `profile`, `openid`)
3. **Credenciais → Criar credenciais → ID do cliente OAuth**
   - Tipo: **Aplicativo da Web**
   - **URIs de redirecionamento autorizados** — cole exatamente:
     ```
     https://pwbtbljlzrkwupvozvia.supabase.co/auth/v1/callback
     ```
4. Guarde o **Client ID** e o **Client Secret**

> A URL de redirecionamento é a do **Supabase**, não a do site. Quem fala com
> o Google é o Supabase; o site só recebe o resultado. Errar isso é o motivo
> mais comum de `redirect_uri_mismatch`.

---

## 3. Ligar o Google no Supabase

Painel do Supabase → **Authentication → Providers → Google**

1. Ative
2. Cole o **Client ID** e o **Client Secret** do passo 2
3. Salve

Ainda em **Authentication → URL Configuration**:

- **Site URL:** `https://comunidadeairsoft.com.br`
- **Redirect URLs** (uma por linha):
  ```
  https://comunidadeairsoft.com.br/auth/callback
  http://localhost:4321/auth/callback
  ```

Sem o `localhost` na lista, o login não funciona na sua máquina.

---

## 4. Deploy

O site deixou de ser 100% arquivo estático: as rotas de `/conta`, `/entrar` e
`/auth` rodam como função na Vercel. Então as variáveis precisam estar
cadastradas **no projeto da Vercel**, não só no `.env` local:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

`SUPABASE_SERVICE_ROLE` **não** vai para lá — nada da área de usuários usa
service role, e ela ignora RLS.

---

## Como testar

1. `astro dev` e abra http://localhost:4321/conta
   → tem que cair em `/entrar?destino=%2Fconta`
2. Entre com o Google
   → tem que cair em `/conta/completar`
3. Preencha WhatsApp, cidade e marque as caixas obrigatórias
   → tem que cair no painel
4. No Supabase, confira:
   ```sql
   select nome, whatsapp, uf, cidade, onboarding_ok, perfil_completo from perfis;
   select tipo, concedido, ip, criado_em from consentimentos order by criado_em;
   ```
   Devem existir **5 linhas** de consentimento (2 obrigatórios + 3 opcionais),
   inclusive as recusadas.
5. Volte em `/conta/perfil`, desmarque uma permissão e salve
   → o consentimento antigo **continua na tabela** e entra uma linha nova.
   É esse histórico que serve de prova.

---

## Decisões que valem revisitar depois

| Assunto | Situação hoje | Quando mexer |
|---|---|---|
| Login por e-mail | Só Google | Quando houver serviço de envio (Resend) contratado |
| Confirmação de WhatsApp | Coluna existe, sempre `false` | Quando houver API de WhatsApp |
| Perfil público de jogador | Tabela é privada | Expor via **view** com colunas escolhidas — nunca abrir `perfis`, ela guarda telefone |
| Papel de dono de campo/loja | Não existe | Tabela própria de reivindicação, com aprovação manual (doc §6.3) |
| Versão dos Termos | `VERSAO_TERMOS` em `src/lib/conta.ts` | **Trocar sempre que o texto dos Termos ou da Política mudar** |
