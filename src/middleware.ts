import { defineMiddleware } from "astro:middleware";
import { criarClienteSupabase } from "./lib/supabase-servidor";
import { COLUNAS_PERFIL, type Perfil } from "./lib/conta";

/**
 * Prefixos que exigem sessao. `/reivindicar` entra aqui de proposito:
 * quem clica em "reivindique esta pagina" sem estar logado tem que ir
 * para o cadastro e voltar direto ao pedido.
 *
 * `/armeiros/cadastrar` pelo mesmo motivo, mais um: o cadastro grava
 * com `criado_por = auth.uid()`, entao sem sessao nao ha o que gravar.
 * O resto de /armeiros e publico e gerado no build.
 */
const PROTEGIDAS = ["/conta", "/reivindicar", "/armeiros/cadastrar"];

/** Dentro de /conta, o que so administrador abre. */
const SO_ADMIN = ["/conta/admin"];

/**
 * Rotas que um usuario logado mas com cadastro incompleto ainda pode
 * abrir — senao ele fica preso num redirect para si mesmo.
 */
const LIBERADAS_SEM_CADASTRO = ["/conta/completar"];

function comecaCom(caminho: string, prefixos: string[]) {
  return prefixos.some((p) => caminho === p || caminho.startsWith(p + "/"));
}

export const onRequest = defineMiddleware(async (contexto, proximo) => {
  // Paginas do diretorio sao geradas no build e nao tem requisicao de
  // verdade: nao ha cookie para ler e o Supabase nem precisa subir.
  if (contexto.isPrerendered) return proximo();

  const { cliente, cabecalhosDeSessao } = criarClienteSupabase(contexto);
  contexto.locals.supabase = cliente;
  contexto.locals.perfil = null;
  contexto.locals.admin = false;
  contexto.locals.paginas = 0;

  // getUser() valida o token no servidor do Supabase. getSession() so
  // le o cookie e acredita nele — nao serve para autorizar nada.
  const { data } = await cliente.auth.getUser();
  const usuario = data.user ?? null;
  contexto.locals.usuario = usuario;

  const caminho = contexto.url.pathname;

  if (comecaCom(caminho, PROTEGIDAS)) {
    if (!usuario) {
      const destino = encodeURIComponent(caminho + contexto.url.search);
      return contexto.redirect(`/entrar?destino=${destino}`, 302);
    }

    const [{ data: perfil }, { data: ehAdmin }, { count: paginas }] = await Promise.all([
      cliente.from("perfis").select(COLUNAS_PERFIL).eq("id", usuario.id).maybeSingle<Perfil>(),
      cliente.from("administradores").select("id").eq("id", usuario.id).maybeSingle(),
      // "Minhas páginas" só existe no menu para quem teve alguma
      // reivindicação aprovada. Fica aqui, e não em cada página, para
      // a casca decidir o menu sem repetir consulta.
      cliente
        .from("reivindicacoes")
        .select("id", { count: "exact", head: true })
        .eq("usuario_id", usuario.id)
        .eq("status", "aprovada"),
    ]);

    contexto.locals.perfil = perfil ?? null;
    contexto.locals.admin = Boolean(ehAdmin);
    contexto.locals.paginas = paginas ?? 0;

    // Cadastro minimo (WhatsApp, cidade, maioridade, consentimentos)
    // e condicao para o painel. Quem nao terminou volta para la.
    if (!perfil?.onboarding_ok && !comecaCom(caminho, LIBERADAS_SEM_CADASTRO)) {
      return contexto.redirect("/conta/completar", 302);
    }

    // A area de moderacao some para quem nao e admin — 404, nao 403:
    // nao ha motivo de anunciar para o curioso que ela existe.
    if (comecaCom(caminho, SO_ADMIN) && !contexto.locals.admin) {
      const resposta404 = await contexto.rewrite("/404");
      return new Response(resposta404.body, { status: 404, headers: resposta404.headers });
    }
  }

  const resposta = await proximo();

  for (const [chave, valor] of Object.entries(cabecalhosDeSessao)) {
    resposta.headers.set(chave, valor);
  }

  return resposta;
});
