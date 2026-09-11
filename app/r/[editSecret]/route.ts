import { NextResponse } from "next/server";
import { createPublicSupabaseClient } from "@/lib/events/public-event";

export async function GET(request: Request, { params }: { params: Promise<{ editSecret: string }> }) {
  const { editSecret } = await params;
  if (!/^[0-9a-f]{64}$/i.test(editSecret)) return NextResponse.redirect(new URL("/", request.url));
  const { data } = await createPublicSupabaseClient().rpc("resolve_shared_rsvp_edit", { p_edit_secret: editSecret });
  if (!data?.publicCode) return NextResponse.redirect(new URL("/", request.url));
  const response = NextResponse.redirect(new URL(`/e/${data.publicCode}#rsvp-form`, request.url));
  response.cookies.set(`invity_rsvp_${data.publicCode}`, editSecret, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 180 });
  return response;
}
