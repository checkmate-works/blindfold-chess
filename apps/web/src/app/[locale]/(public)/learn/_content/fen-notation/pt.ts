const content = `# Uso da notação FEN

Você já ouviu falar da Notação Forsyth-Edwards (FEN)?
Mesmo que não esteja familiarizado com o termo, é possível que tenha visto cadeias como \`rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1\` nas funções de análise ou de compartilhamento do lichess ou chess.com.
O exemplo acima representa a posição inicial em FEN.

## O que é FEN?

FEN permite expressar uma posição de xadrez em uma única linha de texto.
Em ciência da computação, converter estruturas de dados complexas para um formato fácil de armazenar ou transmitir é chamado de serialização.
É exatamente isso que o FEN faz.

Por exemplo, como você comunicaria as posições iniciais das peças?
Em uma conversa, poderia dizer "Primeiro, coloque o Rei na coluna e, a Dama na coluna d, depois coloque as Torres nas colunas a e h...", mas o FEN condensa eficientemente toda essa informação em uma cadeia formalizada.

Formatos como FEN também são fáceis de processar por computadores. Por exemplo, você pode reproduzir uma posição em uma análise de partida inserindo seu FEN.
Este serviço também utiliza FEN para permitir o treinamento em posições específicas.

## Especificação do FEN

Existe abundante documentação oficial que explica a especificação do FEN, então remetemos a esses recursos.

- [Forsyth–Edwards Notation - Wikipedia](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)
- [Standard: Portable Game Notation Specification and Implementation Guide](https://www.thechessdrum.net/PGN_Reference.txt) - FEN é definido como parte da especificação PGN

## Aprofunde sua compreensão através do treinamento

Este serviço oferece menus de treinamento para reconstruir posições do tabuleiro a partir de FEN.
Normalmente, ao jogar xadrez online, você não precisa inserir FEN manualmente: as cadeias FEN copiadas e coladas são automaticamente convertidas em posições do tabuleiro.
No entanto, reconstruir posições manualmente é uma forma eficaz de compreender verdadeiramente o FEN.
Uma vez que tenha aprendido a especificação do FEN, teste sua compreensão com nossos exercícios de treinamento.`;

export default content;
