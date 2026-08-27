-- ============================================================
-- Ajustes no cadastro de operações
--
-- Três mudanças, todas vindas da mesma ideia: a operação passa a ser
-- SEMPRE amarrada a um campo do diretório. É pelo cadastro de evento
-- que o diretório se mantém atualizado — local escrito à mão não
-- alimenta nada e some depois que a operação acontece.
--
-- Aplicar DEPOIS de db/schema-operacoes.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Estilo "misto"
--
-- Operação que mistura recreativo e milsim é o caso mais comum de
-- fim de semana, e hoje o organizador não tinha como dizer isso.
-- Entra no enum compartilhado; o formulário de PERFIL segue sem
-- oferecer, porque "misto" como estilo pessoal não segmenta nada.
-- ------------------------------------------------------------

alter type public.estilo_jogo add value if not exists 'misto';

-- ------------------------------------------------------------
-- 2. Toda operação tem campo
--
-- `local_avulso` deixa de ser alternativa ao campo. A coluna
-- continua existindo (não se apaga coluna com histórico à toa), mas
-- o constraint agora exige o campo.
--
-- Conferido antes de rodar: nenhuma operação usa local avulso hoje.
-- ------------------------------------------------------------

alter table public.operacoes drop constraint if exists operacoes_tem_local;
alter table public.operacoes add constraint operacoes_tem_campo
  check (campo_id is not null) not valid;
alter table public.operacoes validate constraint operacoes_tem_campo;

-- ------------------------------------------------------------
-- 3. Campo enviado pela comunidade
--
-- Quem vai cadastrar a operação e não acha o campo na lista cadastra
-- o campo ali mesmo — e ele entra no diretório.
--
-- Entra PUBLICADO e NÃO VERIFICADO, que é o mesmo estado de todo
-- campo coletado por nós (doc §6.3): a ficha existe, aparece com o
-- selo de não verificado e espera o dono reivindicar. Fosse rascunho,
-- a página pública da operação não teria como mostrar onde é.
--
-- `submetido_por` dá rastro: dá para achar tudo que veio da
-- comunidade e quem mandou.
-- ------------------------------------------------------------

alter table public.campos
  add column if not exists submetido_por uuid references auth.users(id) on delete set null;

create index if not exists campos_submetido_por_idx
  on public.campos (submetido_por) where submetido_por is not null;

/**
 * Teto de envios por pessoa.
 *
 * O diretório é o ativo de SEO do projeto: endpoint autenticado que
 * escreve nele sem limite é convite para entulho. Cinco por dia
 * atende o organizador de boa-fé (que cadastra um campo, no máximo
 * dois) e corta o envio em massa.
 */
create or replace function public.limitar_campos_submetidos()
returns trigger language plpgsql as $$
begin
  if new.submetido_por is not null
     and (select count(*) from public.campos
          where submetido_por = new.submetido_por
            and criado_em > now() - interval '24 hours') >= 5 then
    raise exception 'limite de 5 campos enviados por dia atingido'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists campos_limite_submissao on public.campos;
create trigger campos_limite_submissao before insert on public.campos
  for each row execute function public.limitar_campos_submetidos();

-- O CHECK trava o estado inicial: ninguém entra já verificado, com
-- confiança alta ou marcando outra pessoa como autor.
drop policy if exists campos_submissao_da_comunidade on public.campos;
create policy campos_submissao_da_comunidade on public.campos
  for insert to authenticated
  with check (
    submetido_por = auth.uid()
    and status = 'publicado'
    and verificado = false
    and confianca = 'baixa'
    and fonte like 'submissao:%'
    and exists (
      select 1 from public.perfis p
      where p.id = auth.uid() and p.perfil_completo
    )
  );

-- Quem enxerga o que a comunidade mandou, para conferir depois.
create or replace view public.campos_submetidos
with (security_invoker = true) as
select c.id, c.nome, c.cidade, c.uf, c.modalidade, c.criado_em,
       c.submetido_por, p.nome as enviado_por
from public.campos c
left join public.perfis p on p.id = c.submetido_por
where c.submetido_por is not null
order by c.criado_em desc;

grant select on public.campos_submetidos to authenticated;

-- ------------------------------------------------------------
-- 4. Lados: dois ou mais
--
-- O gatilho criava exatamente dois lados fixos. Agora o formulário
-- manda quantos o organizador quiser (mínimo dois), então o gatilho
-- só serve de rede: se a aplicação falhar no meio, a operação não
-- fica sem lado nenhum. A aplicação renomeia os dois primeiros e
-- insere o resto.
-- ------------------------------------------------------------

-- Vagas por lado já existia; só ficava escondida atrás de um campo
-- único "vagas por lado" no formulário. Nada a mudar no banco.
