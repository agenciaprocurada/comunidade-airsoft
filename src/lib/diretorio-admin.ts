/**
 * O que o administrador pode editar em campo, loja e armeiro.
 *
 * As três fichas somam 111 colunas. Escrever três formulários à mão
 * seria três lugares para esquecer um campo quando a tabela mudar —
 * então a tela é UMA e é gerada a partir da descrição abaixo.
 *
 * Fora daqui, de propósito:
 *  - `id`: é o endereço público da ficha; trocar quebra link e busca
 *    (um gatilho no banco também recusa a troca);
 *  - `criado_em` / `atualizado_em`: o banco cuida;
 *  - `submetido_por` / `criado_por`: rastro de quem enviou, não é dado
 *    da ficha;
 *  - `place_id`, `place_status`, `place_visto_em`: vêm da coleta do
 *    Google e são reescritos por ela — editar à mão seria perdido na
 *    próxima passada;
 *  - `verificado_em`: preenchido pelo banco quando o selo é marcado.
 */

export const TIPOS_DIRETORIO = ["campos", "lojas", "armeiros"] as const;
export type TipoDiretorio = (typeof TIPOS_DIRETORIO)[number];

export const DIRETORIO = {
  campos: { rotulo: "Campo", plural: "Campos", rota: "/campos" },
  lojas: { rotulo: "Loja", plural: "Lojas", rota: "/lojas" },
  armeiros: { rotulo: "Armeiro", plural: "Armeiros", rota: "/armeiros" },
} as const;

export type FormatoCampo =
  | "texto"
  | "textao"
  | "numero"
  | "data"
  | "sim_nao"
  | "escolha"
  | "lista"
  | "contato";

export interface CampoEditavel {
  nome: string;
  rotulo: string;
  formato: FormatoCampo;
  /** Só para `escolha`. */
  opcoes?: readonly { valor: string; rotulo: string }[];
  ajuda?: string;
  /** Texto longo ocupa a linha inteira. */
  largo?: boolean;
  /**
   * Coluna NOT NULL no banco. Sem marcar aqui, apagar o valor na tela
   * derruba o salvamento inteiro com um erro genérico do Postgres — e
   * a pessoa não descobre qual campo causou.
   */
  obrigatorio?: boolean;
}

export interface Secao {
  titulo: string;
  campos: CampoEditavel[];
}

const STATUS = [
  { valor: "publicado", rotulo: "Publicado" },
  { valor: "rascunho", rotulo: "Rascunho (não aparece no site)" },
  { valor: "inativo", rotulo: "Inativo (fechou, não existe mais)" },
] as const;

const CONFIANCA = [
  { valor: "", rotulo: "—" },
  { valor: "alta", rotulo: "Alta" },
  { valor: "media", rotulo: "Média" },
  { valor: "baixa", rotulo: "Baixa" },
] as const;

/** Comum às três: é a mesma ficha de lugar por baixo. */
const IDENTIFICACAO = (extras: CampoEditavel[]): Secao => ({
  titulo: "Identificação",
  campos: [
    { nome: "nome", rotulo: "Nome", formato: "texto", obrigatorio: true },
    {
      nome: "status",
      rotulo: "Situação",
      formato: "escolha",
      opcoes: STATUS,
      ajuda: "Só 'publicado' aparece no site.",
    },
    ...extras,
  ],
});

const LOCAL: Secao = {
  titulo: "Onde fica",
  campos: [
    { nome: "uf", rotulo: "UF", formato: "texto", obrigatorio: true, ajuda: "Duas letras, maiúsculas." },
    { nome: "cidade", rotulo: "Cidade", formato: "texto", obrigatorio: true },
    {
      nome: "cidade_slug",
      rotulo: "Cidade na URL",
      formato: "texto",
      obrigatorio: true,
      ajuda: "Sem acento, com hífen. Muda o endereço da ficha — só altere se estiver errado.",
    },
    { nome: "bairro", rotulo: "Bairro", formato: "texto" },
    { nome: "endereco", rotulo: "Endereço", formato: "texto", largo: true },
    { nome: "lat", rotulo: "Latitude", formato: "numero" },
    { nome: "lng", rotulo: "Longitude", formato: "numero" },
  ],
};

const CONTATO: Secao = {
  titulo: "Contato",
  campos: [
    {
      nome: "contato",
      rotulo: "Canais",
      formato: "contato",
      largo: true,
      ajuda: "Uma linha por canal, no formato chave: valor. Ex.: whatsapp: 51999998888",
    },
  ],
};

const CONFERENCIA = (extras: CampoEditavel[] = []): Secao => ({
  titulo: "Conferência",
  campos: [
    {
      nome: "verificado",
      rotulo: "Ficha verificada",
      formato: "sim_nao",
      ajuda: "Marque só depois de confirmar com o responsável. A data entra sozinha.",
    },
    { nome: "confianca", rotulo: "Confiança do levantamento", formato: "escolha", opcoes: CONFIANCA },
    { nome: "fonte", rotulo: "Fonte", formato: "texto" },
    { nome: "google_nota", rotulo: "Nota do Google", formato: "numero" },
    { nome: "google_avaliacoes", rotulo: "Avaliações no Google", formato: "numero" },
    { nome: "observacoes", rotulo: "Observações internas", formato: "textao", largo: true },
    ...extras,
  ],
});

export const CAMPOS_POR_TIPO: Record<TipoDiretorio, Secao[]> = {
  campos: [
    IDENTIFICACAO([
      {
        nome: "modalidade",
        rotulo: "Modalidade",
        formato: "escolha",
        obrigatorio: true,
        opcoes: [
          { valor: "airsoft", rotulo: "Airsoft" },
          { valor: "paintball", rotulo: "Paintball" },
          { valor: "ambos", rotulo: "Airsoft e paintball" },
        ],
      },
      { nome: "tipo_operacao", rotulo: "Tipo de operação", formato: "texto" },
      { nome: "regiao", rotulo: "Região", formato: "texto" },
    ]),
    LOCAL,
    {
      titulo: "O campo",
      campos: [
        {
          nome: "terreno",
          rotulo: "Terreno",
          formato: "lista",
          largo: true,
          ajuda: "Separe por vírgula. Ex.: mata, cqb, urbano",
        },
        { nome: "precos", rotulo: "Preços (texto livre)", formato: "texto", largo: true },
        { nome: "tipo_campo_original", rotulo: "Tipo (texto do levantamento)", formato: "texto", largo: true },
        { nome: "modalidade_original", rotulo: "Modalidade (texto do levantamento)", formato: "texto" },
        { nome: "status_original", rotulo: "Situação (texto do levantamento)", formato: "texto" },
      ],
    },
    CONTATO,
    CONFERENCIA(),
  ],

  lojas: [
    IDENTIFICACAO([
      {
        nome: "tipo",
        rotulo: "Tipo",
        formato: "escolha",
        obrigatorio: true,
        opcoes: [
          { valor: "fisica", rotulo: "Física" },
          { valor: "online", rotulo: "Online" },
          { valor: "ambas", rotulo: "Física e online" },
        ],
      },
      { nome: "descricao", rotulo: "Descrição", formato: "textao", largo: true },
    ]),
    { ...LOCAL, campos: [...LOCAL.campos, { nome: "cep", rotulo: "CEP", formato: "texto" }] },
    {
      titulo: "A loja",
      campos: [
        { nome: "categorias", rotulo: "Categorias", formato: "lista", largo: true },
        { nome: "marcas", rotulo: "Marcas", formato: "lista", largo: true },
        { nome: "faz_manutencao", rotulo: "Faz manutenção", formato: "sim_nao" },
        { nome: "faz_customizacao", rotulo: "Faz customização", formato: "sim_nao" },
        { nome: "entrega_nacional", rotulo: "Entrega para todo o Brasil", formato: "sim_nao" },
        { nome: "formas_pagamento", rotulo: "Formas de pagamento", formato: "texto", largo: true },
        { nome: "desconto_avista", rotulo: "Desconto à vista", formato: "texto" },
        { nome: "cupom", rotulo: "Cupom", formato: "texto" },
        { nome: "horario", rotulo: "Horário", formato: "texto", largo: true },
      ],
    },
    {
      titulo: "Empresa",
      campos: [
        { nome: "razao_social", rotulo: "Razão social", formato: "texto", largo: true },
        { nome: "cnpj", rotulo: "CNPJ", formato: "texto" },
        { nome: "situacao_cadastral", rotulo: "Situação cadastral", formato: "texto" },
      ],
    },
    CONTATO,
    CONFERENCIA(),
  ],

  armeiros: [
    IDENTIFICACAO([
      {
        nome: "tipo",
        rotulo: "Tipo",
        formato: "escolha",
        obrigatorio: true,
        opcoes: [
          { valor: "autonomo", rotulo: "Autônomo" },
          { valor: "loja", rotulo: "Loja" },
          { valor: "equipe", rotulo: "Equipe" },
        ],
      },
      { nome: "descricao", rotulo: "Descrição", formato: "textao", largo: true },
    ]),
    {
      ...LOCAL,
      campos: [
        ...LOCAL.campos,
        { nome: "cep", rotulo: "CEP", formato: "texto" },
        {
          nome: "endereco_publico",
          rotulo: "Mostrar o endereço na ficha",
          formato: "sim_nao",
          ajuda: "Muita gente atende em casa. Desmarcado, a ficha mostra só a cidade.",
        },
      ],
    },
    {
      titulo: "Atendimento",
      campos: [
        { nome: "atende_presencial", rotulo: "Atende presencial", formato: "sim_nao" },
        { nome: "atende_envio", rotulo: "Atende por envio", formato: "sim_nao" },
        { nome: "raio_atendimento", rotulo: "Raio de atendimento", formato: "texto" },
        { nome: "prazo_medio", rotulo: "Prazo médio", formato: "texto" },
        { nome: "garantia", rotulo: "Garantia", formato: "texto" },
        { nome: "emite_nota", rotulo: "Emite nota", formato: "sim_nao" },
        { nome: "precos", rotulo: "Preços (texto livre)", formato: "texto", largo: true },
        { nome: "formas_pagamento", rotulo: "Formas de pagamento", formato: "texto", largo: true },
        { nome: "horario", rotulo: "Horário", formato: "texto", largo: true },
      ],
    },
    {
      titulo: "O que faz",
      campos: [
        { nome: "servicos", rotulo: "Serviços", formato: "lista", largo: true },
        { nome: "plataformas", rotulo: "Plataformas", formato: "lista", largo: true },
        { nome: "gearboxes", rotulo: "Gearboxes", formato: "lista", largo: true },
        { nome: "marcas", rotulo: "Marcas", formato: "lista", largo: true },
        { nome: "desde", rotulo: "Trabalha desde (ano)", formato: "numero" },
        { nome: "formacao", rotulo: "Formação", formato: "textao", largo: true },
      ],
    },
    {
      titulo: "Empresa",
      campos: [
        { nome: "razao_social", rotulo: "Razão social", formato: "texto", largo: true },
        { nome: "cnpj", rotulo: "CNPJ", formato: "texto" },
        { nome: "situacao_cadastral", rotulo: "Situação cadastral", formato: "texto" },
        { nome: "loja_id", rotulo: "Loja vinculada (id)", formato: "texto" },
      ],
    },
    CONTATO,
    CONFERENCIA(),
  ],
};

/** Todas as colunas que a tela pede ao banco, por tipo. */
export function colunasDoTipo(tipo: TipoDiretorio): string {
  const nomes = CAMPOS_POR_TIPO[tipo].flatMap((s) => s.campos.map((c) => c.nome));
  return ["id", "atualizado_em", "verificado_em", ...nomes].join(",");
}

export function ehTipoDiretorio(valor: unknown): valor is TipoDiretorio {
  return typeof valor === "string" && TIPOS_DIRETORIO.includes(valor as TipoDiretorio);
}

/**
 * `contato` é jsonb e a tela mostra como texto: uma linha por canal.
 * Formulário com campo fixo por rede envelheceria a cada rede nova.
 */
export function contatoParaTexto(valor: unknown): string {
  if (!valor || typeof valor !== "object") return "";
  return Object.entries(valor as Record<string, string>)
    .map(([chave, v]) => `${chave}: ${v}`)
    .join("\n");
}

export function textoParaContato(bruto: string): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const linha of bruto.split(/\r?\n/)) {
    const corte = linha.indexOf(":");
    if (corte < 1) continue;
    const chave = linha.slice(0, corte).trim().toLowerCase();
    const valor = linha.slice(corte + 1).trim();
    if (chave && valor) saida[chave] = valor;
  }
  return saida;
}

export function listaParaTexto(valor: unknown): string {
  return Array.isArray(valor) ? valor.join(", ") : "";
}

export function textoParaLista(bruto: string): string[] {
  return bruto
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * Converte o que veio do formulário para o que a coluna espera.
 *
 * Campo vazio vira `null` e não string vazia: no banco os dois
 * significam coisas diferentes, e "" num campo de data ou número é
 * erro de tipo, não valor ausente.
 */
export function valorParaBanco(campo: CampoEditavel, bruto: string): unknown {
  const limpo = bruto.trim();

  switch (campo.formato) {
    case "sim_nao":
      return bruto === "on";
    case "lista":
      return textoParaLista(limpo);
    case "contato":
      return textoParaContato(bruto);
    case "numero": {
      if (!limpo) return null;
      const n = Number(limpo.replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }
    case "escolha":
    case "data":
      return limpo || null;
    default:
      return limpo || null;
  }
}

/** O contrário: valor do banco para o que o input mostra. */
export function valorParaTela(campo: CampoEditavel, valor: unknown): string {
  if (campo.formato === "lista") return listaParaTexto(valor);
  if (campo.formato === "contato") return contatoParaTexto(valor);
  if (valor === null || valor === undefined) return "";
  return String(valor);
}

/**
 * Confere o que não pode ficar vazio, antes de o banco recusar.
 *
 * A mensagem do Postgres para NOT NULL não diz nada a quem está
 * preenchendo: aponta a coluna, não o rótulo, e derruba o formulário
 * inteiro. Aqui o erro chega no campo certo.
 */
export function conferirObrigatorios(
  tipo: TipoDiretorio,
  valores: Record<string, unknown>,
): Record<string, string> {
  const erros: Record<string, string> = {};

  for (const secao of CAMPOS_POR_TIPO[tipo]) {
    for (const campo of secao.campos) {
      if (!campo.obrigatorio) continue;
      const v = valores[campo.nome];
      if (v === null || v === undefined || String(v).trim() === "") {
        erros[campo.nome] = `${campo.rotulo} não pode ficar em branco.`;
      }
    }
  }

  if (typeof valores.uf === "string" && valores.uf && !/^[A-Za-z]{2}$/.test(valores.uf)) {
    erros.uf = "UF são duas letras. Ex.: RS";
  }

  return erros;
}

/* ==================================================================
   Foto de capa
   ================================================================== */

/** Bucket público do Storage onde vivem as capas do diretório. */
export const BUCKET_DIRETORIO = "diretorio";

export const FOTO_TAMANHO_MAXIMO = 5 * 1024 * 1024;

export const FOTO_TIPOS = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Caminho do arquivo dentro do bucket.
 *
 * `tipo/id-carimbo.ext`: a pasta separa campo de loja e de armeiro, e
 * o carimbo garante nome novo a cada troca. Reaproveitar o mesmo nome
 * economizaria espaço, mas a foto antiga ficaria em cache no CDN e no
 * WhatsApp — e a ficha continuaria mostrando a imagem trocada.
 */
export function caminhoDaFoto(
  tipo: TipoDiretorio,
  id: string,
  nomeArquivo: string,
  carimbo: number,
): string {
  const ext = (nomeArquivo.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${tipo}/${id}-${carimbo}.${ext || "jpg"}`;
}

/**
 * O contrário: da URL pública de volta para o caminho no bucket.
 * Preciso na hora de apagar a foto antiga — guardar só a URL evitaria
 * uma coluna, mas deixaria lixo acumulando no storage para sempre.
 */
export function caminhoDaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marca = `/object/public/${BUCKET_DIRETORIO}/`;
  const corte = url.indexOf(marca);
  return corte < 0 ? null : url.slice(corte + marca.length);
}

/** Mensagem de recusa, ou null quando o arquivo serve. */
export function erroDaFoto(arquivo: File): string | null {
  if (!FOTO_TIPOS.includes(arquivo.type as (typeof FOTO_TIPOS)[number])) {
    return "Formato não aceito. Use JPG, PNG ou WebP.";
  }
  if (arquivo.size > FOTO_TAMANHO_MAXIMO) {
    return "Imagem acima de 5 MB. Reduza antes de enviar.";
  }
  return null;
}
