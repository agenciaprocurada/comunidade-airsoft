import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { Rodape, Topo } from "../../vertical/Moldura";
import { COR } from "../../tema";
import {
  Chamada,
  ConfirmarNoCelular,
  Dor,
  EsperaNaFila,
  LinkNoGrupo,
  Lista,
  NoDia,
} from "./cenas";
import { DURACAO, LIMITES, TRILHA, duracaoDe } from "./ritmo";

/**
 * 26 s a 30 fps, 1080×1920, para Reels / TikTok / Shorts.
 *
 * O ROTEIRO, e por que ele é assim:
 *
 * 1. Abre na DOR, não na marca. Quem não sente o problema não vê valor
 *    na solução, e os dois primeiros segundos são os únicos garantidos
 *    aqui. A lista no bloco de notas e as quatro perguntas de sempre
 *    fazem o reconhecimento antes de qualquer palavra sobre o produto.
 * 2. A virada é UMA frase: manda um link, uma vez.
 * 3. Três provas, nesta ordem: alguém entra pelo link (é possível), a
 *    lista se escreve (não dá trabalho) e a fila anda sozinha (o bloco
 *    de notas não faz isso de jeito nenhum).
 * 4. As objeções — grátis, sem taxa, o dinheiro é seu — vêm ANTES do
 *    botão, porque são elas que travam o clique.
 * 5. O formulário de criação não aparece. Preencher formulário é
 *    custo, não benefício; a promessa "em 1 minuto" fecha o vídeo e
 *    vale mais do que seis segundos vendo alguém digitar.
 *
 * Os cortes são SECOS e caem no compasso (múltiplos de 30 frames a 120
 * BPM). A continuidade fica por conta da lista: é a mesma operação, os
 * mesmos nomes e os mesmos números do começo ao fim.
 */
export const VideoOperacoesVertical: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      {TRILHA ? <Audio src={staticFile(TRILHA)} volume={0.5} /> : null}

      <Sequence name="0-4s · A dor" from={LIMITES.dor} durationInFrames={duracaoDe("dor")}>
        <Dor />
      </Sequence>

      <Sequence
        name="4-7s · A virada: um link"
        from={LIMITES.link}
        durationInFrames={duracaoDe("link")}
      >
        <LinkNoGrupo />
      </Sequence>

      <Sequence
        name="7-11s · Ele abre e confirma"
        from={LIMITES.confirmar}
        durationInFrames={duracaoDe("confirmar")}
      >
        <ConfirmarNoCelular />
      </Sequence>

      <Sequence
        name="11-15s · A lista se escreve"
        from={LIMITES.lista}
        durationInFrames={duracaoDe("lista")}
      >
        <Lista />
      </Sequence>

      <Sequence
        name="15-18s · Lotou, a fila anda"
        from={LIMITES.espera}
        durationInFrames={duracaoDe("espera")}
      >
        <EsperaNaFila />
      </Sequence>

      <Sequence name="18-22s · No dia do jogo" from={LIMITES.dia} durationInFrames={duracaoDe("dia")}>
        <NoDia />
      </Sequence>

      <Sequence
        name="22-26s · Objeções e chamada"
        from={LIMITES.chamada}
        durationInFrames={duracaoDe("chamada")}
      >
        <Chamada />
      </Sequence>

      {/*
        Moldura: contínua, por cima de tudo, para não piscar no corte.

        A barra de progresso é local (e não a de ../../vertical/Moldura)
        porque aquela é calculada sobre os 900 frames do vídeo do
        criador de mapas — aqui são 780, e uma barra que chega a 100%
        antes do fim é pior do que barra nenhuma.

        A marca só entra DEPOIS da dor: nos primeiros 4 s a tela é do
        espectador, não nossa.
      */}
      <Sequence name="Progresso" durationInFrames={DURACAO}>
        <BarraDeProgresso />
      </Sequence>
      <Sequence name="Marca" from={LIMITES.link} durationInFrames={LIMITES.chamada - LIMITES.link}>
        <Topo />
        <Rodape />
      </Sequence>
    </AbsoluteFill>
  );
};

/** A barra de progresso deste vídeo — 780 frames, não 900. */
const BarraDeProgresso: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        top: 120,
        width: 952,
        height: 5,
        backgroundColor: "rgba(240,242,233,0.16)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, (frame / DURACAO) * 100)}%`,
          backgroundColor: COR.oliva300,
        }}
      />
    </div>
  );
};
