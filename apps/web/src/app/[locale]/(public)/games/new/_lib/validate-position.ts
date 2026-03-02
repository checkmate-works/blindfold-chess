import { validatePosition as chessCoreValidatePosition } from '@blindfold-chess/features/chess-core';
import type { Side } from '@blindfold-chess/types';

export type PositionValidationResult = {
  valid: boolean;
  errorKey?: string;
  correctedColor?: Side;
};

export function validatePosition(boardFen: string, fullFen: string): PositionValidationResult {
  const result = chessCoreValidatePosition(boardFen, fullFen);

  return {
    valid: result.valid,
    errorKey: result.errorKey,
    correctedColor: result.correctedColor as Side | undefined,
  };
}
