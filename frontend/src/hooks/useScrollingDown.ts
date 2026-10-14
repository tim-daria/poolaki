/** @file Direction of the user's last scroll in a container, for controls that step aside while they read. */

import { useEffect, useState, type RefObject } from "react";

/** Moves smaller than this, in px, are a resting thumb, not a scroll. */
const THRESHOLD = 8;

/**
 * True after a downward scroll in `ref`, false after an upward one or at the
 * top. Direction, not position: there is no offset at which hiding a control
 * is right, but "the user is heading down to read" always is, and reversing
 * brings it straight back.
 */
export function useScrollingDown(ref: RefObject<HTMLElement | null>): boolean {
  const [down, setDown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = el.scrollTop;

    const onScroll = () => {
      const top = el.scrollTop;
      const delta = top - last;
      if (Math.abs(delta) < THRESHOLD) return;
      last = top;
      setDown(delta > 0 && top > 0);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [ref]);

  return down;
}
