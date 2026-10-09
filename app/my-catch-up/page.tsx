import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {getAuthenticatedTeamProfile} from "../../lib/team-auth";
import EpicC360Sidebar from "../EpicC360Sidebar";
import styles from "../leads/Leads.module.css";
import CatchUpFeed from "./CatchUpFeed";
export default async function CatchUpPage(){
 const token=(await cookies()).get("epic_access_token")?.value;
 const profile=await getAuthenticatedTeamProfile(token);
 if(!profile||profile.role==="workstation")redirect("/employee-login");
 const first=(profile.display_name||"there").split(" ")[0];
 return <main className={styles.shell}>
 <EpicC360Sidebar active="catch-up" profileName={profile.display_name} className={styles.sidebar} navClassName={styles.nav} activeClassName={styles.active} footerClassName={styles.sidebarFooter}/>
 <section style={{flex:1,minWidth:0,padding:"32px clamp(16px,4vw,52px)",background:"#f5f6f8",color:"#20232c"}}>
 <header style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
 <div><div style={{fontSize:11,letterSpacing:2,color:"#875ab6",fontWeight:800}}>EPIC C360 · MY CATCH-UP</div><h1 style={{fontSize:29,margin:"11px 0 5px"}}>Welcome back, {first}!</h1><p style={{color:"#697081",margin:0}}>What happened with your claimed people while you were away?</p></div>
 <a href="/inbox" style={{background:"white",padding:"10px 13px",borderRadius:8,border:"1px solid #e0e1e7",textDecoration:"none",color:"#565b66"}}>← Inbox</a>
 </header>
 <CatchUpFeed profileId={profile.id}/>
 </section></main>
}
