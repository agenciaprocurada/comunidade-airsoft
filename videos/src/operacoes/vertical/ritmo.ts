/**
 * O relógio do 9:16 do Organizador de Operações.
 *
 * Mesmo andamento do vertical do criador de mapas (120 BPM, 30 fps),
 * porque a trilha é a mesma família: cortar fora do compasso é o que
 * faz um vídeo de rede social parecer amador mesmo com boas imagens.
 * Todo limite abaixo é múltiplo de `MEIO_COMPASSO` — se você mexer em
 * um, confira essa conta antes de renderizar.
 *
 * TROCAR A TRILHA: `TRILHA` aponta para um arquivo em public/.
 * `guia-120bpm.mp3` é metrônomo (scripts/gerar-batida-guia.mjs), serve
 * só para conferir o corte. `null` deixa o vídeo mudo.
 */

export const FPS = 30;
export const BPM = 120;

export const BATIDA = (FPS * 60) / BPM; // 15 frames
export const COMPASSO = BATIDA * 4; // 60 frames = 2 s
export const MEIO_COMPASSO = COMPASSO / 2; // 30 frames

export const DURACAO = 780; // 26 s

export const TRILHA: string | null = "guia-120bpm.mp3";

/**
 * Onde cada cena começa. O último valor é o fim do vídeo.
 *
 * 26 s. A cena de abertura NÃO mostra o produto: são 4 segundos de
 * dor (a lista no bloco de notas e as mesmas perguntas de sempre),
 * porque quem não sente o problema não vê valor na solução — e num
 * vídeo de rede social os dois primeiros segundos são os únicos
 * garantidos.
 */
export const LIMITES = {
  dor: 0,
  link: 120,
  confirmar: 210,
  lista: 330,
  espera: 450,
  dia: 540,
  chamada: 660,
  fim: 780,
} as const;

export const duracaoDe = (cena: keyof typeof LIMITES) => {
  const chaves = Object.keys(LIMITES) as (keyof typeof LIMITES)[];
  const i = chaves.indexOf(cena);
  return LIMITES[chaves[i + 1]] - LIMITES[cena];
};
