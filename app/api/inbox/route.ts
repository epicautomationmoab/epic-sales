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

function emailDomain(value: unknown) {
  const email = String(value || "").trim().toLowerCase();
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1) : "";
}

function domainBlocked(domain: string, blocked: string[]) {
  return blocked.some((item) => domain === item || domain.endsWith(`.${item}`));
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
    const [threads, blockedRows] = await Promise.all([
      rpc(session.accessToken, "get_epic_routed_inbox", { p_include_cleaned: includeClosed }),
      rpc(session.accessToken, "get_epic_sales_blocked_domains", {}),
    ]);
    const blocked = (Array.isArray(blockedRows) ? blockedRows : []).map((row: { domain?: string }) => String(row.domain || "").toLowerCase()).filter(Boolean);
    const filteredThreads = (Array.isArray(threads) ? threads : []).filter((thread: { kind?: string; email?: string | null }) => {
      if (thread.kind !== "email") return true;
      const domain = emailDomain(thread.email);
      return !domain || !domainBlocked(domain, blocked);
    });

    const unresolved = filteredThreads.filter((thread: any) => thread.lane === "unmatched");
    const emailCandidates = [...new Set(unresolved.map((thread: any) => String(thread.email || "").trim().toLowerCase()).filter(Boolean))];
    const phoneCandidates = [...new Set(unresolved.map((thread: any) => String(thread.phone || "").replace(/\D/g, "")).filter(Boolean))];
    const knownByEmail = new Map<string, { id:string; display_name:string|null }>();
    const knownByPhone = new Map<string, { id:string; display_name:string|null }>();

    for (const email of emailCandidates) {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/sales_contacts?canonical_email=eq.${encodeURIComponent(email)}&select=id,display_name,canonical_email&limit=2`, {
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
      });
      if (!response.ok) continue;
      const rows = await response.json().catch(() => []) as Array<{ id:string; display_name:string|null; canonical_email:string|null }>;
      if (rows.length === 1) knownByEmail.set(email, rows[0]);
    }

    for (const digits of phoneCandidates) {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/sales_contacts?canonical_phone=not.is.null&select=id,display_name,canonical_phone&limit=5000`, {
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
      });
      if (!response.ok) continue;
      const rows = await response.json().catch(() => []) as Array<{ id:string; display_name:string|null; canonical_phone:string|null }>;
      const matches = rows.filter(row => String(row.canonical_phone || "").replace(/\D/g, "") === digits);
      if (matches.length === 1) knownByPhone.set(digits, matches[0]);
      break;
    }

    const enrichedThreads = filteredThreads.map((thread: any) => {
      if (thread.lane !== "unmatched") return thread;
      const email = String(thread.email || "").trim().toLowerCase();
      const phone = String(thread.phone || "").replace(/\D/g, "");
      const contact = (email && knownByEmail.get(email)) || (phone && knownByPhone.get(phone)) || null;
      if (!contact) return thread;
      return {
        ...thread,
        contact_id: contact.id,
        known_customer: true,
        customer_name: contact.display_name || thread.customer_name,
      };
    });

    return NextResponse.json({ ok: true, threads: enrichedThreads });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load inbox." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth(request);
  if (!session) return NextResponse.json({ error: "Employee login required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: string; thread_key?: string; note_text?: string; destination?: string } | null;
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
    if (body.action === "route") {
      const destination = body.destination === "service" ? "service" : body.destination === "sales" ? "sales" : "";
      if (!destination) return NextResponse.json({ error: "Destination is required." }, { status: 400 });
      const result = await rpc(session.accessToken, "epic_route_inbox_thread", { p_thread_key: body.thread_key, p_destination: destination, p_note_text: body.note_text || null });
      return NextResponse.json(result || { ok: true });
    }
    return NextResponse.json({ error: "Invalid inbox action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update inbox thread." }, { status: 500 });
  }
}
