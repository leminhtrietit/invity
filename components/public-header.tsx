import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="shell flex min-h-20 items-center justify-between">
      <Link className="display text-2xl" href="/" prefetch={false}>Invite</Link>
      <nav aria-label="Điều hướng chính" className="flex items-center gap-3 sm:gap-6">
        <Link className="hidden text-sm font-semibold sm:block" href="/templates" prefetch={false}>Mẫu thiệp</Link>
        <Link className="hidden text-sm font-semibold sm:block" href="/pricing" prefetch={false}>Gói dịch vụ</Link>
        <Link className="button button-secondary text-sm" href="/login" prefetch={false}>Đăng nhập</Link>
      </nav>
    </header>
  );
}
