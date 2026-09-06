import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedTeamProfile } from "../../lib/team-auth";
import LeadsClient, { type SalesLead } from "./LeadsClient";
import styles from "./Leads.module.css";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/, "");
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";

async function loadOpenLeads(accessToken: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_epic_sales_open_leads`, {
    method: "POST",
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Unable to load Sales leads (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  return response.json() as Promise<{ profile: { display_name: string }; leads: SalesLead[] }>;
}

export default async function LeadsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("epic_access_token")?.value;
  const profile = await getAuthenticatedTeamProfile(accessToken);
  if (!profile || !accessToken) redirect("/employee-login");

  let leads: SalesLead[] = [];
  let error = "";
  try { const payload = await loadOpenLeads(accessToken); leads = payload.leads || []; }
  catch (err) { error = err instanceof Error ? err.message : "Unable to load Sales leads."; }

  const openValue = leads.reduce((sum, lead) => sum + Number(lead.lead_value_cents || 0), 0);
  const claimed = leads.filter((lead) => Boolean(lead.claimed_by_name)).length;
  const unclaimed = leads.length - claimed;

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}><div className={styles.logoText}>EPIC 4X4</div><div className={styles.salesText}>SALES</div></div>
        <nav className={styles.nav}>
          <a className={styles.active} href="/leads">Leads</a>
          <a href="/">Quote Builder</a>
          <a href="/missed-calls">Missed Calls</a>
          <a href="/call-recordings">Call Recordings</a>
          <span className={styles.navPending}>Inbox / Needs Review <small>coming next</small></span>
        </nav>
        <div className={styles.sidebarFooter}><div>Signed in as</div><strong>{profile.display_name}</strong></div>
      </aside>

      <section className={styles.main}>
        <header className={styles.header}>
          <div><div className={styles.eyebrow}>Epic Sales</div><h1>Open Leads</h1><p>The same live sales opportunities your team has already been working.</p></div>
          <a className={styles.quoteButton} href="/">+ Build Quote</a>
        </header>

        <section className={styles.kpis}>
          <div className={`${styles.kpi} ${styles.kpiPrimary}`}><span>Open Lead Value</span><strong>${(openValue / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong><small>{leads.length} active opportunities</small></div>
          <div className={styles.kpi}><span>Open Leads</span><strong>{leads.length}</strong><small>Still with Sales</small></div>
          <div className={styles.kpi}><span>Claimed</span><strong>{claimed}</strong><small>Currently owned by a rep</small></div>
          <div className={styles.kpi}><span>Unclaimed</span><strong>{unclaimed}</strong><small>Needs ownership</small></div>
        </section>
        {error ? <div className={styles.error}>{error}</div> : <LeadsClient leads={leads} />}
      </section>
    </main>
  );
}
