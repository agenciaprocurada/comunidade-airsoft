import { ESCALA_INTEIRO } from "./Janela";

/**
 * O passeio da câmera pelo documento, cena a cena.
 *
 * Duas regras seguram todos estes números:
 *
 * 1. **Nada abaixo de 1,556.** É a escala em que o documento cobre a
 *    janela inteira (1120 / 720). Abaixo dela sobra tarja em cima e
 *    embaixo — o que só é aceitável na revelação, onde a tarja É o
 *    efeito de abrir o plano.
 * 2. **O centro não pode chegar na borda do documento.** A janela mostra
 *    `1080/escala` px de largura; com escala 1,62 são 667, então o
 *    centro tem que ficar entre x=333 e x=947, senão aparece vazio ao
 *    lado do mapa. Foi por isso que a área de respawn (centro em 1046)
 *    é enquadrada com o centro em 900, e não nela mesma.
 *
 * O fim de uma cena é sempre o início da seguinte: os cortes são secos,
 * no compasso, e a continuidade do mapa é o que os torna invisíveis.
 */

export const ENQ = {
  aberto: { escala: ESCALA_INTEIRO, centro: { x: 640, y: 360 } },
  ferramentaInicio: { escala: 1.85, centro: { x: 780, y: 360 } },
  desenhar: { escala: 1.62, centro: { x: 900, y: 360 } },
  simbolosFim: { escala: 1.58, centro: { x: 700, y: 360 } },
  ajustesFim: { escala: 1.56, centro: { x: 640, y: 360 } },
} as const;
