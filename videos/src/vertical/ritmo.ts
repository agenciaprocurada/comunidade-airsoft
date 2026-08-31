/**
 * O relógio do vídeo vertical.
 *
 * Tudo aqui é derivado do andamento da trilha. Cortar fora do compasso
 * é o que faz um vídeo de rede social parecer amador mesmo quando as
 * imagens estão boas — então nenhuma cena começa num frame solto: todas
 * começam num múltiplo de meia-compasso.
 *
 * TROCAR A TRILHA: mude `BPM` para o andamento da faixa nova e confira
 * `LIMITES` (cada valor precisa continuar múltiplo de `MEIO_COMPASSO`).
 * A batida-guia em public/ é metrônomo, não música — ver
 * scripts/gerar-batida-guia.mjs.
 */

export const FPS = 30;
export const BPM = 120;

export const BATIDA = (FPS * 60) / BPM; // 15 frames
export const COMPASSO = BATIDA * 4; // 60 frames = 2 s
export const MEIO_COMPASSO = COMPASSO / 2; // 30 frames

export const DURACAO = 900; // 30 s

/**
 * A faixa que toca por baixo.
 *
 * `null` = vídeo mudo. Aponte para o arquivo em public/ quando tiver a
 * trilha definitiva; o `guia-120bpm.mp3` serve só para ver se o corte
 * cai no tempo.
 */
export const TRILHA: string | null = "guia-120bpm.mp3";

/** Onde cada cena começa. O último valor é o fim do vídeo. */
export const LIMITES = {
  abertura: 0,
  ferramenta: 60,
  desenhar: 210,
  simbolos: 390,
  ajustes: 510,
  revelacao: 630,
  chamada: 780,
  fim: 900,
} as const;

export const duracaoDe = (cena: keyof typeof LIMITES) => {
  const chaves = Object.keys(LIMITES) as (keyof typeof LIMITES)[];
  const i = chaves.indexOf(cena);
  return LIMITES[chaves[i + 1]] - LIMITES[cena];
};
