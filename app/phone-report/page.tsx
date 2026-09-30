import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedTeamProfile } from "../../lib/team-auth";
import EpicC360Sidebar from "../EpicC360Sidebar";
import styles from "../missed-calls/MissedCalls.module.css";

const SUPABASE_URL=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/,"");
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";

type Report={date?:string;summary?:Record<string,number|null>;agents?:Array<Record<string,any>>;pauses?:Array<Record<string,any>>;missed?:Array<Record<string,any>>};

function duration(v:any){const n=Number(v);if(!Number.isFinite(n))return "—";if(n>=3600)return Math.floor(n/3600)+"h "+Math.floor((n%3600)/60)+"m";if(n>=60)return Math.floor(n/60)+"m "+Math.round(n%60)+"s";return Math.round(n)+"s";}
function time(v:any){if(!v)return "—";const d=new Date(String(v));return Number.isNaN(d.getTime())?"—":d.toLocaleTimeString("en-US",{timeZone:"America/Denver",hour:"numeric",minute:"2-digit"});}
function phone(v:any){const d=String(v||"").replace(/\D/g,"").slice(-10);return d.length===10?"("+d.slice(0,3)+") "+d.slice(3,6)+"-"+d.slice(6):String(v||"Unknown");}

async function loadReport(token:string,date?:string){
  const r=await fetch(SUPABASE_URL+"/rest/v1/rpc/get_epic_phone_report",{method:"POST",headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({p_local_date:date||null}),cache:"no-store"});
  if(!r.ok)throw new Error(await r.text());
  return await r.json() as Report;
}

export default async function PhoneReportPage({searchParams}:{searchParams:Promise<{date?:string}>}){
  const params=await searchParams;
  const store=await cookies();
  const token=store.get("epic_access_token")?.value;
  const profile=await getAuthenticatedTeamProfile(token);
  if(!profile||!token||profile.role==="workstation")redirect("/employee-login");

  let report:Report={summary:{},agents:[],pauses:[],missed:[]};
  let error="";
  try{report=await loadReport(token,params.date);}catch(e){error=e instanceof Error?e.message:"Unable to load report.";}
  const s=report.summary||{};
  const pauseTotals=new Map<string,{seconds:number,count:number}>();
  for(const p of report.pauses||[]){const k=String(p.extension||"");const x=pauseTotals.get(k)||{seconds:0,count:0};x.seconds+=Number(p.paused_seconds||0);x.count+=1;pauseTotals.set(k,x);}

  return <main className={styles.shell}>
    <EpicC360Sidebar active="phone-report" profileName={profile.display_name} className={styles.sidebar} navClassName={styles.nav} activeClassName={styles.active} footerClassName={styles.sidebarFooter}/>
    <section className={styles.main}>
      <header className={styles.header}>
        <div><div className={styles.eyebrow}>EpicC360 · Phone Operations</div><h1>Phone Report</h1><p>Grandstream PBX performance and queue activity.</p></div>
        <form style={{display:"flex",gap:8}}><input type="date" name="date" defaultValue={String(report.date||params.date||"")} style={{height:40,border:"1px solid #d6dde5",borderRadius:9,padding:"0 10px"}}/><button className={styles.quoteButton} type="submit">View Date</button></form>
      </header>
      {error?<div className={styles.error}>{error}</div>:<>
        <section style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12,marginBottom:18}}>
          {[
            ["Calls In",s.inbound_queue_calls??0],
            ["Answered",s.answered_live??0],
            ["Answer Speed",duration(s.avg_answer_wait_seconds)],
            ["Missed / Abandoned",s.missed??0]
          ].map(([label,value])=><div key={String(label)} style={{background:"#fff",border:"1px solid #dfe5eb",borderRadius:12,padding:14}}><div style={{fontSize:10,fontWeight:900,color:"#7c8793",textTransform:"uppercase"}}>{label}</div><div style={{fontSize:26,fontWeight:900,marginTop:6}}>{String(value)}</div></div>)}
        </section>

        <section style={{background:"#fff",border:"1px solid #dfe5eb",borderRadius:14,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:16,borderBottom:"1px solid #e7ebef"}}><h2 style={{margin:0}}>Team Phone Activity</h2></div>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Agent","Inbound Answered","No-answer Rings","Inbound Talk","Outbound Answered","Outbound Talk","Out of Queue"].map(h=><th key={h} style={{textAlign:"left",padding:12,fontSize:10,textTransform:"uppercase",color:"#7c8793",borderBottom:"1px solid #edf0f3"}}>{h}</th>)}</tr></thead><tbody>
            {(report.agents||[]).map((a:any)=>{const p=pauseTotals.get(String(a.extension));return <tr key={String(a.extension)}><td style={{padding:12,borderBottom:"1px solid #edf0f3"}}><strong>{a.agent_name||"Ext. "+a.extension}</strong><div style={{fontSize:11,color:"#87919b"}}>Ext. {a.extension}</div></td><td style={{padding:12}}>{a.inbound_answered_calls||0}</td><td style={{padding:12}}>{a.true_no_answer_rings||0}</td><td style={{padding:12}}>{duration(a.inbound_talk_seconds)}</td><td style={{padding:12}}>{a.outbound_answered_calls||0}</td><td style={{padding:12}}>{duration(a.outbound_talk_seconds)}</td><td style={{padding:12}}>{p?duration(p.seconds)+" · "+p.count+"x":"—"}</td></tr>})}
          </tbody></table></div>
        </section>

        <section style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{background:"#fff",border:"1px solid #dfe5eb",borderRadius:14,padding:16}}>
            <h2 style={{marginTop:0}}>Queue Timeline</h2>
            {(report.pauses||[]).length?(report.pauses||[]).map((p:any,i:number)=><div key={String(p.extension)+String(p.paused_at)+i} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,padding:"10px 0",borderBottom:"1px solid #edf0f3"}}><div><strong>{p.agent_name||"Ext. "+p.extension}</strong><div style={{fontSize:12,color:"#788290"}}>{time(p.paused_at)} OutOfQ → {time(p.resumed_at)} InQ</div></div><b>{duration(p.paused_seconds)}</b></div>):<div>No queue pauses recorded.</div>}
          </div>
          <div style={{background:"#fff",border:"1px solid #dfe5eb",borderRadius:14,padding:16}}>
            <h2 style={{marginTop:0}}>Missed Calls</h2>
            {(report.missed||[]).length?(report.missed||[]).map((m:any)=><div key={String(m.session)} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,padding:"10px 0",borderBottom:"1px solid #edf0f3"}}><div><strong>{phone(m.customer_phone)}</strong><div style={{fontSize:12,color:"#788290"}}>{time(m.started_at)} · waited {duration(m.queue_wait_seconds)} · {m.ring_attempts||0} ring attempts</div></div><b>{m.recovered_at?"Recovered "+time(m.recovered_at):"Unrecovered"}</b></div>):<div>No missed queue calls.</div>}
          </div>
        </section>
      </>}
    </section>
  </main>;
}
