import { NextResponse } from "next/server";
import { authCookieOptions, getAuthenticatedTeamProfile, signInWithPassword } from "../../../../lib/team-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  try {
    const session = await signInWithPassword(email, password);
    const profile = await getAuthenticatedTeamProfile(session.access_token);
    if (!profile || !profile.active) throw new Error("This account is not authorized for Epic Sales.");

    const response = NextResponse.json({ success: true, profile: { display_name: profile.display_name, email: profile.email, role: profile.role } });
    response.cookies.set("epic_access_token", session.access_token, authCookieOptions(session.expires_in ?? 60 * 60));
    response.cookies.set("epic_refresh_token", session.refresh_token, authCookieOptions(60 * 60 * 24 * 30));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to sign in." }, { status: 401 });
  }
}
