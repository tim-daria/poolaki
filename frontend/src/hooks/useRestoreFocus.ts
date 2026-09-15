/** @file Returns focus to an overlay's opener once the overlay has finished closing. */

import { useEffect, useState } from "react";

/**
 * Both edges of an overlay's life can put focus inside an `aria-hidden`
 * subtree, which is an accessibility violation. On open, MUI hides the content
 * behind the overlay before its focus trap has moved focus off the trigger. On
 * close, it restores focus while the fade-out still hides that content. This
 * hook blurs on both edges and refocuses the trigger once the fade-out is
 * over.
 * Pair with `disableRestoreFocus` and call the result from the transition's
 * `onExited`, which runs after Modal's own handler has lifted the
 * `aria-hidden`. Used by Dialog and Popover alike:
 *
 *   const restoreFocus = useRestoreFocus(open);
 *   <Dialog open={open} disableRestoreFocus
 *           slotProps={{ transition: { onExited: restoreFocus } }} />
 *
 * Needed by nested overlays too: closing a confirmation would otherwise focus
 * a button in the still-hidden parent.
 *
 * The blur on close is not enough on its own: a date picker inside the
 * overlay refocuses its own button in a timeout after it closes, which lands
 * inside the already-hidden, still-fading overlay. So while the overlay is
 * closing, any focus that arrives inside an `aria-hidden` subtree is blurred
 * again.
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
    } else {
      // MUI marks the overlay's own root aria-hidden when it removes it, once
      // the fade-out ends. Whatever was clicked inside it — the close button,
      // Cancel, a date field — must not still hold focus by then.
      (document.activeElement as HTMLElement | null)?.blur();
    }
  }

  // Closing = flipped shut but not yet exited; `restoreTo` is cleared on exit.
  const closing = !open && restoreTo !== null;
  useEffect(() => {
    if (!closing) return;
    const blurIfHidden = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[aria-hidden="true"]')) target.blur();
    };
    document.addEventListener("focusin", blurIfHidden, true);
    return () => document.removeEventListener("focusin", blurIfHidden, true);
  }, [closing]);

  return () => {
    restoreTo?.focus();
    setRestoreTo(null);
  };
}
