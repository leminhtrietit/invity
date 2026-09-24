"use client";

import { useEffect } from "react";

export function StoryReveal() {
  useEffect(() => {
    const grid = document.querySelector<HTMLElement>("#how-it-works .home-story-grid");
    if (!grid || !window.matchMedia("(prefers-reduced-motion: no-preference)").matches || !("IntersectionObserver" in window)) return;

    const cards = Array.from(grid.querySelectorAll<HTMLElement>(".home-story-step"));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.visible = "true";
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });

    cards.forEach((card) => observer.observe(card));
    grid.dataset.revealReady = "true";
    return () => {
      observer.disconnect();
      delete grid.dataset.revealReady;
    };
  }, []);

  return null;
}
