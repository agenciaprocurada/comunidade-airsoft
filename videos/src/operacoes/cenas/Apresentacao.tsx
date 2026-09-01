import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { COR, FONTE_DADO, FONTE_DISPLAY } from "../../tema";
import { Chip, GradeTatica } from "../pecas";

/**
 * A apresentação — 4 s, entre a dor e a demonstração.
 *
 * É o único ponto do vídeo em que a marca ocupa a tela inteira, e ela
 * só ganha esse direito DEPOIS de a pessoa ter reconhecido o problema.
 * Antes disso, logo em tela cheia é interrupção.
 *
 * A frase é a que o dono do produto escreveu: "com o Organizador de
 * Operações gratuito da Comunidade Airsoft você pode tornar sua vida
 * mais fácil — veja como". O "veja como" é uma promessa de continuidade
 * e existe para segurar quem estava prestes a rolar o dedo.
 */

const SELOS = ["Grátis", "Sem taxa", "O dinheiro é seu"];

export const Apresentacao: React.FC<{
  /** Tamanhos e posições mudam entre 16:9 e 9:16. */
  logo?: number;
  titulo?: number;
  centroY?: number;
}> = ({ logo = 120, titulo = 88, centroY = 0.5 }) => {
  const frame = useCurrentFrame();

  const surge = (inicio: number, duracao = 16) =>
    interpolate(frame, [inicio, inicio + duracao], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });

  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <GradeTatica opacidade={0.55} />

      {/* O clarão nasce com a frase e cresce até o fim da cena: a tela
          "acende" quando a solução aparece, logo depois de 10 s de
          problema em tela escura. */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(56% 48% at 50% 48%, rgba(125,145,57,0.32) 0%, rgba(11,13,9,0) 72%)",
          opacity: surge(0, 30),
        }}
      />

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          paddingBottom: `${(0.5 - centroY) * 200}%`,
        }}
      >
        <Img
          src={staticFile("logo.webp")}
          style={{
            height: logo,
            width: "auto",
            filter: "brightness(0) invert(1)",
            opacity: surge(0),
            scale: interpolate(surge(0, 26), [0, 1], [0.92, 1], { output: "perceptual-scale" }),
          }}
        />

        <div
          style={{
            marginTop: 30,
            fontFamily: FONTE_DISPLAY,
            fontWeight: 700,
            fontSize: titulo,
            lineHeight: 0.98,
            textTransform: "uppercase",
            textAlign: "center",
            color: COR.tinta,
            opacity: surge(8),
            translate: `0 ${interpolate(surge(8), [0, 1], [20, 0])}px`,
          }}
        >
          Organizador de operações
          <br />
          <span style={{ color: COR.oliva300 }}>da Comunidade Airsoft</span>
        </div>

        <div
          style={{
            marginTop: 26,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 12,
          }}
        >
          {SELOS.map((selo, i) => (
            <span key={selo} style={{ opacity: surge(18 + i * 5, 12) }}>
              <Chip tom="oliva" tamanho={Math.round(titulo * 0.26)} marcavel>
                {selo}
              </Chip>
            </span>
          ))}
        </div>

        <div
          style={{
            marginTop: 34,
            fontFamily: FONTE_DADO,
            fontSize: Math.round(titulo * 0.36),
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            textAlign: "center",
            color: COR.texto,
            opacity: surge(38, 14),
          }}
        >
          Sua vida mais fácil.
          <br />
          <span style={{ color: COR.latao }}>Veja como.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
