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
  const validCode = process.env.ACCESS_CODE || "";
  const secret = process.env.SESSION_SECRET || "";
  const expected = await sha256(secret + validCode);

  if (session && session === expected) {
    const res = NextResponse.next();
    // Belt-and-suspenders: explicitly forbid caching this response anywhere
    // (CDN, browser, or otherwise) so a stale, already-authenticated page
    // can never be served to someone who shouldn't have access.
    res.headers.set("Cache-Control", "no-store, must-revalidate");
    return res;
  }
  const loginUrl = new URL("/", request.url);
  const res = NextResponse.redirect(loginUrl);
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  return res;
}

export const config = {
  matcher: ["/viewer/:path*"],
};