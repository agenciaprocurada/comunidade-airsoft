/**
 * A operação que o vídeo mostra.
 *
 * Uma fonte só para os dois formatos: o 16:9 da landing e o 9:16 das
 * redes contam a MESMA operação, com os mesmos nomes, os mesmos preços
 * e a mesma conta de vagas. Se o número mudar aqui, muda nos dois — e
 * é isso que impede o vídeo vertical de dizer "21 confirmados"
 * enquanto o horizontal diz 19.
 *
 * Os dados batem com o que a ferramenta faz de verdade
 * (src/lib/operacao.ts do site): dois lados com teto próprio, dois
 * lotes de preço com prazo, lista de espera quando o lado enche.
 * Nome de jogador é fictício — lista de presença de verdade tem gente
 * de verdade dentro, e isso não vai para vídeo de divulgação.
 */

export const OPERACAO = {
  titulo: "Operação Fênix",
  campo: "Sítio Alvorada",
  cidade: "Novo Hamburgo/RS",
  data: "Domingo, 13 de setembro",
  dataCurta: "Dom · 13/09",
  abertura: "08:00",
  inicio: "09:00",
  precoAntecipado: "R$ 35",
  precoNoDia: "R$ 50",
  prazoLote: "até sexta",
  link: "comunidadeairsoft.com.br/operacoes/alvorada-13-09",
} as const;

/** Busca digitada no seletor de campo, na cena de criação. */
export const BUSCA_CAMPO = "Sítio Alvorada, Novo Hamburgo";

export interface Lado {
  nome: string;
  vagas: number;
  /** Confirmados quando a cena da lista COMEÇA. */
  inicio: number;
  /** Confirmados quando ela termina. */
  fim: number;
  cor: string;
}

/**
 * Os dois lados. `inicio` e `fim` são o que a barra de vagas percorre
 * na cena da lista: o PMC fecha em 12/12 (é ele que gera a espera) e o
 * Militar para em 9/12, para a tela mostrar os dois estados possíveis
 * ao mesmo tempo — cheio e com vaga.
 */
export const LADOS: Lado[] = [
  { nome: "PMC", vagas: 12, inicio: 9, fim: 12, cor: "#7d9139" },
  { nome: "Militar", vagas: 12, inicio: 5, fim: 9, cor: "#d1a13c" },
];

export const TOTAL_INICIO = LADOS.reduce((s, l) => s + l.inicio, 0); // 14
export const TOTAL_FIM = LADOS.reduce((s, l) => s + l.fim, 0); // 21
/** Vagas da operação inteira — o número que aparece na prévia do link. */
export const TOTAL_VAGAS = LADOS.reduce((s, l) => s + l.vagas, 0); // 24

export type Estado = "pago" | "a-pagar" | "espera";

export interface Jogador {
  nome: string;
  lado: string;
  estado: Estado;
  /** Já marcado como presente no painel do dia. */
  presente?: boolean;
  /**
   * Quantas vagas essa inscrição ocupa. Quem leva acompanhante ocupa
   * duas — é assim na ferramenta, e sem isso a soma da tela não
   * fecharia com o "+1" escrito no nome.
   */
  peso?: number;
}

/**
 * A lista como ela aparece na tela.
 *
 * A ordem importa: os nomes entram de cima para baixo conforme
 * confirmam, e o ÚLTIMO é o que chegou depois de o PMC lotar — ele é a
 * única razão de a cena existir, porque é ali que a pessoa entende que
 * a lista de espera acontece sem o organizador fazer nada.
 */
export const JOGADORES: Jogador[] = [
  { nome: "Rafael M.", lado: "PMC", estado: "pago", presente: true },
  { nome: "Bruno T. +1", lado: "Militar", estado: "pago", presente: true, peso: 2 },
  { nome: "Diego A.", lado: "PMC", estado: "a-pagar" },
  { nome: "Caio R.", lado: "Militar", estado: "pago", presente: true },
  { nome: "Marcos V.", lado: "PMC", estado: "pago" },
  { nome: "Tiago S.", lado: "Militar", estado: "a-pagar" },
  { nome: "Wesley P.", lado: "PMC", estado: "espera" },
];

/** A cor do lado, para o pontinho que abre cada linha da lista. */
export const corDoLado = (lado: string) =>
  LADOS.find((l) => l.nome === lado)?.cor ?? "#7d9139";

/**
 * Confirmados de um lado depois que `entraram` jogadores da lista já
 * apareceram na tela.
 *
 * A conta é feita aqui, e não escrita à mão em cada cena, porque os
 * dois vídeos mostram a mesma lista em ritmos diferentes: o número da
 * barra tem que sair da MESMA regra que o número da lista, senão a
 * tela se contradiz no meio da animação. Quem está na espera não
 * conta — é exatamente esse o ponto da espera.
 */
export const confirmadosDo = (lado: Lado, entraram: number): number =>
  lado.inicio +
  JOGADORES.slice(0, entraram)
    .filter((j) => j.lado === lado.nome && j.estado !== "espera")
    .reduce((soma, j) => soma + (j.peso ?? 1), 0);

/** Total confirmado na operação inteira, no mesmo critério. */
export const totalConfirmado = (entraram: number): number =>
  LADOS.reduce((soma, lado) => soma + confirmadosDo(lado, entraram), 0);

/**
 * As mensagens do grupo, na cena do link.
 *
 * Conversa genérica de propósito: sem marca, sem logo e sem imitar a
 * interface de nenhum aplicativo. O que a cena precisa dizer é "o link
 * é colado no grupo uma vez", e isso não depende de qual grupo é.
 */
export const CONVERSA = [
  { de: "Organizador", texto: "Fechou o domingo. Lista aberta 👇", minha: true },
  { de: "Léo", texto: "Boa! Já entrei, PMC", minha: false },
  { de: "Ana", texto: "Ainda tem vaga no militar?", minha: false },
] as const;

/**
 * Texto revelado letra por letra.
 *
 * `porFrame` é quantos frames cada caractere leva. Digitação de vídeo
 * é sempre mais rápida que digitação de gente: o espectador já sabe
 * ler, ele só precisa ver que ALGUÉM está digitando.
 */
export const digitado = (
  texto: string,
  frame: number,
  inicio: number,
  porFrame = 1.4,
): string => {
  const letras = Math.max(0, Math.min(texto.length, Math.round((frame - inicio) / porFrame)));
  return texto.slice(0, letras);
};
