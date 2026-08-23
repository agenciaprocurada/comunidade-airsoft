import { defineMiddleware } from "astro:middleware";
import { criarClienteSupabase } from "./lib/supabase-servidor";
import { COLUNAS_PERFIL, type Perfil } from "./lib/conta";

/** Prefixos que exigem sessao. */
const PROTEGIDAS = ["/conta"];

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

    const { data: perfil } = await cliente
      .from("perfis")
      .select(COLUNAS_PERFIL)
      .eq("id", usuario.id)
      .maybeSingle<Perfil>();

    contexto.locals.perfil = perfil ?? null;

    // Cadastro minimo (WhatsApp, cidade, maioridade, consentimentos)
    // e condicao para o painel. Quem nao terminou volta para la.
    if (!perfil?.onboarding_ok && !comecaCom(caminho, LIBERADAS_SEM_CADASTRO)) {
      return contexto.redirect("/conta/completar", 302);
    }
  }

  const resposta = await proximo();

  for (const [chave, valor] of Object.entries(cabecalhosDeSessao)) {
    resposta.headers.set(chave, valor);
  }

  return resposta;
});
