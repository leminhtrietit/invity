import Image from "next/image";
import type { CSSProperties } from "react";
import type { InvitationContent, InvitationMode, InvitationTheme } from "@/lib/invitation/schema";
import { Countdown } from "./countdown";
import styles from "./invitation-renderer.module.css";

type ThemeStyle = CSSProperties & Record<`--invite-${string}`, string>;

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}

function formatShortDate(value: string) {
  const parts = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${get("day")} · ${get("month")} · ${get("year")}`;
}

function formatWeekday(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { weekday: "long", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}

export function InvitationRenderer({ content, theme, mode }: { content: InvitationContent; theme: InvitationTheme; mode: InvitationMode }) {
  const themeStyle: ThemeStyle = {
    "--invite-bg": theme.background,
    "--invite-surface": theme.surface,
    "--invite-ink": theme.ink,
    "--invite-muted": theme.muted,
    "--invite-accent": theme.accent,
    "--invite-accent-soft": theme.accentSoft,
  };
  const names = content.hosts.map((host) => host.name);

  return (
    <article className={`${styles.invitation} ${styles[theme.displayFont]}`} style={themeStyle} data-mode={mode}>
      {mode === "preview" && <div className={styles.previewFlag}>Bản xem thử · không ghi lượt mở</div>}

      <header className={styles.hero}>
        {content.cover ? (
          <Image className={styles.cover} style={{ objectPosition: `${content.cover.focalX ?? 50}% ${content.cover.focalY ?? 50}%` }} src={content.cover.src} alt={content.cover.alt} fill priority sizes="(max-width: 768px) 100vw, 760px" unoptimized={content.cover.src.startsWith("/api/")} />
        ) : <div className={styles.coverFallback} aria-hidden="true" />}
        <div className={styles.heroShade} />
        <div className={styles.heroTop}><span>Trân trọng báo tin vui</span><span>{formatShortDate(content.startsAt)}</span></div>
        <div className={styles.heroCopy}>
          <p>Save the date</p>
          <h1>{names.map((name, index) => <span key={name}>{index > 0 && <i>&amp;</i>}{name}</span>)}</h1>
          <div className={styles.scrollCue}><span /> Cuộn để mở thiệp</div>
        </div>
      </header>

      <section className={styles.intro}>
        <p className={styles.kicker}>Một lời mời từ chúng mình</p>
        <h2>{content.title}</h2>
        {content.prelude && <p className={styles.lead}>{content.prelude}</p>}
        <div className={styles.dateLockup}>
          <span>{formatEventTime(content.startsAt)}</span>
          <strong>{new Date(content.startsAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}</strong>
          <span>{formatWeekday(content.startsAt)}</span>
        </div>
        <p className={styles.fullDate}>{formatEventDate(content.startsAt)}</p>
      </section>

      {content.sections.story && content.story && (
        <section className={styles.story}>
          <div className={styles.storyNumber}>01</div>
          <div>
            <p className={styles.kicker}>{content.story.eyebrow}</p>
            <h2>{content.story.heading}</h2>
            <p>{content.story.body}</p>
          </div>
        </section>
      )}

      {content.sections.countdown && (
        <section className={styles.countdownSection}>
          <p className={styles.kicker}>Hẹn gặp bạn sau</p>
          <h2>Đếm từng khoảnh khắc</h2>
          <Countdown target={content.startsAt} />
        </section>
      )}

      <section className={styles.venue}>
        <p className={styles.kicker}>Địa điểm</p>
        <h2>{content.venue.name}</h2>
        <p>{content.venue.address}</p>
        <a href={content.venue.mapUrl} target="_blank" rel="noreferrer">Xem chỉ đường <span aria-hidden="true">↗</span></a>
        {mode === "public" && <iframe className={styles.map} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${encodeURIComponent(content.venue.address)}&output=embed`} title={`Bản đồ ${content.venue.name}`} />}
      </section>

      {content.sections.schedule && content.schedule.length > 0 && (
        <section className={styles.schedule}>
          <div className={styles.sectionHeading}><p className={styles.kicker}>Ngày vui</p><h2>Lịch trình</h2></div>
          <ol>
            {content.schedule.map((item) => (
              <li key={`${item.time}-${item.title}`}><time>{item.time}</time><div><h3>{item.title}</h3>{item.note && <p>{item.note}</p>}</div></li>
            ))}
          </ol>
        </section>
      )}

      {content.sections.album && content.album.length > 0 && (
        <section className={styles.album}>
          <div className={styles.albumImage}>
            <Image style={{ objectPosition: `${content.album[0].focalX ?? 50}% ${content.album[0].focalY ?? 50}%` }} src={content.album[0].src} alt={content.album[0].alt} fill sizes="(max-width: 768px) 100vw, 760px" unoptimized={content.album[0].src.startsWith("/api/")} />
          </div>
          <div className={styles.albumNote}><span>Our days</span><p>“Thương nhau từ những điều rất nhỏ.”</p></div>
        </section>
      )}

      {content.sections.rsvp && content.rsvp.enabled && (
        <section className={styles.rsvp}>
          <p className={styles.kicker}>Xác nhận tham dự</p>
          <h2>Bạn sẽ đến chung vui chứ?</h2>
          <p>Phản hồi của bạn giúp chúng mình chuẩn bị một chỗ ngồi thật chu đáo.</p>
          <button type="button" disabled={mode === "preview"}>{mode === "preview" ? "RSVP tắt trong bản xem thử" : "Gửi xác nhận"}</button>
        </section>
      )}

      {content.sections.gift && content.gift.enabled && (
        <section className={styles.gift}>
          <span aria-hidden="true">✦</span><div><p className={styles.kicker}>Gửi lời chúc từ xa</p><h2>Món quà nhỏ</h2><p>{content.gift.message}</p></div>
          <button type="button" disabled={mode === "preview"}>Xem mã VietQR</button>
        </section>
      )}

      {content.sections.wishes && content.wishes.enabled && content.wishes.samples.length > 0 && (
        <section className={styles.wishes}>
          <p className={styles.kicker}>Lời thương gửi lại</p><h2>Những lời chúc đầu tiên</h2>
          <div>{content.wishes.samples.map((wish) => <blockquote key={`${wish.author}-${wish.message}`}><p>“{wish.message}”</p><cite>{wish.author}</cite></blockquote>)}</div>
        </section>
      )}

      <footer className={styles.footer}><span>{names.join(" & ")}</span><p>Cảm ơn bạn đã là một phần trong câu chuyện của chúng mình.</p><small>Made with Invite</small></footer>
    </article>
  );
}
