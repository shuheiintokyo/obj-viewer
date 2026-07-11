import { NextResponse } from "next/server";

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request) {
  const { code } = await request.json();

  const validCode = process.env.ACCESS_CODE || "";
  const secret = process.env.SESSION_SECRET || "";

  if (!validCode || !secret) {
    return NextResponse.json(
      { ok: false, error: "サーバー側の環境変数が未設定です。" },
      { status: 500 }
    );
  }

  if (code === validCode) {
    const token = await sha256(secret + validCode);
    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      // No maxAge: this makes it a session cookie, cleared when the browser
      // is fully closed (not just the tab) — so each new browser session
      // requires logging in again, rather than staying signed in for days.
    });
    return res;
  }

  return NextResponse.json(
    { ok: false, error: "アクセスコードが違います。" },
    { status: 401 }
  );
}