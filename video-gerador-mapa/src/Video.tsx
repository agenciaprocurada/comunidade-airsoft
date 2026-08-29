import { AbsoluteFill, Sequence } from "remotion";
import { Abertura } from "./cenas/Abertura";
import { CriarArea } from "./cenas/CriarArea";
import { Reposicionar } from "./cenas/Reposicionar";
import { Revelacao } from "./cenas/Revelacao";
import { Chamada } from "./cenas/Chamada";
import { COR } from "./tema";

/**
 * 15 s a 30 fps = 450 frames. As marcas do roteiro caem exatamente em
 * 0, 2, 8, 10 e 13 s.
 *
 * As cenas SE SOBREPÕEM em 6 frames de propósito: cada uma nasce
 * transparente e cresce por cima da anterior, então a troca é uma
 * dissolvência e não um corte seco. Quem entra depois no `<Sequence>`
 * fica por cima — por isso a ordem aqui é a ordem do roteiro.
 */
export const VideoGeradorMapa: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <Sequence name="0-2s · Marca" from={0} durationInFrames={66}>
        <Abertura />
      </Sequence>

      <Sequence name="2-8s · Criar área de respawn" from={60} durationInFrames={186}>
        <CriarArea />
      </Sequence>

      <Sequence name="8-10s · Reposicionar satélite" from={240} durationInFrames={66}>
        <Reposicionar />
      </Sequence>

      <Sequence name="10-13s · O campo aparece" from={300} durationInFrames={96}>
        <Revelacao />
      </Sequence>

      <Sequence name="13-15s · Chamada" from={390} durationInFrames={60}>
        <Chamada />
      </Sequence>
    </AbsoluteFill>
  );
};
