# Bug: arrastar a foto de satélite não a leva para o lugar certo

**Arquivo:** `src/scripts/mapa/editor.ts`
**Função culpada:** `travarCobertura()` (≈ linhas 598–626), chamada por `moverBase()` (linha 647)
**Diagnóstico feito ao vivo** instrumentando `CanvasRenderingContext2D.drawImage` no `lower-canvas` do Fabric e gravando os eventos de ponteiro durante um arraste real.

---

## 1. Sintoma

Ao arrastar a foto no modo de enquadramento:

- a foto anda **muito menos** que o mouse;
- às vezes anda **para o lado errado** (mouse para a direita, foto para a esquerda);
- ela "gruda" e não chega no ponto desejado;
- no estado inicial / logo após "Ajustar", ela **não se move nada**.

## 2. O que a medição mostrou

Arraste real capturado (39 quadros, 3,25 s):

| momento | ponteiro (x, y) | centro da foto (dx, dy) relativo ao centro do documento | raio |
|---|---|---|---|
| pointerdown | 573, 308 | 64,6 / 16,0 | **66,5** |
| meio | 664, 411 | 42,7 / 54,2 | **69,0** |
| fim | 664, 372 | 41,7 / 30,2 | **51,4** |

O mouse percorreu **+92 px em X e +103 px em Y**. O centro da foto ficou **preso num raio de ~63–69 px** o tempo inteiro, escorregando pela borda de um círculo — e o `dx` até **diminuiu** (foto indo para a esquerda) enquanto o mouse ia para a direita.

Estado do documento no momento: `ladoBitmap = 1632`, `escala = 0,7944`, documento `1019,7 × 574,8`.

## 3. Causa raiz

`travarCobertura()` exige que **cada canto do documento** esteja dentro de um círculo de raio `ladoBitmap · escala / 2` centrado na foto:

```js
const meiaDiagonal = Math.hypot(this.largura, this.altura) / 2;   // 585,3
const escalaMinima = 2 * meiaDiagonal / this.ladoBitmap;          // 0,7172
const raio = this.ladoBitmap * this.ajusteBase.escala / 2;        // 648,2
// ...para cada canto: se distancia > raio, puxa o centro de volta
```

Três consequências:

**a) O círculo é o inscrito no quadrado da foto.** `raio = lado·escala/2` é metade do lado — joga fora os quatro cantos do quadrado (~21% da área útil). O comentário justifica isso como "válido para QUALQUER rotação", mas **a foto nunca é rotacionada**: na matriz de desenho capturada, `b = c = 0` e `a = d`. A generalidade está sendo paga sem ser usada.

**b) A região permitida para o centro da foto é a interseção dos 4 discos** de raio `raio` centrados nos cantos do documento. Como os cantos estão a `meiaDiagonal` do centro, isso equivale a um disco de raio:

```
folga = raio − meiaDiagonal = 648,2 − 585,3 = 63 px
```

Só **63 px de liberdade**, em qualquer direção, num documento de 1020 px de largura.

**c) No mínimo de escala a liberdade é ZERO.** `escalaMinima = 2·meiaDiagonal/ladoBitmap` faz `raio == meiaDiagonal` exatamente, logo `folga = 0`. É o estado inicial e o estado pós-"Ajustar": **o arraste não faz absolutamente nada** e parece que o app travou.

**d) A inversão de direção vem da projeção.** Estando na borda, o clamp devolve o ponto **radialmente** para dentro. O resultado é que o deslocamento efetivo vira **tangente ao círculo** — direção diferente da do mouse, e com magnitude reduzida. Foi exatamente o que a tabela acima registrou.

## 4. O que NÃO é o problema

O handler de arraste está correto. `mouse:down` (l. 244–279) guarda `clientX/clientY`, `mouse:move` (l. 294–308) faz `(clientX − ultimo.x) / zoom` — conversão de pixel de tela para pixel de documento certa, sem inversão de sinal. `aplicarEncaixeBase()` (l. 631) também está certo. **Todo o erro está no clamp.**

## 5. Correção sugerida

Trocar o círculo pelo retângulo real (a foto é um quadrado alinhado aos eixos):

```js
travarCobertura() {
  if (this.temImagemPropria()) return;

  // A foto nunca é rotacionada: o vínculo certo é o retângulo,
  // não o círculo inscrito. O círculo custava um fator √2 de zoom
  // e praticamente toda a liberdade de arraste.
  const escalaMinima = Math.max(this.largura, this.altura) / this.ladoBitmap;
  if (this.ajusteBase.escala < escalaMinima) this.ajusteBase.escala = escalaMinima;

  const lado = this.ladoBitmap * this.ajusteBase.escala;
  const limiteX = (lado - this.largura) / 2;
  const limiteY = (lado - this.altura)  / 2;

  this.ajusteBase.dx = Math.min(limiteX, Math.max(-limiteX, this.ajusteBase.dx));
  this.ajusteBase.dy = Math.min(limiteY, Math.max(-limiteY, this.ajusteBase.dy));
}
```

Com os números atuais isso passa de "63 px num círculo" para **|dx| ≤ 138 px e |dy| ≤ 361 px**, com X e Y **independentes** — arrastar para a direita passa a mover para a direita. E `escalaMinima` cai de 0,7172 para 0,625: a foto deixa de ser forçada a 41% de zoom a mais do que o necessário (ganho direto de nitidez e de área visível).

Se um dia a foto puder girar, o vínculo correto continua sendo um retângulo — o do documento projetado nos eixos da foto — e não um círculo.

## 6. Problema secundário: performance do arraste

Durante o arraste medi **12 fps** e **~150 chamadas de `drawImage` por quadro** — sendo 4.943 tiles de 256×256 em 39 quadros (~127 por quadro). A grade/textura está sendo redesenhada tile a tile a cada frame.

Mesmo com o clamp corrigido o arraste vai continuar parecendo emborrachado. Vale renderizar a grade uma única vez num canvas offscreen (ou `createPattern`) e desenhá-la como uma imagem só por quadro.

## 7. Como reproduzir a medição

1. Instrumentar `CanvasRenderingContext2D.prototype.drawImage`, filtrando `this.canvas === document.querySelector('canvas.lower-canvas')` e `img.naturalWidth === ladoBitmap`.
2. Gravar `ctx.getTransform()` (`e`, `f` = centro da foto em coordenadas de tela) a cada chamada.
3. Gravar `pointerdown/pointermove/pointerup` com `clientX/clientY`.
4. Comparar `Δ(e, f)` com `Δ(clientX, clientY)` e conferir se `hypot(e − cxDoc, f − cyDoc)` fica travado num valor constante — se ficar, é o clamp.
