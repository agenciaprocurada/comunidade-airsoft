import { FONTE_TEXTO } from "../tema";
import { OPERACAO, TOTAL_VAGAS } from "./dados";

/**
 * A conversa do grupo, no visual do aplicativo de mensagens que todo
 * mundo usa.
 *
 * POR QUE ASSIM: o vídeo precisa que a pessoa reconheça a cena em meio
 * segundo — "isso é o meu grupo" — e um balão genérico não faz isso. A
 * forma (papel de parede bege, balão verde-claro à direita, balão
 * branco à esquerda, hora miúda, tique duplo azul) é o que carrega o
 * reconhecimento.
 *
 * O QUE NÃO ENTRA, e é decisão consciente: o logo, o nome do
 * aplicativo escrito em algum lugar e o papel de parede de rabiscos
 * deles. Marca de terceiro em peça de divulgação sugere parceria que
 * não existe — o que a cena precisa dizer ("o link foi para o grupo")
 * não depende de qual aplicativo é.
 *
 * As cores vivem aqui e NÃO em tema.ts de propósito: elas não são do
 * Design System do site, são a paleta de uma tela de terceiro que a
 * gente está representando. Misturar as duas faria alguém achar que
 * #005c4b é cor da marca.
 */
/**
 * Tema CLARO, que é como a maioria das pessoas usa o aplicativo — e,
 * num vídeo de fundo escuro, é o que faz a tela do celular acender
 * como acende na vida real: um retângulo claro na mão de alguém.
 */
export const ZAP = {
  fundo: "#efe7de",
  barra: "#f0f2f5",
  recebida: "#ffffff",
  enviada: "#d9fdd3",
  previaEnviada: "#c8f2c0",
  previaRecebida: "#f5f6f6",
  texto: "#111b21",
  fraco: "#667781",
  hora: "#667781",
  check: "#53bdeb",
  acento: "#00a884",
  /** Cor do nome de quem fala, como no aplicativo: uma por pessoa. */
  nomes: ["#1f7aec", "#c4532d", "#8e44ad", "#0a7c68"] as const,
  /** Contorno de balão claro sobre fundo claro. */
  sombra: "0 1px 0.5px rgba(11,20,26,0.13)",
} as const;

export interface Mensagem {
  de: string;
  texto: string;
  hora: string;
  /** Mostra a prévia do link do evento dentro da bolha. */
  comLink?: boolean;
}

/** O tique duplo de "lido". Só aparece nas mensagens de quem está vendo a tela. */
const Tiques: React.FC<{ tamanho: number }> = ({ tamanho }) => (
  <svg width={tamanho * 1.4} height={tamanho} viewBox="0 0 20 14" fill="none">
    <path
      d="M1 7.5 4.5 11 11.5 3"
      stroke={ZAP.check}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 7.5 11 11 18 3"
      stroke={ZAP.check}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * O papel de parede.
 *
 * Não é o dos rabiscos do aplicativo — é uma textura própria, bem
 * apagada, só para o fundo não ser chapado.
 */
export const FundoDaConversa: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundColor: ZAP.fundo,
      backgroundImage:
        "radial-gradient(rgba(11,20,26,0.05) 1px, transparent 1px), radial-gradient(rgba(11,20,26,0.03) 1px, transparent 1px)",
      backgroundSize: "38px 38px, 38px 38px",
      backgroundPosition: "0 0, 19px 19px",
    }}
  />
);

/** A barra de cima: voltar, foto do grupo, nome e quem está nele. */
export const CabecalhoDaConversa: React.FC<{
  nome: string;
  membros: string;
  escala?: number;
}> = ({ nome, membros, escala = 1 }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14 * escala,
      padding: `${12 * escala}px ${16 * escala}px`,
      backgroundColor: ZAP.barra,
      flexShrink: 0,
    }}
  >
    <svg
      width={22 * escala}
      height={22 * escala}
      viewBox="0 0 24 24"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M15 5 8 12l7 7"
        stroke="#54656f"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>

    {/* Foto do grupo: silhueta de duas pessoas, como o padrão do app. */}
    <div
      style={{
        width: 44 * escala,
        height: 44 * escala,
        borderRadius: 999,
        backgroundColor: "#dfe5e7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width={28 * escala} height={28 * escala} viewBox="0 0 24 24" fill="#8696a0">
        <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.5 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM9 12.5c-2.7 0-6 1.35-6 4V19h12v-2.5c0-2.65-3.3-4-6-4zm7.5.5c-.6 0-1.3.07-2 .2 1.2.9 1.9 2.05 1.9 3.3V19H21v-2.2c0-2.35-2.7-3.3-4.5-3.3z" />
      </svg>
    </div>

    <div style={{ minWidth: 0, flex: 1 }}>
      <div
        style={{
          fontFamily: FONTE_TEXTO,
          fontSize: 21 * escala,
          fontWeight: 600,
          color: ZAP.texto,
          whiteSpace: "nowrap",
        }}
      >
        {nome}
      </div>
      <div
        style={{
          fontFamily: FONTE_TEXTO,
          fontSize: 16 * escala,
          color: ZAP.fraco,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {membros}
      </div>
    </div>

    {[0, 1].map((i) => (
      <svg key={i} width={20 * escala} height={20 * escala} viewBox="0 0 24 24" fill="#54656f">
        {i === 0 ? (
          <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
        ) : (
          <path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        )}
      </svg>
    ))}
  </div>
);

/** A prévia do link do evento, dentro da bolha. */
const PreviaDoLink: React.FC<{ minha: boolean; escala: number }> = ({ minha, escala }) => (
  <div
    style={{
      marginBottom: 6 * escala,
      borderRadius: 8 * escala,
      overflow: "hidden",
      backgroundColor: minha ? ZAP.previaEnviada : ZAP.previaRecebida,
    }}
  >
    {/* Faixa de imagem do link: o oliva da marca, que é o que o site
        serve como og:image — aqui reduzido a uma barra de cor. */}
    <div
      style={{
        height: 6 * escala,
        background: "linear-gradient(90deg,#7d9139,#a9bd66)",
      }}
    />
    <div style={{ padding: `${10 * escala}px ${12 * escala}px` }}>
      <div
        style={{
          fontFamily: FONTE_TEXTO,
          fontSize: 19 * escala,
          fontWeight: 600,
          color: ZAP.texto,
          lineHeight: 1.25,
        }}
      >
        {OPERACAO.titulo} · {OPERACAO.dataCurta}
      </div>
      <div
        style={{
          marginTop: 4 * escala,
          fontFamily: FONTE_TEXTO,
          fontSize: 17 * escala,
          color: ZAP.fraco,
          lineHeight: 1.3,
        }}
      >
        {OPERACAO.campo} · {TOTAL_VAGAS} vagas · {OPERACAO.precoAntecipado}{" "}
        {OPERACAO.prazoLote}
      </div>
      <div
        style={{
          marginTop: 6 * escala,
          fontFamily: FONTE_TEXTO,
          fontSize: 15 * escala,
          color: ZAP.fraco,
        }}
      >
        comunidadeairsoft.com.br
      </div>
    </div>
  </div>
);

/**
 * Uma mensagem.
 *
 * `eu` é o nome de quem está olhando a tela: a mesma conversa aparece
 * com o balão verde de um lado no celular do organizador e do outro no
 * celular de quem recebeu. É isso que permite reaproveitar a conversa
 * nas duas cenas sem escrever nada duas vezes.
 */
export const Balao: React.FC<{
  mensagem: Mensagem;
  eu: string;
  /** Índice para escolher a cor do nome de quem fala. */
  indiceNome?: number;
  entrada?: number;
  escala?: number;
  /** Largura máxima da bolha, em px de tela. */
  largura?: number;
}> = ({ mensagem, eu, indiceNome = 0, entrada = 1, escala = 1, largura = 420 }) => {
  const minha = mensagem.de === eu;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: minha ? "flex-end" : "flex-start",
        opacity: entrada,
        translate: `0 ${(1 - entrada) * 14}px`,
      }}
    >
      <div
        style={{
          maxWidth: largura,
          padding: `${7 * escala}px ${9 * escala}px ${5 * escala}px`,
          borderRadius: 9 * escala,
          // O canto “apontado” do lado de quem falou, como no app.
          borderTopRightRadius: minha ? 0 : 9 * escala,
          borderTopLeftRadius: minha ? 9 * escala : 0,
          backgroundColor: minha ? ZAP.enviada : ZAP.recebida,
          boxShadow: ZAP.sombra,
        }}
      >
        {!minha ? (
          <div
            style={{
              fontFamily: FONTE_TEXTO,
              fontSize: 18 * escala,
              fontWeight: 600,
              color: ZAP.nomes[indiceNome % ZAP.nomes.length],
              marginBottom: 3 * escala,
            }}
          >
            {mensagem.de}
          </div>
        ) : null}

        {mensagem.comLink ? <PreviaDoLink minha={minha} escala={escala} /> : null}

        <div
          style={{
            fontFamily: FONTE_TEXTO,
            fontSize: 22 * escala,
            lineHeight: 1.35,
            color: ZAP.texto,
            paddingRight: 62 * escala,
          }}
        >
          {mensagem.texto}
        </div>

        {/* Hora e tiques, alinhados no canto de baixo como no app. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 5 * escala,
            marginTop: -12 * escala,
          }}
        >
          <span
            style={{
              fontFamily: FONTE_TEXTO,
              fontSize: 14 * escala,
              color: ZAP.hora,
            }}
          >
            {mensagem.hora}
          </span>
          {minha ? <Tiques tamanho={12 * escala} /> : null}
        </div>
      </div>
    </div>
  );
};

/** A barra de digitar, no pé da conversa. */
export const BarraDeEnvio: React.FC<{ escala?: number }> = ({ escala = 1 }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8 * escala,
      padding: `${8 * escala}px ${10 * escala}px`,
      backgroundColor: ZAP.barra,
      flexShrink: 0,
    }}
  >
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 10 * escala,
        height: 46 * escala,
        padding: `0 ${14 * escala}px`,
        borderRadius: 999,
        backgroundColor: "#ffffff",
        boxShadow: ZAP.sombra,
      }}
    >
      <svg width={22 * escala} height={22 * escala} viewBox="0 0 24 24" fill="#54656f">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-3.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM12 18c-2.3 0-4.3-1.4-5.2-3.4h10.4C16.3 16.6 14.3 18 12 18z" />
      </svg>
      <span
        style={{
          fontFamily: FONTE_TEXTO,
          fontSize: 20 * escala,
          color: ZAP.fraco,
        }}
      >
        Mensagem
      </span>
    </div>
    <div
      style={{
        width: 46 * escala,
        height: 46 * escala,
        borderRadius: 999,
        backgroundColor: ZAP.acento,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width={22 * escala} height={22 * escala} viewBox="0 0 24 24" fill="#ffffff">
        <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
      </svg>
    </div>
  </div>
);
