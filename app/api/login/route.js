import { NextResponse } from "next/server";

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request) {
  const { email, password } = await request.json();

  const validEmail = process.env.AUTH_EMAIL || "";
  const validPassword = process.env.AUTH_PASSWORD || "";
  const secret = process.env.SESSION_SECRET || "";

  if (!validEmail || !validPassword || !secret) {
    return NextResponse.json(
      { ok: false, error: "サーバー側の環境変数が未設定です。" },
      { status: 500 }
    );
  }

  if (email === validEmail && password === validPassword) {
    const token = await sha256(secret + validEmail);
    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return res;
  }

  return NextResponse.json(
    { ok: false, error: "メールアドレスまたはパスワードが違います。" },
    { status: 401 }
  );
}
