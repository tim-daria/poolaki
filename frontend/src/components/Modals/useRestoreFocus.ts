/** @file Returns focus to a dialog's opener once the dialog has finished closing. */

import { useState } from "react";

/**
 * Both edges of a dialog's life can put focus inside an `aria-hidden`
 * subtree, which is an accessibility violation. On open, MUI hides the content
 * behind the dialog before its focus trap has moved focus off the trigger. On
 * close, it restores focus while the fade-out still hides that content, since
 * Dialog hardcodes `closeAfterTransition`. This hook blurs the trigger on open
 * and refocuses it once the fade-out is over. Pair with `disableRestoreFocus`
 * and call the result from the transition's `onExited`, which runs after
 * Modal's own handler has lifted the `aria-hidden`:
 *
 *   const restoreFocus = useRestoreFocus(open);
 *   <Dialog open={open} disableRestoreFocus
 *           slotProps={{ transition: { onExited: restoreFocus } }} />
 *
 * Needed by nested dialogs too: closing a confirmation would otherwise focus
 * a button in the still-hidden parent.
 */
export function useRestoreFocus(open: boolean): () => void {
  const [restoreTo, setRestoreTo] = useState<HTMLElement | null>(null);

  // Captured during the render where `open` flips, not in an effect: the
  // Dialog's focus trap has already moved focus by the time an effect runs.
  // Blurred right away, before the commit that applies `aria-hidden`.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const trigger = document.activeElement as HTMLElement | null;
      setRestoreTo(trigger);
      trigger?.blur();
    }
  }

  return () => {
    restoreTo?.focus();
    setRestoreTo(null);
  };
}
