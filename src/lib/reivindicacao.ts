/**
 * Regras da reivindicacao de campo, loja e armeiro. Compartilhadas entre o
 * formulario do solicitante e a fila do administrador, para que as
 * duas telas nunca discordem sobre o que e valido.
 */

export const TIPOS_ENTIDADE = ["campo", "loja", "armeiro"] as const;
export type TipoEntidade = (typeof TIPOS_ENTIDADE)[number];

/** Tabela e rotulo de cada tipo, para não espalhar `if` pelas páginas. */
export const ENTIDADES = {
  campo: { tabela: "campos", rotulo: "campo", artigo: "o" },
  loja: { tabela: "lojas", rotulo: "loja", artigo: "a" },
  armeiro: { tabela: "armeiros", rotulo: "armeiro", artigo: "o" },
} as const;

export const VINCULOS = [
  { valor: "dono", rotulo: "Sou o dono" },
  { valor: "socio", rotulo: "Sou sócio" },
  { valor: "gerente", rotulo: "Sou gerente ou administrador do local" },
  { valor: "autorizado", rotulo: "Fui autorizado pelo responsável" },
] as const;

export type Vinculo = (typeof VINCULOS)[number]["valor"];

export const STATUS = {
  pendente: { rotulo: "Aguardando análise", cor: "latao" },
  em_analise: { rotulo: "Em análise", cor: "info" },
  aprovada: { rotulo: "Aprovada", cor: "ok" },
  recusada: { rotulo: "Recusada", cor: "alerta" },
  cancelada: { rotulo: "Cancelada", cor: "texto-2" },
} as const;

export type StatusReivindicacao = keyof typeof STATUS;

export interface Reivindicacao {
  id: string;
  usuario_id: string;
  tipo_entidade: TipoEntidade;
  entidade_id: string;
  entidade_nome: string;
  vinculo: Vinculo;
  telefone: string | null;
  mensagem: string;
  provas: string[];
  status: StatusReivindicacao;
  motivo_analise: string | null;
  analisado_por: string | null;
  analisado_em: string | null;
  criado_em: string;
}

export const COLUNAS_REIVINDICACAO =
  "id,usuario_id,tipo_entidade,entidade_id,entidade_nome,vinculo,telefone," +
  "mensagem,provas,status,motivo_analise,analisado_por,analisado_em,criado_em";

/** O banco exige 20 caracteres; a tela avisa antes de o banco recusar. */
export const MENSAGEM_MINIMA = 20;

export function ehTipoEntidade(valor: unknown): valor is TipoEntidade {
  return typeof valor === "string" && TIPOS_ENTIDADE.includes(valor as TipoEntidade);
}

/**
 * Aceita uma lista de links colados (um por linha) e devolve só os que
 * são URL de verdade, com http/https. Link quebrado no meio da prova
 * atrapalha justamente na hora de julgar o pedido.
 */
export function limparProvas(bruto: string): { validas: string[]; invalidas: string[] } {
  const validas: string[] = [];
  const invalidas: string[] = [];

  for (const linha of bruto.split(/\r?\n/)) {
    const texto = linha.trim();
    if (!texto) continue;
    const comProtocolo = /^https?:\/\//i.test(texto) ? texto : `https://${texto}`;
    try {
      const url = new URL(comProtocolo);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      validas.push(url.href);
    } catch {
      invalidas.push(texto);
    }
  }

  return { validas, invalidas };
}

export function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
