import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedTeamProfile } from "../../lib/team-auth";
import EpicC360Sidebar from "../EpicC360Sidebar";
import CustomersClient from "./CustomersClient";
import styles from "./Customers.module.css";

export default async function CustomersPage(){
  const cookieStore=await cookies();
  const accessToken=cookieStore.get("epic_access_token")?.value;
  const profile=await getAuthenticatedTeamProfile(accessToken);
  if(!profile||!accessToken)redirect("/employee-login");

  return <main className={styles.shell}>
    <EpicC360Sidebar
      active="customers"
      profileName={profile.display_name}
      className={styles.sidebar}
      navClassName={styles.nav}
      activeClassName={styles.active}
      footerClassName={styles.sidebarFooter}
    />
    <section className={styles.main}>
      <header className={styles.header}><div><div className={styles.eyebrow}>EpicC360</div><h1>Customers</h1><p>Find any customer and open their complete EpicC360 history.</p></div></header>
      <CustomersClient/>
    </section>
  </main>;
}
