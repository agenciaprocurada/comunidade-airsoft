/**
 * Variaveis do texto do termo.
 *
 * O texto do evento pode trazer marcadores como {{nome}} ou {{cpf}}: na
 * tela de assinatura eles sao preenchidos ao vivo com o que a pessoa
 * digitou na etapa 1, e no PDF/comprovante com o que ficou gravado.
 *
 * Variaveis aceitas:
 *   {{nome}} {{cpf}} {{nascimento}} {{telefone}} {{email}} {{equipe}}
 *   {{data_assinatura}}  (ex.: "28 de novembro de 2026")
 */

import { dataBr, formatarCpf, formatarTelefone } from "./termo-evento";

export const VARIAVEIS = [
  "nome",
  "cpf",
  "nascimento",
  "telefone",
  "email",
  "equipe",
  "data_assinatura",
] as const;
export type Variavel = (typeof VARIAVEIS)[number];

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** '2026-11-28' ou Date -> "28 de novembro de 2026" (fuso de Brasilia). */
export function dataExtenso(origem: string | Date): string {
  const d = typeof origem === "string" ? new Date(origem) : origem;
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(d);
  const pega = (t: string) => Number(partes.find((p) => p.type === t)?.value ?? 0);
  return `${pega("day")} de ${MESES[pega("month") - 1]} de ${pega("year")}`;
}

export interface DadosParticipante {
  nome?: string | null;
  cpf?: string | null;
  nascimento?: string | null; // AAAA-MM-DD
  telefone?: string | null;
  email?: string | null;
  equipe?: string | null;
  assinadoEm?: string | Date | null;
}

/** Valor de cada variavel, ja formatado. Vazio quando nao ha o dado. */
export function valoresDasVariaveis(d: DadosParticipante): Record<Variavel, string> {
  return {
    nome: d.nome?.trim() ?? "",
    cpf: d.cpf ? formatarCpf(d.cpf) : "",
    nascimento: d.nascimento ? dataBr(d.nascimento) : "",
    telefone: d.telefone ? formatarTelefone(d.telefone) : "",
    email: d.email?.trim() ?? "",
    equipe: d.equipe?.trim() ?? "",
    data_assinatura: dataExtenso(d.assinadoEm ?? new Date()),
  };
}

/** Texto do termo ja com os dados da pessoa (PDF, comprovante, CSV). */
export function preencherTermo(texto: string, d: DadosParticipante): string {
  const v = valoresDasVariaveis(d);
  return texto.replace(/\{\{(\w+)\}\}/g, (todo, nome: string) => {
    if (!(VARIAVEIS as readonly string[]).includes(nome)) return todo;
    const valor = v[nome as Variavel];
    return valor || (nome === "equipe" ? "(não informada)" : "—");
  });
}

/**
 * Marcador {{so_assinado}}: o que vem DEPOIS dele (em uma linha so) nao
 * aparece na tela de assinatura — so no termo assinado (PDF e comprovante),
 * depois do bloco com a assinatura. Serve para o fecho do documento:
 * campos de assinatura, responsavel legal, rodape da organizacao.
 */
const MARCADOR_SO_ASSINADO = /^[ \t]*\{\{\s*so_assinado\s*\}\}[ \t]*$/m;

export function dividirTermo(texto: string): { tela: string; depois: string } {
  const m = MARCADOR_SO_ASSINADO.exec(texto);
  if (!m) return { tela: texto, depois: "" };
  return {
    tela: texto.slice(0, m.index).trimEnd(),
    depois: texto.slice(m.index + m[0].length).trim(),
  };
}

export type Trecho = { tipo: "texto"; texto: string } | { tipo: "variavel"; nome: Variavel };

/**
 * Quebra um paragrafo em pedacos de texto e variaveis, para a tela
 * imprimir cada variavel num <span> que o navegador preenche ao vivo.
 * Variavel desconhecida fica como texto literal.
 */
export function trechosComVariaveis(texto: string): Trecho[] {
  const saida: Trecho[] = [];
  let resto = 0;
  for (const m of texto.matchAll(/\{\{(\w+)\}\}/g)) {
    const nome = m[1];
    if (!(VARIAVEIS as readonly string[]).includes(nome)) continue;
    if (m.index! > resto) saida.push({ tipo: "texto", texto: texto.slice(resto, m.index) });
    saida.push({ tipo: "variavel", nome: nome as Variavel });
    resto = m.index! + m[0].length;
  }
  if (resto < texto.length) saida.push({ tipo: "texto", texto: texto.slice(resto) });
  return saida;
}

/** Idade em anos completos na data de referencia. */
export function idadeEm(nascimentoIso: string, ref = new Date()): number {
  const [a, m, d] = nascimentoIso.split("-").map(Number);
  let idade = ref.getFullYear() - a;
  if (ref.getMonth() + 1 < m || (ref.getMonth() + 1 === m && ref.getDate() < d)) idade--;
  return idade;
}

/** Data real, nao futura e com idade plausivel (5 a 110 anos). */
export function nascimentoValido(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(a, m - 1, d);
  if (dt.getFullYear() !== a || dt.getMonth() !== m - 1 || dt.getDate() !== d) return false;
  const idade = idadeEm(iso);
  return idade >= 5 && idade <= 110;
}
