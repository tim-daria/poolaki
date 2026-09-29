/** @file Live size of a DOM element, for layouts that fit content to the room they get. */

import { useLayoutEffect, useState, type RefObject } from "react";

export type ElementSize = { width: number; height: number };

/** Border-box size of `ref`'s element, 0×0 before the first measurement. */
export function useElementSize(
  ref: RefObject<HTMLElement | null>,
): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize[0];
      setSize((prev) =>
        prev.width === box.inlineSize && prev.height === box.blockSize
          ? prev
          : { width: box.inlineSize, height: box.blockSize },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
