const content = `# FENの活用

## この記法を見たことがありますか

Forsyth–Edwards Notation (FEN) という記法をご存知ですか？
この用語を知らない人でも、 \`rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1\` のような書式をlichessやchess.comの解析や共有機能で見たことがあるかもしれません。
上記は FEN によって初期配置を表現したものです。

## FENとは何か

FENを利用すればチェス盤のポジションを一行の文字列で表現することが可能です。
情報工学では、複雑なデータ構造を保存や送信がしやすい形式に変換することをシリアライズといいます。
FENがやっているのはまさにシリアライズです。

例えば、駒の初期化位置を伝達するにはどうしたらいいでしょうか？
人間同士でのやり取りは「まず、キングをeファイルに配置し、クイーンはdファイル、次にルークを端のa,hそれぞれに配置し・・・」というふうに伝えることもできますが、FENはこのような情報を形式化された文字列に効率よく凝縮しています。

FENのようなフォーマットがコンピュータにとっても処理がしやすく、例えば棋譜解析でもFENを入力することでポジションを再現できます。
このサービスでも特定のポジションに対するトレーニングを行うためにFENを利用しています。

## FENの仕様について

FENの仕様の解説は公式なドキュメントが潤沢なので、他所に譲ります。

- [Forsyth–Edwards Notation - Wikipedia](https://ja.wikipedia.org/wiki/Forsyth-Edwards_Notation)
- [Standard: Portable Game Notation Specification and Implementation Guide](https://www.thechessdrum.net/PGN_Reference.txt) - FENはPGN仕様の一部として定義されています

## トレーニングで理解を深めよう

このサービスではFENをもとに盤面を再現するトレーニングメニューを用意しています。
一般的にはオンラインでチェスをするときはFENを自分で入力することもなく、コピーアンドペーストで入力したFENは自動的に盤面に再現されます。
しかしながら、FENを理解するために自分の手で盤面の再現をしてみることはFENを理解するための効果的な手段です。
FENの仕様を理解したら、トレーニングで理解度を試してみましょう。`;

export default content;
