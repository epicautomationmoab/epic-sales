import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeamProfile } from "../../../lib/team-auth";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/, "");
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";

async function auth(request: NextRequest) {
  const accessToken = request.cookies.get("epic_access_token")?.value;
  const profile = await getAuthenticatedTeamProfile(accessToken);
  return profile && accessToken && profile.role !== "workstation" ? { accessToken, profile } : null;
}

async function rpc(accessToken: string, body: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_epic_customer_360`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
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

  const params = request.nextUrl.searchParams;
  const body = {
    p_contact_id: params.get("contact") || null,
    p_opportunity_id: params.get("opportunity") || null,
    p_reservation_id: params.get("reservation") || null,
    p_phone: params.get("phone") || null,
    p_email: params.get("email") || null,
  };

  if (!Object.values(body).some(Boolean)) {
    return NextResponse.json({ error: "Customer identity is required." }, { status: 400 });
  }

  try {
    const customer = await rpc(session.accessToken, body);
    return NextResponse.json({ ok: true, customer });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load Customer 360." }, { status: 500 });
  }
}
