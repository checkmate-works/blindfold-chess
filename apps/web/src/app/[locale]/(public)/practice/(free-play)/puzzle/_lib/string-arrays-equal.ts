/** Element-wise equality for the parallel `moves`/`notes` string arrays. */
export function stringArraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}
