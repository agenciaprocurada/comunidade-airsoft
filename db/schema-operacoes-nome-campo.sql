-- ============================================================
-- Nome do campo congelado na operação
--
-- A RLS de `campos` só expõe ficha publicada. Quando um campo sai do
-- ar (vira rascunho ou inativo), o organizador deixa de conseguir ler
-- o nome do campo da PRÓPRIA operação — a tela dizia "Campo removido"
-- para um campo que existe e uma operação que vale.
--
-- Mesma solução já usada em `reivindicacoes.entidade_nome`: o nome
-- fica gravado no momento em que a operação é criada. Se a ficha for
-- renomeada ou despublicada depois, o histórico continua legível.
--
-- `campo_id` segue sendo a fonte para endereço, mapa e contato — isso
-- aqui é só o rótulo.
-- ============================================================

alter table public.operacoes
  add column if not exists campo_nome text;

-- Preenche o que já existe. Roda como postgres, então enxerga
-- inclusive as fichas não publicadas.
update public.operacoes o
   set campo_nome = c.nome
  from public.campos c
 where c.id = o.campo_id
   and o.campo_nome is null;
