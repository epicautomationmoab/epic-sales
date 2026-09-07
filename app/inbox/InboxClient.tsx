"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./Inbox.module.css";

type InboxThread = {
  thread_key:string; kind:string; source_id:string; occurred_at:string; preview:string|null; subject:string|null;
  customer_name:string|null; email:string|null; phone:string|null; opportunity_id:string|null; opportunity_status:string|null;
  lead_value_cents:number|null; interest_label:string|null; activity_window_start:string|null; activity_window_end:string|null;
  assigned_rep_name:string|null; claimed_by_name:string|null; reservation_id:string|null; reservation_confirmation:string|null;
  lane:"sales"|"service"|"unmatched"; is_open:boolean; handled_at:string|null; handled_by_name:string|null;
};

type Filter="open"|"sales"|"service"|"unmatched"|"cleaned";
const money=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});

function fmtTime(v:string){const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
function fmtDate(v:string|null){if(!v)return"—";const d=new Date(`${v}T12:00:00`);return Number.isNaN(d.getTime())?v:d.toLocaleDateString(undefined,{month:"short",day:"numeric"});}
function kindLabel(kind:string){if(kind==="email")return"Email";if(kind==="text")return"Text";if(kind==="abandoned_call")return"Abandoned call";if(kind==="missed_call")return"Missed call";if(kind==="voicemail")return"Voicemail";if(kind==="shopping")return"Shopping";return"Call";}

export default function InboxClient(){
  const[threads,setThreads]=useState<InboxThread[]>([]);const[selectedKey,setSelectedKey]=useState<string|null>(null);const[filter,setFilter]=useState<Filter>("open");const[query,setQuery]=useState("");const[busy,setBusy]=useState(false);const[error,setError]=useState("");
  async function load(nextFilter=filter){
    try{const r=await fetch(`/api/inbox${nextFilter==="cleaned"?"?cleaned=1":""}`,{cache:"no-store"});const p=await r.json();if(!r.ok)throw new Error(p?.error||"Unable to load inbox.");setThreads(p.threads||[]);}catch(e){setError(e instanceof Error?e.message:"Unable to load inbox.");}
  }
  useEffect(()=>{void load();const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load();},5000);return()=>window.clearInterval(timer);},[]);
  useEffect(()=>{void load(filter);},[filter]);
  const visible=useMemo(()=>{const q=query.trim().toLowerCase();return threads.filter(t=>{
    if(filter!=="open"&&filter!=="cleaned"&&t.lane!==filter)return false;
    if(filter==="cleaned"&&t.is_open)return false;
    if(!q)return true;return[t.customer_name,t.email,t.phone,t.subject,t.preview,t.reservation_confirmation,t.interest_label].filter(Boolean).some(v=>String(v).toLowerCase().includes(q));
  });},[threads,filter,query]);
  const selected=useMemo(()=>visible.find(t=>t.thread_key===selectedKey)||threads.find(t=>t.thread_key===selectedKey)||null,[visible,threads,selectedKey]);
  async function clean(){if(!selected)return;setBusy(true);setError("");try{const r=await fetch("/api/inbox",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"clean",thread_key:selected.thread_key})});const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p?.error||"Unable to clean conversation.");setSelectedKey(null);await load(filter);}catch(e){setError(e instanceof Error?e.message:"Unable to clean conversation.");}finally{setBusy(false);}}
  const counts=useMemo(()=>({open:threads.filter(t=>t.is_open).length,sales:threads.filter(t=>t.is_open&&t.lane==="sales").length,service:threads.filter(t=>t.is_open&&t.lane==="service").length,unmatched:threads.filter(t=>t.is_open&&t.lane==="unmatched").length}),[threads]);
  return <>
    <header className={styles.header}><div><div className={styles.eyebrow}>Epic Communications</div><h1>Inbox <span className={styles.count}>{counts.open}</span></h1><p>Everything inbound stays here until somebody handles it. New customer activity brings a cleaned conversation back.</p></div><div className={styles.filters}>
      <button className={`${styles.filter} ${filter==="open"?styles.filterActive:""}`} onClick={()=>setFilter("open")}>Open {counts.open}</button>
      <button className={`${styles.filter} ${filter==="sales"?styles.filterActive:""}`} onClick={()=>setFilter("sales")}>Sales {counts.sales}</button>
      <button className={`${styles.filter} ${filter==="service"?styles.filterActive:""}`} onClick={()=>setFilter("service")}>Service {counts.service}</button>
      <button className={`${styles.filter} ${filter==="unmatched"?styles.filterActive:""}`} onClick={()=>setFilter("unmatched")}>Unmatched {counts.unmatched}</button>
      <button className={`${styles.filter} ${filter==="cleaned"?styles.filterActive:""}`} onClick={()=>setFilter("cleaned")}>Cleaned</button>
    </div></header>
    <div className={styles.workspace}>
      <section className={styles.listPane}><div className={styles.listHeader}><input className={styles.search} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer, email, phone, subject…"/></div>{error?<div className={styles.error}>{error}</div>:null}{visible.map(t=><button key={t.thread_key} className={`${styles.thread} ${selectedKey===t.thread_key?styles.selected:""}`} onClick={()=>setSelectedKey(t.thread_key)}><div className={styles.threadTop}><div className={styles.name}>{t.customer_name||t.email||t.phone||"Unknown customer"}</div><div className={styles.time}>{fmtTime(t.occurred_at)}</div></div><div className={styles.threadMeta}><span className={styles.pill}>{kindLabel(t.kind)}</span><span className={`${styles.pill} ${styles[t.lane]}`}>{t.lane}</span>{t.opportunity_status?<span className={styles.pill}>{t.opportunity_status}</span>:null}</div><div className={styles.preview}>{t.subject?`${t.subject} — `:""}{t.preview||"No preview"}</div></button>)}</section>
      <section className={styles.detailPane}>{selected?<div className={styles.card}><div className={styles.detailTop}><div><div className={styles.eyebrow}>{selected.lane==="sales"?"Sales opportunity":selected.lane==="service"?"Customer service":"Needs identification"}</div><h2>{selected.customer_name||selected.email||selected.phone||"Unknown customer"}</h2><div className={styles.sub}>{[selected.email,selected.phone].filter(Boolean).join(" · ")||"No known contact record yet"}</div></div><span className={`${styles.pill} ${styles[selected.lane]}`}>{selected.lane}</span></div>
        <div className={styles.contextGrid}><div className={styles.context}><span>Latest inbound</span><strong>{kindLabel(selected.kind)}</strong></div><div className={styles.context}><span>Lead value</span><strong>{selected.lead_value_cents!=null?money.format(selected.lead_value_cents/100):"—"}</strong></div><div className={styles.context}><span>Owner</span><strong>{selected.claimed_by_name||selected.assigned_rep_name||"Unassigned"}</strong></div><div className={styles.context}><span>Interest</span><strong>{selected.interest_label||"—"}</strong></div><div className={styles.context}><span>Visit window</span><strong>{selected.activity_window_start?`${fmtDate(selected.activity_window_start)}${selected.activity_window_end&&selected.activity_window_end!==selected.activity_window_start?` – ${fmtDate(selected.activity_window_end)}`:""}`:"—"}</strong></div><div className={styles.context}><span>Reservation</span><strong>{selected.reservation_confirmation||"—"}</strong></div></div>
        <div className={styles.message}><div className={styles.messageLabel}>Latest customer activity · {fmtTime(selected.occurred_at)}</div>{selected.subject?<div className={styles.subject}>{selected.subject}</div>:null}<div className={styles.body}>{selected.preview||"No message preview available."}</div></div>
        <div className={styles.actions}>{selected.opportunity_id?<a className={styles.secondary} href={`/leads?open=${encodeURIComponent(selected.opportunity_id)}`}>Open Lead</a>:null}{selected.reservation_confirmation?<a className={styles.secondary} href={`https://team.myepicreservation.com/team/readiness?search=${encodeURIComponent(selected.reservation_confirmation)}`}>Open Reservation</a>:null}<button className={styles.primary} disabled={busy||!selected.is_open} onClick={()=>void clean()}>{busy?"Cleaning…":selected.is_open?"Clean / Handled":"Already Cleaned"}</button></div><div className={styles.cleanNote}>Cleaning removes this conversation from the active inbox. Any new inbound call, text, email, or shopping activity after that point automatically brings it back.</div>
      </div>:<div className={styles.empty}><div><strong>Select a conversation</strong><div style={{marginTop:8}}>Customer context and the latest inbound activity will appear here.</div></div></div>}</section>
    </div>
  </>;
}
