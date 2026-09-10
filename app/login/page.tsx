import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { safeReturnTo } from "@/lib/auth/return-to";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { signInWithGoogle } from "./actions";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string }> }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  if (await getCurrentAppUser()) redirect(returnTo);

  return (
    <main className="shell grid min-h-screen place-items-center py-10">
      <section className="card w-full max-w-md p-7 sm:p-10" aria-labelledby="login-title">
        <Link className="display text-2xl" href="/">Invite</Link>
        <p className="eyebrow mt-12">Dành cho chủ tiệc</p>
        <h1 className="display mt-3 text-4xl" id="login-title">Đăng nhập để lưu thiệp</h1>
        <p className="mt-4 leading-7 text-[var(--muted)]">Invite chỉ dùng tên, email và ảnh đại diện Google để tạo tài khoản của bạn.</p>
        {params.error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">Đăng nhập chưa hoàn tất. Vui lòng thử lại hoặc mở trang bằng Safari/Chrome.</p>}
        <form action={signInWithGoogle} className="mt-7">
          <input name="returnTo" type="hidden" value={returnTo} />
          <button className="button button-primary w-full" type="submit">Tiếp tục với Google</button>
        </form>
        <p className="mt-5 text-sm leading-6 text-[var(--muted)]">Nếu đang mở trong Zalo hoặc Messenger và Google chặn đăng nhập, hãy dùng menu của ứng dụng để mở trang trong Safari hoặc Chrome.</p>
        <p className="mt-8 text-xs leading-5 text-[var(--muted)]">Khi tiếp tục, bạn đồng ý với điều khoản và chính sách riêng tư của Invite.</p>
      </section>
    </main>
  );
}
