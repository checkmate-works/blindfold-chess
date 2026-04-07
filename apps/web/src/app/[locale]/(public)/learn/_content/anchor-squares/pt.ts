const content = `# Reconheça casas instantaneamente com o método de pontos de âncora

Um tabuleiro de xadrez tem 64 casas.
Em vez de memorizar cada uma individualmente, existe uma forma eficiente de aprendê-las usando casas específicas como referência.
É o método de pontos de âncora.

O método de pontos de âncora é uma técnica na qual **você utiliza várias casas-chave como "pontos de referência (âncoras)" e as usa como base para reconhecer as demais casas**.

## Por que os pontos de âncora são eficazes

O cérebro humano é melhor em reconhecer posições relativas do que posições absolutas.
É o mesmo que quando você olha um mapa: é mais fácil entender "2 km ao norte da estação central" do que se lhe derem as coordenadas de latitude e longitude.

De forma similar no tabuleiro de xadrez, se você memorizar alguns pontos de referência, pode localizar outras casas pensando algo como "a3 está 2 casas acima de a1, então é uma casa escura assim como a1".

## Pontos de âncora básicos

### As casas dos cantos

- a8/h8
- a1/h1

![Anchor Points at Corners](/images/learn/anchor-corners.svg)

Essas casas são muito fáceis de memorizar e lembrar.

Quer você jogue com brancas ou com pretas, as casas de cima à esquerda e de baixo à direita são claras, e as de cima à direita e de baixo à esquerda são escuras, o que também é uma característica fácil de entender.

Como essas são as posições iniciais das torres, pessoalmente imagino que existem "pilares" nessas 4 localizações.
Essa imagem ajuda a habituar-se a ver o tabuleiro completo sem cair na visão de túnel, mesmo no xadrez normal, não só no xadrez às cegas.

### As 4 casas centrais

- d5/e5
- d4/e4

![Anchor Points at Center](/images/learn/anchor-center.svg)

d4 e e4 são frequentemente jogadas como primeiro lance, e d5/e5 também aparecem muitas vezes como respostas.
Isso acontece porque controlar o centro é habitual segundo a teoria de aberturas.

As casas que são jogadas com frequência são fáceis de lembrar, e como são fáceis de distinguir das casas dos cantos, esses também são pontos de âncora que convém ter presentes.

### Outros pontos de âncora

#### Casas de destino do roque

- g1 (destino do rei no O-O das brancas)
- c1 (destino do rei no O-O-O das brancas)
- g8 (destino do rei no O-O das pretas)
- c8 (destino do rei no O-O-O das pretas)

![Anchor Points for Castling](/images/learn/anchor-castling.svg)

Também é útil lembrar as casas de destino do roque mencionadas acima.
Lembre-se de que essas serão da mesma cor que a casa onde se encontrava originalmente o rei.

Por exemplo, a posição inicial do rei branco é e1, que é uma casa escura.
Tanto se faz roque curto (O-O) como grande (O-O-O), o destino do rei é uma casa escura.`;

export default content;
