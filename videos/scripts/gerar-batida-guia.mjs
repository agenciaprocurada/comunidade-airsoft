/**
 * Batida-guia de 120 BPM, 30 s. NÃO É TRILHA.
 *
 * Existe para uma coisa só: conferir se os cortes do vídeo caem no
 * tempo. Sem áudio nenhum a montagem é chute, e com uma trilha de
 * verdade eu não posso trabalhar — licenciar música é decisão do dono
 * do canal, não minha.
 *
 * Troque `public/guia-120bpm.mp3` pela faixa definitiva e ajuste `BPM`
 * em src/vertical/ritmo.ts se o andamento dela for outro. Os cortes são
 * todos derivados de lá.
 *
 * Roda: node scripts/gerar-batida-guia.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TAXA = 44100;
const DURACAO = 30;
const BPM = 120;
const BATIDA = 60 / BPM; // 0,5 s
const COMPASSO = BATIDA * 4; // 2 s

const total = TAXA * DURACAO;
const amostras = new Float32Array(total);

/** Ruído determinístico: o mesmo arquivo toda vez que o script roda. */
let semente = 20260829;
const aleatorio = () => {
  semente = (semente * 1664525 + 1013904223) % 4294967296;
  return (semente / 4294967296) * 2 - 1;
};

for (let i = 0; i < total; i++) {
  const t = i / TAXA;

  // Bumbo em toda batida: seno grave que cai depressa.
  const tb = t % BATIDA;
  const bumbo = Math.sin(2 * Math.PI * (52 + 60 * Math.exp(-40 * tb)) * tb) * Math.exp(-11 * tb);

  // Chimbau nas colcheias, mais fraco no contratempo.
  const tc = t % (BATIDA / 2);
  const forte = t % BATIDA < BATIDA / 2 ? 1 : 0.55;
  const chimbau = aleatorio() * Math.exp(-90 * tc) * forte;

  // Caixa nos tempos 2 e 4 — é o que dá a sensação de "impacto".
  const posicao = (t % COMPASSO) / BATIDA;
  const noTempo2ou4 = posicao % 2 >= 1;
  const tcx = t % BATIDA;
  const caixa = noTempo2ou4
    ? (aleatorio() * 0.7 + Math.sin(2 * Math.PI * 190 * tcx) * 0.3) * Math.exp(-26 * tcx)
    : 0;

  amostras[i] = bumbo * 0.85 + chimbau * 0.1 + caixa * 0.32;
}

// ----- WAV mono 16 bits -----
const dados = Buffer.alloc(total * 2);
for (let i = 0; i < total; i++) {
  const v = Math.max(-1, Math.min(1, amostras[i]));
  dados.writeInt16LE(Math.round(v * 32767 * 0.9), i * 2);
}

const cabecalho = Buffer.alloc(44);
cabecalho.write("RIFF", 0);
cabecalho.writeUInt32LE(36 + dados.length, 4);
cabecalho.write("WAVE", 8);
cabecalho.write("fmt ", 12);
cabecalho.writeUInt32LE(16, 16);
cabecalho.writeUInt16LE(1, 20); // PCM
cabecalho.writeUInt16LE(1, 22); // mono
cabecalho.writeUInt32LE(TAXA, 24);
cabecalho.writeUInt32LE(TAXA * 2, 28);
cabecalho.writeUInt16LE(2, 32);
cabecalho.writeUInt16LE(16, 34);
cabecalho.write("data", 36);
cabecalho.writeUInt32LE(dados.length, 40);

const saida = path.join(RAIZ, "public", "guia-120bpm.wav");
fs.writeFileSync(saida, Buffer.concat([cabecalho, dados]));
console.log(`${saida} — ${DURACAO}s a ${BPM} BPM (batida-guia, não é trilha)`);
