/**
 * Achados — produtos indicados com link de afiliado.
 *
 * O que a vitrine (/achados) e o admin (/conta/admin/achados) têm em
 * comum: as lojas aceitas, o formato do preço e o link que sai do site.
 *
 * Um produto tem até uma oferta por loja (tabela `achado_ofertas`,
 * chave única em `achado_id, loja`). Por isso o formulário do admin não
 * tem "adicionar oferta": é uma linha fixa por loja, e URL vazia
 * significa "não tem nessa loja".
 */

/** `em` é como se fala: "no Mercado Livre", "na Shopee". */
export const LOJAS = [
  { valor: "mercadolivre", rotulo: "Mercado Livre", em: "no Mercado Livre" },
  { valor: "shopee", rotulo: "Shopee", em: "na Shopee" },
  { valor: "aliexpress", rotulo: "AliExpress", em: "no AliExpress" },
  { valor: "amazon", rotulo: "Amazon", em: "na Amazon" },
  { valor: "outra", rotulo: "Outra loja", em: "na loja" },
] as const;

export type Loja = (typeof LOJAS)[number]["valor"];

export const ROTULO_LOJA: Record<Loja, string> = Object.fromEntries(
  LOJAS.map((l) => [l.valor, l.rotulo]),
) as Record<Loja, string>;

export const EM_LOJA: Record<Loja, string> = Object.fromEntries(
  LOJAS.map((l) => [l.valor, l.em]),
) as Record<Loja, string>;

export function ehLoja(valor: unknown): valor is Loja {
  return LOJAS.some((l) => l.valor === valor);
}

export const STATUS_ACHADO = [
  { valor: "publicado", rotulo: "Publicado" },
  { valor: "rascunho", rotulo: "Rascunho (não aparece no site)" },
] as const;

export type StatusAchado = (typeof STATUS_ACHADO)[number]["valor"];

export interface Oferta {
  id: string;
  loja: Loja;
  url: string;
  preco: number | null;
  /** Valor "de", riscado. Só existe junto com `preco` e maior que ele. */
  preco_cheio: number | null;
  preco_visto_em: string | null;
}

export interface Achado {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  status: StatusAchado;
  criado_em: string;
  atualizado_em: string;
  achado_ofertas: Oferta[];
}

/** O que a vitrine e o admin pedem ao banco. A oferta vem aninhada. */
export const COLUNAS_ACHADO =
  "id,nome,descricao,imagem_url,status,criado_em,atualizado_em," +
  "achado_ofertas(id,loja,url,preco,preco_cheio,preco_visto_em)";

/**
 * Ofertas na ordem das lojas, e não na ordem em que foram cadastradas
 * — o card mostra sempre Mercado Livre primeiro, depois Shopee etc.
 */
export function ordenarOfertas(ofertas: Oferta[]): Oferta[] {
  const posicao = new Map(LOJAS.map((l, i) => [l.valor, i]));
  return [...ofertas].sort((a, b) => (posicao.get(a.loja) ?? 99) - (posicao.get(b.loja) ?? 99));
}

// ------------------------------------------------------------
// Preço
// ------------------------------------------------------------

/** Depois disso o preço conta como velho e o admin é avisado. */
export const DIAS_PRECO_VELHO = 30;

const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarPreco(valor: number | null | undefined): string | null {
  return valor == null ? null : REAIS.format(valor);
}

/**
 * "set/26" — só mês e ano. O dia exato não ajuda o visitante e faz o
 * card parecer mais desatualizado do que é.
 */
export function mesDoPreco(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const [ano, mes] = iso.split("-").map(Number);
  if (!ano || !mes) return null;
  const nome = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "short" });
  return `${nome.replace(".", "")}/${String(ano).slice(2)}`;
}

export function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia) return null;
  const visto = Date.UTC(ano, mes - 1, dia);
  const hoje = new Date();
  const agora = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.max(0, Math.round((agora - visto) / 86_400_000));
}

export function precoVelho(oferta: Pick<Oferta, "preco" | "preco_visto_em">): boolean {
  if (oferta.preco == null) return false;
  const dias = diasDesde(oferta.preco_visto_em);
  return dias === null || dias > DIAS_PRECO_VELHO;
}

/**
 * "189,90" / "R$ 1.234,56" / "1234.56" → 1234.56. Vazio → null.
 * Aceita o que a pessoa colar da loja, sem exigir formato.
 */
export function lerPreco(texto: string): number | null | typeof NaN {
  // Só o "R$" sai de graça. Qualquer outra letra é erro, não ruído:
  // "abc" apagado em silêncio viraria "sem preço" e ninguém perceberia.
  const limpo = texto.replace(/R\$/gi, "").trim();
  if (!limpo) return null;
  if (/[^\d,.\s]/.test(limpo)) return NaN;

  // Com vírgula: é o decimal brasileiro; o ponto que sobrar é milhar.
  // Sem vírgula e com um ponto só: pode ser "1234.56" (decimal) ou
  // "1.234" (milhar) — adota decimal se tiver 1 ou 2 casas depois.
  let normalizado: string;
  if (limpo.includes(",")) {
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else {
    const partes = limpo.split(".");
    normalizado =
      partes.length === 2 && partes[1].length <= 2 ? limpo : partes.join("");
  }

  const numero = Number(normalizado.replace(/\s/g, ""));
  return Number.isFinite(numero) && numero > 0 ? Math.round(numero * 100) / 100 : NaN;
}

/** Data de hoje no formato do banco (`date`), sem fuso. */
export function hojeIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ------------------------------------------------------------
// Link
// ------------------------------------------------------------

/**
 * Link de afiliado sai EXATAMENTE como foi cadastrado.
 *
 * O `linkExterno` do site acrescenta UTM — aqui não: o rastreio da
 * comissão está na própria URL (parâmetro ou encurtador da loja), e
 * mexer nela é risco sem ganho, porque a loja não devolve relatório
 * por UTM de terceiro.
 *
 * `sponsored` é o que o Google pede para link pago; `nofollow` junto
 * cobre buscador que não conhece o primeiro.
 */
export function linkAfiliado(url: string) {
  return {
    href: url,
    target: "_blank" as const,
    rel: "sponsored nofollow noopener noreferrer",
  };
}

export function ehUrl(texto: string): boolean {
  try {
    const u = new URL(texto);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ------------------------------------------------------------
// O lote do dia — o que alimenta os carrosséis
// ------------------------------------------------------------

/** Quantos produtos o carrossel mostra por vez. */
export const CARROSSEL_MOSTRA = 5;
/** Teto do lote embutido na página: HTML a mais por card escondido. */
export const CARROSSEL_LOTE = 30;

/**
 * O lote é "o último dia": todos os produtos cadastrados no dia do
 * cadastro mais recente (até CARROSSEL_LOTE). Não "as últimas 24 horas" — num dia sem
 * cadastro o carrossel ficaria vazio. O dia é o de São Paulo, porque
 * uma leva às 23h30 não pode virar dois dias por causa do UTC.
 *
 * Com menos de CARROSSEL_MOSTRA no dia, completa com os anteriores:
 * carrossel de dois cards parece defeito.
 *
 * Quem sorteia os 5 que aparecem é o navegador (CarrosselAchados),
 * a cada visita. A página só carrega o lote.
 *
 * `lista` chega ordenada do mais recente para o mais antigo.
 */
export function loteDoDia(lista: Achado[], max = CARROSSEL_LOTE, min = CARROSSEL_MOSTRA): Achado[] {
  const comOferta = lista.filter((a) => a.achado_ofertas.length > 0);
  if (comOferta.length === 0) return [];

  const dia = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const ultimoDia = dia(comOferta[0].criado_em);

  const doDia = comOferta.filter((a) => dia(a.criado_em) === ultimoDia).slice(0, max);
  if (doDia.length >= min) return doDia;

  const resto = comOferta.filter((a) => !doDia.includes(a));
  return [...doDia, ...resto].slice(0, Math.max(min, doDia.length));
}

/** Embaralha (Fisher-Yates) sem mexer no original. */
export function embaralhar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// ------------------------------------------------------------
// Leitura em página SSR
// ------------------------------------------------------------

/**
 * O lote do dia para página servida por requisição (a ficha da
 * equipe). A versão de BUILD, para página estática, está em
 * achados-build.ts — mesma regra (`loteDoDia`).
 *
 * `supabase` é o cliente de `Astro.locals`; a RLS já corta o rascunho.
 * Falhou o banco, volta lista vazia e a faixa some — não derruba a ficha.
 */
export async function loteAchados(supabase: { from: (t: string) => any }): Promise<Achado[]> {
  const { data, error } = await supabase
    .from("achados")
    .select(COLUNAS_ACHADO)
    .eq("status", "publicado")
    .order("criado_em", { ascending: false })
    .limit(CARROSSEL_LOTE * 2);
  if (error) {
    console.error("Falha ao carregar os achados:", error);
    return [];
  }
  return loteDoDia((data ?? []) as Achado[]);
}
