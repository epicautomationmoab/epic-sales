import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedTeamProfile } from "../../lib/team-auth";
import CallRecordingsClient, { type Recording } from "./CallRecordingsClient";
import styles from "./CallRecordings.module.css";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/, "");
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";

async function loadRecordings(accessToken: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_epic_sales_call_recordings`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await response.text());
  const payload = await response.json();
  return Array.isArray(payload) ? payload as Recording[] : [];
}

export default async function CallRecordingsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("epic_access_token")?.value;
  const profile = await getAuthenticatedTeamProfile(accessToken);
  if (!profile || !accessToken || profile.role === "workstation") redirect("/employee-login");

  let recordings: Recording[] = [];
  let error = "";
  try { recordings = await loadRecordings(accessToken); }
  catch (err) { error = err instanceof Error ? err.message : "Unable to load recordings."; }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}><div className={styles.logoText}>EPIC 4X4</div><div className={styles.salesText}>SALES</div></div>
        <nav className={styles.nav}>
          <a href="/leads">Leads</a>
          <a href="/">Quote Builder</a>
          <a href="/missed-calls">Missed Calls</a>
          <a className={styles.active} href="/call-recordings">Call Recordings</a>
          <span className={styles.navPending}>Inbox / Needs Review <small>coming next</small></span>
        </nav>
        <div className={styles.sidebarFooter}><div>Signed in as</div><strong>{profile.display_name}</strong></div>
      </aside>

      <section className={styles.main}>
        <header className={styles.header}>
          <div><div className={styles.eyebrow}>Epic Sales</div><h1>Call Recordings</h1><p>Search and review CallRail recordings without leaving the Sales workspace.</p></div>
          <a className={styles.quoteButton} href="/">+ Build Quote</a>
        </header>
        {error ? <div className={styles.error}>{error}</div> : <CallRecordingsClient recordings={recordings} />}
      </section>
    </main>
  );
}
