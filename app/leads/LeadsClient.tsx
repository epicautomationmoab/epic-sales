"use client";

import { useMemo, useState } from "react";
import Customer360Modal from "../customer-360/Customer360Modal";
import styles from "./Leads.module.css";

export type SalesLead = {
  id:string; customer_name:string|null; email:string|null; phone_e164:string|null; status:string;
  lead_value_cents:number|null; draft_count:number|null; source_method:string|null; assigned_rep_name:string|null;
  claimed_by_name:string|null; claimed_at:string|null; activity_window_start:string|null; activity_window_end:string|null;
  shopping_last_activity_at:string|null; interest_label:string|null; party_needs:string|null; lead_capture_note:string|null;
  is_past_guest:boolean|null; prior_booking_count:number|null; tripworks_customer_code?:string|null; tripworks_is_opt_in?:boolean|null;
  drafts:Array<{id:string;confirmation_code:string|null;experience_name:string|null;option_name:string|null;activity_date:string|null;value_cents:number|null}>;
  notes:Array<{id:string;author_name:string|null;note_text:string|null;created_at:string|null;updated_at:string|null}>;
  assignments:Array<{id:string;assigned_rep_name:string|null;assigned_at:string|null;unassigned_at:string|null;assignment_source:string|null}>;
};

const money=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});
function fmtDate(v:string|null){if(!v)return"—";const d=new Date(v.length===10?`${v}T12:00:00`:v);return Number.isNaN(d.getTime())?v:d.toLocaleDateString(undefined,{month:"short",day:"numeric"});}
function dateWindow(l:SalesLead){if(!l.activity_window_start)return"No dates yet";if(!l.activity_window_end||l.activity_window_end===l.activity_window_start)return fmtDate(l.activity_window_start);return`${fmtDate(l.activity_window_start)} – ${fmtDate(l.activity_window_end)}`;}

export default function LeadsClient({leads}:{leads:SalesLead[]}){
  const[query,setQuery]=useState("");
  const[owner,setOwner]=useState("All");
  const[selected,setSelected]=useState<SalesLead|null>(null);
  const owners=useMemo(()=>["All","Unclaimed",...Array.from(new Set(leads.map(l=>l.claimed_by_name||l.assigned_rep_name).filter(Boolean) as string[])).sort()], [leads]);
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return leads.filter(l=>{
    const leadOwner=l.claimed_by_name||l.assigned_rep_name||"Unclaimed";
    if(owner!=="All"&&leadOwner!==owner)return false;
    if(!q)return true;
    return[l.customer_name,l.email,l.phone_e164,l.interest_label,leadOwner,...(l.drafts||[]).flatMap(d=>[d.confirmation_code,d.experience_name,d.option_name])].filter(Boolean).some(v=>String(v).toLowerCase().includes(q));
  });},[leads,owner,query]);

  return <>
    <div className={styles.toolbar}><div><strong>Active Leads {filtered.length}</strong><div className={styles.toolbarSub}>This is the work queue. Click a customer to work them in Customer 360.</div></div><input className={styles.search} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, phone, email, activity…"/></div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>{owners.map(name=><button key={name} onClick={()=>setOwner(name)} style={{border:"1px solid #d9e0e6",background:owner===name?"#111827":"#fff",color:owner===name?"#fff":"#26303b",borderRadius:999,padding:"8px 13px",fontWeight:800,cursor:"pointer"}}>{name}</button>)}</div>
    <div className={styles.tableCard}><table className={styles.table}><thead><tr><th>Customer</th><th>Visit Window</th><th>Interest</th><th>Owner</th><th>Drafts</th><th>Lead Value</th></tr></thead><tbody>{filtered.map(l=><tr key={l.id} onClick={()=>setSelected(l)}><td><div className={styles.mainLine}>{l.customer_name||"Unnamed lead"}{l.is_past_guest?<span className={styles.vip}>Past Guest</span>:null}</div><div className={styles.subLine}>{l.phone_e164||l.email||"No contact info"}</div></td><td><div className={styles.mainLine}>{dateWindow(l)}</div></td><td><div className={styles.mainLine}>{l.interest_label||l.drafts?.[0]?.experience_name||"Not specified"}</div><div className={styles.subLine}>{l.party_needs||l.drafts?.[0]?.option_name||""}</div></td><td>{l.claimed_by_name||l.assigned_rep_name||"Unclaimed"}</td><td>{l.draft_count||0}</td><td>{l.lead_value_cents!=null?money.format(l.lead_value_cents/100):"—"}</td></tr>)}</tbody></table></div>
    {selected?<Customer360Modal open={true} onClose={()=>setSelected(null)} opportunityId={selected.id} phone={selected.phone_e164} email={selected.email}/>:null}
  </>;
}
