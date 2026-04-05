/** Check if a game outcome represents a finished game (not in progress). */
export function isGameFinished(status: string): boolean {
  return status === 'win' || status === 'loss' || status === 'draw';
}
