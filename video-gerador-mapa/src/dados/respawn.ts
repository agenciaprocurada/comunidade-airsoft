/**
 * As duas áreas de respawn do roteiro.
 *
 * Não vêm do banco: o mapa salvo tem quatro áreas e nenhuma delas é de
 * respawn. Elas existem porque o vídeo MOSTRA a criação de uma área de
 * respawn (2–8 s) e depois precisa que ela esteja lá quando o campo se
 * monta (10–13 s). Coordenadas em pixels do documento 1280x720,
 * escolhidas em espaço vazio do enquadramento real.
 */

export const AREA_RESPAWN_ALFA: [number, number][] = [
  [955, 235],
  [1120, 228],
  [1148, 300],
  [1112, 378],
  [975, 372],
  [948, 300],
];

export const AREA_RESPAWN_BRAVO: [number, number][] = [
  [215, 205],
  [370, 198],
  [398, 262],
  [360, 330],
  [228, 325],
  [200, 262],
];

export const MARCADOR_ALFA = { x: 1046, y: 300, rotulo: "RESPAWN ALFA" };
export const MARCADOR_BRAVO = { x: 298, y: 262, rotulo: "RESPAWN BRAVO" };
