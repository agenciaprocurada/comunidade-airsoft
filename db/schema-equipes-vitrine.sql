-- ============================================================
-- Comunidade Airsoft — vitrine publica das equipes
--
-- O schema-equipes.sql resolveu a GESTAO (quem entra, quem lidera,
-- quem aprova). Faltava o motivo de alguem preencher aquilo: uma
-- pagina publica que a equipe queira mostrar. Este arquivo abre essa
-- porta e acrescenta so o que a vitrine exige.
--
-- 1. RECRUTANDO. E o campo que transforma o diretorio de vitrine em
--    utilidade: quem chega do Google procurando "equipe de airsoft em
--    Joinville" quer saber quem esta aceitando gente. Nasce `false` —
--    dizer que recruta e ato explicito do lider, senao a lista inteira
--    mente no primeiro dia.
--
-- 2. CONTAGEM DE MEMBROS DERIVADA, nunca digitada. Efetivo declarado
--    e numero que ninguem confere e que todo mundo arredonda para
--    cima. A view conta o elenco ativo; se a equipe tem 12 caras e so
--    3 tem conta, a ficha mostra 3. E menos bonito e e verdade.
--
-- 3. LOGO EM BUCKET PROPRIO. O bucket `avatares` compara a pasta com
--    o uid de quem envia, o que so serve para arquivo de pessoa. Logo
--    e da EQUIPE: a pasta e o id dela e quem escreve e a lideranca.
--
-- Continua valendo o que o schema-equipes.sql travou: sem pontuacao,
-- sem ranking, sem nivel. Vitrine, nao placar.
--
-- Aplicar DEPOIS de db/schema-equipes.sql.
-- ============================================================

-- ------------------------------------------------------------
-- Recrutando
-- ------------------------------------------------------------

alter table public.equipes
  add column if not exists recrutando boolean not null default false;

comment on column public.equipes.recrutando is
  'Equipe aceitando gente nova. Ligado a mao pelo lider; nasce falso.';

-- Indice parcial: a consulta do diretorio filtra por quem recruta, e
-- essa e sempre a minoria das linhas.
create index if not exists equipes_recrutando_idx
  on public.equipes (uf, cidade_slug) where recrutando;

-- ------------------------------------------------------------
-- Vitrine
--
-- Mesma excecao da `equipe_elenco` (`security_invoker = false`) e pelo
-- mesmo motivo: a contagem precisa varrer `equipe_membros`, e a RLS de
-- la esconde vinculo pendente ate do anonimo — com invoker, todo
-- visitante deslogado veria zero membro em todas as equipes.
--
-- Seguro porque nao projeta NENHUMA coluna de pessoa: so o numero.
-- Quem sao os membros continua saindo unicamente da `equipe_elenco`.
-- `criada_por` fica de fora de proposito — uuid de usuario nao tem o
-- que fazer numa resposta publica.
-- ------------------------------------------------------------

drop view if exists public.equipe_vitrine;

create view public.equipe_vitrine
with (security_invoker = false) as
select
  e.id,
  e.nome,
  e.sigla,
  e.slug,
  e.uf,
  e.cidade,
  e.cidade_slug,
  e.descricao,
  e.logo_url,
  e.redes,
  e.verificada,
  e.recrutando,
  e.criado_em,
  count(m.*) filter (where m.status = 'ativo')::int as membros
from public.equipes e
left join public.equipe_membros m on m.equipe_id = e.id
group by e.id;

grant select on public.equipe_vitrine to anon, authenticated;

-- ------------------------------------------------------------
-- Bucket da logo
--
-- Caminho sempre `<equipe_id>/logo-<carimbo>.<ext>`, como o bucket
-- `avatares` faz com o uid. 2 MB porque logo de equipe e imagem de
-- 400px, nao fotografia.
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos', 'logos', true,
  2097152,                                   -- 2 MB
  array['image/png','image/webp','image/jpeg']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/png','image/webp','image/jpeg'];

/**
 * A primeira pasta do caminho e uma equipe que EU lidero?
 *
 * Existe porque a policy nao pode fazer `(storage.foldername(name))[1]::uuid`
 * direto: basta alguem enviar para a pasta "abc" e o cast estoura em
 * erro de tipo no meio da policy. A checagem de forma vem antes do
 * cast, e o caminho torto simplesmente devolve falso.
 */
create or replace function public.pasta_de_equipe_que_lidero(p_nome text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pasta text;
begin
  v_pasta := (storage.foldername(p_nome))[1];

  if v_pasta is null or v_pasta !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  return public.e_lider_da_equipe(v_pasta::uuid) or public.e_admin();
end $$;

drop policy if exists logos_leitura_publica on storage.objects;
create policy logos_leitura_publica on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'logos');

drop policy if exists logos_lider_envia on storage.objects;
create policy logos_lider_envia on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and public.pasta_de_equipe_que_lidero(name));

drop policy if exists logos_lider_troca on storage.objects;
create policy logos_lider_troca on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and public.pasta_de_equipe_que_lidero(name))
  with check (bucket_id = 'logos' and public.pasta_de_equipe_que_lidero(name));

drop policy if exists logos_lider_apaga on storage.objects;
create policy logos_lider_apaga on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and public.pasta_de_equipe_que_lidero(name));

-- ------------------------------------------------------------
-- Operacao organizada por equipe
--
-- A coluna `operacoes.equipe_id` nasceu com o schema de operacoes e
-- nunca foi preenchida por nenhuma tela — o painel do organizador
-- passa a oferecer isso. Nada muda no banco alem do indice: e ele que
-- responde "quais as proximas operacoes desta equipe" na ficha
-- publica sem varrer a tabela inteira.
-- ------------------------------------------------------------

create index if not exists operacoes_por_equipe
  on public.operacoes (equipe_id, data) where equipe_id is not null;
