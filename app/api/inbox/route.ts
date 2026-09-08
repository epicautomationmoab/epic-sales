import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeamProfile } from "../../../lib/team-auth";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/, "");
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";

async function auth(request: NextRequest) {
  const accessToken = request.cookies.get("epic_access_token")?.value;
  const profile = await getAuthenticatedTeamProfile(accessToken);
  return profile && accessToken && profile.role !== "workstation" ? { accessToken, profile } : null;
}

async function rpc(accessToken: string, fn: string, body: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Request failed (${response.status})`);
  return text ? JSON.parse(text) : null;
}

export async function GET(request: NextRequest) {
  const session = await auth(request);
  if (!session) return NextResponse.json({ error: "Employee login required." }, { status: 401 });
  const includeClosed = request.nextUrl.searchParams.get("cleaned") === "1" || request.nextUrl.searchParams.get("closed") === "1";
  const threadKey = request.nextUrl.searchParams.get("thread_key");
  try {
    if (threadKey) {
      const notes = await rpc(session.accessToken, "get_epic_inbox_thread_notes", { p_thread_key: threadKey });
      return NextResponse.json({ ok: true, notes: notes || [] });
    }
    const threads = await rpc(session.accessToken, "get_epic_unified_inbox", { p_include_cleaned: includeClosed });
    return NextResponse.json({ ok: true, threads: threads || [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load inbox." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth(request);
  if (!session) return NextResponse.json({ error: "Employee login required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: string; thread_key?: string; note_text?: string } | null;
  if (!body?.thread_key) return NextResponse.json({ error: "Thread is required." }, { status: 400 });
  try {
    if (body.action === "close" || body.action === "clean") {
      const result = await rpc(session.accessToken, "epic_sales_clean_inbox_thread", { p_thread_key: body.thread_key });
      return NextResponse.json(result || { ok: true });
    }
    if (body.action === "note") {
      const result = await rpc(session.accessToken, "epic_sales_add_inbox_thread_note", { p_thread_key: body.thread_key, p_note_text: body.note_text || "" });
      return NextResponse.json(result || { ok: true });
    }
    return NextResponse.json({ error: "Invalid inbox action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update inbox thread." }, { status: 500 });
  }
}
