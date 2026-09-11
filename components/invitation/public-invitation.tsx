"use client";

import { useRef, useState } from "react";
import type { InvitationContent, InvitationTheme } from "@/lib/invitation/schema";
import { InvitationRenderer } from "./invitation-renderer";

export function PublicInvitation({ content, theme }: { content: InvitationContent; theme: InvitationTheme }) {
  const [opened, setOpened] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const names = content.hosts.map((host) => host.name).join(" & ");

  async function openInvitation() {
    setOpened(true);
    if (audioRef.current) { try { await audioRef.current.play(); setPlaying(true); } catch { setPlaying(false); } }
  }
  async function toggleMusic() {
    if (!audioRef.current) return;
    if (audioRef.current.paused) { try { await audioRef.current.play(); setPlaying(true); } catch { setPlaying(false); } }
    else { audioRef.current.pause(); setPlaying(false); }
  }

  return <div className="public-invitation">
    <InvitationRenderer content={content} theme={theme} mode="public" />
    {!opened && <div className="envelope-screen"><div className="envelope-card"><p>Trân trọng kính mời</p><span className="envelope-seal" aria-hidden="true">✦</span><h1>{names}</h1><button onClick={openInvitation} type="button">Mở thiệp</button><small>Chạm để mở thiệp và phát nhạc</small></div></div>}
    {content.music && <><audio ref={audioRef} loop preload="none" src={content.music.src}>Trình duyệt không hỗ trợ phát nhạc.</audio>{opened && <button className="music-control" aria-label={playing ? "Tắt nhạc" : "Phát nhạc"} onClick={toggleMusic} type="button">{playing ? "♫" : "♪"}</button>}</>}
  </div>;
}
