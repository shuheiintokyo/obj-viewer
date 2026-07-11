import { NextResponse } from "next/server";

export async function POST(request) {
  const url = new URL("/", request.url);
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set("session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}