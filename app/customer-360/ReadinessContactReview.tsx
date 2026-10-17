"use client";
import {useState} from "react";
type Reservation={confirmation:string;name:string;experience:string;start:string;current_phone:string;current_email:string;manual_phone:boolean;manual_email:boolean;primary_phone:string;primary_email:string|null};
export default function ReadinessContactReview({phone}:{phone:string}){
 const [rows,setRows]=useState<Reservation[]>([]);
 const [open,setOpen]=useState(false);
 const [loading,setLoading]=useState(false);
 const [status,setStatus]=useState("");
 const [selected,setSelected]=useState<string[]>([]);
 async function refresh(){
  setLoading(true);setStatus("");
  try{
   const response=await fetch("/api/customer-360/readiness-contact?phone="+encodeURIComponent(phone),{cache:"no-store"});
   const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to load reservations");
   setRows(result.reservations||[]);setSelected([]);
  }catch(e){setStatus(e instanceof Error?e.message:"Lookup failed");}finally{setLoading(false);}
 }
 async function apply(){
  setLoading(true);setStatus("");let count=0;
  try{
   for(const confirmation of selected){
    const row=rows.find(x=>x.confirmation===confirmation);if(!row)continue;
    const response=await fetch("/api/customer-360/readiness-contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone,confirmation,expected_phone:row.current_phone||"",expected_email:row.current_email||""})});
    const result=await response.json();if(!response.ok)throw new Error(confirmation+": "+(result.error||"Unable to save"));
    count++;
   }
   setStatus(count+" reservation(s) updated with durable Readiness contact overrides.");
   await refresh();
  }catch(e){setStatus((count?count+" updated. ":"")+(e instanceof Error?e.message:"Update failed"));}finally{setLoading(false);}
 }
 return <div style={{marginTop:14,borderTop:"1px solid #e2e8f0",paddingTop:12,fontSize:12}}>
  <button type="button" onClick={()=>{setOpen(v=>!v);if(!open)void refresh();}} style={{border:"1px solid #c4b5fd",borderRadius:8,padding:"8px 10px",background:"#faf9ff",color:"#6d28d9",fontWeight:800}}>Review Readiness updates</button>
  {open?<div style={{marginTop:10}}>
   <p style={{color:"#64748b"}}>Select reservations that should use this customer's primary contacts. Existing reservation-specific corrections are shown below. Nothing changes until you apply.</p>
   {rows.map(row=><label key={row.confirmation} style={{display:"block",padding:10,margin:"7px 0",border:"1px solid #e2e8f0",borderRadius:9}}>
    <input type="checkbox" checked={selected.includes(row.confirmation)} onChange={e=>setSelected(p=>e.target.checked?[...p,row.confirmation]:p.filter(c=>c!==row.confirmation))}/>
    <strong> {row.confirmation} · {row.name}</strong>
    <div style={{marginTop:5}}>{row.experience}</div>
    <div>Current: {row.current_phone||"No phone"} · {row.current_email||"No email"}</div>
    <div>Proposed: {row.primary_phone} · {row.primary_email||"No primary email"}</div>
    {row.manual_phone||row.manual_email?<strong style={{color:"#9a3412"}}>Existing manual contact correction — review carefully</strong>:null}
   </label>)}
   {!rows.length&&!loading?<p>No eligible current or upcoming reservations found.</p>:null}
   <button type="button" disabled={loading||selected.length===0} onClick={()=>void apply()} style={{padding:"9px 12px",border:0,borderRadius:9,background:"linear-gradient(110deg,#7c3aed,#ce3b91,#f97316)",color:"#fff",fontWeight:800}}>Apply to {selected.length} selected reservation(s)</button>
   {loading?<p>Working…</p>:null}
  </div>:null}
  {status?<p role="status">{status}</p>:null}
 </div>;
}