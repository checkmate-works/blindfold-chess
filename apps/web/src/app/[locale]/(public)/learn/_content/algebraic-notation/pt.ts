const content = `# Notação Algébrica

## A linguagem universal do xadrez

A notação algébrica é o sistema padrão reconhecido mundialmente para registrar os lances de xadrez.

É a única notação oficialmente reconhecida pela FIDE para torneios e partidas, e a maioria dos livros e materiais educativos de xadrez também adota este formato. Você pode consultar o seguinte link para ver as especificações detalhadas.

[Apêndice C. Notação Algébrica – Comissão de Regras da FIDE](https://rcc.fide.com/appendixc/)

Este artigo resume apenas os aspectos básicos.

## Sistema de coordenadas

Na notação algébrica, cada casa do tabuleiro tem uma coordenada única:

- **Colunas (files)**: Rotuladas de a a h, da esquerda para a direita.
- **Fileiras (ranks)**: Numeradas de 1 a 8, de baixo para cima (da perspectiva das brancas).

![demo:coordinate-board]()

## Regras básicas de notação

### Símbolos das peças

Estes símbolos referem-se a todas as peças exceto os peões.

- **Rei**: K
- **Dama**: Q
- **Torre**: R
- **Bispo**: B
- **Cavalo**: N (para evitar confusão com o Rei — King)

### Notação de lances

Os lances básicos são escritos como: **[Peça][Casa de destino]**

## Exemplos de lances comuns

### Lances de peão

Para os peões, apenas se escreve a casa de destino.
Não é necessário adicionar 'P' para o peão, como Pe4.

- **e4**: O peão move-se para e4
- **d5**: O peão move-se para d5
- **a7**: O peão move-se para a7

### Lances de peças

Para as peças, utiliza-se o símbolo correspondente como prefixo.

- **Nf3**: O cavalo move-se para f3
- **Bc4**: O bispo move-se para c4
- **Qd2**: A dama move-se para d2
- **Kf1**: O rei move-se para f1
- **Ra1**: A torre move-se para a1

## Capturas

Quando uma peça captura outra, utiliza-se o **x**.

- **exd5**: O peão na coluna e captura em d5
- **Nxe4**: O cavalo captura em e4
- **Bxh7**: O bispo captura em h7
- **Qxd8**: A dama captura em d8

## Desambiguação

Quando várias peças do mesmo tipo podem mover-se para a mesma casa, é necessário especificar qual se move.

### Desambiguação por coluna

- **Nbd2**: O cavalo na coluna b move-se para d2
- **Rdf1**: A torre na coluna d move-se para f1

### Desambiguação por fileira

- **R1a3**: A torre na fileira 1 move-se para a3
- **N1f3**: O cavalo na fileira 1 move-se para f3

## Lances especiais

### Roque

- **O-O**: Roque curto (pelo flanco do rei)
- **O-O-O**: Roque grande (pelo flanco da dama)

### Captura en passant

- **exd6 e.p.**: O peão captura en passant em d6
  - No entanto, o símbolo de captura en passant ("e.p.") pode ser omitido.

### Promoção de peão

- **e8=Q**: O peão promove a dama em e8
- **a1=N**: O peão promove a cavalo em a1

## Xeques e xeque-mate

### Xeque

Adiciona-se **+** após o lance.

- **Qh5+**: A dama move-se para h5, dando xeque
- **Bc4+**: O bispo move-se para c4, dando xeque

### Xeque-mate

Adiciona-se **#** após o lance.

- **Qh7#**: A dama move-se para h7, dando xeque-mate
- **Rd8#**: A torre move-se para d8, dando xeque-mate

## Símbolos comuns

### Qualidade do lance

- **!**: Bom lance
- **!!**: Lance brilhante
- **?**: Lance duvidoso
- **??**: Erro grave
- **!?**: Lance interessante
- **?!**: Lance questionável

### Símbolos de avaliação da posição

- **=**: Posição igualada
- **±**: As brancas têm ligeira vantagem
- **∓**: As pretas têm ligeira vantagem
- **+-**: As brancas têm vantagem decisiva
- **-+**: As pretas têm vantagem decisiva

## Exemplo de notação de uma partida

\`\`\`
1. e4 e5
2. Nf3 Nc6
3. Bc4 Bc5
4. O-O d6
5. d3 f5
6. exf5 Bxf5
7. Ng5 Nh6
8. Qh5+ g6
9. Qxc5 dxc5
10. Bxh6
\`\`\`

## Erros comuns que você deve evitar

1.  **Esquecer os símbolos das peças**: Escreva Nf3, não nf3.
2.  **Desambiguação insuficiente**: Esquecer de especificar qual peça se move quando várias podem ir para a mesma casa.
3.  **Esquecer o símbolo de xeque**: Sempre adicione + quando há xeque.`;

export default content;
