"use client";

import { useEffect, useState } from "react";

function remaining(target: string) {
  const distance = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    ngày: Math.floor(distance / 86_400_000),
    giờ: Math.floor((distance / 3_600_000) % 24),
    phút: Math.floor((distance / 60_000) % 60),
    giây: Math.floor((distance / 1000) % 60),
  };
}

export function Countdown({ target }: { target: string }) {
  const [parts, setParts] = useState(() => remaining(target));

  useEffect(() => {
    const timer = window.setInterval(() => setParts(remaining(target)), 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  return (
    <div className="invitation-countdown" aria-label="Thời gian còn lại đến sự kiện">
      {Object.entries(parts).map(([label, value]) => (
        <span key={label}><strong>{String(value).padStart(2, "0")}</strong><small>{label}</small></span>
      ))}
    </div>
  );
}
