import { AbsoluteFill, Sequence } from "remotion";
import { COR } from "../tema";
import { Abertura } from "./cenas/Abertura";
import { Criar } from "./cenas/Criar";
import { Link } from "./cenas/Link";
import { Lista } from "./cenas/Lista";
import { NoDia } from "./cenas/NoDia";
import { Chamada } from "./cenas/Chamada";

/**
 * 22 s a 30 fps = 660 frames, 1920×1080.
 *
 * O roteiro é a semana de quem organiza, na ordem em que ela acontece:
 * abrir a operação, mandar o link, a lista se encher, o portão do
 * campo. A ferramenta não é explicada — ela é usada na frente de quem
 * assiste.
 *
 * As cenas SE SOBREPÕEM em 6 frames de propósito: cada uma nasce
 * transparente por cima da anterior, então a troca é dissolvência e
 * não corte seco. Quem entra depois no `<Sequence>` fica por cima —
 * por isso a ordem aqui é a ordem do roteiro.
 */
export const VideoOperacoes: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <Sequence name="0-2s · Marca"  durationInFrames={66}>
        <Abertura />
      </Sequence>

      <Sequence name="2-8s · Abrir a operação" from={60} durationInFrames={186}>
        <Criar />
      </Sequence>

      <Sequence name="8-12s · O link no grupo" from={240} durationInFrames={126}>
        <Link />
      </Sequence>

      <Sequence name="12-17s · A lista se enche" from={360} durationInFrames={156}>
        <Lista />
      </Sequence>

      <Sequence name="17-20s · No portão do campo" from={510} durationInFrames={96}>
        <NoDia />
      </Sequence>

      <Sequence name="20-22s · Chamada" from={600} durationInFrames={60}>
        <Chamada />
      </Sequence>
    </AbsoluteFill>
  );
};

export const DURACAO_OPERACOES = 660;
