/** @file Year options for the Reports selector: every year from the workspace's oldest row to now. */

/** Newest first. An unknown or future `earliest` yields the current year alone. */
export function yearOptions(
  earliest: number | null,
  current: number,
): number[] {
  const first = earliest === null || earliest > current ? current : earliest;
  const years: number[] = [];
  for (let y = current; y >= first; y--) years.push(y);
  return years;
}
