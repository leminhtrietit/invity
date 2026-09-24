"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent } from "react";

export function HeroInvitation() {
  const [opened, setOpened] = useState(false);
  const envelopeRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  function moveEnvelope(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      envelopeRef.current?.style.setProperty("--tilt-x", `${(-y * 8).toFixed(2)}deg`);
      envelopeRef.current?.style.setProperty("--tilt-y", `${(x * 8).toFixed(2)}deg`);
      frameRef.current = null;
    });
  }

  function resetEnvelope() {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    envelopeRef.current?.style.setProperty("--tilt-x", "0deg");
    envelopeRef.current?.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div className="home-hero-art" aria-label="Mở thử một thiệp mời">
      <div className="home-art-orbit home-art-orbit-one" aria-hidden="true" />
      <div className="home-art-orbit home-art-orbit-two" aria-hidden="true" />
      <span className="home-art-star home-art-star-one" aria-hidden="true">✦</span>
      <span className="home-art-star home-art-star-two" aria-hidden="true">✧</span>
      <button
        ref={envelopeRef}
        className="home-envelope"
        type="button"
        data-open={opened}
        aria-label={opened ? "Đóng thiệp xem thử" : "Mở thử thiệp"}
        aria-pressed={opened}
        onClick={() => setOpened((current) => !current)}
        onPointerMove={moveEnvelope}
        onPointerLeave={resetEnvelope}
      >
        <span className="home-envelope-back" aria-hidden="true" />
        <span className="home-invite-card" aria-hidden="true">
          <span className="home-invite-image"><Image src="/images/templates/garden-vow-cover.webp" alt="" fill sizes="(max-width: 700px) 240px, 380px" fetchPriority="high" loading="eager" /></span>
          <span className="home-invite-copy"><small>THE GARDEN EDITION</small><strong>Mai <i>&amp;</i> Nam</strong><span>20 · 12 · 2026</span></span>
        </span>
        <span className="home-envelope-pocket" aria-hidden="true" />
        <span className="home-envelope-flap" aria-hidden="true" />
        <span className="home-envelope-seal" aria-hidden="true">✦</span>
      </button>
      <div className="home-art-caption"><span>{opened ? "Một câu chuyện vừa mở ra" : "Chạm để mở thử"}</span><Link href="/templates/garden-vow">Xem thiệp hoàn chỉnh ↗</Link></div>
    </div>
  );
}
