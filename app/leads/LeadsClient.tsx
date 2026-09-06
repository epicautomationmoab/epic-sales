"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./Leads.module.css";

export type SalesLead = {
  id: string; customer_name: string | null; email: string | null; phone_e164: string | null; status: string;
  lead_value_cents: number | null; draft_count: number | null; source_method: string | null; assigned_rep_name: string | null;
  claimed_by_name: string | null; claimed_at: string | null; activity_window_start: string | null; activity_window_end: string | null;
  shopping_last_activity_at: string | null; interest_label: string | null; party_needs: string | null; lead_capture_note: string | null;
  is_past_guest: boolean | null; prior_booking_count: number | null; tripworks_customer_code?: string | null; tripworks_is_opt_in?: boolean | null;
  new_unclaimed_at?: string | null;
  drafts: Array<{ id:string; confirmation_code:string|null; experience_name:string|null; option_name:string|null; activity_date:string|null; value_cents:number|null; trip_method:string|null; created_by_name:string|null; last_trip_status:string|null; first_seen_at?:string|null; last_seen_at?:string|null; }>;
  notes: Array<{ id:string; author_name:string|null; note_text:string|null; created_at:string|null; updated_at:string|null; }>;
  assignments: Array<{ id:string; assigned_rep_name:string|null; assigned_at:string|null; unassigned_at:string|null; assignment_source:string|null; }>;
  calls?: Array<{ id:string; direction:string|null; call_type:string|null; answered:boolean|null; voicemail:boolean|null; occurred_at:string|null; duration_seconds:number|null; recording_player_url:string|null; recording_url:string|null; call_summary:string|null; transcription_text:string|null; tracking_phone_number:string|null; }>;
  texts?: Array<{ id:string; direction:string|null; message_body:string|null; status:string|null; agent_name:string|null; occurred_at:string|null; source_number:string|null; destination_number:string|null; }>;
  quotes?: Array<{ id:string; status:string|null; experience_name:string|null; total_cents:number|null; created_by_name:string|null; created_at:string|null; updated_at:string|null; emailed_at:string|null; visit_start_date:string|null; visit_end_date:string|null; }>;
};

type TimelineItem={id:string;kind:"note"|"call"|"text"|"assignment"|"draft"|"quote";at:string|null;title:string;body?:string|null;meta?:string|null;href?:string|null;hrefLabel?:string|null};
type LeadActivity={opportunity_id:string;kind:"text"|"missed_call"|"call"|"voicemail"|"shopped_again";at:string;preview:string|null;unread:boolean};
type CloseMode="lost"|"retired"|null;

const money=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});
const LOST_REASONS=[["","Choose why we lost it…"],["price","Price"],["availability","Availability"],["product_mismatch","Product mismatch"],["policy_or_qualification","Policy / qualification"],["went_elsewhere","Went elsewhere"],["plans_changed","Plans changed"],["unresponsive","Unresponsive"],["timing","Timing / not ready"],["other","Other"]] as const;
const RETIRED_REASONS=[["","Choose why this is being retired…"],["fake_or_junk_contact","Fake / junk contact"],["duplicate","Duplicate"],["test_or_staff_activity","Test / staff activity"],["bad_data","Bad data"],["not_a_prospect","Not actually a prospect"],["other","Other"]] as const;

function fmtDate(v:string|null){if(!v)return"—";const d=new Date(v.length===10?`${v}T12:00:00`:v);return Number.isNaN(d.getTime())?v:d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});}
function fmtDateTime(v:string|null){if(!v)return"Unknown time";const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
function dateWindow(l:SalesLead){if(!l.activity_window_start)return"No dates yet";if(!l.activity_window_end||l.activity_window_end===l.activity_window_start)return fmtDate(l.activity_window_start);return`${fmtDate(l.activity_window_start)} – ${fmtDate(l.activity_window_end)}`;}
function durationLabel(s:number|null){if(s==null)return"";const m=Math.floor(s/60),r=s%60;return m?`${m}m ${r}s`:`${r}s`;}
function twDraftUrl(code:string|null){return code?`https://epic4x4.tripworks.com/trip/${encodeURIComponent(code)}/bookings`:null;}
function twCustomerUrl(code:string|null|undefined){return code?`https://epic4x4.tripworks.com/customer/${encodeURIComponent(code)}/trips`:null;}
function activityLabel(a:LeadActivity|undefined){if(!a?.unread)return"";if(a.kind==="text")return"New text";if(a.kind==="missed_call")return"Missed call";if(a.kind==="voicemail")return"Voicemail";if(a.kind==="shopped_again")return"Shopped again";return"New call";}
function isNewShopper(l:SalesLead){return Boolean(l.new_unclaimed_at&&!l.claimed_by_name&&!l.assigned_rep_name);}

function timelineFor(lead:SalesLead):TimelineItem[]{
  const items:TimelineItem[]=[];
  for(const n of lead.notes||[])items.push({id:`n-${n.id}`,kind:"note",at:n.created_at,title:"Note added",body:n.note_text,meta:n.author_name||"Unknown author"});
  for(const c of lead.calls||[]){const label=c.voicemail?"Voicemail":c.answered===false?"Missed call":c.direction==="outbound"?"Outbound call":"Inbound call";items.push({id:`c-${c.id}`,kind:"call",at:c.occurred_at,title:label,body:c.call_summary||c.transcription_text||null,meta:[durationLabel(c.duration_seconds),c.tracking_phone_number?`via ${c.tracking_phone_number}`:null].filter(Boolean).join(" · "),href:c.recording_player_url||c.recording_url||null,hrefLabel:"Play recording"});}
  for(const t of lead.texts||[])items.push({id:`t-${t.id}`,kind:"text",at:t.occurred_at,title:t.direction==="outbound"?"Text sent":"Text received",body:t.message_body,meta:[t.agent_name,t.status].filter(Boolean).join(" · ")});
  for(const a of lead.assignments||[]){items.push({id:`a-${a.id}`,kind:"assignment",at:a.assigned_at,title:`Lead assigned to ${a.assigned_rep_name||"Unknown"}`,meta:a.assignment_source||null});if(a.unassigned_at)items.push({id:`u-${a.id}`,kind:"assignment",at:a.unassigned_at,title:`Assignment ended for ${a.assigned_rep_name||"Unknown"}`});}
  for(const d of lead.drafts||[])items.push({id:`d-${d.id}`,kind:"draft",at:d.first_seen_at||d.last_seen_at||null,title:`TripWorks draft: ${d.experience_name||"Draft"}`,body:d.option_name||null,meta:[d.confirmation_code,d.created_by_name,d.last_trip_status].filter(Boolean).join(" · "),href:twDraftUrl(d.confirmation_code),hrefLabel:"Open draft in TripWorks"});
  for(const q of lead.quotes||[])items.push({id:`q-${q.id}`,kind:"quote",at:q.created_at,title:`Epic quote ${q.status||"saved"}`,body:q.experience_name||null,meta:[money.format((q.total_cents||0)/100),q.created_by_name,q.emailed_at?"Emailed":null].filter(Boolean).join(" · ")});
  return items.sort((a,b)=>(b.at?new Date(b.at).getTime():0)-(a.at?new Date(a.at).getTime():0));
}

export default function LeadsClient({leads:initialLeads}:{leads:SalesLead[]}){
  const[leads,setLeads]=useState(initialLeads); const[query,setQuery]=useState(""); const[selectedId,setSelectedId]=useState<string|null>(null);
  const[noteText,setNoteText]=useState(""); const[busy,setBusy]=useState(false); const[actionError,setActionError]=useState("");
  const[activity,setActivity]=useState<Record<string,LeadActivity>>({}); const[closeMode,setCloseMode]=useState<CloseMode>(null); const[closeReason,setCloseReason]=useState(""); const[closeNote,setCloseNote]=useState("");
  const selected=useMemo(()=>leads.find(l=>l.id===selectedId)||null,[leads,selectedId]);
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return leads;return leads.filter(l=>[l.customer_name,l.email,l.phone_e164,l.interest_label,l.claimed_by_name,l.assigned_rep_name,l.tripworks_customer_code,...(l.drafts||[]).flatMap(d=>[d.confirmation_code,d.experience_name,d.option_name])].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)));},[leads,query]);
  const timeline=useMemo(()=>selected?timelineFor(selected):[],[selected]);

  async function loadActivity(){try{const r=await fetch("/api/leads/activity",{cache:"no-store"});const p=await r.json();if(r.ok)setActivity(p.activity||{});}catch{}}
  async function openLead(id:string){setSelectedId(id);setActionError("");setCloseMode(null);setCloseReason("");setCloseNote("");setActivity(c=>c[id]?{...c,[id]:{...c[id],unread:false}}:c);try{await fetch("/api/leads/activity",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({opportunity_id:id})});}catch{}}
  useEffect(()=>{void loadActivity();const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void loadActivity();},5000);return()=>window.clearInterval(timer);},[]);

  async function mutateLead(action:"claim"|"release"|"note"){
    if(!selected)return;setBusy(true);setActionError("");try{const r=await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,opportunity_id:selected.id,note_text:action==="note"?noteText:undefined})});const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p?.error||"Unable to update lead.");setLeads(c=>c.map(l=>{if(l.id!==selected.id)return l;if(action==="claim")return{...l,claimed_by_name:p.claimed_by_name||l.claimed_by_name,assigned_rep_name:p.claimed_by_name||l.assigned_rep_name,claimed_at:p.claimed_at||new Date().toISOString(),new_unclaimed_at:null};if(action==="release")return{...l,claimed_by_name:null,assigned_rep_name:null,claimed_at:null};if(action==="note"&&p.note)return{...l,notes:[p.note,...(l.notes||[])]};return l;}));if(action==="note")setNoteText("");}catch(e){setActionError(e instanceof Error?e.message:"Unable to update lead.");}finally{setBusy(false);}}
  async function closeLead(){if(!selected||!closeMode||!closeReason)return;setBusy(true);setActionError("");try{const r=await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:closeMode==="lost"?"mark_lost":"retire",opportunity_id:selected.id,reason:closeReason,note_text:closeNote})});const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p?.error||"Unable to close lead.");setLeads(c=>c.filter(l=>l.id!==selected.id));setSelectedId(null);}catch(e){setActionError(e instanceof Error?e.message:"Unable to close lead.");}finally{setBusy(false);}}

  return <>
    <div className={styles.toolbar}><div><strong>Open Leads {filtered.length}</strong><div className={styles.toolbarSub}>Click any lead to open the full working record.</div></div><input className={styles.search} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, phone, email, activity, rep…"/></div>
    <div className={styles.tableCard}><table className={styles.table}><thead><tr><th>Customer</th><th>Activity Window</th><th>Interest</th><th>Method</th><th>Owner</th><th>Activity</th><th>Drafts</th><th>Lead Value</th></tr></thead><tbody>
      {filtered.map(l=>{const pill=activityLabel(activity[l.id]);return <tr key={l.id} className={isNewShopper(l)?styles.newShopperRow:undefined} onClick={()=>void openLead(l.id)}><td><div className={styles.mainLine}>{l.customer_name||"Unnamed lead"}{l.is_past_guest?<span className={styles.vip}>Past Guest</span>:null}</div><div className={styles.subLine}>{l.phone_e164||l.email||"No contact info"}</div></td><td><div className={styles.mainLine}>{dateWindow(l)}</div><div className={styles.subLine}>Last activity {fmtDate(l.shopping_last_activity_at)}</div></td><td><div className={styles.mainLine}>{l.interest_label||l.drafts?.[0]?.experience_name||"Not specified"}</div><div className={styles.subLine}>{l.party_needs||l.drafts?.[0]?.option_name||""}</div></td><td>{l.source_method||l.drafts?.[0]?.trip_method||"—"}</td><td>{l.claimed_by_name||l.assigned_rep_name||<span className={styles.unclaimed}>Unclaimed</span>}</td><td>{pill?<span className={styles.activityPill}>{pill}</span>:"—"}</td><td className={styles.center}><strong>{l.draft_count||l.drafts?.length||0}</strong></td><td className={styles.money}>{money.format((l.lead_value_cents||0)/100)}</td></tr>})}
    </tbody></table>{!filtered.length?<div className={styles.empty}>No open leads match that search.</div>:null}</div>

    {selected?<div className={styles.backdrop} onMouseDown={()=>setSelectedId(null)}><aside className={styles.drawer} onMouseDown={e=>e.stopPropagation()}>
      <div className={styles.drawerHeader}><div><div className={styles.eyebrow}>Sales Lead</div><h2>{selected.customer_name||"Unnamed lead"}</h2><p>{selected.email||"No email"} · {selected.phone_e164||"No phone"}</p></div><button className={styles.close} onClick={()=>setSelectedId(null)}>×</button></div>
      <div className={styles.drawerActions}><a className={styles.primaryAction} href={`/?lead=${encodeURIComponent(selected.id)}`}>Build Quote</a>{twCustomerUrl(selected.tripworks_customer_code)?<a className={styles.secondaryAction} href={twCustomerUrl(selected.tripworks_customer_code)!} target="_blank" rel="noreferrer">Open Customer in TW ↗</a>:null}{selected.claimed_by_name?<button className={styles.secondaryAction} disabled={busy} onClick={()=>mutateLead("release")}>Release Lead</button>:<button className={styles.secondaryAction} disabled={busy} onClick={()=>mutateLead("claim")}>Claim Lead</button>}</div>
      {actionError?<div className={styles.actionError}>{actionError}</div>:null}
      <div className={styles.factGrid}><div><span>Visit Window</span><strong>{dateWindow(selected)}</strong></div><div><span>Lead Value</span><strong>{money.format((selected.lead_value_cents||0)/100)}</strong></div><div><span>Claimed By</span><strong>{selected.claimed_by_name||"Unclaimed"}</strong></div><div><span>Method</span><strong>{selected.source_method||"—"}</strong></div></div>
      <section className={styles.drawerSection}><div className={styles.sectionHeading}><h3>Activity Timeline</h3><span>{timeline.length} items</span></div>{timeline.length?timeline.map(i=><div className={`${styles.timelineItem} ${styles[`kind_${i.kind}`]||""}`} key={i.id}><div className={styles.timelineTop}><strong>{i.title}</strong><span>{fmtDateTime(i.at)}</span></div>{i.body?<div className={styles.timelineBody}>{i.body}</div>:null}{i.meta?<div className={styles.recordMeta}>{i.meta}</div>:null}{i.href?<a className={styles.recordingLink} href={i.href} target="_blank" rel="noreferrer">{i.hrefLabel||"Open"} ↗</a>:null}</div>):<p className={styles.mutedText}>No linked activity yet.</p>}</section>
      <section className={styles.drawerSection}><h3>Sales Notes</h3><textarea className={styles.noteBox} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Add a sales note, follow-up detail, objection, preference…" maxLength={4000}/><button className={styles.secondaryAction} disabled={busy||!noteText.trim()} onClick={()=>mutateLead("note")}>{busy?"Saving…":"Add Note"}</button></section>
      <section className={styles.drawerSection}><h3>Lead Outcome</h3><p className={styles.mutedText}>Use Lost for a real opportunity Epic did not win. Retire is for junk, tests, duplicates, bad data, or contacts that were never truly a sales prospect.</p><div className={styles.drawerActions}><button className={styles.lostButton} onClick={()=>{setCloseMode("lost");setCloseReason("");}}>Mark Lost</button><button className={styles.secondaryAction} onClick={()=>{setCloseMode("retired");setCloseReason("");}}>Retire Lead</button></div>{closeMode?<div className={styles.closePanel}><select value={closeReason} onChange={e=>setCloseReason(e.target.value)}>{(closeMode==="lost"?LOST_REASONS:RETIRED_REASONS).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><textarea value={closeNote} onChange={e=>setCloseNote(e.target.value)} placeholder="Optional note…"/><div className={styles.drawerActions}><button className={styles.lostButton} disabled={busy||!closeReason} onClick={closeLead}>{busy?"Saving…":closeMode==="lost"?"Confirm Lost":"Confirm Retire"}</button><button className={styles.secondaryAction} onClick={()=>setCloseMode(null)}>Cancel</button></div></div>:null}</section>
    </aside></div>:null}
  </>;
}
