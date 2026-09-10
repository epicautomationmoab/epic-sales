import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeamProfile } from "../../../lib/team-auth";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/, "");
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("epic_access_token")?.value;
  const profile = await getAuthenticatedTeamProfile(accessToken);
  if (!profile || !accessToken || profile.role === "workstation") {
    return NextResponse.json({ error: "Employee login required." }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json({ ok: true, customers: [] });

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_epic_customers`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_query: q, p_limit: 50 }),
      cache: "no-store",
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text || `Customer search failed (${response.status})`);
    return NextResponse.json({ ok: true, customers: text ? JSON.parse(text) : [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to search customers." }, { status: 500 });
  }
}
