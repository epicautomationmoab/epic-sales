"use client";
import {useEffect,useState} from "react";
type Docs={businessLine?:string|null;guestPortalUrl?:string|null;readinessId:string;epicReceived:number;epicExpected:number;mpwrReceived:number;mpwrExpected:number;epic:Array<{name:string;role:string;url:string|null}>;polaris:Array<{name:string;role:string;url:string|null}>;ohv?:Array<{id:string;name:string;filename:string;uploadedAt:string}>};
type Certificate={readinessId:string;driverName:string;filename:string;uploadedAt:string;viewUrl:string|null};
type Status={confirmation_code:string;ohv_required:boolean|null;ohv_certificate_uploaded:boolean|null;mpwr_document_received_count:number|null;mpwr_document_expected_count:number|null;handoff_status:string|null};
export default function ReservationReadiness({confirmation}:{confirmation:string}){
 const [row,setRow]=useState<Status|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [expanded,setExpanded]=useState(false);
 const [certificates,setCertificates]=useState<Certificate[]>([]);
 const [documents,setDocuments]=useState<Docs[]>([]);
 async function refresh(){
  setLoading(true);setError("");
  try{
   const response=await fetch("/api/customer-readiness?confirmation="+encodeURIComponent(confirmation),{cache:"no-store"});
   if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(typeof detail.error==="string"?detail.error:"Request failed ("+response.status+")");}
   const result=await response.json() as {rows:Status[];certificates?:Certificate[];documents?:Docs[]};
   setCertificates(result.certificates||[]);
   setDocuments(result.documents||[]);
   setRow(result.rows?.[0]||null);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load readiness details.");}finally{setLoading(false);}
 }
 useEffect(()=>{void refresh();},[confirmation]);
 const destination="https://epic-tools-app.vercel.app/team/readiness?confirmation="+encodeURIComponent(confirmation);
 const isRental=documents[0]?.businessLine?.toLowerCase()==="rental";
 const portalUrl=documents[0]?.guestPortalUrl?"https://epic-tools-app.vercel.app"+documents[0].guestPortalUrl:null;
 const ohv=row?.ohv_required===false?"Not required":row?.ohv_certificate_uploaded===true?"Received":row?.ohv_required===true?"Missing":"Unknown";
 return <div style={{marginTop:10,borderTop:"1px solid #e4e8ed",paddingTop:9,fontSize:12}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><strong>Guest Readiness</strong><button onClick={()=>void refresh()} disabled={loading} type="button">{loading?"Loading…":"Refresh"}</button></div>
  {error?<div role="alert">{error}</div>:loading&&!row?<div>Checking readiness…</div>:!row&&!documents.length?<div>No readiness record located.</div>:<div style={{marginTop:6}}>Epic Documents: <strong>{documents[0]?.epicReceived??0}/{documents[0]?.epicExpected??0}</strong><div>MPWR Waivers: <strong>{documents[0]?.mpwrReceived??0}/{documents[0]?.mpwrExpected??0}</strong></div>{isRental?<div>OHV certificate: <strong>{ohv}</strong></div>:null}<div>MPWR paperwork: <strong>{row?.mpwr_document_expected_count==null?"Unknown":String(row.mpwr_document_received_count??0)+" / "+String(row.mpwr_document_expected_count)}</strong></div></div>}
  <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}><button type="button" onClick={()=>setExpanded(!expanded)}>{expanded?"Hide Documents":"View Documents"}</button>{portalUrl?<a target="_blank" rel="noreferrer" href={portalUrl}>View Guest Portal ↗</a>:null}<a target="_blank" rel="noreferrer" href={destination}>Open Full Readiness ↗</a></div>
  {expanded?<div role="dialog" aria-modal="true" aria-label="Reservation documents" style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(12,20,30,.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}><div style={{background:"white",color:"#172033",borderRadius:16,padding:22,width:"min(650px,100%)",maxHeight:"85vh",overflowY:"auto"}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><strong style={{fontSize:18}}>Reservation Documents · {confirmation}</strong><button type="button" onClick={()=>setExpanded(false)}>Close ✕</button></div>
   {error?<p role="alert">Readiness error: {error}</p>:!documents.length?<p>No Readiness document detail available.</p>:documents.map((d,i)=><div key={d.readinessId||i}>
    <section style={{background:"#f0f9f2",borderRadius:12,padding:14,marginTop:16}}><h3 style={{color:"#176639",margin:"0 0 10px"}}>Epic Documents · {d.epicReceived}/{d.epicExpected}</h3>{d.epic.length?d.epic.map((p,j)=><div key={j} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"9px 0",borderTop:"1px solid #d6e5da"}}><span><strong>{p.name}</strong><small style={{display:"block"}}>{p.role}</small></span>{p.url?<a href={p.url} target="_blank" rel="noreferrer">Open Waiver ↗</a>:<span>Link unavailable</span>}</div>):<p>No signed Epic documents found.</p>}</section>
    <section style={{background:"#f0f5fc",borderRadius:12,padding:14,marginTop:14}}><h3 style={{color:"#285b87",margin:"0 0 10px"}}>MPWR Waivers · {d.mpwrReceived}/{d.mpwrExpected}</h3>{d.polaris.length?d.polaris.map((p,j)=><div key={j} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"9px 0",borderTop:"1px solid #d6dfec"}}><span><strong>{p.name}</strong><small style={{display:"block"}}>{p.role}</small></span>{p.url?<a href={p.url} target="_blank" rel="noreferrer">Open Waiver ↗</a>:<span>Link unavailable</span>}</div>):<p>No MPWR waivers found.</p>}</section>
    {d.businessLine?.toLowerCase()==="rental"?<section style={{background:"#fff8e9",borderRadius:12,padding:14,marginTop:14}}><h3 style={{color:"#795400",margin:"0 0 10px"}}>OHV Certificates · {(d.ohv||[]).length} uploaded</h3>{d.ohv?.length?d.ohv.map(c=><div key={c.id} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"9px 0",borderTop:"1px solid #eadfbd"}}><span><strong>{c.name||"Driver"}</strong><small style={{display:"block"}}>{c.filename}</small></span><a href={"https://epic-tools-preview-akc5pzy9z-automation-4515s-projects.vercel.app/api/team/ohv/view/"+encodeURIComponent(c.id)} target="_blank" rel="noreferrer">View Certificate ↗</a></div>):<p>No OHV certificates uploaded.</p>}</section>:null}
   </div>)}
   <div style={{marginTop:14,display:"flex",gap:14,flexWrap:"wrap"}}>{portalUrl?<a href={portalUrl} target="_blank" rel="noreferrer">View Guest Portal ↗</a>:null}<a href={destination} target="_blank" rel="noreferrer">Open Full Readiness ↗</a></div>
  </div></div>:null}
 </div>;
}
