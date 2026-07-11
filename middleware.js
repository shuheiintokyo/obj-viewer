import { NextResponse } from "next/server";

async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request) {
  const session = request.cookies.get("session")?.value;
  const validEmail = process.env.AUTH_EMAIL || "";
  const secret = process.env.SESSION_SECRET || "";
  const expected = await sha256(secret + validEmail);

  if (session && session === expected) {
    return NextResponse.next();
  }
  const loginUrl = new URL("/", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/viewer/:path*"],
};
