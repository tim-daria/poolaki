// Rounds up to a "nice" axis maximum (1, 2, 5 x 10^n)
export function niceMax(value: number) {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

// Current month = 1, past months = attenuated, future months = hidden.
// currentMonth is null for past years, where every month is complete.
export function monthOpacity(month: number, currentMonth: number | null) {
  if (currentMonth === null || month === currentMonth) return 1;
  return month < currentMonth ? 0.35 : 0;
}