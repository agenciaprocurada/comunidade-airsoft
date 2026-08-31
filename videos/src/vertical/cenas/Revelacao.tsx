import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Documento } from "../../componentes/Documento";
import { Janela, ESCALA_INTEIRO } from "../Janela";
import { ENQ } from "../enquadramentos";
import { Legenda } from "../Moldura";
import { FIM_SIMBOLOS, PECAS, Pecas } from "../pecas";
import { COR, FONTE_DADO } from "../../tema";

/**
 * 21–26 s — o plano abre e o campo inteiro se monta.
 *
 * É o pagamento: até aqui só se viu um pedaço ampliado. A câmera recua
 * de 1,56 para 0,84 (o documento inteiro na largura da tela) enquanto
 * as peças que faltam caem uma a uma. Recuar E montar ao mesmo tempo,
 * não em sequência — separado, viram dois momentos mornos.
 */

/** Frame em que cada peça restante assenta. Uma a cada 8 frames. */
const CHEGADAS = [16, 24, 32, 40, 48, 56, 66, 76];

export const Revelacao: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <Janela
        escala={interpolate(frame, [8, 88], [ENQ.ajustesFim.escala, ESCALA_INTEIRO], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.36, 0, 0.12, 1),
        })}
        centro={ENQ.ajustesFim.centro}
      >
        <Documento>
          <Pecas
            frame={frame}
            aparicaoDe={(i) => {
              if (i <= FIM_SIMBOLOS) return 1;
              const chegada = CHEGADAS[i - FIM_SIMBOLOS - 1];
              if (chegada === undefined) return 0;
              return interpolate(frame, [chegada, chegada + 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
            }}
          />
        </Documento>
      </Janela>

      {/*
        Identificação do mapa, na faixa de cima.

        Quando a câmera recua, o documento 16:9 deixa duas faixas vazias
        dentro da janela quase quadrada — é geometria, não erro. Em vez
        de fingir que não existem, elas viram a moldura da ficha: nome do
        mapa em cima, camadas e formatos de saída embaixo.
      */}
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 320,
          width: 952,
          textAlign: "center",
          opacity: interpolate(frame, [44, 60], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            fontFamily: FONTE_DADO,
            fontSize: 26,
            textTransform: "uppercase",
            letterSpacing: "0.28em",
            color: COR.oliva300,
            marginBottom: 14,
          }}
        >
          Bengazi — Operação Fênix
        </div>
        <div
          style={{
            fontFamily: FONTE_DADO,
            fontSize: 24,
            letterSpacing: "0.14em",
            color: COR.texto2,
          }}
        >
          10 × 10 setores · 2 respawns · zoom 19
        </div>
      </div>

      {/* Contador de camadas: dá número à coisa que acabou de acontecer. */}
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 1268,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "16px 26px",
          backgroundColor: "rgba(11,13,9,0.9)",
          border: `1px solid ${COR.oliva700}`,
          opacity: interpolate(frame, [18, 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span
          style={{
            fontFamily: FONTE_DADO,
            fontSize: 26,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: COR.oliva300,
          }}
        >
          Camadas
        </span>
        <span style={{ fontFamily: FONTE_DADO, fontSize: 30, color: COR.tinta }}>
          {Math.min(
            PECAS.length,
            FIM_SIMBOLOS + 1 + CHEGADAS.filter((c) => frame >= c + 12).length,
          )}
        </span>
      </div>

      {/* Formatos de saída — a última dúvida antes de experimentar. */}
      <div
        style={{
          position: "absolute",
          right: 64,
          top: 1268,
          display: "flex",
          gap: 12,
          opacity: interpolate(frame, [104, 118], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {["Exportar PNG", "PDF / Imprimir"].map((f) => (
          <span
            key={f}
            style={{
              padding: "16px 24px",
              backgroundColor: "rgba(11,13,9,0.9)",
              border: `1px solid ${COR.bordaForte}`,
              fontFamily: FONTE_DADO,
              fontSize: 24,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: COR.texto,
            }}
          >
            {f}
          </span>
        ))}
      </div>

      <Legenda kicker="Seu campo inteiro" titulo="Pronto para imprimir" entrada={6} />
    </AbsoluteFill>
  );
};
