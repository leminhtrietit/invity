import { NextResponse } from "next/server";

export function requestId() {
  return crypto.randomUUID();
}

export function apiSuccess<T>(data: T, id = requestId(), init?: ResponseInit) {
  return NextResponse.json({ data, requestId: id }, init);
}

export function apiError(status: number, code: string, message: string, id = requestId(), fields: Array<{ path: string; code: string }> = []) {
  return NextResponse.json({ error: { code, message, fields }, requestId: id }, { status });
}
