/**
 * Regras da operação e da lista de presença. Compartilhadas entre a
 * página pública, o painel do organizador e o formulário de criação —
 * as três precisam concordar sobre qual lote está valendo e quantas
 * vagas sobraram.
 *
 * Vocabulário: LADO é a divisão daquela operação (PMC x Militar).
 * EQUIPE é a agremiação permanente e vive em `lib/equipe.ts`.
 */

import type { Estilo } from "./conta";

export const STATUS_OPERACAO = {
  rascunho: { rotulo: "Rascunho", tom: "neutro" },
  publicada: { rotulo: "Aberta", tom: "ok" },
  cancelada: { rotulo: "Cancelada", tom: "alerta" },
  realizada: { rotulo: "Realizada", tom: "neutro" },
} as const;

export type StatusOperacao = keyof typeof STATUS_OPERACAO;

export const STATUS_INSCRICAO = {
  confirmada: { rotulo: "Confirmado", tom: "ok" },
  espera: { rotulo: "Lista de espera", tom: "atencao" },
  cancelada: { rotulo: "Cancelado", tom: "neutro" },
} as const;

export type StatusInscricao = keyof typeof STATUS_INSCRICAO;

export interface Operacao {
  id: string;
  slug: string;
  campo_id: string | null;
  /** Nome congelado na criação: sobrevive à ficha sair do ar. */
  campo_nome: string | null;
  local_avulso: string | null;
  organizador_id: string;
  equipe_id: string | null;
  titulo: string | null;
  data: string;
  abertura: string | null;
  briefing: string | null;
  inicio: string | null;
  fim: string | null;
  estilo: Estilo | null;
  preco: number | null;
  preco_no_dia: number | null;
  prazo_lote: string | null;
  pagamento: string | null;
  observacoes: string | null;
  status: StatusOperacao;
  motivo_cancelamento: string | null;
  criado_em: string;
  uf: string | null;
  cidade: string | null;
  cidade_slug: string | null;
  visibilidade: Visibilidade;
  /** Opcional de proposito: so as consultas do organizador pedem esta
   *  coluna (COLUNAS_OPERACAO_DONO). Nas demais ela nem vem. */
  chave_acesso?: string | null;
  whatsapp_contato: string | null;
}

export interface Lado {
  id: string;
  operacao_id: string;
  nome: string;
  ordem: number;
  vagas: number | null;
}

export interface Inscricao {
  id: string;
  operacao_id: string;
  lado_id: string | null;
  usuario_id: string | null;
  nome_avulso: string | null;
  equipe_id: string | null;
  etiqueta_equipe: string | null;
  status: StatusInscricao;
  acompanhantes: number;
  pago: boolean;
  presente: boolean;
  observacao: string | null;
  criado_em: string;
}

/** Uma linha da view pública `operacao_lista`. */
export interface LinhaDaLista {
  id: string;
  operacao_id: string;
  lado_id: string | null;
  status: StatusInscricao;
  acompanhantes: number;
  etiqueta_equipe: string | null;
  criado_em: string;
  nome: string | null;
  nickname: string | null;
  foto_url: string | null;
}

/**
 * Colunas da operacao para QUALQUER tela.
 *
 * `chave_acesso` NAO entra aqui, e isso e a diferenca entre a operacao
 * fechada ser fechada ou ser enfeite: a RLS filtra linha, nunca coluna.
 * Se a pagina publica pedisse a chave, ela viria no HTML de todo mundo.
 * Quem precisa dela usa COLUNAS_OPERACAO_DONO, e so nas telas em que a
 * consulta ja esta presa ao organizador.
 */
export const COLUNAS_OPERACAO =
  "id,slug,campo_id,campo_nome,local_avulso,organizador_id,equipe_id,titulo,data," +
  "abertura,briefing,inicio,fim,estilo,preco,preco_no_dia,prazo_lote," +
  "pagamento,observacoes,status,motivo_cancelamento,criado_em," +
  "uf,cidade,cidade_slug,visibilidade,whatsapp_contato";

/** Só para as telas do organizador — inclui a chave do link exclusivo. */
export const COLUNAS_OPERACAO_DONO = `${COLUNAS_OPERACAO},chave_acesso`;

export const COLUNAS_LADO = "id,operacao_id,nome,ordem,vagas";

export const COLUNAS_INSCRICAO =
  "id,operacao_id,lado_id,usuario_id,nome_avulso,equipe_id,etiqueta_equipe," +
  "status,acompanhantes,pago,presente,observacao,criado_em";

/**
 * `arena-insba-airsoft-2026-08-29`. O id do campo já é slug, então o
 * endereço da operação sai legível e único sem sorteio nenhum.
 */
export function slugDaOperacao(base: string, data: string): string {
  return `${base}-${data}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}

/** "2026-08-29" → "Sábado, 29 de agosto" (sem ano quando é o ano atual). */
export function dataPorExtenso(iso: string, hoje = new Date()): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(ano, mes - 1, dia);
  const texto = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    ...(ano !== hoje.getFullYear() ? { year: "numeric" } : {}),
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "2026-08-29" → "29/08". */
export function dataCurta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

/** O Postgres devolve `time` como "08:30:00". A tela quer "08:30". */
export function hora(valor: string | null): string {
  if (!valor) return "";
  return valor.slice(0, 5);
}

export function formatarPreco(valor: number | null): string {
  if (valor === null || valor === undefined) return "A combinar";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Qual lote está valendo hoje.
 *
 * O organizador escreve "R$ 35 até sexta, R$ 50 no dia" e depois torce
 * para ninguém confundir. Aqui a conta é feita uma vez e as duas telas
 * mostram o mesmo número.
 */
export function loteVigente(
  operacao: Pick<Operacao, "preco" | "preco_no_dia" | "prazo_lote">,
  hoje = new Date(),
): { valor: number | null; antecipado: boolean; rotulo: string } {
  const temDois = operacao.preco_no_dia !== null && operacao.prazo_lote !== null;

  if (!temDois) {
    return { valor: operacao.preco, antecipado: false, rotulo: formatarPreco(operacao.preco) };
  }

  const prazo = new Date(`${operacao.prazo_lote}T23:59:59`);
  const dentro = hoje <= prazo;

  return {
    valor: dentro ? operacao.preco : operacao.preco_no_dia,
    antecipado: dentro,
    rotulo: dentro
      ? `${formatarPreco(operacao.preco)} até ${dataCurta(operacao.prazo_lote!)}`
      : formatarPreco(operacao.preco_no_dia),
  };
}

/** Vagas restantes de um lado. `null` = sem teto. */
export function vagasRestantes(lado: Lado, confirmadas: number): number | null {
  if (lado.vagas === null) return null;
  return Math.max(0, lado.vagas - confirmadas);
}

/** Operação que já aconteceu não aceita mais inscrição. */
export function jaPassou(operacao: Pick<Operacao, "data">, hoje = new Date()): boolean {
  const [ano, mes, dia] = operacao.data.split("-").map(Number);
  const fim = new Date(ano, mes - 1, dia, 23, 59, 59);
  return hoje > fim;
}

export function abertaParaInscricao(
  operacao: Pick<Operacao, "status" | "data">,
  hoje = new Date(),
): boolean {
  return operacao.status === "publicada" && !jaPassou(operacao, hoje);
}

/** Nome que aparece na lista: "Guilherme A. R.I.S.E" */
export function linhaDaLista(linha: LinhaDaLista): string {
  const nome = linha.nome?.trim() || linha.nickname || "Jogador";
  const extra = linha.acompanhantes > 0 ? ` +${linha.acompanhantes}` : "";
  return linha.etiqueta_equipe ? `${nome} ${linha.etiqueta_equipe}${extra}` : `${nome}${extra}`;
}

export const OBSERVACOES_MAXIMO = 600;
export const PAGAMENTO_MAXIMO = 400;

/* ==================================================================
   Ajustes do cadastro de operação
   ================================================================== */

import { ESTILOS } from "./conta";

/**
 * Estilos que uma OPERAÇÃO pode ter.
 *
 * É a lista do perfil mais "Misto", que é o fim de semana mais comum
 * — metade recreativo, metade milsim. No perfil "misto" não entra: lá
 * o estilo serve para segmentar, e quem marca tudo não segmenta nada.
 */
export const ESTILOS_OPERACAO = [
  ...ESTILOS,
  { valor: "misto", rotulo: "Misto" },
] as const;

/** Mínimo de lados numa operação. Menos que dois não é jogo. */
export const LADOS_MINIMO = 2;
/** Teto de lados. Acima disso é planilha, não formulário. */
export const LADOS_MAXIMO = 6;

/**
 * Lê dinheiro escrito por gente: "R$ 1.234,56", "35", "35,00", "1234.56".
 *
 * O parser antigo fazia `replace(",", ".")` e transformava "1.234,56"
 * em "1.234.56" — virava NaN e o preço sumia sem avisar.
 *
 * Devolve `null` para vazio (preço a combinar) e `undefined` para
 * texto que não é número, para a tela conseguir separar os dois casos.
 */
export function lerPreco(bruto: string): number | null | undefined {
  const limpo = bruto.replace(/\s|R\$/gi, "").trim();
  if (!limpo) return null;

  // Formato brasileiro: ponto é milhar, vírgula é decimal.
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;

  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return undefined;

  const valor = Number(normalizado);
  if (!Number.isFinite(valor) || valor < 0 || valor > 99999.99) return undefined;
  return valor;
}

/** Valor do banco de volta para o campo do formulário: "35,00". */
export function precoParaEntrada(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ==================================================================
   Operação aberta x fechada, e o filtro da agenda
   ================================================================== */

export const VISIBILIDADES = {
  aberta: {
    rotulo: "Aberta",
    ajuda: "Qualquer um vê a lista e confirma presença pelo site.",
  },
  fechada: {
    rotulo: "Fechada",
    ajuda:
      "Aparece na agenda, mas a lista e a inscrição só abrem para quem receber " +
      "o seu link. Quem quiser entrar te chama no WhatsApp.",
  },
} as const;

export type Visibilidade = keyof typeof VISIBILIDADES;

/** Campos que a operação ganhou depois da primeira versão. */
export interface OperacaoRegiao {
  uf: string | null;
  cidade: string | null;
  cidade_slug: string | null;
  visibilidade: Visibilidade;
  /** Só o organizador recebe este valor — é ele que abre a lista fechada. */
  chave_acesso: string | null;
  whatsapp_contato: string | null;
}

/**
 * Cookie que guarda o convite aceito, um por evento.
 *
 * Prefixo + id do evento: receber o convite de um jogo não abre a
 * lista de outro.
 */
export const COOKIE_CONVITE = "ca-convite-";

/** Quanto tempo o convite aceito vale no navegador de quem recebeu. */
export const DIAS_DO_CONVITE = 120;

/**
 * O link exclusivo do evento fechado.
 *
 * Endereço próprio (`/convite/<chave>`) e não `?k=` colado no endereço
 * público: a query string se perde quando alguém copia só até o "?", e
 * os dois links ficavam iguais na aparência — quem recebia não sabia
 * qual repassar.
 */
export function linkDeConvite(
  operacao: Partial<Pick<OperacaoRegiao, "chave_acesso">>,
  base: string,
): string | null {
  if (!operacao.chave_acesso) return null;
  return new URL(`/convite/${operacao.chave_acesso}`, base).href;
}

/**
 * Endereço público do evento. É o que vale para evento aberto; no
 * fechado, este é o link que mostra só a capa.
 */
export function linkDaOperacao(
  operacao: Pick<Operacao, "slug"> & Partial<Pick<OperacaoRegiao, "visibilidade" | "chave_acesso">>,
  base: string,
): string {
  return new URL(`/operacoes/${operacao.slug}`, base).href;
}

/**
 * Mensagem pronta para quem quer entrar numa operação fechada.
 *
 * O texto já diz qual operação é: o organizador que roda três jogos no
 * mês não precisa perguntar "qual deles?" a cada mensagem.
 */
export function linkPedidoDeConvite(
  numero: string,
  operacao: Pick<Operacao, "data">,
  local: string,
): string {
  const digitos = numero.replace(/\D/g, "");
  const comPais = digitos.startsWith("55") ? digitos : `55${digitos}`;
  const texto = `Olá! Vi a operação de ${dataCurta(operacao.data)} no ${local} pela Comunidade Airsoft e queria entrar na lista.`;
  return `https://wa.me/${comPais}?text=${encodeURIComponent(texto)}`;
}

/* ==================================================================
   Quanto falta — o dado que o organizador procura primeiro
   ================================================================== */

/**
 * Dias inteiros entre hoje e a data da operação. Negativo = passou.
 * Compara só a data, nunca a hora: operação "de hoje" continua sendo
 * hoje às 22h.
 */
export function diasAte(data: string, hoje = new Date()): number {
  const [ano, mes, dia] = data.split("-").map(Number);
  const alvo = Date.UTC(ano, mes - 1, dia);
  const base = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo - base) / 86_400_000);
}

/**
 * "É hoje", "Amanhã", "em 6 dias", "em 3 semanas", "há 21 dias".
 *
 * A tela mostrava só "segunda-feira, 31 de agosto". Data absoluta não
 * responde a pergunta que o organizador faz ao abrir a lista — que é
 * "quanto tempo eu ainda tenho".
 */
export function quantoFalta(data: string, hoje = new Date()): string {
  const dias = diasAte(data, hoje);

  if (dias === 0) return "É hoje";
  if (dias === 1) return "Amanhã";
  if (dias === -1) return "Foi ontem";

  if (dias > 0) {
    if (dias < 14) return `em ${dias} dias`;
    if (dias < 60) return `em ${Math.round(dias / 7)} semanas`;
    return `em ${Math.round(dias / 30)} meses`;
  }

  const passados = Math.abs(dias);
  if (passados < 14) return `há ${passados} dias`;
  if (passados < 60) return `há ${Math.round(passados / 7)} semanas`;
  return `há ${Math.round(passados / 30)} meses`;
}

/** Urgência para pintar o selo: a semana da operação pede destaque. */
export function urgencia(data: string, hoje = new Date()): "hoje" | "semana" | "longe" {
  const dias = diasAte(data, hoje);
  if (dias <= 1 && dias >= 0) return "hoje";
  if (dias > 1 && dias <= 7) return "semana";
  return "longe";
}

/**
 * Ocupação da operação: confirmados sobre o total de vagas.
 *
 * `total` só existe quando TODOS os lados têm teto — um lado sem
 * limite torna a soma mentira. Nesse caso a tela mostra só o número
 * de confirmados, sem denominador.
 */
export function ocupacao(
  lados: Pick<Lado, "vagas">[],
  confirmados: number,
): { confirmados: number; total: number | null; cheio: boolean; fracao: number | null } {
  const semTeto = lados.length === 0 || lados.some((l) => l.vagas === null);
  const total = semTeto ? null : lados.reduce((soma, l) => soma + (l.vagas ?? 0), 0);
  return {
    confirmados,
    total,
    cheio: total !== null && confirmados >= total,
    fracao: total ? Math.min(1, confirmados / total) : null,
  };
}
