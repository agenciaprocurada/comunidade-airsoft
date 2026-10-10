/**
 * PDF do termo assinado (comprovante que o participante baixa).
 *
 * pdf-lib roda em qualquer funcao serverless (sem navegador). Usa as
 * fontes padrao do PDF (Helvetica), que cobrem o portugues; qualquer
 * caractere fora dessa tabela vira "?" em vez de derrubar o arquivo.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { blocosDoTermo, dataBr, dataHoraBr, formatarCpf, formatarTelefone } from "./termo-evento";
import { dividirTermo, preencherTermo } from "./termo-variaveis";

export interface DadosTermoAssinado {
  evento: {
    nome: string;
    data_evento: string | null;
    horario?: string | null;
    local_evento: string | null;
    organizador: string | null;
    texto: string;
    texto_hash: string;
  };
  assinatura: {
    nome: string;
    email: string;
    telefone: string;
    cpf: string;
    nascimento: string | null;
    equipe: string | null;
    assinatura: string; // data URL PNG
    texto_hash: string;
    ip: string | null;
    user_agent: string | null;
    assinado_em: string;
  };
}

const A4 = { l: 595.28, a: 841.89 };
const MARGEM = 54;
const COR_TEXTO = rgb(0.1, 0.1, 0.1);
const COR_SUAVE = rgb(0.36, 0.36, 0.36);

/** Troca o que a fonte padrao nao desenha por "?". */
function seguro(texto: string, fonte: PDFFont): string {
  let saida = "";
  for (const ch of texto.replace(/\r/g, "")) {
    if (ch === "\n") {
      saida += " ";
      continue;
    }
    try {
      fonte.encodeText(ch);
      saida += ch;
    } catch {
      saida += "?";
    }
  }
  return saida;
}

function quebrar(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of seguro(texto, fonte).split(/\s+/).filter(Boolean)) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (fonte.widthOfTextAtSize(teste, tamanho) <= largura) {
      atual = teste;
    } else {
      if (atual) linhas.push(atual);
      // palavra maior que a linha (hash, e-mail longo): corta no limite
      let resto = palavra;
      while (fonte.widthOfTextAtSize(resto, tamanho) > largura) {
        let n = resto.length;
        while (n > 1 && fonte.widthOfTextAtSize(resto.slice(0, n), tamanho) > largura) n--;
        linhas.push(resto.slice(0, n));
        resto = resto.slice(n);
      }
      atual = resto;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export async function gerarPdfTermoAssinado(d: DadosTermoAssinado): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Termo assinado — ${d.evento.nome}`);
  pdf.setAuthor("Comunidade Airsoft");
  pdf.setSubject("Termo de consentimento assinado eletronicamente");
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  const largura = A4.l - MARGEM * 2;
  let pagina: PDFPage = pdf.addPage([A4.l, A4.a]);
  let y = A4.a - MARGEM;

  const novaPagina = () => {
    pagina = pdf.addPage([A4.l, A4.a]);
    y = A4.a - MARGEM;
  };
  const garantir = (altura: number) => {
    if (y - altura < MARGEM + 24) novaPagina();
  };
  const escrever = (texto: string, o: { tam?: number; fonte?: PDFFont; cor?: ReturnType<typeof rgb>; antes?: number; entre?: number } = {}) => {
    const tam = o.tam ?? 10;
    const fonte = o.fonte ?? normal;
    const entre = o.entre ?? tam * 1.4;
    y -= o.antes ?? 0;
    for (const linha of texto.split("\n").flatMap((t) => quebrar(t, fonte, tam, largura))) {
      garantir(entre);
      y -= entre;
      pagina.drawText(linha, { x: MARGEM, y, size: tam, font: fonte, color: o.cor ?? COR_TEXTO });
    }
  };

  // Cabecalho
  escrever("TERMO DE CONSENTIMENTO ASSINADO ELETRONICAMENTE", { tam: 8.5, fonte: negrito, cor: COR_SUAVE });
  escrever(d.evento.nome, { tam: 18, fonte: negrito, antes: 6, entre: 22 });
  const info = [d.evento.data_evento && dataBr(d.evento.data_evento), d.evento.horario, d.evento.local_evento, d.evento.organizador]
    .filter(Boolean)
    .join("  |  ");
  if (info) escrever(info, { tam: 10, cor: COR_SUAVE, antes: 2 });

  pagina.drawLine({
    start: { x: MARGEM, y: y - 10 },
    end: { x: A4.l - MARGEM, y: y - 10 },
    thickness: 0.8,
    color: rgb(0.6, 0.6, 0.6),
  });
  y -= 14;

  // Texto do termo. O que vem depois de {{so_assinado}} entra DEPOIS da assinatura.
  const partes = dividirTermo(d.evento.texto);
  const dadosTermo = {
    nome: d.assinatura.nome,
    cpf: d.assinatura.cpf,
    nascimento: d.assinatura.nascimento,
    telefone: d.assinatura.telefone,
    email: d.assinatura.email,
    equipe: d.assinatura.equipe,
    assinadoEm: d.assinatura.assinado_em,
  };
  const escreverTermo = (texto: string) => {
    for (const b of blocosDoTermo(preencherTermo(texto, dadosTermo))) {
      if (b.tipo === "titulo") escrever(b.texto, { tam: 11, fonte: negrito, antes: 10 });
      else escrever(b.texto, { tam: 10, antes: 3, entre: 13.5 });
    }
  };
  escreverTermo(partes.tela);

  // Bloco do assinante (nao quebra no meio)
  garantir(250);
  y -= 18;
  pagina.drawLine({ start: { x: MARGEM, y }, end: { x: A4.l - MARGEM, y }, thickness: 0.8, color: rgb(0.6, 0.6, 0.6) });
  const a = d.assinatura;
  escrever("ASSINANTE", { tam: 11, fonte: negrito, antes: 8 });
  const campos: [string, string][] = [
    ["Nome", a.nome],
    ["CPF", formatarCpf(a.cpf)],
    ["Nascimento", a.nascimento ? dataBr(a.nascimento) : "-"],
    ["E-mail", a.email],
    ["Telefone", formatarTelefone(a.telefone)],
    ["Equipe", a.equipe || "-"],
    ["Assinado em", `${dataHoraBr(a.assinado_em)} (horario de Brasilia)`],
  ];
  for (const [rotulo, valor] of campos) {
    garantir(14);
    y -= 14;
    pagina.drawText(seguro(rotulo, negrito), { x: MARGEM, y, size: 10, font: negrito, color: COR_SUAVE });
    pagina.drawText(seguro(valor, normal), { x: MARGEM + 80, y, size: 10, font: normal, color: COR_TEXTO });
  }

  // Assinatura desenhada
  try {
    const base64 = a.assinatura.replace(/^data:image\/png;base64,/, "");
    const png = await pdf.embedPng(Uint8Array.from(Buffer.from(base64, "base64")));
    const alvoAltura = 70;
    const escala = Math.min(alvoAltura / png.height, 220 / png.width);
    const w = png.width * escala;
    const h = png.height * escala;
    garantir(h + 40);
    y -= h + 10;
    pagina.drawImage(png, { x: MARGEM, y, width: w, height: h });
    pagina.drawLine({ start: { x: MARGEM, y: y - 2 }, end: { x: MARGEM + 240, y: y - 2 }, thickness: 0.7, color: COR_TEXTO });
    y -= 4;
    escrever(a.nome, { tam: 9, cor: COR_SUAVE, antes: 2 });
  } catch {
    escrever("(assinatura desenhada indisponivel neste arquivo)", { tam: 9, cor: COR_SUAVE, antes: 6 });
  }

  // Fecho do documento (so existe na versao assinada)
  if (partes.depois) escreverTermo(partes.depois);

  // Registro tecnico
  garantir(80);
  y -= 8;
  escrever("REGISTRO DA ASSINATURA", { tam: 8, fonte: negrito, cor: COR_SUAVE, antes: 6 });
  escrever(`IP: ${a.ip ?? "nao registrado"}`, { tam: 8, cor: COR_SUAVE, entre: 11 });
  escrever(`Navegador: ${a.user_agent ?? "nao registrado"}`, { tam: 8, cor: COR_SUAVE, entre: 11 });
  escrever(`SHA-256 do texto aceito: ${a.texto_hash}`, { tam: 8, cor: COR_SUAVE, entre: 11 });
  escrever(
    a.texto_hash === d.evento.texto_hash
      ? "O texto acima e identico ao texto aceito nesta assinatura."
      : "ATENCAO: o texto atual do evento difere do texto aceito nesta assinatura.",
    { tam: 8, cor: COR_SUAVE, entre: 11 },
  );

  // Rodape com numero de pagina
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    p.drawText(seguro(`Comunidade Airsoft  |  ${d.evento.nome}  |  pagina ${i + 1} de ${paginas.length}`, normal), {
      x: MARGEM,
      y: MARGEM - 18,
      size: 7.5,
      font: normal,
      color: COR_SUAVE,
    });
  });

  return pdf.save();
}
