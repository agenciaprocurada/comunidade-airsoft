import { Composition, Folder } from "remotion";
import "./index.css";
import { VideoGeradorMapa } from "./Video";
import { Abertura } from "./cenas/Abertura";
import { CriarArea } from "./cenas/CriarArea";
import { Reposicionar } from "./cenas/Reposicionar";
import { Revelacao } from "./cenas/Revelacao";
import { Chamada } from "./cenas/Chamada";

/**
 * Cada cena também é registrada sozinha, dentro da pasta "Cenas": no
 * Studio dá para abrir uma e ajustar o tempo dela sem esperar o vídeo
 * inteiro rodar, e o duplo clique na faixa da linha do tempo cai
 * direto na composição certa.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoGeradorMapa"
        component={VideoGeradorMapa}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />

      <Folder name="Cenas">
        <Composition
          id="Cena1-Marca"
          component={Abertura}
          durationInFrames={66}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Cena2-CriarArea"
          component={CriarArea}
          durationInFrames={186}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Cena3-Reposicionar"
          component={Reposicionar}
          durationInFrames={66}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Cena4-Revelacao"
          component={Revelacao}
          durationInFrames={96}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Cena5-Chamada"
          component={Chamada}
          durationInFrames={60}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
    </>
  );
};
