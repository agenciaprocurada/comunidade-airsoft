/**
 * Regras da area de usuario: forma dos dados, validacao e
 * consentimento. Fica fora das paginas para que o formulario de
 * cadastro e o de edicao usem exatamente a mesma checagem.
 */

/**
 * Versao dos textos que a pessoa aceita. TROCAR sempre que os Termos
 * ou a Politica mudarem de conteudo — e isso que fica gravado em
 * `consentimentos.versao_texto` e prova o que foi aceito.
 */
export const VERSAO_TERMOS = "2026-08-23";

export const NIVEIS = [
  { valor: "iniciante", rotulo: "Iniciante", ajuda: "Nunca joguei ou joguei poucas vezes" },
  { valor: "intermediario", rotulo: "Intermediário", ajuda: "Jogo com alguma frequência" },
  { valor: "veterano", rotulo: "Veterano", ajuda: "Jogo há anos, tenho equipamento próprio" },
] as const;

export const ESTILOS = [
  { valor: "recreativo", rotulo: "Recreativo" },
  { valor: "milsim", rotulo: "MilSim" },
  { valor: "speedsoft", rotulo: "Speedsoft" },
  { valor: "cqb", rotulo: "CQB" },
] as const;

export type Nivel = (typeof NIVEIS)[number]["valor"];
export type Estilo = (typeof ESTILOS)[number]["valor"];

/** Consentimentos que sao condicao de uso — sem eles nao ha conta. */
export const CONSENTIMENTOS_OBRIGATORIOS = [
  {
    tipo: "termos_de_uso",
    rotulo: "Li e aceito os <a href=\"/termos\" target=\"_blank\" class=\"text-oliva-300 underline\">Termos de Uso</a>.",
  },
  {
    tipo: "politica_privacidade",
    rotulo:
      "Li e aceito a <a href=\"/privacidade\" target=\"_blank\" class=\"text-oliva-300 underline\">Política de Privacidade</a>.",
  },
] as const;

/**
 * Opcionais, e pedidos SEPARADOS de proposito. Consentimento em bloco
 * unico nao sustenta o uso comercial da base na Fase 2 (doc §7.2).
 */
export const CONSENTIMENTOS_OPCIONAIS = [
  {
    tipo: "comunicacao_email",
    rotulo: "Quero receber avisos de operações e novidades por e-mail.",
  },
  {
    tipo: "comunicacao_whatsapp",
    rotulo: "Quero receber avisos da minha região por WhatsApp.",
  },
  {
    tipo: "uso_dados_recomendacao",
    rotulo:
      "Autorizo o uso do meu perfil para receber recomendações de produtos e lojas parceiras.",
  },
] as const;

export type TipoConsentimento =
  | (typeof CONSENTIMENTOS_OBRIGATORIOS)[number]["tipo"]
  | (typeof CONSENTIMENTOS_OPCIONAIS)[number]["tipo"];

export interface Perfil {
  id: string;
  nome: string | null;
  nickname: string | null;
  foto_url: string | null;
  whatsapp: string | null;
  whatsapp_verificado: boolean;
  uf: string | null;
  cidade: string | null;
  cidade_slug: string | null;
  nivel: Nivel | null;
  estilos: Estilo[];
  redes: Record<string, string>;
  maioridade: boolean;
  onboarding_ok: boolean;
  perfil_completo: boolean;
}

/**
 * O Editor de Mapas e o cadastro de operacoes so abrem para quem tem o
 * perfil completo E pelo menos uma replica cadastrada. E o "ultimo
 * passo" que o painel anuncia depois do cadastro — a regra fica aqui
 * para a pagina do mapa, a de operacoes e o painel cobrarem a MESMA
 * coisa.
 */
export function ferramentasLiberadas(
  perfil: Perfil | null,
  totalReplicas: number,
): boolean {
  return Boolean(perfil?.perfil_completo) && totalReplicas > 0;
}

export const COLUNAS_PERFIL =
  "id,nome,nickname,foto_url,whatsapp,whatsapp_verificado,uf,cidade,cidade_slug," +
  "nivel,estilos,redes,maioridade,onboarding_ok,perfil_completo";

/**
 * Normaliza o telefone digitado para E.164 (+55DDNNNNNNNNN), que e o
 * formato que o constraint do banco exige e o que a API de WhatsApp
 * vai pedir quando a confirmacao entrar.
 *
 * Aceita "(51) 99999-9999", "51999999999", "+55 51 99999-9999".
 * Devolve null quando nao da para reconhecer.
 */
export function normalizarWhatsapp(entrada: string): string | null {
  let digitos = entrada.replace(/\D/g, "");

  // Numero colado com o zero do DDD antigo: 051...
  if (digitos.length === 12 && digitos.startsWith("0")) digitos = digitos.slice(1);
  if (digitos.startsWith("55") && digitos.length >= 12) digitos = digitos.slice(2);

  // Sobrou DDD (2) + 8 ou 9 digitos.
  if (!/^[1-9]{2}[0-9]{8,9}$/.test(digitos)) return null;

  return `+55${digitos}`;
}

/** Exibe +5551999998888 como (51) 99999-8888. */
export function formatarWhatsapp(e164: string | null): string {
  if (!e164) return "";
  const digitos = e164.replace(/^\+55/, "");
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return e164;
}

/**
 * Onde guardamos, entre o clique em "Entrar" e a volta do Google, para
 * qual pagina mandar a pessoa depois. Vive poucos minutos.
 */
export const COOKIE_DESTINO = "ca-destino";

/**
 * So aceita caminho interno. Sem isso, `?destino=https://site-falso`
 * transformaria o login num redirecionador aberto — o phishing chega
 * com um link legitimo do nosso dominio.
 */
export function destinoSeguro(bruto: string | null | undefined): string {
  if (!bruto) return "/conta";
  if (!bruto.startsWith("/")) return "/conta";
  if (bruto.startsWith("//")) return "/conta";
  if (bruto.startsWith("/auth/")) return "/conta";
  return bruto;
}

/**
 * IP do visitante para o registro de consentimento. `clientAddress`
 * exige adapter; em dev pode nao existir, e ai o registro fica sem IP
 * em vez de o cadastro falhar.
 */
export function ipDaRequisicao(pegar: () => string): string | null {
  try {
    return pegar() || null;
  } catch {
    return null;
  }
}
