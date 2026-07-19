"use client";

import { useEffect } from "react";

export function useScrollReveal() {
  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealActive");
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    const elements = document.querySelectorAll(".reveal");
    elements.forEach((el) => observer.observe(el));

    // Also observe dynamically added elements (like those fetched from DB)
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.classList.contains("reveal")) {
              observer.observe(node);
            }
            // Also check children of added nodes
            const childReveals = node.querySelectorAll(".reveal");
            childReveals.forEach((el) => observer.observe(el));
          }
        });
      });
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      elements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);
}
