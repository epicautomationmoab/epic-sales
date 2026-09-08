"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./Customer360.module.css";

type Identity={contact_id:string|null;name:string|null;phone:string|null;email:string|null;tripworks_customer_id:number|null;tripworks_customer_code:string|null};
type Reservation={id:string;confirmation_code:string|null;customer_name:string|null;customer_email:string|null;customer_phone:string|null;tripworks_customer_id:number|null;business_line:string|null;experience_name:string|null;start_time:string|null;end_time:string|null;trip_status:string|null;booking_status:string|null;is_cancelled:boolean|null;total_amount_cents:number|null;amount_due_cents:number|null;people_count:number|null;trip_method_name:string|null;customer_portal_url:string|null;created_at:string|null;updated_at:string|null};
type Opportunity={id:string;status:string|null;customer_name:string|null;email:string|null;phone:string|null;lead_value_cents:number|null;interest_label:string|null;activity_window_start:string|null;activity_window_end:string|null;assigned_rep_name:string|null;claimed_by_name:string|null;source_method:string|null;shopping_last_activity_at:string|null;updated_at:string|null};
type Draft={id:string;confirmation_code:string|null;experience_name:string|null;option_name:string|null;activity_date:string|null;value_cents:number|null;is_current_draft:boolean|null;converted_at:string|null;last_seen_at:string|null};
type Quote={id:string;opportunity_id:string|null;status:string|null;experience_name:string|null;total_cents:number|null;created_by_name:string|null;emailed_at:string|null;created_at:string|null;visit_start_date:string|null;visit_end_date:string|null};
type Call={id:string;at:string|null;direction:string|null;answered:boolean|null;voicemail:boolean|null;duration_seconds:number|null;recording_url:string|null;summary:string|null;lead_score:number|null;lead_explanation:string|null;source_name:string|null;campaign:string|null;matched_reservation_id:string|null;matched_opportunity_id:string|null};
type Text={id:string;at:string|null;direction:string|null;body:string|null;agent_name:string|null;status:string|null};
type Email={id:string;at:string|null;direction:string|null;subject:string|null;body:string|null;from_email:string|null;to_emails:string[]|null};
type Note={id:string;opportunity_id:string|null;author_name:string|null;note_text:string|null;created_at:string|null};
type Customer360={identity:Identity;reservations:Reservation[];opportunities:Opportunity[];drafts:Draft[];quotes:Quote[];calls:Call[];texts:Text[];emails:Email[];notes:Note[]};

type Props={open:boolean;onClose:()=>void;contactId?:string|null;opportunityId?:string|null;reservationId?:string|null;phone?:string|null;email?:string|null};
type EventItem={id:string;kind:"call"|"text"|"email"|"reservation"|"lead"|"draft"|"quote"|"note";at:string|null;title:string;meta?:string|null;body?:string|null;href?:string|null;hrefLabel?:string|null};
type LifecycleFilter="all"|"call"|"text"|"email"|"other";

const money=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});
function fmtDateTime(v:string|null){if(!v)return"Unknown time";const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString(undefined,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});}
function fmtDate(v:string|null){if(!v)return"—";const d=new Date(v.length===10?`${v}T12:00:00`:v);return Number.isNaN(d.getTime())?v:d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});}
function durationLabel(s:number|null){if(s==null)return"";const m=Math.floor(s/60),r=s%60;return m?`${m}m ${r}s`:`${r}s`;}
function twCustomerUrl(code:string|null){return code?`https://epic4x4.tripworks.com/customer/${encodeURIComponent(code)}/trips`:null;}
function twReservationUrl(code:string|null){return code?`https://epic4x4.tripworks.com/trip/${encodeURIComponent(code)}/bookings`:null;}

export default function Customer360Modal(props:Props){
  const{open,onClose,contactId,opportunityId,reservationId,phone,email}=props;
  const[data,setData]=useState<Customer360|null>(null);const[loading,setLoading]=useState(false);const[error,setError]=useState("");const[filter,setFilter]=useState<LifecycleFilter>("all");

  useEffect(()=>{if(!open)return;const controller=new AbortController();setFilter("all");(async()=>{setLoading(true);setError("");try{const q=new URLSearchParams();if(contactId)q.set("contact",contactId);if(opportunityId)q.set("opportunity",opportunityId);if(reservationId)q.set("reservation",reservationId);if(phone)q.set("phone",phone);if(email)q.set("email",email);const r=await fetch(`/api/customer-360?${q.toString()}`,{cache:"no-store",signal:controller.signal});const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to load Customer 360.");setData(p.customer||null);}catch(e){if((e as Error).name!=="AbortError")setError(e instanceof Error?e.message:"Unable to load Customer 360.");}finally{setLoading(false);}})();return()=>controller.abort();},[open,contactId,opportunityId,reservationId,phone,email]);

  useEffect(()=>{if(!open)return;const handler=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);},[open,onClose]);

  const timeline=useMemo<EventItem[]>(()=>{if(!data)return[];const items:EventItem[]=[];
    for(const c of data.calls||[]){const title=c.voicemail?"Voicemail":c.answered===false?"Missed call":c.direction==="outbound"?"Outbound call":"Inbound call";items.push({id:`c-${c.id}`,kind:"call",at:c.at,title,meta:[c.lead_score!=null?`CallRail score ${c.lead_score}`:null,durationLabel(c.duration_seconds),c.source_name,c.campaign].filter(Boolean).join(" · "),body:c.summary||c.lead_explanation||null,href:c.recording_url||undefined,hrefLabel:"Listen to call"});}
    for(const t of data.texts||[])items.push({id:`t-${t.id}`,kind:"text",at:t.at,title:t.direction==="outbound"?"Text sent":"Text received",meta:[t.agent_name,t.status].filter(Boolean).join(" · "),body:t.body});
    for(const e of data.emails||[])items.push({id:`e-${e.id}`,kind:"email",at:e.at,title:e.direction==="outbound"?`Email sent${e.subject?`: ${e.subject}`:""}`:`Email received${e.subject?`: ${e.subject}`:""}`,meta:e.direction==="inbound"?(e.from_email?`From ${e.from_email}`:null):(e.to_emails?.length?`To ${e.to_emails.join(", ")}`:null),body:e.body});
    for(const r of data.reservations||[])items.push({id:`r-${r.id}`,kind:"reservation",at:r.start_time||r.created_at,title:`${r.is_cancelled?"Cancelled reservation":"Reservation"}: ${r.experience_name||r.confirmation_code||"TripWorks booking"}`,meta:[r.confirmation_code,r.business_line,r.trip_status,r.total_amount_cents!=null?money.format(r.total_amount_cents/100):null].filter(Boolean).join(" · "),body:r.start_time?`${fmtDateTime(r.start_time)}${r.people_count?` · ${r.people_count} guests`:""}`:null,href:twReservationUrl(r.confirmation_code)||undefined,hrefLabel:"Open reservation in TripWorks"});
    for(const o of data.opportunities||[])items.push({id:`o-${o.id}`,kind:"lead",at:o.shopping_last_activity_at||o.updated_at,title:`Lead ${o.status||""}`.trim(),meta:[o.interest_label,o.lead_value_cents!=null?money.format(o.lead_value_cents/100):null,o.claimed_by_name||o.assigned_rep_name].filter(Boolean).join(" · "),body:o.activity_window_start?`Visit window ${fmtDate(o.activity_window_start)}${o.activity_window_end&&o.activity_window_end!==o.activity_window_start?` – ${fmtDate(o.activity_window_end)}`:""}`:null,href:`/leads?open=${encodeURIComponent(o.id)}`,hrefLabel:"Open lead"});
    for(const d of data.drafts||[])items.push({id:`d-${d.id}`,kind:"draft",at:d.last_seen_at,title:`TripWorks Draft: ${d.experience_name||"Draft Reservation"}`,meta:[d.option_name,d.value_cents!=null?money.format(d.value_cents/100):null,d.confirmation_code,d.converted_at?"Booked":d.is_current_draft===false?"Closed":"Draft"].filter(Boolean).join(" · "),body:d.activity_date?`For ${fmtDate(d.activity_date)}`:null,href:twReservationUrl(d.confirmation_code)||undefined,hrefLabel:"Open in TripWorks"});
    for(const q of data.quotes||[])items.push({id:`q-${q.id}`,kind:"quote",at:q.created_at,title:`Epic quote ${q.status||"saved"}`,meta:[q.experience_name,q.total_cents!=null?money.format(q.total_cents/100):null,q.created_by_name,q.emailed_at?"Emailed":null].filter(Boolean).join(" · ")});
    for(const n of data.notes||[])items.push({id:`n-${n.id}`,kind:"note",at:n.created_at,title:"Sales note",meta:n.author_name,body:n.note_text});
    return items.sort((a,b)=>(b.at?new Date(b.at).getTime():0)-(a.at?new Date(a.at).getTime():0));
  },[data]);

  const visibleTimeline=useMemo(()=>timeline.filter(item=>filter==="all"?true:filter==="other"?!["call","text","email"].includes(item.kind):item.kind===filter),[timeline,filter]);

  if(!open)return null;
  const identity=data?.identity;
  const activeReservations=(data?.reservations||[]).filter(r=>!r.is_cancelled&&(!r.end_time||new Date(r.end_time).getTime()>=Date.now()-24*60*60*1000));
  const pastReservations=(data?.reservations||[]).filter(r=>!activeReservations.some(a=>a.id===r.id));
  const openLeads=(data?.opportunities||[]).filter(o=>o.status==="open");
  const futureDrafts=(data?.drafts||[]).filter(d=>d.is_current_draft!==false&&!d.converted_at);
  const lifetimeSpend=(data?.reservations||[]).reduce((sum,r)=>sum+(r.total_amount_cents||0),0);
  const communications=(data?.calls?.length||0)+(data?.texts?.length||0)+(data?.emails?.length||0);
  const badges:string[]=[];
  if(activeReservations.length)badges.push(`${activeReservations.length} Active Reservation${activeReservations.length===1?"":"s"}`);
  if(openLeads.length)badges.push(`${openLeads.length} Open Lead${openLeads.length===1?"":"s"}`);
  if(pastReservations.length)badges.push(`${pastReservations.length} Prior Visit${pastReservations.length===1?"":"s"}`);
  if(identity?.tripworks_customer_id)badges.push("TripWorks Customer");
  if(!badges.length)badges.push("New Customer");

  return <div className={styles.backdrop} onMouseDown={e=>{if(e.currentTarget===e.target)onClose();}}><section className={styles.modal} role="dialog" aria-modal="true" aria-label="Customer 360">
    <header className={styles.header}><div className={styles.headerIdentity}><div className={styles.eyebrow}>Customer 360</div><h2>{identity?.name||"New / Unknown Customer"}</h2><div className={styles.sub}>{[identity?.email,identity?.phone].filter(Boolean).join(" · ")||"No customer identity captured yet"}</div>{data?<div className={styles.badges}>{badges.map(b=><span key={b}>{b}</span>)}</div>:null}</div><div className={styles.headerActions}>{identity?.email?<a className={styles.button} href={`mailto:${identity.email}`}>Email</a>:null}{identity?.phone?<a className={styles.button} href={`sms:${identity.phone}`}>Text</a>:null}<a className={styles.buttonPrimary} href="/quote">Build Quote</a>{identity?.tripworks_customer_code&&twCustomerUrl(identity.tripworks_customer_code)?<a className={styles.button} href={twCustomerUrl(identity.tripworks_customer_code)!} target="_blank" rel="noreferrer">Book in TripWorks</a>:null}<button className={styles.close} aria-label="Close Customer 360" onClick={onClose}>×</button></div></header>
    {loading?<div className={styles.loading}>Loading Customer 360…</div>:error?<div className={styles.error}>{error}</div>:!data?<div className={styles.empty}>No customer record found.</div>:<div className={styles.body}>
      <main className={styles.journey}>
        <div className={styles.lifecycleHeader}><div><div className={styles.eyebrow}>Customer Lifecycle</div><h3>Customer Lifecycle</h3></div><span>{timeline.length} events</span></div>
        <div className={styles.filters}>{([['all','All'],['call','Calls'],['text','Texts'],['email','Emails'],['other','Other']] as Array<[LifecycleFilter,string]>).map(([value,label])=><button key={value} className={filter===value?styles.filterActive:styles.filter} onClick={()=>setFilter(value)}>{label}</button>)}</div>
        <div className={styles.timeline}>{visibleTimeline.length?visibleTimeline.map(item=><article key={item.id} className={`${styles.event} ${styles[item.kind]}`}><div className={styles.eventTop}><strong>{item.title}</strong><span>{fmtDateTime(item.at)}</span></div>{item.meta?<div className={styles.eventMeta}>{item.meta}</div>:null}{item.body?<div className={styles.eventBody}>{item.body}</div>:null}{item.href?<a href={item.href} target={item.href.startsWith("http")?"_blank":undefined} rel={item.href.startsWith("http")?"noreferrer":undefined}>{item.hrefLabel||"Open"}</a>:null}</article>):<div className={styles.emptyTimeline}>No activity in this view yet.</div>}</div>
      </main>
      <aside className={styles.sidebar}>
        <div className={styles.commandTitle}><div className={styles.eyebrow}>Current Customer Context</div><h3>Command Center</h3></div>
        <div className={styles.actionGrid}><a href="/quote" className={styles.actionCard}><span>Quote</span><strong>Build Quote</strong></a>{identity.tripworks_customer_code&&twCustomerUrl(identity.tripworks_customer_code)?<a href={twCustomerUrl(identity.tripworks_customer_code)!} target="_blank" rel="noreferrer" className={styles.actionCard}><span>Booking</span><strong>Book in TripWorks</strong></a>:<div className={styles.actionCardDisabled}><span>Booking</span><strong>No TW Customer ID</strong></div>}</div>

        {activeReservations.length?<div className={styles.sideSection}><h3>Current</h3>{activeReservations.map(r=><div key={r.id} className={styles.record}><div className={styles.recordTitle}>{r.experience_name||r.confirmation_code}</div><div className={styles.recordMeta}>{[r.confirmation_code,r.start_time?fmtDateTime(r.start_time):null,r.trip_status,r.amount_due_cents!=null?`${money.format(r.amount_due_cents/100)} due`:null].filter(Boolean).join(" · ")}</div><div className={styles.recordActions}>{twReservationUrl(r.confirmation_code)?<a className={styles.button} href={twReservationUrl(r.confirmation_code)!} target="_blank" rel="noreferrer">Open Reservation</a>:null}</div></div>)}</div>:openLeads.length?<div className={styles.sideSection}><h3>Current</h3>{openLeads.map(o=><div key={o.id} className={styles.record}><div className={styles.recordTitle}>{o.interest_label||"Open lead"}</div><div className={styles.recordMeta}>{[o.lead_value_cents!=null?money.format(o.lead_value_cents/100):null,o.activity_window_start?fmtDate(o.activity_window_start):null,o.claimed_by_name||o.assigned_rep_name||"Unclaimed"].filter(Boolean).join(" · ")}</div><div className={styles.recordActions}><a className={styles.button} href={`/leads?open=${encodeURIComponent(o.id)}`}>Open Lead</a></div></div>)}</div>:null}

        <div className={styles.summaryGrid}><div><span>Known Visits</span><strong>{data.reservations.length}</strong></div><div><span>Known Spend</span><strong>{money.format(lifetimeSpend/100)}</strong></div><div><span>Communications</span><strong>{communications}</strong></div><div><span>Open Sales Activity</span><strong>{openLeads.length+futureDrafts.length}</strong></div></div>

        {openLeads.length||futureDrafts.length?<div className={styles.sideSection}><h3>Open Sales Activity</h3>{openLeads.map(o=><div key={o.id} className={styles.compactRecord}><strong>{o.interest_label||"Open lead"}</strong><span>{[o.lead_value_cents!=null?money.format(o.lead_value_cents/100):null,o.claimed_by_name||o.assigned_rep_name||"Unclaimed"].filter(Boolean).join(" · ")}</span><a href={`/leads?open=${encodeURIComponent(o.id)}`}>Open lead</a></div>)}{futureDrafts.length?<div className={styles.compactRecord}><strong>{futureDrafts.length} future TripWorks draft{futureDrafts.length===1?"":"s"}</strong><span>{money.format(futureDrafts.reduce((s,d)=>s+(d.value_cents||0),0)/100)} in draft reservations</span></div>:null}</div>:null}

        <div className={styles.sideSection}><h3>Customer Identity</h3><div className={styles.identityList}><div><span>Name</span><strong>{identity.name||"—"}</strong></div><div><span>Phone</span><strong>{identity.phone||"—"}</strong></div><div><span>Email</span><strong>{identity.email||"—"}</strong></div><div><span>TripWorks Customer ID</span><strong>{identity.tripworks_customer_id??"—"}</strong></div></div></div>
      </aside>
    </div>}
  </section></div>;
}
