# Campos

Um arquivo JSON por campo. O nome do arquivo vira o slug da URL:

    src/content/campos/arena-exemplo-cerrado.json
    -> /campos/go/goiania/arena-exemplo-cerrado

O schema esta em `src/content.config.ts` e e validado no build:
campo faltando ou valor invalido quebra o build de proposito.

Os arquivos com "exemplo" no nome sao SEMENTE de desenvolvimento.
Apagar antes do lancamento.

## Regras

- `status` comeca em "rascunho". So vira "publicado" apos conferencia.
- `verificado: true` somente quando o responsavel confirmou os dados.
- `verificado_em` e a data da ultima conferencia humana. Aparece na ficha.
- `fonte` registra de onde veio o dado (instagram, maps, submissao...).
- O nome do arquivo (slug) NUNCA muda depois de publicado: quebra SEO.
