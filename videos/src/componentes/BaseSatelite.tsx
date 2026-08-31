import { Img, staticFile } from "remotion";
import manifesto from "../dados/tiles.json";

/**
 * O mosaico de tiles da Esri, montado do mesmo jeito que o editor monta
 * no navegador: cada tile de 256 px posicionado pelo deslocamento que
 * `montarMosaico` calculou (ver scripts/baixar-tiles.mjs).
 *
 * Os arquivos ficam em public/tiles/, então o render não vai à rede —
 * uma requisição que falha no meio de 450 frames é um quadrado preto no
 * vídeo final, e isso só aparece depois de renderizar tudo.
 */

type Camada = keyof typeof manifesto;

export const BaseSatelite: React.FC<{
  camada: Camada;
  style?: React.CSSProperties;
}> = ({ camada, style }) => {
  const { lado, tiles } = manifesto[camada];

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: lado,
        height: lado,
        marginLeft: -lado / 2,
        marginTop: -lado / 2,
        backgroundColor: "#0b0d09",
        ...style,
      }}
    >
      {tiles.map((t) => (
        <Img
          key={`${t.x}_${t.y}`}
          src={staticFile(`tiles/${camada}/${t.x}_${t.y}.jpg`)}
          style={{
            position: "absolute",
            left: t.esquerda,
            top: t.topo,
            width: 256,
            height: 256,
          }}
        />
      ))}
    </div>
  );
};
