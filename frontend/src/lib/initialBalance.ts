export async function submitInitialBalance(
  balance: string,
  csrfToken: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = parseFloat(balance);

  if (isNaN(parsed) || parsed < 0) {
    return { ok: false, error: "Please enter a valid amount" };
  }

  const res = await fetch("/api/organizations/personal/initial-balance/", {
    method: "PATCH",
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

  return { ok: false, error: "Failed to create organisation. Please try again." };
}
