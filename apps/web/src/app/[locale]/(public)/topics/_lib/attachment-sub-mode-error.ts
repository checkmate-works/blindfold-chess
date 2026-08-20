import type { AttachmentInputDetect } from '@/lib/games/validation';

/**
 * Friendly per-shape validation error for the PGN sub-mode of the game
 * attachment input. PGN body is the only accepted shape here; every other
 * detection routes the user toward the URL tab or out of the chess.com flow.
 * Returns `null` when there is nothing to flag (empty or a valid PGN body).
 *
 * Authoritative validation is server-side — this only gates the Apply button
 * and surfaces a hint. Extracted from `AttachmentInput` so the dispatch can be
 * unit-tested in isolation from the component.
 */
export function pgnSubModeError(detected: AttachmentInputDetect | null): string | null {
  if (!detected) return null;
  switch (detected.kind) {
    case 'pgn':
    case 'empty':
      return null;
    case 'lichess':
    case 'lichess_embed':
      // TODO(i18n): attachment.game.pgn.error.lichessUrl
      return 'Lichess URL detected. Switch to the Lichess URL tab to attach.';
    case 'lichess_unsupported':
      // TODO(i18n): attachment.game.pgn.error.lichessStudy
      return 'Lichess study URLs are not supported.';
    case 'lichess_embed_invalid_url':
      // TODO(i18n): attachment.game.pgn.error.lichessEmbedInvalid
      return 'Invalid Lichess embed URL.';
    case 'chesscom_attribution':
    case 'chesscom_invalid_url':
    case 'chesscom_invalid_pgn':
    case 'chesscom_embed':
    case 'chesscom_embed_invalid_url':
      // TODO(i18n): attachment.game.pgn.error.chesscomNotAccepted
      return 'chess.com URLs are not accepted. Paste the PGN body exported from chess.com instead.';
    case 'unknown':
      // TODO(i18n): attachment.game.pgn.error.unknown
      return 'This does not look like a PGN body. Paste a complete PGN, or use the Lichess URL tab for a URL.';
    default: {
      // `unknown` used to share this branch, which hid the fact that every
      // *new* detected shape landed on the "not a PGN body" hint instead of
      // the routing hint this module exists to give. The union has grown
      // twice (embed kinds, then chess.com kinds); it must fail the build now.
      const _exhaustive: never = detected;
      void _exhaustive;
      return 'This does not look like a PGN body. Paste a complete PGN, or use the Lichess URL tab for a URL.';
    }
  }
}

/**
 * Friendly per-shape validation error for the Lichess-URL sub-mode of the game
 * attachment input. Lichess game / embed URLs are the only accepted shapes
 * here. Returns `null` when there is nothing to flag.
 */
export function urlSubModeError(detected: AttachmentInputDetect | null): string | null {
  if (!detected) return null;
  switch (detected.kind) {
    case 'lichess':
    case 'lichess_embed':
    case 'empty':
      return null;
    case 'lichess_unsupported':
      // TODO(i18n): attachment.game.url.error.lichessStudy
      return 'Lichess study URLs are not supported.';
    case 'lichess_embed_invalid_url':
      // TODO(i18n): attachment.game.url.error.lichessEmbedInvalid
      return 'Invalid Lichess embed URL.';
    case 'chesscom_attribution':
    case 'chesscom_invalid_url':
    case 'chesscom_invalid_pgn':
    case 'chesscom_embed':
    case 'chesscom_embed_invalid_url':
      // TODO(i18n): attachment.game.url.error.chesscomNotAccepted
      return 'chess.com URLs are not accepted. Paste the PGN body exported from chess.com instead.';
    case 'pgn':
      // TODO(i18n): attachment.game.url.error.pgnDetected
      return 'PGN body detected. Switch to the PGN tab to attach.';
    case 'unknown':
      // TODO(i18n): attachment.game.url.error.notLichess
      return 'Please paste a Lichess game URL or embed URL.';
    default: {
      // Same reasoning as `pgnSubModeError` above: keep `unknown` explicit so
      // a newly detected shape is a build error rather than a wrong hint.
      const _exhaustive: never = detected;
      void _exhaustive;
      return 'Please paste a Lichess game URL or embed URL.';
    }
  }
}
