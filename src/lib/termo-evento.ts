/**
 * Termo de consentimento assinado online (area restrita /termos-evento e
 * link publico /assinar/<codigo>). Schema em db/schema-termos-evento.sql.
 */

/** Unico e-mail que entra no painel. Espelha `e_dono_termos()` no banco. */
export const EMAIL_DONO_TERMOS = "agenciaprocurada@gmail.com";

export function ehDonoTermos(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === EMAIL_DONO_TERMOS;
}

/* ------------------------------ codigo do link ----------------------------- */

const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789"; // sem 0/o/1/i/l: vai por WhatsApp

/** 10 caracteres aleatorios (~50 bits): nao da para adivinhar o link de outro evento. */
export function gerarCodigo(tamanho = 10): string {
  const bytes = new Uint8Array(tamanho);
  crypto.getRandomValues(bytes);
  let saida = "";
  for (const b of bytes) saida += ALFABETO[b % ALFABETO.length];
  return saida;
}

export const CODIGO_VALIDO = /^[a-z0-9]{8,16}$/;

/** 32 caracteres hexadecimais (128 bits): codigo secreto do link de consulta. */
export function gerarTokenLista(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------ validacoes -------------------------------- */

export function soDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function cpfValido(bruto: string): boolean {
  const d = soDigitos(bruto);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (base: number) => {
    let soma = 0;
    for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function emailValido(email: string): boolean {
  return email.length <= 160 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/** DDD + numero (10 ou 11 digitos), aceitando 55 na frente. */
export function telefoneValido(bruto: string): boolean {
  let d = soDigitos(bruto);
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return d.length === 10 || d.length === 11;
}

export function normalizarTelefone(bruto: string): string {
  let d = soDigitos(bruto);
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return d;
}

export function formatarCpf(cpf: string): string {
  const d = soDigitos(cpf);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf;
}

/** 123.***.***-45 — para listas onde o CPF inteiro nao precisa aparecer. */
export function mascararCpf(cpf: string): string {
  const d = soDigitos(cpf);
  return d.length === 11 ? `${d.slice(0, 3)}.***.***-${d.slice(9)}` : "***";
}

export function formatarTelefone(tel: string): string {
  const d = normalizarTelefone(tel);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel;
}

/**
 * Confere se o PNG do canvas tem tracos de verdade. Um canvas vazio vira
 * um PNG de poucas centenas de bytes; uma assinatura real passa de 1,5 KB.
 */
export function assinaturaPlausivel(dataUrl: string): boolean {
  return (
    dataUrl.startsWith("data:image/png;base64,") &&
    dataUrl.length >= 1500 &&
    dataUrl.length <= 400_000 &&
    /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dataUrl)
  );
}

/* --------------------------------- datas ---------------------------------- */

/** 'AAAA-MM-DD' (coluna date) -> '12/10/2026', sem deslocar por fuso. */
export function dataBr(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function dataHoraBr(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------ texto do termo ---------------------------- */

interface DadosEvento {
  nome: string;
  data?: string | null; // AAAA-MM-DD
  local?: string | null;
  organizador?: string | null;
}

/**
 * MODELO de termo de responsabilidade para evento de airsoft.
 *
 * Nao e peca juridica revisada: antes de usar em evento real, passe por
 * advogado (principalmente as clausulas 5 e 6, de maioridade e isencao).
 * O texto final fica salvo no evento e pode ser editado ate a primeira
 * assinatura.
 */
export function textoPadrao(e: DadosEvento): string {
  const partes = [`do evento de airsoft "${e.nome}"`];
  if (e.data) partes.push(`marcado para ${dataBr(e.data)}`);
  if (e.local) partes.push(`em ${e.local}`);
  if (e.organizador) partes.push(`organizado por ${e.organizador}`);
  const evento = partes.join(", ");
  const org = e.organizador ? e.organizador : "a organização do evento";

  return [
    "## 1. Objeto",
    `Este termo é assinado por quem vai participar, como jogador, ${evento}. Ele vale somente para este evento.`,
    "## 2. Ciência dos riscos",
    "O airsoft é um esporte de simulação com réplicas que disparam esferas plásticas (BBs) em alta velocidade. Declaro que sei que a atividade envolve riscos reais, entre eles: impactos de BB (dor, hematomas e escoriações); lesões nos olhos, no rosto e nos dentes quando a proteção é retirada ou inadequada; quedas, torções e cortes em terreno irregular; esforço físico intenso, calor, frio e desidratação; e picadas de insetos ou animais peçonhentos em áreas abertas.",
    "## 3. Equipamento de proteção e potência das réplicas",
    "Comprometo-me a usar, durante todo o tempo em que estiver na área de jogo, proteção de olhos fechada e própria para airsoft (óculos ou máscara que não permita a passagem de uma BB), além das demais proteções exigidas pela organização. Sei que é proibido retirar a proteção dos olhos dentro da área de jogo. Só usarei réplica dentro do limite de potência (FPS ou joules) informado pela organização e aceito que ela seja medida antes do jogo.",
    "## 4. Regras e conduta",
    `Vou respeitar o briefing de segurança, as regras do jogo, as áreas proibidas e as decisões de ${org} e dos árbitros. Não consumirei álcool ou drogas antes ou durante o evento e não portarei réplica carregada fora da área de jogo. Aceito ser retirado do jogo, sem reembolso, se descumprir regras de segurança ou colocar outras pessoas em risco.`,
    "## 5. Idade e condição de saúde",
    "Declaro que tenho 18 anos ou mais e que estou em condições físicas e de saúde adequadas para a atividade, sem restrição médica que me impeça de participar. Comprometo-me a avisar a organização sobre qualquer condição relevante. Quem tem menos de 18 anos não deve assinar este termo: a participação depende de autorização do responsável legal, combinada diretamente com a organização.",
    "## 6. Responsabilidade",
    `Participo por livre e espontânea vontade, ciente dos riscos descritos. Assumo a responsabilidade pelos riscos inerentes à prática e pelos danos que eu causar a outras pessoas ou ao local ao descumprir as regras. Na extensão permitida pela lei, isento ${org} e os responsáveis pelo local de responsabilidade por acidentes decorrentes dos riscos inerentes à atividade, exceto em caso de dolo ou culpa grave deles, ou quando a lei não permitir essa isenção.`,
    "## 7. Uso de imagem",
    "Autorizo, sem custo, o uso de fotos e vídeos do evento em que eu apareça, para divulgação do evento e da comunidade de airsoft em redes sociais e sites da organização. Posso pedir a retirada de uma imagem minha pelo contato da organização.",
    "## 8. Proteção de dados pessoais (LGPD)",
    `Os dados que informo neste termo (nome completo, e-mail, telefone, CPF e assinatura, além de data e hora, endereço IP e navegador usados na assinatura) serão tratados por ${org} para identificar o participante, comprovar a minha ciência e a aceitação deste termo e atender a obrigações legais e ao exercício regular de direitos, inclusive em eventual disputa judicial. Os dados não serão vendidos e ficam guardados com acesso restrito pelo prazo necessário a essas finalidades. Posso pedir confirmação, acesso, correção ou eliminação dos dados, nos limites da lei, pelo contato da organização.`,
    "## 9. Assinatura eletrônica",
    "Concordo que este termo seja assinado eletronicamente e que a minha assinatura desenhada, junto com os dados e registros acima, comprova a minha manifestação de vontade, nos termos da Lei nº 14.063/2020 (assinatura eletrônica simples) e do art. 10, § 2º, da MP nº 2.200-2/2001. Li o termo por inteiro e concordo com ele.",
  ].join("\n\n");
}

export interface BlocoTermo {
  tipo: "titulo" | "paragrafo";
  texto: string;
}

/**
 * Quebra o texto em blocos para a tela. Linha que comeca com "## " vira
 * titulo; o resto, paragrafo. A tela imprime tudo como TEXTO (o Astro
 * escapa), nunca como HTML: o texto e digitado por uma pessoa e mostrado
 * para centenas.
 */
export function blocosDoTermo(texto: string): BlocoTermo[] {
  return texto
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) =>
      b.startsWith("## ")
        ? { tipo: "titulo" as const, texto: b.slice(3).trim() }
        : // "2. DECLARAÇÃO DE CIÊNCIA": linha única numerada em caixa alta também é título
          /^\d+\.\s+[^a-zà-ÿ\n]+$/.test(b)
          ? { tipo: "titulo" as const, texto: b }
          : { tipo: "paragrafo" as const, texto: b },
    );
}

/* ----------------------------------- csv ---------------------------------- */

/** Protege a celula contra injecao de formula no Excel e escapa aspas. */
export function celulaCsv(valor: string | number | null | undefined): string {
  let s = String(valor ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
