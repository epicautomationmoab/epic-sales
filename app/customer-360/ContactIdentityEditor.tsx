"use client";
import {useState} from "react";

type Props={name:string|null|undefined;phone:string|null|undefined;email:string|null|undefined;contactId:string|null|undefined};
export default function ContactIdentityEditor({name,phone,email,contactId}:Props){
 const [open,setOpen]=useState(false);
 const [primaryPhone,setPrimaryPhone]=useState(phone||"");
 const [primaryEmail,setPrimaryEmail]=useState(email||"");
 const [status,setStatus]=useState("");
 const [checking,setChecking]=useState(false);
 const [knownPhones,setKnownPhones]=useState<string[]>([]);
 const [knownEmail,setKnownEmail]=useState("");
 async function loadContacts(){if(!phone)return;try{const response=await fetch("/api/customer-360?phone="+encodeURIComponent(phone),{cache:"no-store"});const result=await response.json();if(response.ok){const phones=[...new Set([phone,...(result.customer?.identity?.linked_phones||[])].filter(Boolean))];setKnownPhones(phones);setKnownEmail(result.customer?.identity?.email||email||"");}}catch{}}
 async function check(){
  setChecking(true);setStatus("");
  try{
   const response=await fetch("/api/customer-360/contact-match-preflight",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:primaryPhone,email:primaryEmail,contact_id:contactId||null})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Unable to check contact pair.");
   setStatus(result.exact_matches?.length
     ?`Exact contact pair already exists on ${result.exact_matches.length} other customer record(s). No changes saved.`
     :"No exact-match collision found in registered contact records. No changes saved.");
  }catch(error){setStatus(error instanceof Error?error.message:"Validation unavailable.");}
  finally{setChecking(false);}
 }
 async function save(){setChecking(true);setStatus("");try{const response=await fetch("/api/customer-360/primary-contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone,primary_phone:primaryPhone,primary_email:primaryEmail})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to save");setStatus("Primary contacts saved. Reopen C360 to refresh the header.");}catch(e){setStatus(e instanceof Error?e.message:"Save failed");}finally{setChecking(false);}}
 return <div style={{display:"inline-block",position:"relative"}}>
  <button type="button" onClick={()=>{setPrimaryPhone(phone||"");setPrimaryEmail(email||"");setStatus("");setOpen(v=>!v);void loadContacts();}} aria-expanded={open} style={{padding:"5px 9px",borderRadius:7,border:"1px solid #cbd5e1",background:"#fff",color:"#334155",fontSize:12,fontWeight:700,cursor:"pointer"}}>Edit contact details</button>
  {open?<div role="region" aria-label="Customer contact details" style={{position:"absolute",top:"calc(100% + 6px)",right:0,zIndex:45,width:"min(360px,80vw)",padding:15,display:"grid",gap:10,background:"#fff",border:"1px solid #cbd5e1",borderRadius:10,boxShadow:"0 12px 28px #0002",color:"#172033"}}>
    <strong>{name||"Customer"} — contact details</strong>
    {knownPhones.length>1?<div style={{fontSize:12}}>Known numbers: {knownPhones.join(" · ")}. Other numbers stay available as secondary contacts.</div>:null}
    <label style={{fontSize:12}}>Primary phone<input aria-label="Primary phone" type="tel" value={primaryPhone} onChange={e=>setPrimaryPhone(e.target.value)} style={{display:"block",width:"100%",padding:8,boxSizing:"border-box"}}/></label>
    <label style={{fontSize:12}}>Primary email<input aria-label="Primary email" type="email" value={primaryEmail} onChange={e=>setPrimaryEmail(e.target.value)} style={{display:"block",width:"100%",padding:8,boxSizing:"border-box"}}/></label>
    <p style={{fontSize:12,color:"#64748b",margin:0}}>Only existing confirmed linked phone numbers and known emails can be selected. Reservation contact information in Readiness is not changed.</p>
    {status?<div role="status" style={{fontSize:12}}>{status}</div>:null}
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><button type="button" onClick={()=>setOpen(false)}>Close</button><button type="button" disabled={checking} onClick={()=>void check()}>{checking?"Checking…":"Check exact match"}</button><button type="button" disabled={checking||knownPhones.length<2} onClick={()=>void save()}>Save primary</button></div>
  </div>:null}
 </div>;
}
