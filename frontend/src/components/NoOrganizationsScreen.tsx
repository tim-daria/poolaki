/**
 * The user belongs to zero organizations. Shouldn't be reachable — the signup
 * signal creates a personal org for every user — so surface it as an error
 * rather than hiding it behind a permanent spinner.
 */
export function NoOrganizationsScreen() {
  return (
    <div role="alert">
      <h2>No workspaces found</h2>
      <p>
        Your account has no workspaces, which shouldn&apos;t happen. Please
        contact support.
      </p>
    </div>
  );
}
