import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

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
  loader: glob({ base: "./src/content/campos", pattern: "**/*.json" }),
  schema: z.object({
    nome: z.string(),
    descricao: z.string(),
    ...localizacao,
    ...verificacao,

    terreno: z.array(z.enum(["mata", "cqb", "urbano", "misto"])).min(1),

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
  loader: glob({ base: "./src/content/lojas", pattern: "**/*.json" }),
  schema: z.object({
    nome: z.string(),
    descricao: z.string(),
    tipo: z.enum(["fisica", "online", "ambas"]),
    ...verificacao,

    /** Loja exclusivamente online não tem localização. */
    uf: z.enum(UFS).optional(),
    cidade: z.string().optional(),
    cidade_slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
    endereco: z.string().optional(),
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

    contato: z
      .object({
        whatsapp: z.string().optional(),
        telefone: z.string().optional(),
        instagram: z.string().optional(),
        site: z.string().url().optional(),
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
  schema: z.object({
    titulo: z.string(),
    /** Usado na meta description. Entre 120 e 160 caracteres. */
    resumo: z.string().min(60).max(200),
    publicado_em: z.coerce.date(),
    atualizado_em: z.coerce.date().optional(),
    autor: z.string().default("Comunidade Airsoft"),
    rascunho: z.boolean().default(false),
    /** Perguntas que viram FAQPage no schema.org. */
    faq: z
      .array(z.object({ pergunta: z.string(), resposta: z.string() }))
      .default([]),
  }),
});

export const collections = { campos, lojas, guias };
export { UFS };
