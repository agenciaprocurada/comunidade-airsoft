import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { Rodape, Topo } from "../../vertical/Moldura";
import { COR } from "../../tema";
import {
  ApresentacaoVertical,
  Chamada,
  ConfirmarNoCelular,
  CriarVertical,
  Dor,
  EsperaNaFila,
  LinkNoGrupo,
  Lista,
  NoDia,
} from "./cenas";
import { DURACAO, LIMITES, TRILHA, duracaoDe } from "./ritmo";

/**
 * 52 s a 30 fps, 1080×1920, para Reels / TikTok / Shorts.
 *
 * O RITMO É LENTO DE PROPÓSITO. A versão de 26 s passava por seis
 * funcionalidades e o espectador via movimento, não entendia o
 * produto. Aqui cada tela fica tempo suficiente para ser LIDA.
 *
 * A ESTRUTURA:
 *   0–10 s   a dor: o anúncio no grupo, a lista na mão, as perguntas
 *   10–14 s  quem somos e o que a ferramenta faz
 *   14–20 s  abrir a operação
 *   20–28 s  copiar o link e colar no grupo — o gesto inteiro
 *   28–34 s  alguém abre e confirma
 *   34–39 s  a lista se escreve
 *   39–44 s  lotou, e a fila anda sozinha
 *   44–49 s  o dia do jogo
 *   49–52 s  objeções e chamada
 *
 * A marca (`Topo`) fica em todas as cenas MENOS nos 10 s de dor: ali a
 * tela é do espectador, e logo em cima de um problema que ele ainda
 * não sabe que tem solução só atrapalha. Na apresentação e na chamada
 * ela já está grande no meio da tela, então a do topo sai.
 *
 * Os cortes são secos e caem no compasso (múltiplos de 30 frames a
 * 120 BPM).
 */
export const VideoOperacoesVertical: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      {TRILHA ? <Audio src={staticFile(TRILHA)} volume={0.5} /> : null}

      <Sequence name="0-10s · A dor" from={LIMITES.dor} durationInFrames={duracaoDe("dor")}>
        <Dor />
      </Sequence>

      <Sequence
        name="10-14s · O que é a ferramenta"
        from={LIMITES.apresentacao}
        durationInFrames={duracaoDe("apresentacao")}
      >
        <ApresentacaoVertical />
      </Sequence>

      <Sequence
        name="14-20s · Abrir a operação"
        from={LIMITES.criar}
        durationInFrames={duracaoDe("criar")}
      >
        <CriarVertical />
      </Sequence>

      <Sequence
        name="20-28s · Copiar e colar no grupo"
        from={LIMITES.link}
        durationInFrames={duracaoDe("link")}
      >
        <LinkNoGrupo />
      </Sequence>

      <Sequence
        name="28-34s · Ele abre e confirma"
        from={LIMITES.confirmar}
        durationInFrames={duracaoDe("confirmar")}
      >
        <ConfirmarNoCelular />
      </Sequence>

      <Sequence
        name="34-39s · A lista se escreve"
        from={LIMITES.lista}
        durationInFrames={duracaoDe("lista")}
      >
        <Lista />
      </Sequence>

      <Sequence
        name="39-44s · Lotou, a fila anda"
        from={LIMITES.espera}
        durationInFrames={duracaoDe("espera")}
      >
        <EsperaNaFila />
      </Sequence>

      <Sequence name="44-49s · No dia do jogo" from={LIMITES.dia} durationInFrames={duracaoDe("dia")}>
        <NoDia />
      </Sequence>

      <Sequence
        name="49-52s · Objeções e chamada"
        from={LIMITES.chamada}
        durationInFrames={duracaoDe("chamada")}
      >
        <Chamada />
      </Sequence>

      {/*
        Moldura: contínua, por cima de tudo, para não piscar no corte.

        A barra de progresso é local (e não a de ../../vertical/Moldura)
        porque aquela é calculada sobre os 900 frames do vídeo do
        criador de mapas — aqui são 1560, e uma barra que chega a 100%
        antes do fim é pior do que barra nenhuma.
      */}
      <Sequence name="Progresso" durationInFrames={DURACAO}>
        <BarraDeProgresso />
      </Sequence>
      <Sequence
        name="Marca"
        from={LIMITES.criar}
        durationInFrames={LIMITES.chamada - LIMITES.criar}
      >
        <Topo />
        <Rodape />
      </Sequence>
    </AbsoluteFill>
  );
};

/** A barra de progresso deste vídeo — 1560 frames, não 900. */
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
