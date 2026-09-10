"use client";

import { useEffect, useState } from "react";
import Customer360Modal from "../customer-360/Customer360Modal";
import styles from "./Customers.module.css";

type CustomerResult={
  identity_key:string;contact_id:string|null;reservation_id:string|null;confirmation_code:string|null;
  customer_name:string|null;email:string|null;phone:string|null;tripworks_customer_id:number|null;tripworks_customer_code:string|null;
  last_seen_at:string|null;reservation_count:number; lifetime_spend_cents:number; has_open_lead:boolean;
};

const money=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});
function fmtDate(v:string|null){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});}

export default function CustomersClient(){
  const[query,setQuery]=useState("");
  const[results,setResults]=useState<CustomerResult[]>([]);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");
  const[selected,setSelected]=useState<CustomerResult|null>(null);

  useEffect(()=>{
    const q=query.trim();
    if(q.length<2){setResults([]);setLoading(false);setError("");return;}
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      setLoading(true);setError("");
      try{
        const r=await fetch(`/api/customers?q=${encodeURIComponent(q)}`,{cache:"no-store",signal:controller.signal});
        const p=await r.json();
        if(!r.ok)throw new Error(p?.error||"Unable to search customers.");
        setResults(p.customers||[]);
      }catch(e){if((e as Error).name!=="AbortError")setError(e instanceof Error?e.message:"Unable to search customers.");}
      finally{setLoading(false);}
    },250);
    return()=>{window.clearTimeout(timer);controller.abort();};
  },[query]);

  return <>
    <section className={styles.searchPanel}>
      <div className={styles.searchWrap}>
        <input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, email, phone, confirmation, TripWorks ID…" />
        {loading?<span>Searching…</span>:null}
      </div>
      <div className={styles.help}>Search the customer database. Closed inbox items do not live here as messages — the customer and their history live in Customer 360.</div>
    </section>

    {error?<div className={styles.error}>{error}</div>:null}
    {query.trim().length<2?<div className={styles.empty}><strong>Find any customer</strong><span>Start with at least two characters.</span></div>:
      !loading&&!results.length?<div className={styles.empty}><strong>No customer found</strong><span>Try a different name, email, phone number, or reservation confirmation.</span></div>:
      <section className={styles.results}>{results.map(c=><button key={c.identity_key} className={styles.customerCard} onClick={()=>setSelected(c)}>
        <div className={styles.cardTop}><div><div className={styles.name}>{c.customer_name||c.email||c.phone||"Unknown customer"}</div><div className={styles.contact}>{[c.email,c.phone].filter(Boolean).join(" · ")||"No contact details"}</div></div><div className={styles.lastSeen}>{fmtDate(c.last_seen_at)}</div></div>
        <div className={styles.meta}>
          {c.has_open_lead?<span className={styles.lead}>OPEN LEAD</span>:null}
          {c.reservation_count>0?<span>{c.reservation_count} reservation{c.reservation_count===1?"":"s"}</span>:null}
          {c.lifetime_spend_cents>0?<span>{money.format(c.lifetime_spend_cents/100)} known spend</span>:null}
          {c.confirmation_code?<span>{c.confirmation_code}</span>:null}
          {c.tripworks_customer_id?<span>TW #{c.tripworks_customer_id}</span>:null}
        </div>
        <div className={styles.open}>Open Customer 360 →</div>
      </button>)}</section>}

    {selected?<Customer360Modal open={true} onClose={()=>setSelected(null)} contactId={selected.contact_id} reservationId={selected.reservation_id} reservationConfirmation={selected.confirmation_code} phone={selected.phone} email={selected.email}/>:null}
  </>;
}
