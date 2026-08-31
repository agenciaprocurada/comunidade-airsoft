import { DESENHO_SIMBOLO } from "../dados/simbolos";
import { FONTE_TEXTO } from "../tema";

/**
 * Um símbolo tático solto no mapa, reproduzindo o Group que o editor
 * monta em `criarSimbolo`: disco de 38 px com a cor da categoria, ícone
 * de 21 px de largura centralizado nele, e o rótulo em caixa alta 9 px
 * à direita. O grupo inteiro é ancorado pelo CENTRO — é assim que a
 * posição vem salva no banco.
 */

const RAIO = 19;
const LADO_ICONE = 21;

export const Marcador: React.FC<{
  x: number;
  y: number;
  escala: number;
  cor: string;
  rotulo: string;
  opacidade?: number;
  /** 1 = tamanho normal. O pulso do respawn mexe só nisto. */
  pulso?: number;
  /** Halo que respira em volta do disco. Só o respawn usa. */
  halo?: number;
}> = ({ x, y, escala, cor, rotulo, opacidade = 1, pulso = 1, halo = 0 }) => {
  const desenho = DESENHO_SIMBOLO[rotulo.toUpperCase()];
  const fatorIcone = desenho ? LADO_ICONE / desenho.caixa[2] : 1;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "flex",
        alignItems: "center",
        gap: 9,
        translate: "-50% -50%",
        scale: escala * pulso,
        opacity: opacidade,
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
        {halo > 0 ? (
          <div
            style={{
              position: "absolute",
              left: 20,
              top: 20,
              width: 40,
              height: 40,
              marginLeft: -20,
              marginTop: -20,
              borderRadius: 999,
              border: `3px solid ${cor}`,
              scale: 1 + halo * 1.6,
              opacity: (1 - halo) * 0.85,
            }}
          />
        ) : null}
        <svg width={40} height={40} viewBox="0 0 40 40">
          <circle cx={20} cy={20} r={RAIO} fill={cor} stroke="rgba(0,0,0,0.7)" strokeWidth={2} />
          {desenho ? (
            <g
              transform={`translate(${20 - (desenho.caixa[2] * fatorIcone) / 2}, ${
                20 - (desenho.caixa[3] * fatorIcone) / 2
              }) scale(${fatorIcone}) translate(${-desenho.caixa[0]}, ${-desenho.caixa[1]})`}
            >
              <path
                d={desenho.path}
                fill="none"
                stroke="#0b0d09"
                strokeWidth={1.8 / fatorIcone}
                strokeLinecap="square"
              />
            </g>
          ) : null}
        </svg>
      </div>

      <span
        style={{
          fontFamily: FONTE_TEXTO,
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: "0.04em",
          color: "#fff",
          textShadow: "0 1px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)",
          lineHeight: 1.13,
        }}
      >
        {rotulo.toUpperCase()}
      </span>
    </div>
  );
};
