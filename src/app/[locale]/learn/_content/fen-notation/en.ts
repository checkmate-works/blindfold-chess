const content = `# Using FEN Notation

Have you heard of Forsyth–Edwards Notation (FEN)?
Even if you're not familiar with the term, you may have seen strings like \`rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1\` in the analysis or sharing features of lichess or chess.com.
The example above represents the starting position in FEN.

## What is FEN?

FEN allows you to express a chess position in a single line of text.
In computer science, converting complex data structures into a format that's easy to store or transmit is called serialization.
That's exactly what FEN does.

For example, how would you communicate the initial piece positions?
In human conversation, you might say "First, place the King on the e-file, the Queen on the d-file, then place the Rooks on the a and h files..." but FEN efficiently condenses such information into a formalized string.

Formats like FEN are also easy for computers to process. For instance, you can reproduce a position in game analysis by inputting its FEN.
This service also uses FEN to enable training on specific positions.

## FEN Specification

There is abundant official documentation explaining the FEN specification, so we'll defer to those resources.

- [Forsyth–Edwards Notation - Wikipedia](https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)
- [Standard: Portable Game Notation Specification and Implementation Guide](https://www.thechessdrum.net/PGN_Reference.txt) - FEN is defined as part of the PGN specification

## Deepen Your Understanding Through Training

This service provides training menus for reconstructing board positions from FEN.
Typically, when playing chess online, you don't need to input FEN manually—copy and pasted FEN strings are automatically converted into board positions.
However, reconstructing positions by hand is an effective way to truly understand FEN.
Once you've learned the FEN specification, test your understanding with our training exercises.`;

export default content;
