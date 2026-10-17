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
    async function search(fn: string) {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_query: q, p_limit: 50 }),
        cache: "no-store",
      });
      const content = await response.text();
      if (!response.ok) throw new Error(content || `Customer search failed (${response.status})`);
      return content ? JSON.parse(content) as Array<Record<string, any>> : [];
    }
    const [existing, inbound] = await Promise.all([
      search("search_epic_customers"),
      search("search_epic_inbound_only_customers"),
    ]);
    const canonicalPhone=(value:unknown)=>String(value||"").replace(/\D/g,"").slice(-10);
    const existingPhones=new Set(existing.map(c=>canonicalPhone(c.phone)).filter(Boolean));
    const existingEmails=new Set(existing.map(c=>String(c.email||"").trim().toLowerCase()).filter(Boolean));
    const keys=new Set(existing.map(c=>String(c.identity_key)));
    const additions=inbound.filter(c=>{
      const phone=canonicalPhone(c.phone);
      const email=String(c.email||"").trim().toLowerCase();
      if(keys.has(String(c.identity_key))||(phone&&existingPhones.has(phone))||(email&&existingEmails.has(email)))return false;
      keys.add(String(c.identity_key));
      return true;
    });
    return NextResponse.json({ok:true,customers:[...existing,...additions].sort((a,b)=>new Date(b.last_seen_at||0).getTime()-new Date(a.last_seen_at||0).getTime()).slice(0,50)});
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to search customers." }, { status: 500 });
  }
}
