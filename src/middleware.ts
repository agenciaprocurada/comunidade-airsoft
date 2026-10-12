import { defineMiddleware } from "astro:middleware";
import { criarClienteSupabase } from "./lib/supabase-servidor";
import { COLUNAS_PERFIL, type Perfil } from "./lib/conta";
import { ehDonoTermos } from "./lib/termo-evento";

/**
 * Prefixos que exigem sessao. `/reivindicar` entra aqui de proposito:
 * quem clica em "reivindique esta pagina" sem estar logado tem que ir
 * para o cadastro e voltar direto ao pedido.
 *
 * `/armeiros/cadastrar` pelo mesmo motivo, mais um: o cadastro grava
 * com `criado_por = auth.uid()`, entao sem sessao nao ha o que gravar.
 * O resto de /armeiros e publico e gerado no build.
 *
 * `/mapa`: o editor inteiro e so para quem esta logado — decisao de
 * produto, nao tecnica (salvar ja exigia sessao).
 */
const PROTEGIDAS = ["/conta", "/reivindicar", "/armeiros/cadastrar", "/mapa"];

/**
 * Painel do termo de consentimento: so o dono (um e-mail so, ver
 * EMAIL_DONO_TERMOS). Fica FORA de PROTEGIDAS de proposito — quem entra
 * aqui nao precisa ter feito o cadastro de jogador (/conta/completar).
 * O banco recusa de novo (policy com e_dono_termos), a tela nao e a
 * unica trava. Quem nao e o dono recebe 404, como na moderacao.
 */
const SO_DONO_TERMOS = ["/termos-evento"];

/** Paginas com dado pessoal: nunca ficam em cache de CDN ou do navegador. */
const SEM_CACHE = ["/termos-evento", "/assinar", "/participantes"];

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

  if (comecaCom(caminho, SO_DONO_TERMOS)) {
    if (!usuario) {
      const destino = encodeURIComponent(caminho + contexto.url.search);
      return contexto.redirect(`/entrar?destino=${destino}`, 302);
    }
    if (!ehDonoTermos(usuario.email)) {
      const resposta404 = await contexto.rewrite("/404");
      return new Response(resposta404.body, { status: 404, headers: resposta404.headers });
    }
  }

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

  if (comecaCom(caminho, SEM_CACHE)) {
    resposta.headers.set("Cache-Control", "no-store");
    resposta.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  for (const [chave, valor] of Object.entries(cabecalhosDeSessao)) {
    resposta.headers.set(chave, valor);
  }

  return resposta;
});
