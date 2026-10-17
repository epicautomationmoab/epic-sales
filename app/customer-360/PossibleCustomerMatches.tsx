"use client";
import {useEffect,useState} from "react";

type Candidate={candidate_name:string;candidate_phone:string|null;candidate_email:string|null;confidence_score:number;evidence:{exact_name?:boolean;nickname_variant?:boolean;within_two_hours?:boolean;same_area_code?:boolean};source_count:number;source_records:Array<{source_type:string;source_key:string}>};
export default function PossibleCustomerMatches({name,phone,email,sourceType,sourceKey}:{name:string|null|undefined;phone:string|null|undefined;email:string|null|undefined;sourceType?:string|null;sourceKey?:string|null}){
  const [open,setOpen]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [matches,setMatches]=useState<Candidate[]>([]);
  const [reviewing,setReviewing]=useState(false);
  const [reviewMessage,setReviewMessage]=useState("");
  async function review(candidate:Candidate, decision:"confirmed"|"rejected"){
    const target=candidate.source_records?.find(r=>r.source_key&&r.source_type&&!(r.source_type===sourceType&&r.source_key===sourceKey));
    if(!sourceType||!sourceKey||!target)return;
    setReviewing(true);setReviewMessage("");
    try{
      const response=await fetch("/api/customer-360/possible-matches",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({left_type:sourceType,left_key:sourceKey,right_type:target.source_type,right_key:target.source_key,decision})});
      if(!response.ok)throw new Error("Could not save review");
      setMatches(previous=>previous.filter(m=>m!==candidate));
      setReviewMessage(decision==="confirmed"?"Same-person decision recorded. Histories are not yet linked.":"Not-the-same-person decision recorded.");
    }catch(e){setReviewMessage(e instanceof Error?e.message:"Unable to save decision.");}
    finally{setReviewing(false);}
  }
  useEffect(()=>{
    if(!open||!name)return;
    const controller=new AbortController();
    const q=new URLSearchParams({name});
    if(phone)q.set("phone",phone);
    if(email)q.set("email",email);
    setLoading(true);setError("");
    fetch("/api/customer-360/possible-matches?"+q,{signal:controller.signal,cache:"no-store"})
      .then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error||"Unable to search.");return data;})
      .then(data=>setMatches(data.matches||[]))
      .catch(e=>{if(e.name!=="AbortError")setError(e.message||"Lookup failed.");})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[open,name,phone,email]);
  if(!name||name.trim().length<3)return null;
  return <div style={{position:"relative",display:"inline-block"}}>
    <button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)} style={{border:"1px solid #cbd5e1",borderRadius:7,padding:"7px 10px",background:"#fff",color:"#334155",cursor:"pointer",fontSize:12,fontWeight:700}}>Possible matches ▾</button>
    {open?<div role="region" aria-label="Possible customer matches" style={{position:"absolute",zIndex:40,top:"calc(100% + 6px)",right:0,width:"min(380px,80vw)",maxHeight:360,overflowY:"auto",padding:14,background:"#fff",color:"#172033",border:"1px solid #cbd5e1",borderRadius:10,boxShadow:"0 12px 28px #0002",fontSize:13}}>
      <div style={{fontWeight:800,marginBottom:6}}>Possible customer matches</div>
      <p style={{margin:"0 0 10px",color:"#64748b"}}>Suggestions only. No customer records are merged.</p>
      {reviewMessage?<p role="status">{reviewMessage}</p>:null}
      {loading?<p>Searching…</p>:error?<p role="alert">{error}</p>:matches.length===0?<p>No suggested matches found.</p>:matches.map((m,i)=><div key={i} style={{padding:"10px 0",borderTop:"1px solid #e2e8f0"}}>
        <strong>{m.candidate_name||"Unnamed customer"}</strong>
        <div style={{fontSize:12,color:"#475569"}}>{[m.candidate_phone,m.candidate_email].filter(Boolean).join(" · ")||"No contact method"}</div>
        <div style={{marginTop:4,fontSize:11,color:"#64748b"}}>{[m.evidence?.exact_name?"Same name":null,m.evidence?.nickname_variant?"Name variation":null,m.evidence?.same_area_code?"Same area code":null,m.evidence?.within_two_hours?"Recent activity":null].filter(Boolean).join(" · ")}{m.source_count>1?` · ${m.source_count} records`:""}</div>
        {sourceType&&sourceKey&&m.source_records?.length?<div style={{display:"flex",gap:7,marginTop:8}}><button type="button" disabled={reviewing} onClick={()=>void review(m,"confirmed")}>Same person (record)</button><button type="button" disabled={reviewing} onClick={()=>void review(m,"rejected")}>Not same person</button></div>:null}
      </div>)}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}><button type="button" onClick={()=>setOpen(false)} style={{background:"#fff",border:"1px solid #cbd5e1",borderRadius:6,padding:"5px 10px",cursor:"pointer"}}>Close</button></div>
    </div>:null}
  </div>;
}
