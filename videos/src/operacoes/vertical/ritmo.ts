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

export const DURACAO = 900; // 30 s

export const TRILHA: string | null = "guia-120bpm.mp3";

/**
 * Onde cada cena começa. O último valor é o fim do vídeo.
 *
 * O total continua em 900 frames mesmo com a cena do "confirmar" — o
 * vertical vive de 30 s, e a barra de progresso da moldura é calculada
 * sobre essa duração. Entrou cena nova, as outras encolheram.
 */
export const LIMITES = {
  gancho: 0,
  criar: 60,
  link: 210,
  confirmar: 330,
  lista: 480,
  nodia: 690,
  chamada: 810,
  fim: 900,
} as const;

export const duracaoDe = (cena: keyof typeof LIMITES) => {
  const chaves = Object.keys(LIMITES) as (keyof typeof LIMITES)[];
  const i = chaves.indexOf(cena);
  return LIMITES[chaves[i + 1]] - LIMITES[cena];
};
