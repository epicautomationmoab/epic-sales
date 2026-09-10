import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedTeamProfile } from "../../lib/team-auth";
import CustomersClient from "./CustomersClient";
import styles from "./Customers.module.css";

export default async function CustomersPage(){
  const cookieStore=await cookies();
  const accessToken=cookieStore.get("epic_access_token")?.value;
  const profile=await getAuthenticatedTeamProfile(accessToken);
  if(!profile||!accessToken)redirect("/employee-login");

  return <main className={styles.shell}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}><div className={styles.logoText}>EPIC 4X4</div><div className={styles.salesText}>CUSTOMERS</div></div>
      <nav className={styles.nav}>
        <a href="/inbox">Inbox</a>
        <a href="/leads">Leads</a>
        <a className={styles.active} href="/customers">Customers</a>
        <a href="/">Quote Builder</a>
        <a href="/missed-calls">Missed Calls</a>
        <a href="/call-recordings">Call Recordings</a>
      </nav>
      <div className={styles.sidebarFooter}><div>Signed in as</div><strong>{profile.display_name}</strong></div>
    </aside>
    <section className={styles.main}>
      <header className={styles.header}><div><div className={styles.eyebrow}>Epic CRM</div><h1>Customers</h1><p>Find any customer and open their complete Customer 360 history.</p></div></header>
      <CustomersClient/>
    </section>
  </main>;
}
