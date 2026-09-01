import { AbsoluteFill, Sequence } from "remotion";
import { COR } from "../tema";
import { Link } from "./cenas/Link";
import { Confirmar } from "./cenas/Confirmar";
import { Lista } from "./cenas/Lista";
import { Espera } from "./cenas/Espera";
import { NoDia } from "./cenas/NoDia";
import { Chamada } from "./cenas/Chamada";

/**
 * 20 s a 30 fps = 600 frames, 1920×1080. O vídeo do bloco da landing.
 *
 * POR QUE ESTE ROTEIRO, e não o cronológico do produto:
 *
 * 1. Não abre com logo. Marca no primeiro frame é o jeito mais rápido
 *    de perder quem ainda não tem motivo para se importar com ela — e
 *    aqui a marca já está na página inteira em volta do player.
 * 2. Não mostra o formulário de criação. Preencher formulário é CUSTO,
 *    não benefício; a promessa "em 1 minuto" fecha o vídeo e vale mais
 *    do que seis segundos vendo alguém digitar.
 * 3. Não repete a dor. Quem está aqui já leu o hero logo acima. Este
 *    vídeo é PROVA; o gancho de dor é trabalho do 9:16, que pega
 *    público frio.
 * 4. A lista de espera virou cena inteira, com três batidas. É a única
 *    coisa que a ferramenta faz e o bloco de notas não faz de jeito
 *    nenhum — antes passava em um segundo.
 *
 * As cenas se sobrepõem em 6 frames: a troca é dissolvência, não corte.
 */
export const VideoOperacoes: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <Sequence name="0-3s · O link no grupo" durationInFrames={90}>
        <Link />
      </Sequence>

      <Sequence name="3-7s · Ele abre e confirma" from={84} durationInFrames={120}>
        <Confirmar />
      </Sequence>

      <Sequence name="7-11s · A lista se escreve" from={198} durationInFrames={120}>
        <Lista />
      </Sequence>

      <Sequence name="11-14s · Lotou, a fila anda" from={312} durationInFrames={90}>
        <Espera />
      </Sequence>

      <Sequence name="14-18s · No portão do campo" from={396} durationInFrames={120}>
        <NoDia />
      </Sequence>

      <Sequence name="18-20s · Chamada" from={510} durationInFrames={90}>
        <Chamada />
      </Sequence>
    </AbsoluteFill>
  );
};

export const DURACAO_OPERACOES = 600;
