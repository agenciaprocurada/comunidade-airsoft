/**
 * Tokens do Design System v2.0 do Comunidade Airsoft (base escura).
 *
 * Copiados de src/styles/global.css do site. Valor novo aqui só entra
 * se entrar lá primeiro — o vídeo é vitrine do produto, não um lugar
 * para inventar cor.
 */

import { loadFont as carregarDisplay } from "@remotion/google-fonts/SairaCondensed";
import { loadFont as carregarTexto } from "@remotion/google-fonts/Barlow";
import { loadFont as carregarDado } from "@remotion/google-fonts/ShareTechMono";

export const { fontFamily: FONTE_DISPLAY } = carregarDisplay("normal", {
  weights: ["600", "700"],
  subsets: ["latin"],
});

export const { fontFamily: FONTE_TEXTO } = carregarTexto("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

export const { fontFamily: FONTE_DADO } = carregarDado("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

export const COR = {
  fundo: "#0b0d09",
  papel: "#14180f",
  papel2: "#1c2115",
  borda: "#2b3222",
  bordaForte: "#46512f",
  tinta: "#f0f2e9",
  texto: "#cdd2c0",
  texto2: "#98a087",

  oliva050: "#191e11",
  oliva100: "#d6e0b6",
  oliva300: "#a9bd66",
  oliva400: "#93a84a",
  oliva500: "#7d9139",
  oliva700: "#4d5a24",

  latao: "#d1a13c",
  ok: "#6fae80",
  alerta: "#d97a55",
} as const;
