import { Composition, Folder } from "remotion";
import "./index.css";
import { VideoGeradorMapa } from "./Video";
import { Abertura } from "./cenas/Abertura";
import { CriarArea } from "./cenas/CriarArea";
import { Reposicionar } from "./cenas/Reposicionar";
import { Revelacao } from "./cenas/Revelacao";
import { Chamada } from "./cenas/Chamada";
import { VideoVertical } from "./vertical/VideoVertical";
import { VideoOperacoes } from "./operacoes/VideoOperacoes";
import { Abertura as AberturaOp } from "./operacoes/cenas/Abertura";
import { Criar as CriarOp } from "./operacoes/cenas/Criar";
import { Link as LinkOp } from "./operacoes/cenas/Link";
import { Lista as ListaOp } from "./operacoes/cenas/Lista";
import { NoDia as NoDiaOp } from "./operacoes/cenas/NoDia";
import { Chamada as ChamadaOp } from "./operacoes/cenas/Chamada";
import { VideoOperacoesVertical } from "./operacoes/vertical/VideoOperacoesVertical";
import {
  Chamada as ChamadaOpV,
  Criar as CriarOpV,
  Gancho as GanchoOpV,
  LinkNoGrupo as LinkOpV,
  Lista as ListaOpV,
  NoDia as NoDiaOpV,
} from "./operacoes/vertical/cenas";
import { Abertura as AberturaV } from "./vertical/cenas/Abertura";
import { Ferramenta as FerramentaV } from "./vertical/cenas/Ferramenta";
import { Desenhar as DesenharV } from "./vertical/cenas/Desenhar";
import { Simbolos as SimbolosV } from "./vertical/cenas/Simbolos";
import { Ajustes as AjustesV } from "./vertical/cenas/Ajustes";
import { Revelacao as RevelacaoV } from "./vertical/cenas/Revelacao";
import { Chamada as ChamadaV } from "./vertical/cenas/Chamada";

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

      {/* Organizador de Operações — a segunda ferramenta do site. */}
      <Composition
        id="VideoOperacoes"
        component={VideoOperacoes}
        durationInFrames={660}
        fps={30}
        width={1920}
        height={1080}
      />

      <Composition
        id="VideoOperacoesVertical"
        component={VideoOperacoesVertical}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />

      <Folder name="Cenas-Operacoes-Vertical">
        <Composition
          id="OV1-Gancho"
          component={GanchoOpV}
          durationInFrames={60}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="OV2-Criar"
          component={CriarOpV}
          durationInFrames={180}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="OV3-Link"
          component={LinkOpV}
          durationInFrames={150}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="OV4-Lista"
          component={ListaOpV}
          durationInFrames={240}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="OV5-NoDia"
          component={NoDiaOpV}
          durationInFrames={150}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="OV6-Chamada"
          component={ChamadaOpV}
          durationInFrames={120}
          fps={30}
          width={1080}
          height={1920}
        />
      </Folder>

      <Folder name="Cenas-Operacoes">
        <Composition
          id="O1-Marca"
          component={AberturaOp}
          durationInFrames={66}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="O2-Criar"
          component={CriarOp}
          durationInFrames={186}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="O3-Link"
          component={LinkOp}
          durationInFrames={126}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="O4-Lista"
          component={ListaOp}
          durationInFrames={156}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="O5-NoDia"
          component={NoDiaOp}
          durationInFrames={96}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="O6-Chamada"
          component={ChamadaOp}
          durationInFrames={60}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>

      {/* Versão vertical para Reels / TikTok / Shorts. */}
      <Composition
        id="VideoVertical"
        component={VideoVertical}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />

      <Folder name="Cenas-Vertical">
        <Composition
          id="V1-Gancho"
          component={AberturaV}
          durationInFrames={60}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="V2-AcharOCampo"
          component={FerramentaV}
          durationInFrames={150}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="V3-Desenhar"
          component={DesenharV}
          durationInFrames={180}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="V4-Simbolos"
          component={SimbolosV}
          durationInFrames={120}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="V5-Ajustes"
          component={AjustesV}
          durationInFrames={120}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="V6-Revelacao"
          component={RevelacaoV}
          durationInFrames={150}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="V7-Chamada"
          component={ChamadaV}
          durationInFrames={120}
          fps={30}
          width={1080}
          height={1920}
        />
      </Folder>

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
