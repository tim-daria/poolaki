/** @file Starting balance of the personal workspace; the endpoint has no shared-workspace counterpart. */

/**
 * Flip once the backend can set a shared workspace's starting balance. Until
 * then Home shows the action disabled, so the layout is final.
 */
export const CAN_SET_SHARED_STARTING_BALANCE = false;

export async function submitInitialBalance(
  balance: string,
  csrfToken: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = parseFloat(balance);

  if (isNaN(parsed) || parsed < 0) {
    return { ok: false, error: "Please enter a valid amount" };
  }

  const res = await fetch("/api/v1/organizations/personal/initial-balance/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify({ initial_balance: parsed }),
  });

  if (res.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    error: "Could not save the starting balance. Please try again.",
  };
}
