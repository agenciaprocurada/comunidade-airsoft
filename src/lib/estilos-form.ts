/**
 * Classes de formulario do DS. Ficam aqui, e nao repetidas em cada
 * pagina, para que cadastro e edicao nunca divirjam visualmente.
 */

export const ROTULO_CAMPO =
  "block font-display text-base font-bold uppercase tracking-[0.08em] text-tinta";

export const AJUDA_CAMPO = "mt-1 text-sm leading-snug text-texto-2";

export const ENTRADA =
  "mt-2 w-full border border-borda-forte bg-papel px-4 py-3 text-[17px] text-tinta " +
  "placeholder:text-desabilitado focus:border-oliva-500 focus:outline-none " +
  "focus-visible:outline-2 focus-visible:outline-oliva-300";

export const SELECAO = ENTRADA + " appearance-none";

export const CAIXA =
  "mt-1 h-5 w-5 shrink-0 accent-oliva-500 border border-borda-forte bg-papel";

export const LINHA_CAIXA =
  "flex cursor-pointer items-start gap-3 border border-borda bg-papel/40 p-4 " +
  "hover:border-borda-forte";

export const ERRO_CAIXA =
  "border border-alerta bg-alerta-bg px-4 py-3 text-alerta-texto";
