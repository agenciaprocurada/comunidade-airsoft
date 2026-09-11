/**
 * Últimos achados para a HOME — lidos no BUILD, não na requisição.
 *
 * A home é estática de propósito (cache de CDN, Core Web Vitals). Por
 * isso a faixa de achados entra no HTML na hora do build e só muda no
 * próximo deploy. A vitrine /achados continua viva: lá o cadastro
 * aparece na hora.
 *
 * Mesma ANON key do diretório (campos-supabase.ts): a RLS só devolve
 * `status = 'publicado'`, então rascunho não vaza por esquecimento.
 *
 * Diferença do diretório: aqui o banco fora do ar NÃO derruba o build.
 * A faixa é vitrine secundária; publicar o site sem ela é melhor do que
 * não publicar. Some da home e avisa no log.
 */
import { COLUNAS_ACHADO, type Achado } from "./achados";

const URL_BASE = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
const CHAVE = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

export async function carregarUltimosAchados(quantos: number): Promise<Achado[]> {
  if (!URL_BASE || !CHAVE) {
    console.warn("[achados] SUPABASE_URL/SUPABASE_ANON_KEY ausentes: a home sai sem a faixa de achados.");
    return [];
  }

  try {
    // Pede mais do que precisa: produto publicado sem oferta é
    // descartado abaixo, e a ordem é a da vitrine (mais recente).
    const params = new URLSearchParams({
      select: COLUNAS_ACHADO,
      status: "eq.publicado",
      order: "atualizado_em.desc",
      limit: String(quantos * 3),
    });
    const resposta = await fetch(`${URL_BASE}/rest/v1/achados?${params}`, {
      headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` },
    });

    if (!resposta.ok) {
      console.warn(`[achados] Supabase respondeu ${resposta.status}: a home sai sem a faixa de achados.`);
      return [];
    }

    const linhas = (await resposta.json()) as Achado[];
    return linhas
      .filter((a) => a.achado_ofertas.length > 0)
      .slice(0, quantos)
      // Garante número: numeric pode chegar como texto conforme o caminho.
      .map((a) => ({
        ...a,
        achado_ofertas: a.achado_ofertas.map((o) => ({
          ...o,
          preco: o.preco == null ? null : Number(o.preco),
          preco_cheio: o.preco_cheio == null ? null : Number(o.preco_cheio),
        })),
      }));
  } catch (erro) {
    console.warn("[achados] Falha ao ler os achados no build:", erro);
    return [];
  }
}
