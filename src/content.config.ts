import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { carregarCampos } from "./lib/campos-supabase";
import { carregarLojas } from "./lib/lojas-supabase";

/* ============================================================
   Estruturas compartilhadas
   ============================================================ */

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
  "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

/** Toda entidade de diretório carrega estado de verificação (doc §4.2, §9). */
const verificacao = {
  status: z.enum(["rascunho", "publicado", "inativo"]).default("rascunho"),
  verificado: z.boolean().default(false),
  /** Data da última conferência humana. Exibida na ficha (mitigação de dado podre). */
  verificado_em: z.coerce.date().optional(),
  /** De onde veio o dado: instagram | maps | facebook | submissao | proprietario */
  fonte: z.string().optional(),
  /** Preenchido quando o dono reivindica a página. */
  reivindicado_por: z.string().optional(),
};

const localizacao = {
  uf: z.enum(UFS),
  /** Slug da cidade, em minúsculas e sem acento. Compõe a URL. */
  cidade_slug: z.string().regex(/^[a-z0-9-]+$/),
  cidade: z.string(),
  endereco: z.string().optional(),
  lat: z.number().min(-34).max(6).optional(),
  lng: z.number().min(-74).max(-34).optional(),
};

/* ============================================================
   Campos / locais de jogo — doc §4.2
   ============================================================ */

const campos = defineCollection({
  /**
   * Fonte: tabela `campos` no Supabase (ver src/lib/campos-supabase.ts).
   * Os JSON em src/content/campos/ eram sementes de desenvolvimento e
   * não são mais lidos.
   */
  loader: carregarCampos,
  schema: z.object({
    nome: z.string(),
    descricao: z.string(),
    ...localizacao,
    ...verificacao,

    modalidade: z.enum(["airsoft", "paintball", "ambos"]),
    /** "Campo comercial", "Campo de equipe"… texto livre do levantamento. */
    tipo_operacao: z.string().optional(),
    /** Texto original do status na planilha: "A confirmar", "Ativo (novo)"… */
    status_original: z.string().optional(),
    regiao: z.string().optional(),
    bairro: z.string().optional(),

    /** Preço é texto livre: a planilha traz "Consultar", pacotes, faixas. */
    precos: z.string().optional(),
    /** Descrição original do tipo de campo, antes de virar `terreno`. */
    tipo_campo_original: z.string().optional(),

    /** Reputação de terceiro (Google). Exibida como tal — nunca como nossa. */
    google_nota: z.number().min(0).max(5).optional(),
    google_avaliacoes: z.number().int().nonnegative().optional(),
    confianca: z.enum(["alta", "media", "baixa"]).optional(),

    /**
     * O levantamento nem sempre traz o tipo de terreno, então isto
     * deixou de ser obrigatório: campo sem terreno declarado ainda é
     * um campo útil no diretório.
     */
    terreno: z.array(z.enum(["mata", "cqb", "urbano", "misto"])).default([]),

    estrutura: z
      .array(
        z.enum([
          "safe-zone-coberta",
          "banheiro",
          "estacionamento",
          "aluguel-equipamento",
          "loja-no-local",
          "lanchonete",
          "chuveiro",
          "energia",
        ]),
      )
      .default([]),

    /** Limite de FPS por categoria de réplica, medido com BB 0.20g. */
    fps: z
      .array(
        z.object({
          categoria: z.string(),
          limite: z.number().int().positive(),
          observacao: z.string().optional(),
        }),
      )
      .default([]),

    funcionamento: z.string().optional(),
    valor_min: z.number().nonnegative().optional(),
    valor_max: z.number().nonnegative().optional(),

    aceita_iniciante: z.boolean().optional(),
    tem_aluguel: z.boolean().optional(),

    contato: z
      .object({
        whatsapp: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().email().optional(),
        instagram: z.string().optional(),
        site: z.string().url().optional(),
        facebook: z.string().url().optional(),
      })
      .default({}),

    fotos: z
      .array(z.object({ src: z.string(), alt: z.string() }))
      .default([]),
  }),
});

/* ============================================================
   Lojas — doc §4.4
   ============================================================ */

const lojas = defineCollection({
  /**
   * Fonte: tabela `lojas` no Supabase (ver src/lib/lojas-supabase.ts).
   * A carga inicial vive em db/lojas.json e é aplicada por
   * db/carregar-lojas.mjs — o JSON é a semente, o banco é a verdade.
   */
  loader: carregarLojas,
  schema: z.object({
    nome: z.string(),
    descricao: z.string(),
    tipo: z.enum(["fisica", "online", "ambas"]),
    ...verificacao,

    /**
     * Razão social, CNPJ e situação cadastral vêm da Receita Federal.
     * São o que separa loja séria de perfil que some com o dinheiro
     * do jogador — por isso aparecem na ficha.
     */
    razao_social: z.string().optional(),
    cnpj: z.string().optional(),
    situacao_cadastral: z.string().optional(),

    /** Loja exclusivamente online pode não ter endereço de atendimento. */
    uf: z.enum(UFS).optional(),
    cidade: z.string().optional(),
    cidade_slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
    bairro: z.string().optional(),
    endereco: z.string().optional(),
    cep: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),

    categorias: z
      .array(
        z.enum(["replicas", "upgrade", "vestuario", "consumivel", "acessorio"]),
      )
      .min(1),

    marcas: z.array(z.string()).default([]),
    faz_manutencao: z.boolean().default(false),
    faz_customizacao: z.boolean().default(false),

    /** Informação comercial: o que o jogador quer saber antes de comprar. */
    entrega_nacional: z.boolean().optional(),
    formas_pagamento: z.string().optional(),
    desconto_avista: z.string().optional(),
    horario: z.string().optional(),

    google_nota: z.number().min(0).max(5).optional(),
    google_avaliacoes: z.number().int().nonnegative().optional(),
    confianca: z.enum(["alta", "media", "baixa"]).optional(),

    /** Ressalvas do levantamento: divergência de endereço, dado ausente. */
    observacoes: z.string().optional(),

    contato: z
      .object({
        whatsapp: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().email().optional(),
        instagram: z.string().optional(),
        site: z.string().url().optional(),
        facebook: z.string().url().optional(),
      })
      .default({}),

    /** Vira link de afiliado na Fase 2. Hoje é só exibição. */
    cupom: z.string().optional(),
  }),
});

/* ============================================================
   Guias — conteúdo editorial de SEO (doc §5.2)
   ============================================================ */

const guias = defineCollection({
  loader: glob({ base: "./src/content/guias", pattern: "**/*.{md,mdx}" }),
  schema: ({ image }) =>
    z.object({
      titulo: z.string(),
      /** Usado na meta description. Entre 120 e 160 caracteres. */
      resumo: z.string().min(60).max(200),
      publicado_em: z.coerce.date(),
      atualizado_em: z.coerce.date().optional(),
      autor: z.string().default("Comunidade Airsoft"),
      rascunho: z.boolean().default(false),

      /**
       * Capa do guia: vira hero no artigo e thumbnail na listagem. Passa pelo
       * pipeline do Astro, entao o build gera webp em varias larguras e ja
       * conhece width/height — o que evita salto de layout no carregamento.
       * Opcional: guia sem capa continua publicavel.
       */
      imagem: image().optional(),
      /** Texto alternativo da capa. Sem ele a imagem entra como decorativa. */
      imagem_alt: z.string().optional(),

      /**
       * Nivel de conhecimento do leitor (doc 4.1: iniciante / intermediario /
       * veterano). Organiza a trilha de leitura em /guias e e o eixo que
       * transforma 20 artigos soltos em um percurso.
       */
      nivel: z
        .enum(["iniciante", "intermediario", "avancado"])
        .default("iniciante"),

      /** Agrupamento tematico dentro do nivel. Ex.: "Legal", "Equipamento". */
      categoria: z.string().default("Geral"),

      /**
       * Termo principal de busca que a pagina persegue. Nao vai para o HTML:
       * serve de registro editorial para evitar canibalizacao entre guias.
       */
      palavra_chave: z.string().optional(),

      /**
       * Slugs de outros guias. Vira bloco de links internos no fim do artigo:
       * distribui autoridade e segura o leitor dentro do site.
       */
      relacionados: z.array(z.string()).default([]),

      /** Perguntas que viram FAQPage no schema.org. */
      faq: z
        .array(z.object({ pergunta: z.string(), resposta: z.string() }))
        .default([]),
    }),
});

export const collections = { campos, lojas, guias };
export { UFS };
