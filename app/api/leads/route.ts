import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeamProfile } from "../../../lib/team-auth";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/, "");
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";

async function rpc(accessToken: string, fn: string, body: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    let message = text || `Request failed (${response.status})`;
    try { const parsed = JSON.parse(text); message = parsed?.message || parsed?.error || message; } catch {}
    throw new Error(message);
  }
  return text ? JSON.parse(text) : null;
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("epic_access_token")?.value;
  const profile = await getAuthenticatedTeamProfile(accessToken);
  if (!profile || !accessToken || profile.role === "workstation") return NextResponse.json({ error: "Employee login required." }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    action?: "claim" | "release" | "note" | "mark_lost" | "retire";
    opportunity_id?: string;
    note_text?: string;
    reason?: string;
  } | null;
  const opportunityId = body?.opportunity_id?.trim();
  if (!opportunityId) return NextResponse.json({ error: "Lead is required." }, { status: 400 });

  try {
    if (body?.action === "note") {
      const note = await rpc(accessToken, "epic_sales_add_note", { p_opportunity_id: opportunityId, p_note_text: body.note_text || "" });
      return NextResponse.json({ ok: true, note });
    }
    if (body?.action === "claim" || body?.action === "release") {
      const result = await rpc(accessToken, "epic_sales_claim_lead", { p_opportunity_id: opportunityId, p_release: body.action === "release" });
      return NextResponse.json(result || { ok: true });
    }
    if (body?.action === "mark_lost" || body?.action === "retire") {
      const result = await rpc(accessToken, "epic_sales_close_lead", {
        p_opportunity_id: opportunityId,
        p_status: body.action === "mark_lost" ? "lost" : "retired",
        p_reason: body.reason || "",
        p_note: body.note_text || null,
      });
      return NextResponse.json(result || { ok: true });
    }
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update lead." }, { status: 500 });
  }
}
