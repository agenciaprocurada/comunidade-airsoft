import { Img, staticFile } from "remotion";
import { BaseSatelite } from "./BaseSatelite";
import { Grade } from "./Grade";
import { DOC, ENQUADRAMENTO, VEU } from "../dados/mapa";
import { FONTE_DADO, FONTE_TEXTO } from "../tema";

/**
 * O documento do mapa: 1280x720, exatamente como está salvo.
 *
 * A ordem das camadas é a do editor e não é negociável — satélite, véu,
 * grade, desenho, enfeites. Véu antes da grade porque linha fina de
 * grade sobre telhado branco simplesmente some; enfeites por último
 * porque escala e norte precisam ser lidos por cima de tudo.
 *
 * A base é um quadrado de 1632 px girado 59° em volta do centro — o
 * mesmo `lado` que `carregarBase()` calcula para este documento nesta
 * rotação. Mexer nisso desalinha o desenho do terreno.
 */
export const Documento: React.FC<{
  /** Zoom extra sobre a foto, por cima do encaixe salvo. */
  escalaExtra?: number;
  deslocamento?: { dx: number; dy: number };
  /** 0 a 1: o quanto da grade já foi desenhada. */
  grade?: number;
  /** Colunas/linhas/opacidade da grade, quando a cena mexe nos controles. */
  colunas?: number;
  linhas?: number;
  opacidadeGrade?: number;
  /** Força do véu. Sobrescreve o valor salvo quando a cena o demonstra. */
  veu?: number;
  /** 0 a 1: escala, rosa dos ventos, marca e crédito. */
  enfeites?: number;
  children?: React.ReactNode;
}> = ({
  escalaExtra = 1,
  deslocamento = { dx: 0, dy: 0 },
  grade = 1,
  colunas,
  linhas,
  opacidadeGrade,
  veu = VEU,
  enfeites = 1,
  children,
}) => {
  return (
    <div
      style={{
        position: "relative",
        width: DOC.largura,
        height: DOC.altura,
        overflow: "hidden",
        backgroundColor: "#070a06",
      }}
    >
      <BaseSatelite
        camada="z19"
        style={{
          translate: `${deslocamento.dx}px ${deslocamento.dy}px`,
          rotate: `${ENQUADRAMENTO.rotacao}deg`,
          scale: ENQUADRAMENTO.escalaBase * escalaExtra,
        }}
      />

      {/* Véu: satélite cru é claro e ruidoso demais para desenho fino. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: `rgba(6,8,5,${veu})`,
        }}
      />

      <Grade
        progresso={grade}
        colunas={colunas}
        linhas={linhas}
        opacidade={opacidadeGrade}
      />

      {children}

      {/* ----- Enfeites ----- */}
      <div style={{ position: "absolute", inset: 0, opacity: enfeites, pointerEvents: "none" }}>
        {/* Barra de escala. 50 m = 193 px neste enquadramento (zoom 19,
            lat -29.83) — o mesmo que `barraDeEscala` devolve. */}
        <div
          style={{
            position: "absolute",
            left: 38,
            top: 676,
            width: 209,
            height: 32,
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
        />
        <svg style={{ position: "absolute", left: 0, top: 0 }} width={DOC.largura} height={DOC.altura}>
          <line x1={46} y1={696} x2={239} y2={696} stroke="#fff" strokeWidth={3} />
          <line x1={46} y1={690} x2={46} y2={700} stroke="#fff" strokeWidth={3} />
          <line x1={239} y1={690} x2={239} y2={700} stroke="#fff" strokeWidth={3} />
          <text x={46} y={677} dominantBaseline="hanging" fontFamily={FONTE_DADO} fontSize={13} fill="#fff">
            50 m
          </text>
        </svg>

        {/* Rosa dos ventos. Gira -59° para continuar apontando o norte
            de verdade: a foto foi girada 59° para alinhar o campo. */}
        <div
          style={{
            position: "absolute",
            left: 1242,
            top: 122,
            translate: "-50% -50%",
            rotate: `${-ENQUADRAMENTO.rotacao}deg`,
          }}
        >
          <svg width={40} height={56} viewBox="-20 -20 40 56">
            <polygon
              points="0,-16 7,10 0,5 -7,10"
              fill="#fff"
              stroke="rgba(0,0,0,0.8)"
              strokeWidth={1.5}
            />
            <text
              x={0}
              y={20}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={FONTE_DADO}
              fontSize={13}
              fill="#fff"
            >
              N
            </text>
          </svg>
        </div>

        {/* Marca d'água: canto superior direito, 42 px, 30%. */}
        <Img
          src={staticFile("logo.webp")}
          style={{
            position: "absolute",
            right: 10,
            top: 40,
            height: 42,
            width: "auto",
            opacity: 0.3,
            filter: "brightness(0) invert(1)",
          }}
        />

        <span
          style={{
            position: "absolute",
            right: 8,
            bottom: 5,
            fontFamily: FONTE_TEXTO,
            fontSize: 11,
            color: "rgba(255,255,255,0.82)",
            textShadow: "0 1px 3px rgba(0,0,0,0.9)",
          }}
        >
          Imagem: Esri, Maxar, Earthstar Geographics
        </span>
      </div>
    </div>
  );
};
