/**
 * Formulários da área logada — dialeto de PRODUTO do design system.
 *
 * O DS público usa display condensado em caixa alta para quase tudo.
 * Aqui não: rótulo, botão e dado vão em Barlow, escala fixa em rem.
 * Fonte display em rótulo de campo é ruído numa tela de tarefa — a
 * pessoa está preenchendo, não sendo convencida.
 *
 * O que sobrevive do dialeto público: a cor, a borda reta, o oliva no
 * foco e o mono (`font-dado`) em número, data e status.
 */

export const ROTULO_CAMPO =
  "block text-[0.9375rem] font-semibold leading-tight text-tinta";

export const AJUDA_CAMPO = "mt-1 text-[0.8125rem] leading-snug text-texto-2";

const ENTRADA_BASE =
  "mt-2 w-full border bg-papel px-3.5 py-2.5 text-[0.9375rem] text-tinta " +
  "transition-colors duration-150 " +
  // `desabilitado` (#5a6150) em placeholder dá 2,8:1 contra o fundo —
  // ilegível. `texto-2` dá 6,5:1 e continua discreto.
  "placeholder:text-texto-2 " +
  "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 " +
  "focus-visible:outline-oliva-300 " +
  "disabled:cursor-not-allowed disabled:border-borda disabled:bg-desabilitado-bg " +
  "disabled:text-desabilitado";

export const ENTRADA = `${ENTRADA_BASE} border-borda-forte focus:border-oliva-500`;

/** Mesmo campo, sinalizando erro. Usar junto de `aria-invalid`. */
export const ENTRADA_INVALIDA = `${ENTRADA_BASE} border-alerta focus:border-alerta`;

/** `.selecao` (global.css) repõe a seta que o `appearance-none` remove. */
export const SELECAO = `${ENTRADA} selecao appearance-none pr-10`;

export const SELECAO_INVALIDA = `${ENTRADA_INVALIDA} selecao appearance-none pr-10`;

export const ERRO_CAMPO =
  "mt-1.5 flex items-start gap-1.5 text-[0.8125rem] leading-snug text-alerta-texto";

const CAIXA_BASE =
  "h-[1.15rem] w-[1.15rem] shrink-0 accent-oliva-500 " +
  "border border-borda-forte bg-papel";

/** Caixa alinhada ao topo — a linha pode ter duas alturas de texto. */
export const CAIXA = `mt-0.5 ${CAIXA_BASE}`;

/** A mesma caixa dentro de uma etiqueta de uma linha só. */
export const CAIXA_ETIQUETA = CAIXA_BASE;

export const LINHA_CAIXA =
  "flex cursor-pointer items-start gap-3 border border-borda bg-papel/50 px-4 py-3 " +
  "transition-colors duration-150 hover:border-borda-forte hover:bg-oliva-050 " +
  "has-[:checked]:border-oliva-700 has-[:checked]:bg-oliva-050";

/**
 * Etiqueta selecionável — a MESMA linha de caixa, do tamanho do
 * rótulo, para conjuntos longos de escolha múltipla (plataformas,
 * serviços, versões de gearbox).
 *
 * Linha inteira em grade desperdiça tela: quatro colunas com "V2"
 * dentro é caixa vazia. O vocabulário não muda — mesma borda, mesmo
 * tint de marcado, caixa nativa visível —, só a largura acompanha o
 * texto e o conjunto quebra em várias linhas.
 */
export const ETIQUETA_CAIXA =
  "inline-flex cursor-pointer items-center gap-2.5 border border-borda bg-papel/50 " +
  "px-3 py-2 text-[0.9375rem] leading-none text-tinta " +
  "transition-colors duration-150 hover:border-borda-forte hover:bg-oliva-050 " +
  "has-[:checked]:border-oliva-700 has-[:checked]:bg-oliva-050 " +
  "has-[:checked]:text-oliva-100";

/** Título de bloco dentro de uma tela de tarefa. Mesmo peso do Painel. */
export const TITULO_SECAO = "text-[1.0625rem] font-semibold leading-tight text-tinta";

export const ERRO_CAIXA =
  "border border-alerta bg-alerta-bg px-4 py-3 text-[0.9375rem] text-alerta-texto";

/**
 * Botões da área logada. O chanfro e o caixa-alta display do DS público
 * ficam de fora: aqui o botão é um controle, não um CTA de campanha.
 */
const BOTAO_BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 border " +
  "px-4 py-2.5 text-[0.9375rem] font-semibold leading-none " +
  "transition-colors duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oliva-300 " +
  "disabled:cursor-not-allowed disabled:border-borda " +
  "disabled:bg-desabilitado-bg disabled:text-desabilitado";

export const BOTAO_PRIMARIO =
  `${BOTAO_BASE} border-oliva-500 bg-oliva-500 text-fundo hover:border-oliva-400 hover:bg-oliva-400`;

export const BOTAO_SECUNDARIO =
  `${BOTAO_BASE} border-borda-forte bg-transparent text-tinta hover:border-oliva-500 hover:bg-oliva-050 hover:text-oliva-100`;

export const BOTAO_PERIGO =
  `${BOTAO_BASE} border-alerta bg-transparent text-alerta-texto hover:bg-alerta-bg`;

/**
 * Botão do painel de réplicas: caixa com contorno e ícone, no
 * vocabulário de HUD. Menor e mais discreto que o botão de formulário
 * — são ações de item, não a ação principal da tela.
 */
export const BOTAO_HUD =
  "inline-flex cursor-pointer items-center gap-2 border border-borda-forte bg-transparent " +
  "px-3 py-2 text-[0.8125rem] font-semibold leading-none text-texto " +
  "transition-colors duration-150 hover:border-hud/60 hover:bg-hud/[0.06] hover:text-hud " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hud";

/** Ação discreta dentro de uma linha de lista. Sem borda, sem peso. */
export const BOTAO_TEXTO =
  "cursor-pointer text-[0.8125rem] font-semibold text-texto-2 " +
  "transition-colors duration-150 hover:text-oliva-300 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oliva-300";
