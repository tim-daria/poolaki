/** @file Terminal screen for a workspace list that could not be fetched, with a retry. */

import { useState } from "react";
import { Button } from "@mui/material";
import { ErrorScreen } from "./ErrorScreen";

interface Props {
  onRetry: () => Promise<void>;
}

/**
 * Distinct from NoOrganizationsScreen: we don't know what the user has, so
 * telling them they have nothing would be a lie.
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
    <ErrorScreen
      role="alert"
      title="Couldn't load your workspaces"
      actions={
        <Button
          variant="contained"
          onClick={() => void handleRetry()}
          disabled={retrying}
        >
          {retrying ? "Retrying…" : "Retry"}
        </Button>
      }
    >
      Something went wrong on our side. Please try again.
    </ErrorScreen>
  );
}
