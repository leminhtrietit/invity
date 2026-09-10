import Link from "next/link";

export default function NotFound() {
  return <main className="shell grid min-h-screen place-items-center text-center"><section><p className="eyebrow">404</p><h1 className="display mt-3 text-5xl">Không tìm thấy trang</h1><Link className="button button-primary mt-7" href="/">Về trang chủ</Link></section></main>;
}
