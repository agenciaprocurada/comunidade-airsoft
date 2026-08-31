/** Nomes por sigla — usados em títulos, breadcrumbs e meta tags dos hubs. */
export const NOME_UF: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AM: "Amazonas",
  AP: "Amapá",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MG: "Minas Gerais",
  MS: "Mato Grosso do Sul",
  MT: "Mato Grosso",
  PA: "Pará",
  PB: "Paraíba",
  PE: "Pernambuco",
  PI: "Piauí",
  PR: "Paraná",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RO: "Rondônia",
  RR: "Roraima",
  RS: "Rio Grande do Sul",
  SC: "Santa Catarina",
  SE: "Sergipe",
  SP: "São Paulo",
  TO: "Tocantins",
};

/**
 * Siglas em ordem alfabética, derivadas de NOME_UF.
 *
 * Existe aqui, e não em content.config.ts, porque páginas SSR precisam
 * da lista para montar `<select>` — e importar o content config numa
 * rota de servidor arrastaria junto os loaders do Supabase.
 */
export const SIGLAS_UF: string[] = Object.keys(NOME_UF).sort();

/**
 * Gera slug de URL: minúsculas, sem acento, hífen no lugar de espaço.
 * Usado na importação da planilha de coleta para montar `cidade_slug`.
 */
export function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * "R$ 60" · "R$ 60 a R$ 90" · "A combinar"
 *
 * `precos` é o texto livre vindo do levantamento ("Consultar",
 * "Pacote a partir de R$ 70") e tem precedência: é mais honesto
 * mostrar o que o campo divulga do que inventar uma faixa.
 */
export function faixaDeValor(
  min?: number,
  max?: number,
  precos?: string,
): string {
  if (precos) return precos;
  if (min == null && max == null) return "A combinar";
  if (min != null && max != null && min !== max) {
    return `R$ ${min} a R$ ${max}`;
  }
  return `R$ ${min ?? max}`;
}

/** Rótulos de modalidade — o diretório cobre airsoft e paintball. */
export const ROTULO_MODALIDADE: Record<string, string> = {
  airsoft: "Airsoft",
  paintball: "Paintball",
  ambos: "Airsoft e paintball",
};

/** Termo para título//SEO de listagem, por modalidade. */
export const TERMO_MODALIDADE: Record<string, string> = {
  airsoft: "airsoft",
  paintball: "paintball",
  ambos: "airsoft e paintball",
};

/** Rótulos legíveis para os enums do schema. */
export const ROTULO_TERRENO: Record<string, string> = {
  mata: "Mata",
  cqb: "CQB",
  urbano: "Urbano",
  misto: "Misto",
};

export const ROTULO_ESTRUTURA: Record<string, string> = {
  "safe-zone-coberta": "Safe zone coberta",
  banheiro: "Banheiro",
  estacionamento: "Estacionamento",
  "aluguel-equipamento": "Aluguel de equipamento",
  "loja-no-local": "Loja no local",
  lanchonete: "Lanchonete",
  chuveiro: "Chuveiro",
  energia: "Tomada / energia",
};

export const ROTULO_CATEGORIA_LOJA: Record<string, string> = {
  replicas: "Réplicas",
  upgrade: "Upgrade",
  vestuario: "Vestuário",
  consumivel: "Consumível",
  acessorio: "Acessório",
};

/**
 * Preposição correta antes do nome de cada estado.
 *
 * "em Rio Grande do Sul" está errado — é "NO Rio Grande do Sul".
 * Uns pedem artigo masculino (no Paraná), outros feminino (na Bahia)
 * e outros nenhum (em Goiás). Como isso aparece em <title> e <h1> dos
 * hubs, que são o principal ativo de SEO do projeto, o erro fica
 * visível no resultado do Google.
 */
const PREPOSICAO: Record<string, "no" | "na" | "em"> = {
  AC: "no", AL: "em", AM: "no", AP: "no", BA: "na", CE: "no",
  DF: "no", ES: "no", GO: "em", MA: "no", MG: "em", MS: "no",
  MT: "no", PA: "no", PB: "na", PE: "em", PI: "no", PR: "no",
  RJ: "no", RN: "no", RO: "em", RR: "em", RS: "no", SC: "em",
  SE: "em", SP: "em", TO: "no",
};

/**
 * "no Rio Grande do Sul", "na Bahia", "em São Paulo".
 * Passe a sigla; devolve a expressão pronta para colar na frase.
 */
export function noEstado(sigla: string): string {
  const nome = NOME_UF[sigla] ?? sigla;
  return `${PREPOSICAO[sigla] ?? "em"} ${nome}`;
}

/** Rótulos do tipo de operação da loja (doc §4.4). */
export const ROTULO_TIPO_LOJA: Record<string, string> = {
  fisica: "Loja física",
  online: "Loja online",
  ambas: "Física e online",
};

/**
 * Monta o link do WhatsApp a partir do número guardado no banco.
 *
 * O banco guarda só os dígitos com DDD; o wa.me exige o código do
 * país. Concatenar 55 na hora de renderizar evita ter que normalizar
 * o dado histórico de novo a cada carga.
 */
export function linkWhatsapp(numero: string): string {
  const digitos = numero.replace(/\D/g, "");
  const comPais = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${comPais}`;
}

/* ============================================================
   Armeiros — vocabulário do diretório de manutenção.

   Os valores são os mesmos das constraints de db/schema-armeiros.sql.
   Mudar um rótulo aqui é seguro; mudar uma CHAVE exige migração no
   banco, senão o filtro passa a devolver zero em silêncio.
   ============================================================ */

/** Rótulos do tipo de armeiro. */
export const ROTULO_TIPO_ARMEIRO: Record<string, string> = {
  autonomo: "Autônomo",
  oficina: "Oficina",
  loja: "Atende em loja",
};

/**
 * Plataformas: o que ele abre.
 *
 * Não é detalhe de nerd — é o primeiro filtro real. Quem só mexe em
 * elétrica não vai resolver a GBBR de ninguém, e mandar a réplica para
 * quem não trabalha com ela custa frete, prazo e risco.
 *
 * O eixo é a PLATAFORMA, não a versão da gearbox, porque é assim que o
 * mercado fala e é o único nível que as fontes públicas trazem. A
 * versão vive em ROTULO_GEARBOX, logo abaixo.
 */
export const ROTULO_PLATAFORMA_ARMEIRO: Record<string, string> = {
  aeg: "AEG (elétrica)",
  aep: "AEP (pistola elétrica)",
  gbb: "GBB (pistola a gás)",
  gbbr: "GBBR (rifle a gás)",
  hpa: "HPA",
  spring: "Spring / sniper (VSR)",
  ptw: "PTW",
};

/** Versão curta, para caber nas etiquetas do card. */
export const ROTULO_PLATAFORMA_CURTO: Record<string, string> = {
  aeg: "AEG",
  aep: "AEP",
  gbb: "GBB",
  gbbr: "GBBR",
  hpa: "HPA",
  spring: "Spring",
  ptw: "PTW",
};

/**
 * Versão da gearbox — detalhe FINO, e por isso separado da plataforma.
 *
 * Nenhuma lista pública de armeiro traz isto: elas dizem "faço AEG". A
 * versão só o próprio armeiro sabe, então este campo enche pelo
 * auto-cadastro e pela reivindicação da ficha, nunca por levantamento.
 */
export const ROTULO_GEARBOX: Record<string, string> = {
  v2: "Gearbox V2",
  v3: "Gearbox V3",
  v6: "Gearbox V6",
  v7: "Gearbox V7",
};

/** Serviços: o que ele faz depois de abrir. */
export const ROTULO_SERVICO_ARMEIRO: Record<string, string> = {
  manutencao: "Manutenção preventiva",
  reparo: "Conserto de pane",
  upgrade: "Upgrade de internos",
  shimming: "Shimming",
  aoe: "Correção de AOE",
  "hop-up": "Hop-up e R-hop",
  eletronica: "Eletrônica (MOSFET, gatilho eletrônico)",
  solda: "Solda e fiação",
  customizacao: "Customização",
  pintura: "Pintura",
};

export const ROTULO_SERVICO_CURTO: Record<string, string> = {
  manutencao: "Manutenção",
  reparo: "Conserto",
  upgrade: "Upgrade",
  shimming: "Shimming",
  aoe: "AOE",
  "hop-up": "Hop-up",
  eletronica: "Eletrônica",
  solda: "Solda",
  customizacao: "Customização",
  pintura: "Pintura",
};

/**
 * Frase de atendimento a partir dos dois booleanos.
 *
 * Aparece no card e na ficha. "Atende por envio" é a informação que
 * faz um armeiro de Goiás servir alguém do Acre — e é exatamente o
 * que um mapa por proximidade esconderia.
 */
export function comoAtende(presencial: boolean, envio: boolean): string {
  if (presencial && envio) return "Presencial e por envio";
  if (envio) return "Só por envio";
  return "Só presencial";
}

/**
 * "cachoeirinha" → "Cachoeirinha"; "santa cruz do sul" → "Santa Cruz do Sul".
 *
 * A cidade chega digitada pelo próprio usuário, então vem como ele
 * escreveu — inclusive tudo em minúscula. Em tela de conta isso passa;
 * em título de página pública, que é o que o Google mostra, não passa.
 *
 * As preposições ficam minúsculas porque é assim que se escreve nome de
 * cidade em português, e "Santa Cruz Do Sul" denuncia texto gerado por
 * máquina na primeira olhada.
 */
const MINUSCULAS = new Set(["de", "do", "da", "dos", "das", "e", "d'"]);

export function nomeDeCidade(bruto: string | null): string | null {
  const limpo = bruto?.trim().replace(/\s+/g, " ");
  if (!limpo) return null;

  return limpo
    .split(" ")
    .map((palavra, i) => {
      const minuscula = palavra.toLocaleLowerCase("pt-BR");
      if (i > 0 && MINUSCULAS.has(minuscula)) return minuscula;
      // Nome já escrito com maiúscula no meio ("McDonald") não é
      // reescrito: só arruma quem veio todo em caixa baixa.
      if (palavra !== minuscula) return palavra;
      return minuscula.charAt(0).toLocaleUpperCase("pt-BR") + minuscula.slice(1);
    })
    .join(" ");
}
