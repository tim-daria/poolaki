interface Props {
  onRetry: () => void;
}

/**
 * The workspace exists and is yours, but the server couldn't be told you opened
 * it. Distinct from NoAccessScreen: nothing is wrong with the workspace, so the
 * useful action is retrying rather than going elsewhere.
 *
 * Goes away with the bridge — once endpoints take the workspace from the URL
 * there is nothing to sync, so nothing to fail.
 */
export function SyncFailedScreen({ onRetry }: Props) {
  return (
    <div role="alert">
      <h2>Couldn&apos;t open this workspace</h2>
      <p>Something went wrong on our side. Please try again.</p>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
