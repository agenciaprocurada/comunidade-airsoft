/**
 * Física da calculadora de FPS.
 *
 * Um módulo só, sem dependência de DOM, para que a página (no build) e o
 * script do navegador façam a MESMA conta. A tabela estática que o Google
 * indexa e o número que aparece quando a pessoa digita saem daqui.
 *
 * A base é uma fórmula só: energia cinética E = ½ · m · v².
 *  - m em quilogramas (a BB é vendida em gramas: 0.20 g = 0.0002 kg);
 *  - v em metros por segundo (FPS é pé por segundo: 1 pé = 0,3048 m);
 *  - E sai em joules.
 *
 * Toda conversão "de um peso para outro" assume que a energia da réplica
 * não muda com a BB. É verdade para AEG e springer (mola). Em GBB e HPA a
 * BB pesada pode SUBIR a energia (o chamado joule creep) — a calculadora
 * avisa isso na tela, e a conta continua servindo de referência.
 */

/** Um pé em metros — a única constante de conversão da página. */
export const PE_EM_METROS = 0.3048;

/** Peso de referência universal da cronagem. */
export const PESO_REFERENCIA = 0.2;

/** Pesos vendidos no Brasil, em gramas, do mais leve ao mais pesado. */
export const PESOS_BB = [0.2, 0.23, 0.25, 0.28, 0.3, 0.32, 0.36, 0.4, 0.43, 0.45];

/** Limites de entrada: fora disso o número é erro de digitação, não tiro. */
export const LIMITES = {
  fps: { min: 1, max: 1500 },
  joules: { min: 0.01, max: 20 },
  bb: { min: 0.1, max: 1 },
};

export const fpsParaMs = (fps: number) => fps * PE_EM_METROS;
export const msParaFps = (ms: number) => ms / PE_EM_METROS;

/** Energia (J) de uma BB de `gramas` saindo a `fps`. */
export function joulesDe(fps: number, gramas: number): number {
  const v = fpsParaMs(fps);
  return 0.5 * (gramas / 1000) * v * v;
}

/** Velocidade (FPS) que uma BB de `gramas` atinge com `joules` de energia. */
export function fpsDe(joules: number, gramas: number): number {
  return msParaFps(Math.sqrt((2 * joules) / (gramas / 1000)));
}

/**
 * Faixas COMUNS de limite nos campos brasileiros, em FPS com BB 0.20 g.
 * Não é regra nacional: cada campo publica o seu. Os valores repetem o
 * guia /guias/o-que-e-fps-no-airsoft — mudou lá, muda aqui.
 */
export const CATEGORIAS = [
  { nome: "CQB / indoor", ate: 350 },
  { nome: "Fuzil de assalto (AEG)", ate: 400 },
  { nome: "DMR", ate: 500 },
  { nome: "Sniper bolt action", ate: 550 },
] as const;

/** Em qual faixa comum a energia cai, medida como FPS com BB 0.20 g. */
export function categoriaDe(joules: number): string {
  const fpsRef = fpsDe(joules, PESO_REFERENCIA);
  const faixa = CATEGORIAS.find((c) => fpsRef <= c.ate + 0.5);
  return faixa ? faixa.nome : "Acima do que a maioria dos campos aceita";
}

/** Número em português: vírgula decimal, casas fixas. */
export function formatar(n: number, casas = 2): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/** "0.20 g" — o peso sempre com duas casas e ponto, como vem no pote. */
export const rotuloPeso = (gramas: number) => `${gramas.toFixed(2)} g`;
