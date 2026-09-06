export type TeamProfile = {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  role: "admin" | "manager" | "agent" | "workstation" | string;
  active: boolean;
  tripworks_user_id: number | null;
  tripworks_full_name: string | null;
};

type SupabaseAuthUser = { id: string; email?: string | null };

type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user: SupabaseAuthUser;
};

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/, "");
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";

export async function signInWithPassword(email: string, password: string): Promise<SupabaseSession> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error_description || payload?.msg || "Invalid email or password.");
  return payload as SupabaseSession;
}

export async function getAuthUser(accessToken: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<SupabaseAuthUser>;
}

export async function getAuthenticatedTeamProfile(accessToken: string | null | undefined) {
  if (!accessToken) return null;
  const user = await getAuthUser(accessToken);
  if (!user) return null;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_epic_sales_self_profile`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
  });
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows.length ? rows[0] as TeamProfile : null;
}

export function authCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
