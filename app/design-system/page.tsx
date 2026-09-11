import type { Metadata } from "next";
import { DialogDemo, Tabs, UploadField } from "@/components/ui/interactive";
import { Button, Card, DataTable, TextAreaField, TextField, Toast } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };

export default function DesignSystemPage() {
  return <main className="shell design-system-page py-14"><p className="eyebrow">Invite design system · G3</p><h1 className="display mt-3 text-5xl">Ivory, burgundy & sage</h1><p className="design-system-lead">Bộ thành phần thực tế cho owner dashboard và editor. Mọi control có trạng thái focus, disabled, lỗi và vùng chạm tối thiểu.</p>
    <section className="design-system-grid">
      <Card><h2>Actions</h2><div className="ui-row"><Button>Lưu thay đổi</Button><Button variant="secondary">Xem thử</Button><Button variant="danger">Xóa</Button><Button disabled>Đang lưu…</Button></div></Card>
      <Card><h2>Fields & upload</h2><div className="ui-stack"><TextField label="Tên sự kiện" defaultValue="Lễ thành hôn của Minh & An" hint="Tối đa 120 ký tự" /><TextField label="Địa điểm" error="Vui lòng nhập địa điểm" aria-invalid /><TextAreaField label="Lời mời" defaultValue="Trân trọng mời bạn đến chung vui." rows={3} /><UploadField /></div></Card>
      <Card><h2>Dialog & sheet</h2><div className="ui-row"><DialogDemo /><DialogDemo sheet /></div></Card>
      <Card><h2>Tabs & feedback</h2><Tabs items={[{ label: "Nội dung", content: <p>Thông tin thiệp và lịch trình.</p> }, { label: "Giao diện", content: <p>Font chữ và bảng màu.</p> }]} /><div className="ui-stack mt-5"><Toast>Đã lưu bản nháp lúc 14:32</Toast><Toast tone="error">Không thể tải ảnh. Hãy thử lại.</Toast></div></Card>
      <Card className="design-system-wide"><h2>Table</h2><DataTable columns={["Khách mời", "Trạng thái", "Đi cùng"]} rows={[["Nguyễn Hà", "Tham dự", "1"], ["Trần Minh", "Chờ phản hồi", "—"]]} /></Card>
    </section>
  </main>;
}
