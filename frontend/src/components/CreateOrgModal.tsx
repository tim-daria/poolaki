import { useState } from "react";
import { useNavigate } from "react-router";
import { useOrgList } from "../context/useOrgList";
import { createOrganization } from "../lib/organizations";
import { getCsrfToken } from "../lib/csrf";

interface Props {
  onClose: () => void;
}
/**
 * Modal dialog for creating a new shared workspace with an initial balance.
 *
 * Key behavior & ordering:
 * - Client Validation: Validates non-empty name and non-negative balance before submitting.
 * - Essential Refetch Order: Calls `refresh()` to update the global organization list
 *   BEFORE navigating to `/o/${org.id}`. Navigating first would cause `OrgLayout`
 *   to fail its lookup and temporarily render `NoAccessScreen` for the newly created workspace.
 *
 * NOTE: Duplicate workspace names are currently allowed on the backend.
 * The personal workspace name can have doubles, too.
 */
export function CreateOrgModal({ onClose }: Props) {
  const { refresh } = useOrgList();
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError("");

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a workspace name");
      return;
    }
    const parsed = parseFloat(balance);
    if (isNaN(parsed) || parsed < 0) {
      setError("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const org = await createOrganization(trimmed, parsed, getCsrfToken());
      // Refresh before navigating: OrgLayout resolves the org out of the list,
      // so navigating first shows NoAccessScreen for the workspace we just made.
      await refresh();
      // Close explicitly. The header stays mounted across a workspace switch,
      // so navigating alone will not unmount this.
      onClose();
      navigate(`/o/${org.id}`);
    } catch {
      setError("Failed to create workspace. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <dialog open>
      <h2>Create shared workspace</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          Initial balance (€)
          <input
            type="number"
            min="0"
            step="0.01"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create"}
        </button>
        <button type="button" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
      </form>
    </dialog>
  );
}
