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

export const DURACAO = 1560; // 52 s

export const TRILHA: string | null = "guia-120bpm.mp3";

/**
 * Onde cada cena começa. O último valor é o fim do vídeo.
 *
 * 52 s, e o ritmo é lento de propósito: a versão de 26 s passava por
 * seis funcionalidades e o espectador via movimento, não entendia o
 * produto. Aqui cada tela fica tempo suficiente para ser LIDA.
 *
 * A abertura NÃO mostra o produto: são 10 segundos de dor (o anúncio
 * da operação no grupo, a lista numerada na mão e as mesmas perguntas
 * de sempre), porque quem não sente o problema não vê valor na
 * solução. Só depois disso a marca aparece.
 */
export const LIMITES = {
  dor: 0,
  apresentacao: 300,
  criar: 420,
  link: 600,
  confirmar: 840,
  lista: 1020,
  espera: 1170,
  dia: 1320,
  chamada: 1470,
  fim: 1560,
} as const;

export const duracaoDe = (cena: keyof typeof LIMITES) => {
  const chaves = Object.keys(LIMITES) as (keyof typeof LIMITES)[];
  const i = chaves.indexOf(cena);
  return LIMITES[chaves[i + 1]] - LIMITES[cena];
};
