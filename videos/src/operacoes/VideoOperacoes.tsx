import { AbsoluteFill, Sequence } from "remotion";
import { COR } from "../tema";
import { Dor } from "./cenas/Dor";
import { Apresentacao } from "./cenas/Apresentacao";
import { Criar } from "./cenas/Criar";
import { Link } from "./cenas/Link";
import { Confirmar } from "./cenas/Confirmar";
import { Lista } from "./cenas/Lista";
import { Espera } from "./cenas/Espera";
import { NoDia } from "./cenas/NoDia";
import { Chamada } from "./cenas/Chamada";
import { Marca } from "./marca";

/**
 * 52 s a 30 fps = 1560 frames, 1920×1080.
 *
 * O RITMO É LENTO DE PROPÓSITO. A versão anterior tinha 20 s e passava
 * por seis funcionalidades — o espectador via movimento, não entendia
 * o produto. Aqui cada tela fica tempo suficiente para ser LIDA: a
 * lista de espera tem 5 s, o copia-e-cola tem 8 s, o formulário tem 6.
 *
 * A ESTRUTURA:
 *   0–10 s   a dor, sem produto nenhum na tela
 *   10–14 s  quem somos e o que a ferramenta faz
 *   14–20 s  abrir a operação
 *   20–28 s  copiar o link e colar no grupo — o gesto inteiro
 *   28–34 s  alguém abre e confirma
 *   34–39 s  a lista se escreve
 *   39–44 s  lotou, e a fila anda sozinha
 *   44–49 s  o dia do jogo
 *   49–52 s  chamada
 *
 * A marca fica em TODA tela (canto superior direito) — o vídeo circula
 * em print e em grupo, e em metade dessas viagens ele chega sem a
 * legenda e sem o link.
 *
 * As cenas se sobrepõem em 6 frames: a troca é dissolvência.
 */

/** Onde cada cena começa. Editar aqui, não nos `from` espalhados. */
const LIMITES = {
  dor: 0,
  apresentacao: 300,
  criar: 420,
  link: 600,
  confirmar: 840,
  lista: 1020,
  espera: 1170,
  dia: 1320,
  chamada: 1470,
  fim: 1560,
} as const;

const duracao = (cena: keyof typeof LIMITES) => {
  const chaves = Object.keys(LIMITES) as (keyof typeof LIMITES)[];
  const i = chaves.indexOf(cena);
  // +6 para a sobreposição da dissolvência; a última cena termina no fim.
  const extra = i < chaves.length - 2 ? 6 : 0;
  return LIMITES[chaves[i + 1]] - LIMITES[cena] + extra;
};

export const VideoOperacoes: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COR.fundo }}>
      <Sequence name="0-10s · A dor" durationInFrames={duracao("dor")}>
        {/* Mesmo eixo das outras cenas: texto à esquerda, tela à
            direita. O aparelho começa em y=140 para não esbarrar na
            assinatura do canto. */}
        <Dor
          batidas={{ lista: 96, perguntas: 210 }}
          telefone={{ x: 1120, y: 140, largura: 560, altura: 880 }}
          legenda={{ x: 110, y: 400, largura: 520, tamanho: 62 }}
        />
      </Sequence>

      <Sequence
        name="10-14s · O que é a ferramenta"
        from={LIMITES.apresentacao}
        durationInFrames={duracao("apresentacao")}
      >
        <Apresentacao logo={130} titulo={84} />
      </Sequence>

      <Sequence name="14-20s · Abrir a operação" from={LIMITES.criar} durationInFrames={duracao("criar")}>
        <Criar />
      </Sequence>

      <Sequence
        name="20-28s · Copiar o link e colar no grupo"
        from={LIMITES.link}
        durationInFrames={duracao("link")}
      >
        <Link />
      </Sequence>

      <Sequence
        name="28-34s · Ele abre e confirma"
        from={LIMITES.confirmar}
        durationInFrames={duracao("confirmar")}
      >
        <Confirmar />
      </Sequence>

      <Sequence name="34-39s · A lista se escreve" from={LIMITES.lista} durationInFrames={duracao("lista")}>
        <Lista />
      </Sequence>

      <Sequence name="39-44s · Lotou, a fila anda" from={LIMITES.espera} durationInFrames={duracao("espera")}>
        <Espera />
      </Sequence>

      <Sequence name="44-49s · No portão do campo" from={LIMITES.dia} durationInFrames={duracao("dia")}>
        <NoDia />
      </Sequence>

      <Sequence name="49-52s · Chamada" from={LIMITES.chamada} durationInFrames={duracao("chamada")}>
        <Chamada />
      </Sequence>

      {/* A marca, por cima de tudo e o tempo todo — menos na
          apresentação e na chamada, onde ela já está grande no meio da
          tela e a assinatura no canto viraria eco. */}
      <Sequence name="Marca" durationInFrames={LIMITES.apresentacao}>
        <Marca />
      </Sequence>
      <Sequence
        name="Marca"
        from={LIMITES.criar}
        durationInFrames={LIMITES.chamada - LIMITES.criar}
      >
        <Marca />
      </Sequence>
    </AbsoluteFill>
  );
};

export const DURACAO_OPERACOES = LIMITES.fim;
