"use client";
import {useEffect,useState} from "react";
type Certificate={readinessId:string;driverName:string;filename:string;uploadedAt:string;viewUrl:string|null};
type Status={confirmation_code:string;ohv_required:boolean|null;ohv_certificate_uploaded:boolean|null;mpwr_document_received_count:number|null;mpwr_document_expected_count:number|null;handoff_status:string|null};
export default function ReservationReadiness({confirmation}:{confirmation:string}){
 const [row,setRow]=useState<Status|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [expanded,setExpanded]=useState(false);
 const [certificates,setCertificates]=useState<Certificate[]>([]);
 async function refresh(){
  setLoading(true);setError("");
  try{
   const response=await fetch("/api/customer-readiness?confirmation="+encodeURIComponent(confirmation),{cache:"no-store"});
   if(!response.ok)throw new Error("Readiness unavailable");
   const result=await response.json() as {rows:Status[];certificates?:Certificate[]};
   setCertificates(result.certificates||[]);
   setRow(result.rows[0]||null);
  }catch{setError("Unable to load readiness details.");}finally{setLoading(false);}
 }
 useEffect(()=>{void refresh();},[confirmation]);
 const destination="https://epic-tools-app.vercel.app/team/readiness?confirmation="+encodeURIComponent(confirmation);
 const ohv=row?.ohv_required===false?"Not required":row?.ohv_certificate_uploaded===true?"Received":row?.ohv_required===true?"Missing":"Unknown";
 return <div style={{marginTop:10,borderTop:"1px solid #e4e8ed",paddingTop:9,fontSize:12}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><strong>Guest Readiness</strong><button onClick={()=>void refresh()} disabled={loading} type="button">{loading?"Loading…":"Refresh"}</button></div>
  {error?<div role="alert">{error}</div>:loading&&!row?<div>Checking readiness…</div>:!row?<div>No readiness record located.</div>:<div style={{marginTop:6}}>OHV certificate: <strong>{ohv}</strong><div>MPWR paperwork: <strong>{row.mpwr_document_expected_count===null?"Unknown":String(row.mpwr_document_received_count??0)+" / "+String(row.mpwr_document_expected_count)}</strong></div></div>}
  <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}><button type="button" onClick={()=>setExpanded(!expanded)}>{expanded?"Hide Documents":"View Documents"}</button><a target="_blank" rel="noreferrer" href={destination}>Open Full Readiness ↗</a></div>
  {expanded?<div style={{padding:9,marginTop:8,background:"#f4f6f8",borderRadius:6}}><strong>Completed OHV Certificates</strong>{certificates.length?certificates.map((doc,i)=><div key={doc.readinessId+"-"+i} style={{padding:"6px 0"}}>{doc.driverName||"Driver"} — {doc.filename} {doc.viewUrl?<a href={doc.viewUrl} target="_blank" rel="noreferrer">View ↗</a>:"Preview unavailable"}</div>):<p>No uploaded OHV certificate available.</p>}<div style={{marginTop:8}}>Signed waivers and other paperwork: <a href={destination} target="_blank" rel="noreferrer">View in Readiness ↗</a></div></div>:null}
 </div>;
}
