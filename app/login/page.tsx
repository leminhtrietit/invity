import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { safeReturnTo } from "@/lib/auth/return-to";
import { getCurrentAppUser } from "@/lib/auth/current-user";
import { signInWithLeMinhTriet, signInWithPassword } from "./actions";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string }> }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);
  if (await getCurrentAppUser()) redirect(returnTo);

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <Link className="login-brand display" href="/">Invite</Link>
        <h1 className="display" id="login-title">Đăng nhập</h1>
        {params.error && <p className="login-error" role="alert">Thông tin đăng nhập không hợp lệ.</p>}
        <form action={signInWithPassword} className="login-form">
          <input name="returnTo" type="hidden" value={returnTo} />
          <label>
            <span>Email</span>
            <input autoComplete="email" inputMode="email" name="email" placeholder="you@example.com" required type="email" />
          </label>
          <label>
            <span>Mật khẩu</span>
            <input autoComplete="current-password" minLength={6} name="password" placeholder="••••••••" required type="password" />
          </label>
          <button className="login-submit" type="submit">Đăng nhập</button>
        </form>
        <form action={signInWithLeMinhTriet} className="login-provider">
          <input name="returnTo" type="hidden" value={returnTo} />
          <button aria-label="Đăng nhập bằng leminhtriet.com" title="leminhtriet.com" type="submit"><span aria-hidden="true">L</span></button>
        </form>
      </section>
    </main>
  );
}
