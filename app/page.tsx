import Image from "next/image";
import Link from "next/link";
import { HeroInvitation } from "@/components/home/hero-invitation";
import { StoryReveal } from "@/components/home/story-reveal";
import { PublicHeader } from "@/components/public-header";
import { getTemplate, templateArt } from "@/lib/templates/catalog";

export default function HomePage() {
  const featured = ["vow-editorial", "little-orbit", "new-chapter"].map((id) => getTemplate(id)!);

  return <>
    <PublicHeader />
    <main>
      <section className="home-hero shell">
        <div className="home-hero-copy">
          <p className="eyebrow">Thiệp mời trực tuyến · Made in Vietnam</p>
          <h1 className="display">Thiệp mời khiến người ta <em>muốn mở.</em></h1>
          <p>Chọn một phong cách thật riêng, kể câu chuyện của bạn và nhận hồi đáp trong cùng một nơi.</p>
        </div>
        <HeroInvitation />
        <div className="home-hero-actions">
          <Link className="button button-primary" href="/templates">Tạo thiệp miễn phí</Link>
          <Link className="button button-secondary" href="#how-it-works">Xem cách hoạt động</Link>
          <small>Không cần thẻ thanh toán · 1 sự kiện/tháng · tối đa 50 khách</small>
        </div>
      </section>

      <section className="home-story shell" id="how-it-works">
        <StoryReveal />
        <div className="home-story-heading">
          <p className="eyebrow">Từ ý tưởng đến lời hồi đáp</p>
          <h2 className="display">Một lời mời. <em>Cả câu chuyện.</em></h2>
          <p>Invite giúp bạn tạo thiệp đẹp và chăm chút từng vị khách, từ khoảnh khắc chọn mẫu đến lúc nhận câu trả lời.</p>
        </div>
        <div className="home-story-grid">
          <article className="home-story-step">
            <div className="home-story-visual home-story-visual-templates" aria-hidden="true">
              {["silk-promise", "little-orbit", "midnight-toast"].map((id) => <span className="home-story-mini-card" key={id}><Image src={templateArt[id].src} alt="" fill sizes="180px" /></span>)}
            </div>
            <span className="home-story-index">01 / CHỌN MẪU</span>
            <h3 className="display">Bắt đầu bằng cảm xúc.</h3>
            <p>Từ cưới, thôi nôi đến tiệc tối: mỗi mẫu có hình ảnh và nhịp kể riêng.</p>
          </article>
          <article className="home-story-step">
            <div className="home-story-visual home-story-visual-personal" aria-hidden="true">
              <div className="home-story-personal-card"><small>THIỆP CỦA BẠN</small><strong className="display">Mai <i>&amp;</i> Nam</strong><span>Hẹn bạn giữa khu vườn · 20.12.2026</span></div>
              <span className="home-story-personal-sticker">thật riêng<br />cho bạn ✦</span>
            </div>
            <span className="home-story-index">02 / KỂ CHUYỆN</span>
            <h3 className="display">Đặt dấu ấn của bạn.</h3>
            <p>Thêm ảnh, lời mời, thời gian và những chi tiết đáng nhớ vào thiệp.</p>
          </article>
          <article className="home-story-step">
            <div className="home-story-visual home-story-visual-rsvp" aria-hidden="true">
              <div className="home-story-rsvp-card"><small>BẢN MINH HỌA · RSVP</small><strong className="display">Hẹn gặp nhau nhé!</strong><span className="home-story-rsvp-answer"><b>✓</b> Mình sẽ đến</span><span className="home-story-rsvp-message">“Rất mong đến chung vui cùng hai bạn.”</span></div>
            </div>
            <span className="home-story-index">03 / NHẬN HỒI ĐÁP</span>
            <h3 className="display">Niềm vui được đáp lại.</h3>
            <p>Gửi link và theo dõi RSVP, lời chúc cùng danh sách khách trong một chỗ.</p>
          </article>
        </div>
      </section>

      <section className="shell home-templates">
        <div className="home-section-heading"><div><p className="eyebrow">Bộ sưu tập</p><h2 className="display">Mỗi dịp một cách kể.</h2></div><Link href="/templates">Xem cả 10 mẫu →</Link></div>
        <div className="home-template-grid">{featured.map((template, index) => <Link href={`/templates/${template.id}`} className="home-template" data-template={template.id} key={template.id}>
          <div style={{ background: template.theme.background, color: template.theme.surface }}><Image alt="" fill sizes="(max-width: 700px) 90vw, 33vw" src={templateArt[template.id].src} /><span>0{index + 1}</span><strong className="display">{template.motif}</strong><small>{template.name}</small></div>
          <p>{template.categoryLabel}</p><h3 className="display">{template.name}</h3>
        </Link>)}</div>
      </section>

      <section className="home-feature-band"><div className="shell"><article><span>✦</span><h3 className="display">Mở thiệp có cảm xúc</h3><p>Thiệp đẹp trên điện thoại, có nhạc sau tương tác và chuyển động vừa đủ.</p></article><article><span>↗</span><h3 className="display">Chia sẻ đẹp</h3><p>Mỗi sự kiện có ảnh xem trước riêng khi gửi qua Zalo, Messenger và Telegram.</p></article><article><span>✓</span><h3 className="display">Quản lý nhẹ nhàng</h3><p>RSVP, lời chúc, VietQR và danh sách khách luôn ở đúng sự kiện.</p></article></div></section>
      <section className="shell home-final"><p className="eyebrow">Gói Free đang mở</p><h2 className="display">Lời mời đầu tiên<br />đang chờ bạn viết.</h2><p>Một sự kiện mỗi tháng, tối đa 50 suất khách. Chưa cần thanh toán.</p><div><Link className="button button-primary" href="/templates">Chọn mẫu thiệp</Link><Link className="button button-secondary" href="/pricing">Xem gói dịch vụ</Link></div></section>
    </main>
    <footer className="site-footer shell"><Link className="display" href="/">Invite</Link><div><Link href="/privacy">Quyền riêng tư</Link><Link href="/contact">Hỗ trợ</Link><Link href="/pricing">Gói dịch vụ</Link></div><small>© 2026 Invite</small></footer>
  </>;
}
