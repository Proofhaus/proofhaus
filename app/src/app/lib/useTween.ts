"use client";

import { useEffect, useRef, useState } from "react";

// eases the displayed number from wherever it currently is to the new target
export function useTween(target: number, ms = 1100): number {
  const [val, setVal] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = start + (target - start) * eased;
      from.current = v;
      setVal(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return val;
}
