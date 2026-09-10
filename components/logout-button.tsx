"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button className="button button-secondary text-sm" onClick={async () => {
      const response = await fetch("/api/v1/auth/logout", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } });
      if (response.ok) {
        router.push("/");
        router.refresh();
      }
    }} type="button">Đăng xuất</button>
  );
}
