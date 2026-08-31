import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { BarraDeProgresso, Rodape, Topo } from "../../vertical/Moldura";
import { COR } from "../../tema";
import { Chamada, Criar, Gancho, LinkNoGrupo, Lista, NoDia } from "./cenas";
import { DURACAO, LIMITES, TRILHA, duracaoDe } from "./ritmo";

/**
 * 30 s a 30 fps, 1080×1920, para Reels / TikTok / Shorts.
 *
 * Os cortes são SECOS e caem no compasso (múltiplos de 30 frames a 120
 * BPM). Dissolvência aqui seria erro: o corte no tempo é metade do
 * impacto numa tela vertical. A continuidade fica por conta da lista —
 * é a mesma operação, os mesmos nomes e os mesmos números do começo ao
 * fim, então o corte não desorienta.
 *
 * A moldura (progresso, marca, endereço) vive FORA das cenas: ela não
 * pode piscar no corte.
 */
export const VideoOperacoesVertical: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      {TRILHA ? <Audio src={staticFile(TRILHA)} volume={0.5} /> : null}

      <Sequence name="0-2s · Gancho" from={LIMITES.gancho} durationInFrames={duracaoDe("gancho")}>
        <Gancho />
      </Sequence>

      <Sequence name="2-8s · Abrir a operação" from={LIMITES.criar} durationInFrames={duracaoDe("criar")}>
        <Criar />
      </Sequence>

      <Sequence name="8-13s · O link no grupo" from={LIMITES.link} durationInFrames={duracaoDe("link")}>
        <LinkNoGrupo />
      </Sequence>

      <Sequence name="13-21s · A lista se enche" from={LIMITES.lista} durationInFrames={duracaoDe("lista")}>
        <Lista />
      </Sequence>

      <Sequence name="21-26s · No dia do jogo" from={LIMITES.nodia} durationInFrames={duracaoDe("nodia")}>
        <NoDia />
      </Sequence>

      <Sequence name="26-30s · Chamada" from={LIMITES.chamada} durationInFrames={duracaoDe("chamada")}>
        <Chamada />
      </Sequence>

      {/* A barra precisa CHEGAR em 100%, então vai até o último frame;
          marca e endereço saem na chamada, que traz os dois maiores. */}
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
