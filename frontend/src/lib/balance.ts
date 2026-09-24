/** @file Workspace balance: the opening balance plus income, minus expenses and goal contributions. */

import { parseMoney } from "./money";

/** GET /api/v1/organizations/${org_id}/balance/ */
export async function fetchBalance(
  org_id: number,
  signal?: AbortSignal,
): Promise<number> {
  const res = await fetch(`/api/v1/organizations/${org_id}/balance/`, {
    credentials: "include",
    signal,
  });
  if (!res.ok) throw new Error(`Failed to load balance (${res.status})`);
  const data: { balance: string | number } = await res.json();
  // DRF serialises Decimal as a string by default; String() also covers a
  // settings change that would send a number.
  return parseMoney(String(data.balance));
}
