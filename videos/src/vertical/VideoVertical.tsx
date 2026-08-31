import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { Abertura } from "./cenas/Abertura";
import { Ferramenta } from "./cenas/Ferramenta";
import { Desenhar } from "./cenas/Desenhar";
import { Simbolos } from "./cenas/Simbolos";
import { Ajustes } from "./cenas/Ajustes";
import { Revelacao } from "./cenas/Revelacao";
import { Chamada } from "./cenas/Chamada";
import { BarraDeProgresso, Rodape, Topo } from "./Moldura";
import { DURACAO, LIMITES, TRILHA, duracaoDe } from "./ritmo";
import { COR } from "../tema";

/**
 * 30 s a 30 fps, 1080x1920, para Reels / TikTok / Shorts.
 *
 * Os cortes são SECOS e caem no compasso (múltiplos de 30 frames a 120
 * BPM). Dissolvência aqui seria erro: o corte no tempo é metade do
 * impacto, e a continuidade fica por conta do mapa — o enquadramento de
 * uma cena termina exatamente onde o da seguinte começa, então o mapa
 * não pula mesmo com o corte.
 *
 * A moldura (progresso, marca, endereço) vive FORA das cenas: ela não
 * pode piscar no corte.
 */
export const VideoVertical: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      {TRILHA ? <Audio src={staticFile(TRILHA)} volume={0.5} /> : null}

      <Sequence name="0-2s · Gancho" from={LIMITES.abertura} durationInFrames={duracaoDe("abertura")}>
        <Abertura />
      </Sequence>

      <Sequence
        name="2-7s · Achar o campo"
        from={LIMITES.ferramenta}
        durationInFrames={duracaoDe("ferramenta")}
      >
        <Ferramenta />
      </Sequence>

      <Sequence
        name="7-13s · Desenhar a área"
        from={LIMITES.desenhar}
        durationInFrames={duracaoDe("desenhar")}
      >
        <Desenhar />
      </Sequence>

      <Sequence
        name="13-17s · 17 símbolos"
        from={LIMITES.simbolos}
        durationInFrames={duracaoDe("simbolos")}
      >
        <Simbolos />
      </Sequence>

      <Sequence
        name="17-21s · Grade e véu"
        from={LIMITES.ajustes}
        durationInFrames={duracaoDe("ajustes")}
      >
        <Ajustes />
      </Sequence>

      <Sequence
        name="21-26s · O campo inteiro"
        from={LIMITES.revelacao}
        durationInFrames={duracaoDe("revelacao")}
      >
        <Revelacao />
      </Sequence>

      <Sequence
        name="26-30s · Chamada"
        from={LIMITES.chamada}
        durationInFrames={duracaoDe("chamada")}
      >
        <Chamada />
      </Sequence>

      {/*
        Moldura: contínua, por cima de tudo. A barra de progresso vai até
        o fim (ela precisa CHEGAR em 100%, senão vira barra quebrada);
        marca e endereço saem na chamada, que traz os dois maiores.
      */}
      <Sequence name="Progresso"  durationInFrames={DURACAO}>
        <BarraDeProgresso />
      </Sequence>
      <Sequence name="Marca"  durationInFrames={LIMITES.chamada}>
        <Topo />
        <Rodape />
      </Sequence>
    </AbsoluteFill>
  );
};

export const DURACAO_VERTICAL = DURACAO;
