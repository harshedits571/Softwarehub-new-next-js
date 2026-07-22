"use client";

import { useState, useEffect, useRef } from "react";
import { useInView, motion } from "framer-motion";

// --- CountUp Component ---
export function CountUp({
  target,
  suffix = "",
  decimals = 0,
}: {
  target: number;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let current = 0;
    const duration = 1500;
    const steps = duration / 16;
    const increment = target / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, decimals]);

  return (
    <span ref={ref}>
      {decimals > 0 ? count.toFixed(decimals) : count}
      {suffix}
    </span>
  );
}

// --- Marquee Component ---
export function Marquee({ items = [] }: { items?: string[] }) {
  const defaultItems = ["PREMIUM EDITIONS", "ORIGINAL CONTENT", "EXCLUSIVE RESOURCES", "PRO ASSETS"];
  const displayItems = items.length > 0 ? items : defaultItems;
  const doubled = [...displayItems, ...displayItems, ...displayItems, ...displayItems];

  return (
    <div className="w-full overflow-hidden bg-brand-500 py-3 relative border-y border-brand-600/50">
      <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-black/20 to-transparent z-10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-black/20 to-transparent z-10 pointer-events-none" />
      <div className="flex whitespace-nowrap animate-marquee">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="text-black font-black text-xs md:text-sm tracking-[0.2em] uppercase mx-8 flex items-center gap-4"
          >
            {item}
            <i className="fa-solid fa-star text-[10px] opacity-50 mx-4"></i>
          </span>
        ))}
      </div>
    </div>
  );
}
