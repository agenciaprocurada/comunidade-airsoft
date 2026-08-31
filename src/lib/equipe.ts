/**
 * Regras de equipe. Compartilhadas entre a tela de quem procura, a de
 * quem cria e o painel do líder, para que as três nunca discordem
 * sobre o que é um nome válido ou quem pode o quê.
 *
 * Vocabulário: EQUIPE é a agremiação permanente (R.I.S.E, NOMAD). O
 * lado que a pessoa joga numa operação (PMC x Militar) é `lado` e não
 * tem nada a ver com isto.
 */

import { SIGLAS_UF, slugificar } from "./uf";

export const PAPEIS = {
  lider: { rotulo: "Líder", ordem: 0 },
  membro: { rotulo: "Membro", ordem: 1 },
} as const;

export type PapelEquipe = keyof typeof PAPEIS;

export const STATUS_MEMBRO = {
  pendente: { rotulo: "Aguardando resposta", tom: "atencao" },
  ativo: { rotulo: "Ativo", tom: "ok" },
  recusado: { rotulo: "Recusado", tom: "alerta" },
  saiu: { rotulo: "Saiu da equipe", tom: "neutro" },
  removido: { rotulo: "Removido", tom: "neutro" },
} as const;

export type StatusMembro = keyof typeof STATUS_MEMBRO;

export interface Equipe {
  id: string;
  nome: string;
  sigla: string | null;
  slug: string;
  uf: string | null;
  cidade: string | null;
  cidade_slug: string | null;
  descricao: string | null;
  logo_url: string | null;
  redes: Record<string, string>;
  verificada: boolean;
  /** Equipe aceitando gente nova. Ligado à mão pelo líder. */
  recrutando: boolean;
  criada_por: string | null;
  criado_em: string;
}

/** Quem começou o vínculo — define quem precisa aceitar. */
export type OrigemVinculo = "pedido" | "convite";

export interface VinculoEquipe {
  id: string;
  equipe_id: string;
  usuario_id: string;
  papel: PapelEquipe;
  status: StatusMembro;
  origem: OrigemVinculo;
  principal: boolean;
  criado_em: string;
}

/**
 * O mesmo `pendente` significa coisas opostas para cada lado. Sem esta
 * distinção a tela mandaria a pessoa esperar por uma resposta que ela
 * mesma deveria dar.
 */
export function rotuloPendente(origem: OrigemVinculo, souEu: boolean): string {
  if (origem === "convite") return souEu ? "Convite para você" : "Convite enviado";
  return souEu ? "Aguardando o líder" : "Pediu para entrar";
}

/** Uma linha da view `equipe_elenco` — só o que é público do perfil. */
export interface MembroDoElenco {
  equipe_id: string;
  usuario_id: string;
  papel: PapelEquipe;
  membro_desde: string;
  nome: string | null;
  nickname: string | null;
  foto_url: string | null;
}

export const COLUNAS_EQUIPE =
  "id,nome,sigla,slug,uf,cidade,cidade_slug,descricao,logo_url,redes," +
  "verificada,recrutando,criada_por,criado_em";

export const COLUNAS_VINCULO =
  "id,equipe_id,usuario_id,papel,status,origem,principal,criado_em";

export const NOME_MINIMO = 2;
export const NOME_MAXIMO = 60;
export const SIGLA_MAXIMA = 12;
export const DESCRICAO_MAXIMA = 400;

/**
 * Slug a partir do nome. Tem que casar com o constraint
 * `equipes_slug_forma` do banco: só minúscula, número e hífen simples.
 *
 * "R.I.S.E" vira "r-i-s-e"; "Nômade 22" vira "nomade-22".
 */
export function slugDaEquipe(nome: string): string {
  const bruto = slugificar(nome)
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // /equipes/[slug] serve também o hub estadual (/equipes/pr), como
  // /armeiros/[slug] já faz. Equipe chamada "PR" roubaria a URL do
  // estado inteiro, então ela ganha sufixo na hora de nascer — o slug
  // é o endereço, e endereço não se resolve depois.
  if (SIGLAS_UF.some((sigla) => sigla.toLowerCase() === bruto)) {
    return `${bruto}-equipe`;
  }

  return bruto;
}

/**
 * A sigla é o que o pessoal já escreve do lado do nome na lista do
 * grupo. Mantém ponto e barra ("R.I.S.E", "22/NOMAD") porque é assim
 * que eles escrevem — só corta espaço sobrando e o tamanho.
 */
export function normalizarSigla(bruto: string): string | null {
  const limpo = bruto.trim().replace(/\s+/g, " ");
  if (!limpo) return null;
  return limpo.slice(0, SIGLA_MAXIMA);
}

/**
 * Devolve a mensagem de erro, ou null quando está válido. A tela avisa
 * antes de o banco recusar — o constraint continua sendo a garantia.
 */
export function erroDoNome(nome: string): string | null {
  const limpo = nome.trim();
  if (limpo.length < NOME_MINIMO) return "Escreva o nome da equipe.";
  if (limpo.length > NOME_MAXIMO) return `No máximo ${NOME_MAXIMO} caracteres.`;
  if (!slugDaEquipe(limpo)) {
    return "Use pelo menos uma letra ou número no nome.";
  }
  return null;
}

/** Como a equipe aparece do lado do nome na lista da operação. */
export function etiqueta(equipe: Pick<Equipe, "nome" | "sigla">): string {
  return equipe.sigla?.trim() || equipe.nome;
}

/** Líder primeiro, depois por nome — a ordem que se espera de um elenco. */
export function ordenarElenco(elenco: MembroDoElenco[]): MembroDoElenco[] {
  return [...elenco].sort((a, b) => {
    const porPapel = PAPEIS[a.papel].ordem - PAPEIS[b.papel].ordem;
    if (porPapel !== 0) return porPapel;
    return (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR");
  });
}

/** Nome curto para lista: "Guilherme Abreu" vira "Guilherme A." */
export function nomeCurto(nome: string | null, nickname: string | null): string {
  const base = nome?.trim();
  if (!base) return nickname ?? "Jogador";
  const partes = base.split(/\s+/);
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1].charAt(0).toUpperCase()}.`;
}

/**
 * O filtro `or` do PostgREST é montado como texto: vírgula, parêntese
 * e aspas vindos da caixa de busca viram OUTRO filtro na consulta.
 * Aqui eles caem fora antes de chegar na query.
 */
export function termoDeBusca(bruto: string): string {
  return bruto
    .replace(/[,()*%\\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

export function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ------------------------------------------------------------------
// Vitrine pública
//
// A partir daqui é o que a página pública da equipe usa. O que a área
// logada precisa fica acima; misturar as duas listas de colunas foi o
// que quase fez `criada_por` vazar para a resposta pública.
// ------------------------------------------------------------------

/** Uma linha da view `equipe_vitrine`: ficha + contagem do elenco. */
export interface EquipeVitrine {
  id: string;
  nome: string;
  sigla: string | null;
  slug: string;
  uf: string | null;
  cidade: string | null;
  cidade_slug: string | null;
  descricao: string | null;
  logo_url: string | null;
  redes: Record<string, string>;
  verificada: boolean;
  recrutando: boolean;
  criado_em: string;
  /** Membros ATIVOS com conta no site. Contado, nunca declarado. */
  membros: number;
}

export const COLUNAS_VITRINE =
  "id,nome,sigla,slug,uf,cidade,cidade_slug,descricao,logo_url,redes," +
  "verificada,recrutando,criado_em,membros";

/** Logo: 2 MB e três formatos, igual ao bucket `logos` no banco. */
export const LOGO_MAXIMA = 2 * 1024 * 1024;

export const TIPOS_LOGO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const DESCRICAO_PARA_INDEXAR = 120;
const MEMBROS_PARA_INDEXAR = 3;

/**
 * A ficha entra no índice do Google?
 *
 * Publicar em massa ficha de três linhas é a receita de conteúdo raso:
 * centenas de páginas quase vazias puxam a autoridade do domínio para
 * baixo e nenhuma delas ganha busca nenhuma. Então a página existe e
 * abre para quem tem o link desde o primeiro minuto — só não é
 * oferecida ao buscador antes de ter o que ler.
 *
 * O critério é: história escrita DE VERDADE, mais um sinal de que a
 * equipe existe fora do cadastro (logo enviada ou gente dentro). Selo
 * de verificada, dado por admin, passa por cima de tudo.
 */
export function equipeIndexavel(equipe: {
  descricao: string | null;
  logo_url: string | null;
  membros: number;
  verificada: boolean;
}): boolean {
  if (equipe.verificada) return true;
  const historia = (equipe.descricao ?? "").trim().length;
  if (historia < DESCRICAO_PARA_INDEXAR) return false;
  return Boolean(equipe.logo_url) || equipe.membros >= MEMBROS_PARA_INDEXAR;
}

/**
 * O que ainda falta para a ficha ser oferecida ao Google. Some quando
 * `equipeIndexavel` passa — é o aviso que o painel do líder mostra.
 */
export function faltaParaIndexar(equipe: {
  descricao: string | null;
  logo_url: string | null;
  membros: number;
  verificada: boolean;
}): string[] {
  if (equipeIndexavel(equipe)) return [];
  const falta: string[] = [];
  if ((equipe.descricao ?? "").trim().length < DESCRICAO_PARA_INDEXAR) {
    falta.push("escrever a história da equipe (pelo menos duas frases)");
  }
  if (!equipe.logo_url && equipe.membros < MEMBROS_PARA_INDEXAR) {
    falta.push("enviar a logo ou ter 3 membros com conta no site");
  }
  return falta;
}

/**
 * Instagram é guardado como @arroba, não como URL: o líder digita do
 * jeito que ele sabe ("@equipe_rise", "instagram.com/equipe_rise") e a
 * ficha mostra sempre igual.
 */
export function normalizarInstagram(bruto: string): string | null {
  const limpo = bruto
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@/, "");
  if (!limpo) return null;
  if (!/^[A-Za-z0-9._]{1,30}$/.test(limpo)) return null;
  return limpo.toLowerCase();
}

/** Só os dígitos, como o resto do site já guarda telefone. */
export function normalizarWhatsapp(bruto: string): string | null {
  const digitos = bruto.replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 13) return null;
  return digitos;
}

/**
 * Monta o objeto `redes` a partir do formulário. Campo apagado some da
 * chave em vez de virar string vazia — `redes` é jsonb e chave com
 * valor vazio dá trabalho em toda leitura depois.
 */
export function montarRedes(
  atual: Record<string, string>,
  entrada: { instagram?: string; whatsapp?: string },
): Record<string, string> {
  const redes = { ...atual };

  if (entrada.instagram !== undefined) {
    const valor = normalizarInstagram(entrada.instagram);
    if (valor) redes.instagram = valor;
    else delete redes.instagram;
  }

  if (entrada.whatsapp !== undefined) {
    const valor = normalizarWhatsapp(entrada.whatsapp);
    if (valor) redes.whatsapp = valor;
    else delete redes.whatsapp;
  }

  return redes;
}
