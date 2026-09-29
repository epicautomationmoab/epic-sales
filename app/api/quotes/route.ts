import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeamProfile } from "../../../lib/team-auth";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/, "");
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("epic_access_token")?.value;
  const profile = await getAuthenticatedTeamProfile(accessToken);
  if (!profile || !accessToken || !profile.active || profile.role === "workstation") {
    return NextResponse.json({ error: "Signed-in sales rep required." }, { status: 401 });
  }

  const input = await request.json().catch(() => null);
  if (!input || !Array.isArray(input.activities)) {
    return NextResponse.json({ error: "Invalid quote." }, { status: 400 });
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_epic_sales_quote_v6`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_quote_id: input.quoteId || null,
      p_customer_name: input.customerName || null,
      p_customer_email: input.customerEmail || null,
      p_customer_phone: input.customerPhone || null,
      p_visit_start: input.visitStart || null,
      p_visit_end: input.visitEnd || null,
      p_activities: input.activities,
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return NextResponse.json({ error: payload?.message || payload?.error || "Unable to save estimate." }, { status: response.status });
  }
  return NextResponse.json(payload);
}
