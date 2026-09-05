import { useState } from "react";

/**
 * Stops a half-filled form from being thrown away by an accidental close.
 *
 * Pair the hook with <DiscardChangesDialog>: give the shell and the Cancel
 * button `requestClose` instead of `onClose`, and the Esc key and backdrop are
 * covered too, since MUI routes both through the Dialog's onClose.
 *
 *   const guard = useCloseGuard(draft, onClose);
 *   …
 *   <ModalShell onClose={guard.requestClose}>
 *     …
 *     <Button onClick={guard.requestClose}>Cancel</Button>
 *     <DiscardChangesDialog guard={guard} />
 *   </ModalShell>
 */
export type CloseGuard<T> = {
  /** Close if untouched, otherwise raise the confirmation. */
  requestClose: () => void;
  /** True while the confirmation is up. */
  confirming: boolean;
  /** Dismiss the confirmation and stay in the form. */
  keepEditing: () => void;
  /** Close for real, losing the changes. */
  discard: () => void;
  /** Exposed for callers that want to disable a Save button on a no-op edit. */
  hasUnsavedChanges: boolean;
  /**
   * Re-snapshot, for a form that clears itself instead of unmounting.
   *
   * Takes the blank value rather than reading `current`, because the caller
   * resets its fields in the same handler: those setState calls have not
   * landed yet, so `current` still holds what is being thrown away.
   */
  reset: (blank: T) => void;
};

export function useCloseGuard<T>(
  current: T,
  onClose: () => void,
): CloseGuard<T> {
  /**
   * The value as it was on mount, or as of the last reset(). Captured with
   * useState rather than useRef so it is snapshotted deliberately, never on
   * every render.
   */
  const [openedWith, setOpenedWith] = useState(current);
  const [confirming, setConfirming] = useState(false);

  /**
   * Serialized comparison is safe for form drafts, which are built field by
   * field from one builder and so always have their keys in the same order.
   * It is not safe for arbitrary objects.
   */
  const hasUnsavedChanges =
    JSON.stringify(current) !== JSON.stringify(openedWith);

  return {
    hasUnsavedChanges,
    confirming,
    requestClose: () => {
      if (hasUnsavedChanges) setConfirming(true);
      else onClose();
    },
    keepEditing: () => setConfirming(false),
    discard: () => {
      setConfirming(false);
      onClose();
    },
    reset: (blank: T) => setOpenedWith(blank),
  };
}
