/**
 * Interruptores de funcionalidade.
 *
 * Existe para desligar uma área inteira sem apagar o código dela. O
 * caminho de apagar e recuperar depois pelo git custa caro e sempre
 * volta faltando um pedaço — um `false` aqui é reversível em um
 * commit e não deixa a tela em estado meio-pronto.
 *
 * EQUIPES: escondida temporariamente. As tabelas, as páginas e a
 * inscrição em bloco continuam inteiras no repositório e no banco;
 * só não há porta de entrada enquanto isto for `false`.
 */
export const EQUIPES_VISIVEIS = false;
