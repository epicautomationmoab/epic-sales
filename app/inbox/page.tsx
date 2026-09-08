import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedTeamProfile } from "../../lib/team-auth";
import InboxClient from "./InboxClient";
import styles from "./Inbox.module.css";

export default async function InboxPage(){
  const cookieStore=await cookies();
  const accessToken=cookieStore.get("epic_access_token")?.value;
  const profile=await getAuthenticatedTeamProfile(accessToken);
  if(!profile||!accessToken)redirect("/employee-login");
  const canManage=profile.role==="admin"||profile.role==="manager";
  return <main className={styles.shell}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}><div className={styles.logoText}>EPIC 4X4</div><div className={styles.salesText}>COMMUNICATIONS</div></div>
      <nav className={styles.nav}>
        <a className={styles.active} href="/inbox">Inbox</a>
        <a href="/leads">Leads</a>
        <a href="/">Quote Builder</a>
        <a href="/missed-calls">Missed Calls</a>
        <a href="/call-recordings">Call Recordings</a>
        {canManage?<a href="/inbox/blocked-domains">Blocked Email Domains</a>:null}
      </nav>
      <div className={styles.sidebarFooter}><div>Signed in as</div><strong>{profile.display_name}</strong></div>
    </aside>
    <section className={styles.main}><InboxClient/></section>
  </main>;
}
