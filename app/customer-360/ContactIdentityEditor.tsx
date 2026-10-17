"use client";
import {useEffect,useState} from "react";
type Method={id:string|null;type:"phone"|"email";value:string;primary:boolean};
type Props={name:string|null|undefined;phone:string|null|undefined;email:string|null|undefined;contactId:string|null|undefined};
export default function ContactIdentityEditor({name,phone}:Props){
 const [open,setOpen]=useState(false);
 const [methods,setMethods]=useState<Method[]>([]);
 const [linked,setLinked]=useState(false);
 const [loading,setLoading]=useState(false);
 const [status,setStatus]=useState("");
 const [type,setType]=useState<"phone"|"email">("phone");
 const [value,setValue]=useState("");
 const [editing,setEditing]=useState<Method|null>(null);
 async function load(){if(!phone)return;setLoading(true);setStatus("");try{
  const res=await fetch("/api/customer-360/contact-methods?phone="+encodeURIComponent(phone),{cache:"no-store"});
  const result=await res.json();if(!res.ok)throw new Error(result.error||"Unable to load contacts");
  setMethods(result.methods||[]);setLinked(Boolean(result.linked));
 }catch(e){setStatus(e instanceof Error?e.message:"Unable to load contacts");}finally{setLoading(false);}}
 useEffect(()=>{if(open)void load();},[open,phone]);
 async function change(action:"add"|"remove"|"primary",methodType:"phone"|"email",methodValue:string,makePrimary=false){
  setLoading(true);setStatus("");
  try{
   const res=await fetch("/api/customer-360/contact-methods",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone,action,type:methodType,value:methodValue,make_primary:makePrimary})});
   const result=await res.json();if(!res.ok)throw new Error(result.error||"Unable to save contact change");
   setMethods(result.methods||[]);setStatus("Saved. Reopen C360 to refresh the header.");
   setEditing(null);setValue("");
  }catch(e){setStatus(e instanceof Error?e.message:"Unable to save");}finally{setLoading(false);}
 }
 return <div style={{position:"relative",display:"inline-block"}}>
  <button type="button" onClick={()=>setOpen(v=>!v)} style={{padding:"5px 9px",borderRadius:7,border:"1px solid #cbd5e1",background:"#fff",fontWeight:700,fontSize:12}}>Edit contact details</button>
  {open?<section aria-label="Customer contact details" style={{position:"absolute",top:"calc(100% + 6px)",right:0,zIndex:45,width:"min(420px,85vw)",maxHeight:"75vh",overflowY:"auto",padding:16,background:"white",border:"1px solid #cbd5e1",borderRadius:12,boxShadow:"0 12px 28px #0002",color:"#172033"}}>
   <strong>{name||"Customer"} — contact details</strong>
   <p style={{fontSize:12,color:"#64748b"}}>Edit preferred contact information or add another way to reach this customer.</p>
   {loading?<p style={{fontSize:12}}>Saving or loading…</p>:null}
   {!linked?<p style={{fontSize:12}}>Contact editing is available for confirmed linked customers.</p>:null}
   {(["phone","email"] as const).map(t=><div key={t} style={{margin:"12px 0"}}>
    <strong>{t==="phone"?"Phone numbers":"Email addresses"}</strong>
    {methods.filter(m=>m.type===t).map(m=><div key={m.id||m.value} style={{padding:"9px 0",borderBottom:"1px solid #e2e8f0"}}>
     <div style={{overflowWrap:"anywhere",fontSize:12}}>{m.value} {m.primary?<strong style={{color:"#6d28d9"}}>· Primary</strong>:<span style={{color:"#64748b"}}>· Additional</span>}</div>
     <div style={{display:"flex",gap:8,marginTop:5,flexWrap:"wrap"}}>
      {!m.primary?<button type="button" disabled={loading} onClick={()=>void change("primary",m.type,m.value)}>Make primary</button>:null}
      <button type="button" disabled={loading} onClick={()=>{setType(m.type);setEditing(m);setValue(m.value);}}>Edit</button>
      {!m.primary&&m.id?<button type="button" disabled={loading} onClick={()=>void change("remove",m.type,m.value)}>Remove</button>:null}
     </div>
    </div>)}
    {methods.filter(m=>m.type===t).length===0?<p style={{fontSize:12}}>No {t} on file.</p>:null}
    <button type="button" disabled={!linked||loading} onClick={()=>{setType(t);setEditing(null);setValue("");}} style={{marginTop:8}}>+ Add {t}</button>
   </div>)}
   {linked?<div style={{border:"1px solid #c4b5fd",borderRadius:9,padding:10,background:"#faf9ff"}}>
    <strong>{editing?"Edit "+editing.type:"Add "+type}</strong>
    <input aria-label="Contact value" type={type==="email"?"email":"tel"} value={value} onChange={e=>setValue(e.target.value)} style={{width:"100%",boxSizing:"border-box",padding:8,margin:"8px 0"}} placeholder={type==="phone"?"Phone number":"Email address"}/>
    <div style={{display:"flex",gap:8}}>
     <button type="button" disabled={loading||!value.trim()} onClick={async()=>{
      if(editing){await change("add",type,value,editing.primary);if(!editing.primary)await change("remove",editing.type,editing.value);}
      else await change("add",type,value);
     }}>Save contact</button>
     <button type="button" onClick={()=>{setEditing(null);setValue("");}}>Cancel</button>
    </div>
   </div>:null}
   {status?<p role="status" style={{fontSize:12}}>{status}</p>:null}
   <div style={{textAlign:"right",marginTop:12}}><button type="button" onClick={()=>setOpen(false)}>Close</button></div>
  </section>:null}
 </div>;
}
