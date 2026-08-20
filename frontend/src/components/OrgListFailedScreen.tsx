import { useState } from "react";

interface Props {
  onRetry: () => Promise<void>;
}

/**
 * The workspace list itself couldn't be fetched. Distinct from
 * NoOrganizationsScreen: we don't know what the user has, so telling them they
 * have nothing would be a lie.
 *
 * Holds its own pending flag instead of raising the provider's `loading`: that
 * flag gates the whole subtree, so a retry from here would unmount whatever is
 * on screen elsewhere (the create-workspace modal, mid-submit).
 */
export function OrgListFailedScreen({ onRetry }: Props) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    // On success this component unmounts, so the reset only matters on failure.
    await onRetry().catch(() => {});
    setRetrying(false);
  }

  return (
    <div role="alert">
      <h2>Couldn&apos;t load your workspaces</h2>
      <p>Something went wrong on our side. Please try again.</p>
      <button
        type="button"
        onClick={() => void handleRetry()}
        disabled={retrying}
      >
        {retrying ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}
