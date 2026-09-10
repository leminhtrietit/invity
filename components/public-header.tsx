import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="shell flex min-h-20 items-center justify-between">
      <Link className="display text-2xl" href="/">Invite</Link>
      <nav aria-label="Điều hướng chính" className="flex items-center gap-3 sm:gap-6">
        <Link className="hidden text-sm font-semibold sm:block" href="/templates">Mẫu thiệp</Link>
        <Link className="button button-secondary text-sm" href="/login">Đăng nhập</Link>
      </nav>
    </header>
  );
}
