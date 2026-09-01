import { AbsoluteFill, Sequence } from "remotion";
import { COR } from "../tema";
import { Abertura } from "./cenas/Abertura";
import { Criar } from "./cenas/Criar";
import { Link } from "./cenas/Link";
import { Confirmar } from "./cenas/Confirmar";
import { Lista } from "./cenas/Lista";
import { NoDia } from "./cenas/NoDia";
import { Chamada } from "./cenas/Chamada";

/**
 * 26 s a 30 fps = 780 frames, 1920×1080.
 *
 * O roteiro é a semana de quem organiza, na ordem em que ela acontece:
 * abrir a operação, mandar o link no grupo, alguém abrir esse link e
 * confirmar, a lista se encher, o portão do campo. A ferramenta não é
 * explicada — ela é usada na frente de quem assiste.
 *
 * A cena do "Confirmar" existe porque sem ela o vídeo pedia um ato de
 * fé: o link saía do painel e a lista aparecia cheia, sem mostrar
 * ninguém entrando. É o único momento em que a tela é do JOGADOR, e
 * não do organizador.
 *
 * As cenas SE SOBREPÕEM em 6 frames de propósito: cada uma nasce
 * transparente por cima da anterior, então a troca é dissolvência e
 * não corte seco. Quem entra depois no `<Sequence>` fica por cima —
 * por isso a ordem aqui é a ordem do roteiro.
 */
export const VideoOperacoes: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <Sequence name="0-2s · Marca" durationInFrames={66}>
        <Abertura />
      </Sequence>

      <Sequence name="2-8s · Abrir a operação" from={60} durationInFrames={186}>
        <Criar />
      </Sequence>

      <Sequence name="8-12s · O link no grupo" from={240} durationInFrames={126}>
        <Link />
      </Sequence>

      <Sequence name="12-16s · Ele abre e confirma" from={360} durationInFrames={126}>
        <Confirmar />
      </Sequence>

      <Sequence name="16-21s · A lista se enche" from={480} durationInFrames={156}>
        <Lista />
      </Sequence>

      <Sequence name="21-24s · No portão do campo" from={630} durationInFrames={96}>
        <NoDia />
      </Sequence>

      <Sequence name="24-26s · Chamada" from={720} durationInFrames={60}>
        <Chamada />
      </Sequence>
    </AbsoluteFill>
  );
};

export const DURACAO_OPERACOES = 780;
