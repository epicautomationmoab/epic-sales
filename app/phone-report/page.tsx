import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedTeamProfile } from "../../lib/team-auth";
import EpicC360Sidebar from "../EpicC360Sidebar";
import styles from "./PhoneReport.module.css";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/, "");
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";

type Summary = {
  inbound_queue_calls?: number;
  answered_live?: number;
  missed?: number;
  live_answer_rate_pct?: number;
  avg_answer_wait_seconds?: number;
  longest_answer_wait_seconds?: number;
  longest_missed_wait_seconds?: number;
};
type Agent = {
  extension:string; agent_name?:string|null; inbound_answered_calls:number; true_no_answer_rings:number;
  rings_answered_elsewhere:number; inbound_talk_seconds:number; outbound_answered_calls:number; outbound_talk_seconds:number;
};
type Pause = { extension:string; agent_name?:string|null; paused_at:string; resumed_at?:string|null; paused_seconds?:number|null; };
type Missed = { session:string; started_at:string; customer_phone?:string|null; call_outcome:string; recovered_at?:string|null; recovered_by_extension?:string|null; recovered_by_name?:string|null; recovery_seconds?:number|null; queue_wait_seconds?:number|null; ring_attempts?:number|null; extensions_rung?:string|null; };
type Report = { date:string; summary:Summary; agents:Agent[]; pauses:Pause[]; missed:Missed[]; };

function fmtTime(value?:string|null){
  if(!value)return "—";
  const d=new Date(value);
  return Number.isNaN(d.getTime())?"—":d.toLocaleTimeString("en-US",{timeZone:"America/Denver",hour:"numeric",minute:"2-digit"});
}
function fmtDuration(seconds?:number|null){
  if(seconds==null)return "—";
  const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60;
  if(h)return `${h}h ${m}m`;
  if(m)return `${m}m ${s}s`;
  return `${s}s`;
}
function fmtPhone(value?:string|null){
  if(!value)return "Unknown";
  const d=value.replace(/\D/g,"").slice(-10);
  return d.length===10?`(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`:value;
}
async function loadReport(accessToken:string,date?:string){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_epic_phone_report`,{
    method:"POST",
    headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},
    body:JSON.stringify({p_local_date:date||null}),
    cache:"no-store"
  });
  if(!response.ok)throw new Error(await response.text());
  return await response.json() as Report;
}

export default async function PhoneReportPage({searchParams}:{searchParams:Promise<{date?:string}>}){
  const params=await searchParams;
  const store=await cookies();
  const accessToken=store.get("epic_access_token")?.value;
  const profile=await getAuthenticatedTeamProfile(accessToken);
  if(!profile||!accessToken||profile.role==="workstation")redirect("/employee-login");

  let report:Report={date:params.date||"",summary:{},agents:[],pauses:[],missed:[]};
  let error="";
  try{report=await loadReport(accessToken,params.date);}catch(err){error=err instanceof Error?err.message:"Unable to load phone report.";}

  const pausesByAgent=new Map<string,{seconds:number;count:number}>();
  for(const p of report.pauses||[]){
    const key=p.extension;
    const current=pausesByAgent.get(key)||{seconds:0,count:0};
    current.seconds+=p.paused_seconds||0; current.count+=1; pausesByAgent.set(key,current);
  }
  return <main className={styles.shell}>
    <EpicC360Sidebar active="phone-report" profileName={profile.display_name} className={styles.sidebar} navClassName={styles.nav} activeClassName={styles.active} footerClassName={styles.sidebarFooter}/>
    <section className={styles.main}>
      <header className={styles.header}>
        <div><div className={styles.eyebrow}>EpicC360 · Phone Operations</div><h1>Phone Report</h1><p>Human answer performance, queue availability and missed-call recovery from the Grandstream PBX.</p></div>
        <form className={styles.dateForm}><input aria-label="Report date" type="date" name="date" defaultValue={report.date}/><button type="submit">View Date</button></form>
      </header>
      {error?<div className={styles.error}>{error}</div>:<>
        <section className={styles.kpis}>
          <div className={styles.kpi}><span>Inbound Queue Calls</span><strong>{report.summary?.inbound_queue_calls??0}</strong></div>
          <div className={styles.kpi}><span>Answered Live</span><strong>{report.summary?.answered_live??0}</strong></div>
          <div className={styles.kpiMiss}><span>Missed</span><strong>{report.summary?.missed??0}</strong></div>
          <div className={styles.kpi}><span>Live Answer Rate</span><strong>{report.summary?.live_answer_rate_pct??0}%</strong></div>
          <div className={styles.kpi}><span>Avg. Answer Wait</span><strong>{fmtDuration(report.summary?.avg_answer_wait_seconds==null?null:Math.round(report.summary.avg_answer_wait_seconds))}</strong></div>
          <div className={styles.kpi}><span>Longest Missed Wait</span><strong>{fmtDuration(report.summary?.longest_missed_wait_seconds)}</strong></div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}><div><h2>Team Phone Activity</h2><p>Agent-level activity. “Answered elsewhere” rings are not counted against the agent.</p></div></div>
          <div className={styles.tableWrap}><table><thead><tr><th>Agent</th><th>Inbound Answered</th><th>No-answer Rings</th><th>Inbound Talk</th><th>Outbound Answered</th><th>Outbound Talk</th><th>Out of Queue</th></tr></thead>
          <tbody>{report.agents.length?report.agents.map(a=>{const p=pausesByAgent.get(a.extension);return <tr key={a.extension}><td><strong>{a.agent_name||`Ext. ${a.extension}`}</strong><small>Ext. {a.extension}</small></td><td>{a.inbound_answered_calls}</td><td>{a.true_no_answer_rings}</td><td>{fmtDuration(a.inbound_talk_seconds)}</td><td>{a.outbound_answered_calls}</td><td>{fmtDuration(a.outbound_talk_seconds)}</td><td>{p?`${fmtDuration(p.seconds)} · ${p.count}x`:"—"}</td></tr>}):<tr><td colSpan={7} className={styles.emptyCell}>No agent activity.</td></tr>}</tbody></table></div>
        </section>

        <section className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}><div><h2>Queue Timeline</h2><p>OutOfQ = Agent Pause (*83). InQ = Agent Unpause (*84).</p></div></div>
            <div className={styles.timeline}>{report.pauses.length?report.pauses.map((p,i)=><div className={styles.timelineRow} key={p.extension+p.paused_at+i}><div><strong>{p.agent_name||`Ext. ${p.extension}`}</strong><small>Ext. {p.extension}</small></div><div><span>{fmtTime(p.paused_at)} OutOfQ</span><span>{fmtTime(p.resumed_at)} InQ</span></div><b>{fmtDuration(p.paused_seconds)}</b></div>):<div className={styles.empty}>No queue pauses recorded.</div>}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHeader}><div><h2>Missed Calls</h2><p>PBX-defined: no employee extension answered the queue session.</p></div></div>
            <div className={styles.missedList}>{report.missed.length?report.missed.map(m=><div className={styles.missedRow} key={m.session}><div><strong>{fmtPhone(m.customer_phone)}</strong><small>{fmtTime(m.started_at)} · waited {fmtDuration(m.queue_wait_seconds)} · {m.ring_attempts??0} ring attempts</small></div><div>{m.recovered_at?<span className={styles.recovered}>Recovered {fmtTime(m.recovered_at)}</span>:<span className={styles.unrecovered}>Unrecovered</span>}</div></div>):<div className={styles.empty}>No missed queue calls.</div>}</div>
          </div>
        </section>
      </>}
    </section>
  </main>;
}
