import { NextRequest, NextResponse } from "next/server";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kbuxcvqzicnydqllyong.supabase.co").replace(/\\/+$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function secondsToMoabMidnight() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const field = (type: string) => Number(parts.find(p => p.type === type)?.value || 0);
  return Math.max(1, 86400 - (field("hour") * 3600 + field("minute") * 60 + field("second")));
}

function jwtExpiry(token: string) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = atob(part);
    return Number(JSON.parse(bytes).exp || 0);
  } catch { return 0; }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/auth/") || path === "/employee-login") return NextResponse.next();
  const access = request.cookies.get("epic_access_token")?.value;
  const refresh = request.cookies.get("epic_refresh_token")?.value;
  if (!refresh || !key) return NextResponse.next();
  if (access && jwtExpiry(access) > Math.floor(Date.now() / 1000) + 120) return NextResponse.next();

  try {
    const result = await fetch(url + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST", headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }), cache: "no-store",
    });
    if (!result.ok) return NextResponse.next();
    const session = await result.json();
    if (!session.access_token || !session.refresh_token) return NextResponse.next();
    const headers = new Headers(request.headers);
    headers.set("cookie", request.cookies.getAll().filter(c => c.name !== "epic_access_token" && c.name !== "epic_refresh_token").map(c => c.name + "=" + c.value).concat([
      "epic_access_token=" + session.access_token, "epic_refresh_token=" + session.refresh_token,
    ]).join("; "));
    const response = NextResponse.next({ request: { headers } });
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
    const midnight = secondsToMoabMidnight();
    response.cookies.set("epic_access_token", session.access_token, { ...options, maxAge: Math.min(midnight, session.expires_in || 3600) });
    response.cookies.set("epic_refresh_token", session.refresh_token, { ...options, maxAge: midnight });
    return response;
  } catch { return NextResponse.next(); }
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|css|js)$).*)"] };
