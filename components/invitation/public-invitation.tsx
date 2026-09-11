"use client";

import { useRef, useState } from "react";
import type { InvitationContent, InvitationTheme } from "@/lib/invitation/schema";
import { InvitationRenderer } from "./invitation-renderer";
import { RsvpForm, type RsvpInitial } from "./rsvp-form";
import { GiftSheet } from "./gift-sheet";
import type { PublicGiftOption } from "@/lib/gifts/schema";

export function PublicInvitation({ content, theme, publicCode, giftOptions=[], invitationToken, guestName, initialRsvp }: { content: InvitationContent; theme: InvitationTheme; publicCode: string; giftOptions?:PublicGiftOption[]; invitationToken?: string; guestName?: string; initialRsvp?: RsvpInitial | null }) {
  const [opened, setOpened] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const giftDialogRef = useRef<HTMLDialogElement>(null);
  const names = content.hosts.map((host) => host.name).join(" & ");

  async function openInvitation() {
    setOpened(true);
    void fetch(`/api/v1/public/events/${publicCode}/open`, { method: "POST", keepalive: true });
    if (audioRef.current) { try { await audioRef.current.play(); setPlaying(true); } catch { setPlaying(false); } }
  }
  async function toggleMusic() {
    if (!audioRef.current) return;
    if (audioRef.current.paused) { try { await audioRef.current.play(); setPlaying(true); } catch { setPlaying(false); } }
    else { audioRef.current.pause(); setPlaying(false); }
  }

  return <div className="public-invitation">
    <InvitationRenderer content={content} theme={theme} mode="public" onOpenGift={giftOptions.length?()=>giftDialogRef.current?.showModal():undefined} />
    {giftOptions.length>0&&<GiftSheet publicCode={publicCode} options={giftOptions} dialogRef={giftDialogRef}/>}
    {content.sections.rsvp && content.rsvp.enabled && <RsvpForm endpoint={invitationToken ? `/api/v1/i/${invitationToken}/rsvp` : initialRsvp ? `/api/v1/public/events/${publicCode}/rsvps/me` : `/api/v1/public/events/${publicCode}/rsvps`} guestName={guestName} initial={initialRsvp} maxCompanions={content.rsvp.maxCompanions} method={invitationToken || initialRsvp ? "PATCH" : "POST"} />}
    {!opened && <div className="envelope-screen"><div className="envelope-card"><p>{guestName ? `Thân gửi ${guestName}` : "Trân trọng kính mời"}</p><span className="envelope-seal" aria-hidden="true">✦</span><h1>{names}</h1><button onClick={openInvitation} type="button">Mở thiệp</button><small>Chạm để mở thiệp và phát nhạc</small></div></div>}
    {content.music && <><audio ref={audioRef} loop preload="none" src={content.music.src}>Trình duyệt không hỗ trợ phát nhạc.</audio>{opened && <button className="music-control" aria-label={playing ? "Tắt nhạc" : "Phát nhạc"} onClick={toggleMusic} type="button">{playing ? "♫" : "♪"}</button>}</>}
  </div>;
}
