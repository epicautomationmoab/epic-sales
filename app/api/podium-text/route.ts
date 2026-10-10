import { NextRequest, NextResponse } from "next/server";

const TOOLS_BASE = (process.env.EPIC_TOOLS_API_BASE_URL || "https://epic-tools-app.vercel.app").replace(/\/+$/, "");

async function proxy(request: NextRequest, method: "GET" | "POST") {
  const accessToken = request.cookies.get("epic_access_token")?.value;
  if (!accessToken) return NextResponse.json({ error: "Employee login required." }, { status: 401 });
  const endpoint = method === "GET" ? "/api/team/podium-conversation" : "/api/team/podium-text";
  const suffix = method === "GET" ? request.nextUrl.search : "";
  const response = await fetch(`${TOOLS_BASE}${endpoint}${suffix}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
    ...(method === "POST" ? { body: await request.text() } : {}),
    cache: "no-store",
  });
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: NextRequest) { return proxy(request, "GET"); }
export async function POST(request: NextRequest) { return proxy(request, "POST"); }
