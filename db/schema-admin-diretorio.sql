-- ============================================================
-- Comunidade Airsoft — o administrador edita o diretorio
--
-- Ate aqui NENHUMA das tres tabelas do diretorio tinha policy de
-- update: campo, loja e armeiro so entravam por carga de planilha ou
-- auto-cadastro, e corrigir qualquer coisa exigia SQL na mao.
--
-- Duas decisoes que este arquivo trava:
--
-- 1. SO ADMIN EDITA, E POR ENQUANTO SO ELE. Dono aprovado de ficha
--    (reivindicacao) NAO entra aqui ainda: ele edita a propria ficha
--    quando essa tela existir, com um conjunto menor de campos. Abrir
--    update para dono agora, sem essa tela, seria dar a chave sem a
--    porta.
--
-- 2. `id` NAO MUDA. Ele e o slug da URL publica
--    (/campos/rs/gravatai/arena-insba-airsoft). Trocar o id quebraria
--    todo link ja compartilhado e todo resultado no Google. Um gatilho
--    devolve o valor antigo em vez de deixar passar.
--
-- IMPORTANTE: a ficha publica e gerada no BUILD. O que o admin salva
-- aqui corrige o banco na hora, mas so aparece no site no proximo
-- deploy. A tela avisa isso; nao ha como contornar sem transformar o
-- diretorio inteiro em pagina dinamica.
--
-- Aplicar DEPOIS de schema.sql, schema-lojas.sql, schema-armeiros.sql
-- e schema-reivindicacoes.sql (usa `e_admin`).
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array['campos','lojas','armeiros'] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_edita', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (public.e_admin()) with check (public.e_admin())',
      t || '_admin_edita', t);

    -- Leitura tambem: sem isso o admin nao enxerga rascunho e inativo,
    -- que sao justamente as fichas que precisam de conserto.
    execute format('drop policy if exists %I on public.%I', t || '_admin_le_tudo', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (public.e_admin())',
      t || '_admin_le_tudo', t);
  end loop;
end $$;

/**
 * `id` e o endereco publico da ficha. Nao muda.
 *
 * Fica em gatilho e nao na tela porque a tela e uma so para tres
 * tabelas: um campo esquecido no formulario viraria link quebrado sem
 * ninguem perceber.
 */
create or replace function public.travar_id_do_diretorio()
returns trigger
language plpgsql
as $$
begin
  if new.id is distinct from old.id then
    new.id := old.id;
  end if;
  return new;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['campos','lojas','armeiros'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_trava_id', t);
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.travar_id_do_diretorio()',
      t || '_trava_id', t);
  end loop;
end $$;

/**
 * Marcar como verificado exige a data da conferencia.
 *
 * O selo "verificado" e a promessa central do diretorio (PRODUCT.md,
 * "admitir a incerteza"): sem data, a ficha diz que foi conferida sem
 * dizer quando, que e pior do que nao dizer nada. `campos` ja tinha
 * esse check; aqui as tres passam a preencher a data sozinhas.
 */
create or replace function public.datar_verificacao()
returns trigger
language plpgsql
as $$
begin
  if new.verificado and not coalesce(old.verificado, false)
     and new.verificado_em is null then
    new.verificado_em := current_date;
  end if;

  if not new.verificado then
    new.verificado_em := null;
  end if;

  return new;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['campos','lojas','armeiros'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_data_verificacao', t);
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.datar_verificacao()',
      t || '_data_verificacao', t);
  end loop;
end $$;
