"use client";
import {useState} from "react";
type Result={contact_id:string|null;customer_name:string|null;email:string|null;phone:string|null};
export default function SocialIdentityLink({contactId,onLinked}:{contactId:string;onLinked:()=>void}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(""),[results,setResults]=useState<Result[]>([]);
 const [choice,setChoice]=useState<Result|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function search(){setBusy(true);setError("");try{
  const r=await fetch("/api/customers?q="+encodeURIComponent(query.trim()),{cache:"no-store"});
  const v=await r.json();if(!r.ok)throw Error(v.error||"Search failed");
  setResults((v.customers||[]).filter((c:Result)=>c.contact_id&&c.contact_id!==contactId));
 }catch(e){setError(e instanceof Error?e.message:"Search failed");}finally{setBusy(false);}}
 async function confirm(){if(!choice?.contact_id)return;setBusy(true);setError("");try{
  const r=await fetch("/api/customer-360/social-link",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({source_contact_id:contactId,target_contact_id:choice.contact_id})});
  const v=await r.json();if(!r.ok)throw Error(v.error||"Link failed");onLinked();
 }catch(e){setError(e instanceof Error?e.message:"Link failed");}finally{setBusy(false);}}
 return <div style={{display:"inline-block",position:"relative"}}>
  <button type="button" onClick={()=>setOpen(!open)}>Link to existing C360</button>
  {open?<div style={{position:"absolute",right:0,top:"100%",width:360,maxWidth:"85vw",background:"white",border:"1px solid #ccd5df",padding:14,zIndex:75,boxShadow:"0 8px 22px #0002",borderRadius:10}}>
   <strong>Confirm same customer</strong><p style={{fontSize:12}}>Only the social history will be linked. No customer profiles or unrelated records are merged.</p>
   <div style={{display:"flex",gap:6}}><input aria-label="Search existing customer" placeholder="Name, phone or email" value={query} onChange={e=>setQuery(e.target.value)}/><button disabled={busy||query.trim().length<2} onClick={()=>void search()}>Find</button></div>
   {results.slice(0,15).map(c=><button type="button" key={c.contact_id} onClick={()=>setChoice(c)} style={{display:"block",width:"100%",marginTop:8,padding:9,textAlign:"left",border:"1px solid #d5dae2",background:choice?.contact_id===c.contact_id?"#f5edff":"white",borderRadius:7}}>{c.customer_name||c.email||c.phone}<small style={{display:"block"}}>{[c.email,c.phone].filter(Boolean).join(" · ")}</small></button>)}
   {choice?<div style={{marginTop:12}}><strong>Link this social identity to {choice.customer_name||choice.email||choice.phone}?</strong><p style={{fontSize:12}}>Verify you know these are the same person before confirming.</p><button disabled={busy} onClick={()=>void confirm()}>Confirm & link social history</button></div>:null}
   {error?<p role="alert" style={{color:"#b91c1c"}}>{error}</p>:null}
   <button onClick={()=>setOpen(false)} style={{marginTop:10}}>Cancel</button>
  </div>:null}
 </div>;
}