"use client";
import {useEffect,useState} from "react";
import Customer360Modal from "../customer-360/Customer360Modal";
type Item={id:string;opportunity_id:string;title:string;context_note:string;due_at:string;status:string;assigned_to_profile_id:string;created_at:string;sales_opportunities?:{customer_name?:string}|null};
export default function ScheduledFollowUps(){
 const [items,setItems]=useState<Item[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true),[open,setOpen]=useState<string|null>(null),[action,setAction]=useState<string|null>(null),[note,setNote]=useState(""),[due,setDue]=useState(""),[busy,setBusy]=useState(false);
 async function load(){try{const r=await fetch("/api/followups",{cache:"no-store"});const p=await r.json();if(!r.ok)throw Error(p.error||"Unable to load follow-ups");setItems(p.items||[]);setError("");}catch(e){setError(e instanceof Error?e.message:"Unable to load follow-ups")}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 async function save(id:string,kind:string){setBusy(true);try{const body=kind==="reschedule"?{id,action:kind,due_at:due?new Date(due).toISOString():null,note}:kind==="attempt"?{id,action:kind,outcome:"no_answer",note}: {id,action:"complete",outcome:"contacted",note};const r=await fetch("/api/followups",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const p=await r.json();if(!r.ok)throw Error(p.error||"Unable to update");setAction(null);setNote("");setDue("");await load()}catch(e){setError(e instanceof Error?e.message:"Unable to update")}finally{setBusy(false)}}
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Denver",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const key=(date:string)=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Denver",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(date));
 const active=items.filter(x=>x.status==="pending");
 const sections=[{name:"Overdue",rows:active.filter(x=>key(x.due_at)<today)},{name:"Due Today",rows:active.filter(x=>key(x.due_at)===today)},{name:"Upcoming",rows:active.filter(x=>key(x.due_at)>today)}];
 return <section style={{display:"grid",gap:12,marginTop:24}}>
 <h2 style={{fontSize:22,margin:0}}>Scheduled Follow-Ups</h2>
 <p style={{color:"#667085",margin:0,fontSize:13}}>Customer commitments stay open until resolved. Open C360 for the complete conversation and notes.</p>
 {loading?<p>Loading follow-ups…</p>:error?<p role="alert" style={{color:"#ad2530"}}>{error}</p>:null}
 {sections.map(section=><div key={section.name} style={{background:"white",border:"1px solid #e3e5eb",borderRadius:12,padding:15}}>
 <h3 style={{fontSize:16,margin:"0 0 10px"}}>{section.name} ({section.rows.length})</h3>
 {!section.rows.length?<p style={{fontSize:13,color:"#77808c"}}>None</p>:section.rows.map(item=><div key={item.id} style={{borderTop:"1px solid #edf0f2",padding:"13px 0",display:"grid",gap:8}}>
 <strong>{item.sales_opportunities?.customer_name||"Customer"}</strong>
 <div style={{fontSize:14}}>{item.title}</div>
 {item.context_note?<div style={{fontSize:12,color:"#526073"}}>{item.context_note}</div>:null}
 <small>{new Date(item.due_at).toLocaleString("en-US",{timeZone:"America/Denver",dateStyle:"medium",timeStyle:"short"})} Mountain</small>
 <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
 <button type="button" onClick={()=>setOpen(item.opportunity_id)}>Open C360</button>
 <button type="button" onClick={()=>{setAction(item.id+":complete");setNote("")}}>Record outcome</button>
 <button type="button" onClick={()=>{setAction(item.id+":attempt");setNote("")}}>No answer</button>
 <button type="button" onClick={()=>{setAction(item.id+":reschedule");setNote("")}}>Reschedule</button>
 </div>
 {action?.startsWith(item.id+":")?<div style={{display:"grid",gap:8,maxWidth:480}}>
 {action.endsWith("reschedule")?<label>New date <input type="datetime-local" value={due} onChange={e=>setDue(e.target.value)}/></label>:null}
 <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Record the outcome in C360's context" rows={2}/>
 <div style={{display:"flex",gap:8}}><button disabled={busy||action.endsWith("complete")&&!note.trim()||action.endsWith("reschedule")&&!due} onClick={()=>void save(item.id,action.split(":")[1])}>{busy?"Saving…":"Save"}</button><button onClick={()=>setAction(null)}>Cancel</button></div>
 </div>:null}
 </div>)}
 </div>)}
 {open?<Customer360Modal open={true} onClose={()=>setOpen(null)} opportunityId={open}/>:null}
 </section>
}
