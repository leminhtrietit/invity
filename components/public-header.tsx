/* eslint-disable @next/next/no-html-link-for-pages */
export function PublicHeader() {
  return (
    <header className="shell flex min-h-20 items-center justify-between">
      <a className="display text-2xl" href="/">Invite</a>
      <nav aria-label="Điều hướng chính" className="flex items-center gap-3 sm:gap-6">
        <a className="hidden text-sm font-semibold sm:block" href="/templates">Mẫu thiệp</a>
        <a className="hidden text-sm font-semibold sm:block" href="/pricing">Gói dịch vụ</a>
        <a className="button button-secondary text-sm" href="/login">Đăng nhập</a>
      </nav>
    </header>
  );
}
