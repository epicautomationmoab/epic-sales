import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedTeamProfile } from "../../lib/team-auth";
import EpicC360Sidebar from "../EpicC360Sidebar";
import PhoneReportC360Link from "./PhoneReportC360Link";
import styles from "../missed-calls/MissedCalls.module.css";

const SUPABASE_URL=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/,"");
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";

type Report={date?:string;summary?:Record<string,number|null>;agents?:Array<Record<string,any>>;agent_events?:Array<Record<string,any>>;outbound_events?:Array<Record<string,any>>;pauses?:Array<Record<string,any>>;missed?:Array<Record<string,any>>};

function duration(v:any){const n=Number(v);if(!Number.isFinite(n))return "—";if(n>=3600)return Math.floor(n/3600)+"h "+Math.floor((n%3600)/60)+"m";if(n>=60)return Math.floor(n/60)+"m "+Math.round(n%60)+"s";return Math.round(n)+"s";}
function time(v:any){if(!v)return "—";const d=new Date(String(v));return Number.isNaN(d.getTime())?"—":d.toLocaleTimeString("en-US",{timeZone:"America/Denver",hour:"numeric",minute:"2-digit"});}
function phone(v:any){const d=String(v||"").replace(/\D/g,"").slice(-10);return d.length===10?"("+d.slice(0,3)+") "+d.slice(3,6)+"-"+d.slice(6):String(v||"Unknown");}

async function loadReport(token:string,date?:string){
  const r=await fetch(SUPABASE_URL+"/rest/v1/rpc/get_epic_phone_report_v2",{method:"POST",headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({p_local_date:date||null}),cache:"no-store"});
  if(!r.ok)throw new Error(await r.text());
  return await r.json() as Report;
}

export default async function PhoneReportPage({searchParams}:{searchParams:Promise<{date?:string;extension?:string;metric?:string;session?:string}>}){
  const params=await searchParams;
  const store=await cookies();
  const token=store.get("epic_access_token")?.value;
  const profile=await getAuthenticatedTeamProfile(token);
  if(!profile||!token||profile.role==="workstation")redirect("/employee-login");

  let report:Report={summary:{},agents:[],agent_events:[],outbound_events:[],pauses:[],missed:[]};
  let error="";
  try{report=await loadReport(token,params.date);}catch(e){error=e instanceof Error?e.message:"Unable to load report.";}
  const s=report.summary||{};
  const pauseTotals=new Map<string,{seconds:number,count:number}>();
  const selectedExtension=params.extension||"";
  const selectedMetric=params.metric||"";
  const selectedSession=params.session||"";
  const answeredEvents=(report.agent_events||[]).filter((e:any)=>String(e.extension||"")===selectedExtension&&e.disposition==="ANSWERED"&&Number(e.billsec||0)>0);
  const salesOpportunities=answeredEvents.filter((e:any)=>e.is_sales_opportunity);
  const bookedSales=salesOpportunities.filter((e:any)=>e.call_outcome==="booked");
  const attributedRevenue=bookedSales.reduce((sum:number,e:any)=>sum+Number(e.booking_revenue_cents||0),0);
  const conversionRate=salesOpportunities.length?Math.round((bookedSales.length/salesOpportunities.length)*100):0;
  const money=(cents:any)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(cents||0)/100);
  const statusLabel=(e:any)=>e.customer_status==="new_caller"?"NEW CALLER":e.customer_status==="existing_customer"?"EXISTING CUSTOMER":e.customer_status==="returning_caller"?"RETURNING CALLER":"CALLER";
  const purposeLabel=(e:any)=>e.call_purpose==="sales_inquiry"?"Sales Inquiry":e.call_purpose==="existing_reservation"?"Reservation Service":"Other";
  const outcomeLabel=(e:any)=>e.call_outcome==="booked"?`💫 Sale ${money(e.booking_revenue_cents)}`:e.call_outcome==="existing_reservation_handled"?"Reservation Service":e.call_outcome==="no_booking_yet"?"Sales Lead":"Other";
  const selectedEvents=(selectedMetric==="outbound"?report.outbound_events||[]:report.agent_events||[]).filter((e:any)=>{
    if(String(e.extension||"")!==selectedExtension)return false;
    if(selectedMetric==="answered")return e.disposition==="ANSWERED"&&Number(e.billsec||0)>0;
    if(selectedMetric==="no-answer")return e.disposition==="NO ANSWER"&&String(e.action_note||"")!=="answered elsewhere";
    if(selectedMetric==="outbound")return e.disposition==="ANSWERED";
    return false;
  });
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
            {(report.agents||[]).map((a:any)=>{const p=pauseTotals.get(String(a.extension));return <tr key={String(a.extension)}><td style={{padding:12,borderBottom:"1px solid #edf0f3"}}><strong>{a.agent_name||"Ext. "+a.extension}</strong><div style={{fontSize:11,color:"#87919b"}}>Ext. {a.extension}</div></td><td style={{padding:12}}><a href={`/phone-report?date=${encodeURIComponent(String(report.date||params.date||""))}&extension=${encodeURIComponent(String(a.extension))}&metric=answered`} style={{fontWeight:900,color:"#18202b",textDecoration:"underline",textUnderlineOffset:3}}>{a.inbound_answered_calls||0}</a></td><td style={{padding:12}}><a href={`/phone-report?date=${encodeURIComponent(String(report.date||params.date||""))}&extension=${encodeURIComponent(String(a.extension))}&metric=no-answer`} style={{fontWeight:900,color:"#b9471f",textDecoration:"underline",textUnderlineOffset:3}}>{a.true_no_answer_rings||0}</a></td><td style={{padding:12}}>{duration(a.inbound_talk_seconds)}</td><td style={{padding:12}}><a href={`/phone-report?date=${encodeURIComponent(String(report.date||params.date||""))}&extension=${encodeURIComponent(String(a.extension))}&metric=outbound`} style={{fontWeight:900,color:"#18202b",textDecoration:"underline",textUnderlineOffset:3}}>{a.outbound_answered_calls||0}</a></td><td style={{padding:12}}>{duration(a.outbound_talk_seconds)}</td><td style={{padding:12}}>{p?duration(p.seconds)+" · "+p.count+"x":"—"}</td></tr>})}
          </tbody></table></div>
        </section>

        {selectedExtension&&selectedMetric?<section style={{background:"#fff",border:"1px solid #dfe5eb",borderRadius:14,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:16,borderBottom:"1px solid #e7ebef",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <div><h2 style={{margin:0}}>{selectedMetric==="answered"?"Answered Calls":selectedMetric==="outbound"?"Outbound Answered Calls":"No-Answer Rings"} · Ext. {selectedExtension}</h2><div style={{fontSize:12,color:"#788290",marginTop:4}}>{selectedEvents.length} event{selectedEvents.length===1?"":"s"} for the selected date.</div></div>
            <a href={`/phone-report?date=${encodeURIComponent(String(report.date||params.date||""))}`} style={{fontWeight:800,color:"#56606d"}}>Close</a>
          </div>
          {selectedMetric==="answered"?<div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,padding:"14px 16px",background:"#f8fafb",borderBottom:"1px solid #e7ebef"}}>
            {[
              ["Sales Opportunities",salesOpportunities.length],
              ["Booked",bookedSales.length],
              ["Attributed Revenue",money(attributedRevenue)],
              ["Conversion",salesOpportunities.length?conversionRate+"%":"—"]
            ].map(([label,value])=><div key={String(label)} style={{background:"#fff",border:"1px solid #e2e7ec",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:9,fontWeight:900,color:"#7c8793",textTransform:"uppercase"}}>{label}</div><div style={{fontSize:20,fontWeight:900,marginTop:4}}>{String(value)}</div></div>)}
          </div>:null}
          <div style={{padding:"0 16px"}}>
            {selectedEvents.length?selectedEvents.map((e:any,i:number)=><div key={String(e.session)+String(e.event_time)+i} style={{display:"grid",gridTemplateColumns:selectedMetric==="answered"?"minmax(300px,1.5fr) 130px minmax(180px,1fr)":"220px 1fr auto",gap:16,alignItems:"center",padding:"12px 0",borderBottom:"1px solid #edf0f3"}}>
              {selectedMetric==="outbound"?<div><strong style={{color:"#18202b"}}>{phone(e.called_phone)}</strong>{e.matched_customer_name?<div style={{fontSize:12,fontWeight:800,color:"#e4511d",marginTop:2}}>{e.matched_customer_name}{e.matched_confirmation_code?` · ${e.matched_confirmation_code}`:""}</div>:<div style={{fontSize:11,color:"#87919b",marginTop:2}}>No customer match</div>}{e.has_recording||e.has_transcript||e.has_summary?<div style={{fontSize:10,color:"#788290",marginTop:2}}>{[e.has_recording?"Recording":null,e.has_transcript?"Transcript":null,e.has_summary?"Summary":null].filter(Boolean).join(" · ")}</div>:null}</div>:selectedMetric==="answered"?<div>
                <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}><strong style={{color:"#18202b"}}>{e.customer_name||phone(e.caller_phone)}</strong>{e.customer_name?<span style={{fontSize:11,color:"#788290"}}>{phone(e.caller_phone)}</span>:null}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:5}}><span style={{fontSize:9,fontWeight:900,color:e.customer_status==="new_caller"?"#a94720":"#53606e",background:"#f2f4f6",borderRadius:999,padding:"3px 7px"}}>{statusLabel(e)}</span><span style={{fontSize:10,fontWeight:800,color:"#53606e"}}>{purposeLabel(e)}</span>{e.booking_experience?<span style={{fontSize:10,color:"#788290"}}>· {e.booking_experience}</span>:e.existing_experience?<span style={{fontSize:10,color:"#788290"}}>· {e.existing_experience}</span>:null}</div>
                <div style={{marginTop:5}}><PhoneReportC360Link contactId={e.contact_id||null} reservationId={e.booking_reservation_id||e.existing_reservation_id||null} reservationConfirmation={e.booking_confirmation_code||e.existing_confirmation_code||null} phone={e.caller_phone||null}/>{e.booking_confirmation_code?<span style={{fontSize:11,color:"#788290",marginLeft:8}}>{e.booking_confirmation_code}</span>:e.existing_confirmation_code?<span style={{fontSize:11,color:"#788290",marginLeft:8}}>{e.existing_confirmation_code}</span>:null}</div>
              </div>:<a href={`/phone-report?date=${encodeURIComponent(String(report.date||params.date||""))}&session=${encodeURIComponent(String(e.session||""))}`} style={{fontWeight:900,color:"#18202b",textDecoration:"underline",textUnderlineOffset:3}}>{phone(e.caller_phone)}</a>}
              <span style={{color:"#56606d"}}>{time(e.event_time)}{selectedMetric==="answered"?<div style={{fontSize:11,color:"#87919b",marginTop:2}}>{duration(e.billsec)}</div>:null}</span>
              <span style={{fontWeight:900,color:selectedMetric==="no-answer"?"#b9471f":e.call_outcome==="booked"?"#25693b":"#56606d"}}>{selectedMetric==="outbound"?"Answered · "+duration(e.billsec):selectedMetric==="answered"?outcomeLabel(e):"No answer · rang "+duration(e.duration_seconds)}</span>
            </div>):<div style={{padding:18,color:"#788290"}}>No matching events.</div>}
          </div>
        </section>:null}

        {selectedSession?<section style={{background:"#fff",border:"1px solid #dfe5eb",borderRadius:14,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:16,borderBottom:"1px solid #e7ebef",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <div><h2 style={{margin:0}}>Call Path</h2><div style={{fontSize:12,color:"#788290",marginTop:4}}>Every queue phone this call touched, in order.</div></div>
            <a href={`/phone-report?date=${encodeURIComponent(String(report.date||params.date||""))}`} style={{fontWeight:800,color:"#56606d"}}>Close</a>
          </div>
          <div style={{padding:"0 16px"}}>
            {(report.agent_events||[]).filter((e:any)=>String(e.session||"")===selectedSession).map((e:any,i:number)=><div key={String(e.event_time)+String(e.extension)+i} style={{display:"grid",gridTemplateColumns:"110px 130px 1fr auto",gap:14,alignItems:"center",padding:"12px 0",borderBottom:"1px solid #edf0f3"}}>
              <strong>Ext. {e.extension}</strong><span>{time(e.event_time)}</span><span>{phone(e.caller_phone)}</span><b style={{color:e.disposition==="ANSWERED"?"#25693b":"#b9471f"}}>{e.disposition==="ANSWERED"?"Answered · "+duration(e.billsec):"No answer · rang "+duration(e.duration_seconds)}</b>
            </div>)}
          </div>
        </section>:null}

        <section style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{background:"#fff",border:"1px solid #dfe5eb",borderRadius:14,padding:16}}>
            <h2 style={{marginTop:0}}>Queue Timeline</h2>
            {(report.pauses||[]).length?(report.pauses||[]).map((p:any,i:number)=><div key={String(p.extension)+String(p.paused_at)+i} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,padding:"10px 0",borderBottom:"1px solid #edf0f3"}}><div><strong>{p.agent_name||"Ext. "+p.extension}</strong><div style={{fontSize:12,color:"#788290"}}>{time(p.paused_at)} OutOfQ → {time(p.resumed_at)} InQ</div></div><b>{duration(p.paused_seconds)}</b></div>):<div>No queue pauses recorded.</div>}
          </div>
          <div style={{background:"#fff",border:"1px solid #dfe5eb",borderRadius:14,padding:16}}>
            <h2 style={{marginTop:0}}>Missed Calls</h2>
            {(report.missed||[]).length?(report.missed||[]).map((m:any)=><div key={String(m.session)} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,padding:"10px 0",borderBottom:"1px solid #edf0f3"}}><div><strong>{phone(m.customer_phone)}</strong><div style={{fontSize:12,color:"#788290"}}>{time(m.started_at)} · waited {duration(m.queue_wait_seconds)} · {m.ring_attempts||0} queue rings</div>{m.voicemail_left?<div style={{fontSize:12,fontWeight:800,color:"#6b4a00",marginTop:3}}>Voicemail left{m.voicemail_transcription?" · transcription available":""}</div>:<div style={{fontSize:12,color:"#8a93a0",marginTop:3}}>No voicemail left</div>}</div><b>{m.recovered_at?"Recovered "+time(m.recovered_at):"Unrecovered"}</b></div>):<div>No missed queue calls.</div>}
          </div>
        </section>
      </>}
    </section>
  </main>;
}
