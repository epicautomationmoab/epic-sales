import { NextRequest, NextResponse } from "next/server";

const PODIUM_TOOLS_PREVIEW = "https://epic-tools-app-git-feature-c36-83802a-automation-4515s-projects.vercel.app";
const TOOLS_BASE = (process.env.EPIC_TOOLS_API_BASE_URL || (process.env.VERCEL_GIT_COMMIT_REF === "feature/c360-podium-sms-2700" ? PODIUM_TOOLS_PREVIEW : "https://epic-tools-app.vercel.app")).replace(/\/+$/, "");

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
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json")) {
    return NextResponse.json({error: "Podium reply service unavailable in this preview. No text was sent."}, {status:502});
  }
  return new NextResponse(body, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: NextRequest) { return proxy(request, "GET"); }
export async function POST(request: NextRequest) { return proxy(request, "POST"); }
