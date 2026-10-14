"use client";
import {useEffect,useRef,useState} from "react";
import CancellationAgreementPanel from "./CancellationAgreementPanel";
type Candidate={readiness_id:string;confirmation_code:string};
type Row=Candidate&{customer_name:string;customer_phone:string|null;customer_email:string|null;product_display_name:string};
export default function CancellationAutoPopup(){
 const started=useRef(new Date().toISOString());
 const seen=useRef(new Set<string>());
 const [active,setActive]=useState<Row|null>(null);
 useEffect(()=>{
  let dead=false,working=false;
  async function check(){
   if(dead||working||document.visibilityState!=="visible")return;
   working=true;
   try{
    const r=await fetch("/api/cancellation-popup-candidates?since="+encodeURIComponent(started.current),{cache:"no-store"});
    if(!r.ok)return;
    const data=await r.json() as {candidates?:Candidate[]};
    for(const c of data.candidates||[]){
     if(seen.current.has(c.readiness_id))continue;
     seen.current.add(c.readiness_id);
     const status=await fetch("/api/cancellation-acknowledgement?readinessId="+encodeURIComponent(c.readiness_id),{cache:"no-store"});
     if(!status.ok)continue;
     const st=await status.json();
     if(st.agreement&&["sent","opened","accepted"].includes(st.agreement.status))continue;
     const details=await fetch("/api/cancellation-popup-detail?confirmation="+encodeURIComponent(c.confirmation_code),{cache:"no-store"});
     if(!details.ok)continue;
     const row=await details.json() as Row;
     if(!dead)setActive(current=>current||row);
    }
   }catch{}finally{working=false}
  }
  void check();const timer=window.setInterval(()=>void check(),3000);
  document.addEventListener("visibilitychange",check);
  return()=>{dead=true;window.clearInterval(timer);document.removeEventListener("visibilitychange",check)}
 },[]);
 return active?<CancellationAgreementPanel key={active.readiness_id} row={active} autoOpen showLauncher={false} dismissWhenHandledElsewhere onPopupClose={()=>setActive(null)}/>:null;
}
