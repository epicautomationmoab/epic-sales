"use client";

import { useMemo, useState } from "react";
import type { SalesLead } from "./LeadsClient";

type Props={
  lead:SalesLead;
  profileName:string;
  onClose:()=>void;
  onOpenIntroduction:()=>void;
  onOpenCustomer360:()=>void;
};

type ObjectionCode=
  |"price_value"|"activity_choice"|"vehicle_choice"|"difficulty_safety"|"dates_timing"
  |"group_deciding"|"competitor"|"trip_not_final"|"itinerary_help"|"researching"|"other";

const objectionOptions:Array<{code:ObjectionCode;label:string;prompt:string;questions:string[]}>=[
  {code:"price_value",label:"Price / Value",prompt:"Find out whether this is overall budget or a value comparison before answering.",questions:["Is it the overall trip budget, or are you comparing us with another option?","What are you comparing between the choices?","What matters most to you besides price?"]},
  {code:"activity_choice",label:"Which Activity?",prompt:"Help them choose based on the experience they want, not just the activity name.",questions:["What kind of experience are you hoping for: scenery, technical driving, or a mix?","How much time do you want to spend on trail?","Is this your first time off-roading in Moab?"]},
  {code:"vehicle_choice",label:"Which Vehicle?",prompt:"Match the vehicle to group size, comfort, weather protection, and desired driving experience.",questions:["How many people are riding together?","Is comfort/weather protection important?","Are you looking for the most capable drive or the easiest all-day experience?"]},
  {code:"difficulty_safety",label:"Difficulty / Safety",prompt:"Understand who is nervous and what specifically concerns them before recommending an experience.",questions:["Is the concern from the driver or a passenger?","Any first-time off-road drivers?","Is it heights, steep terrain, technical driving, or something else?"]},
  {code:"dates_timing",label:"Dates / Timing",prompt:"Solve the schedule first. A great recommendation does not help if it will not fit their trip.",questions:["What other plans are already fixed during your visit?","How much time can you comfortably allow?","Are your dates firm or still flexible?"]},
  {code:"group_deciding",label:"Group Still Deciding",prompt:"Find the real hesitation inside the group.",questions:["What are the other people in your group unsure about?","Is anyone concerned about difficulty, price, or time?","Who is making the final decision?"]},
  {code:"competitor",label:"Comparing Companies",prompt:"Ask what they are comparing so you can explain the relevant Epic difference.",questions:["What are you comparing between the companies?","Is the biggest difference price, vehicle, trail access, protection, or service?","What would make one option clearly better for you?"]},
  {code:"trip_not_final",label:"Trip Not Finalized",prompt:"Help them anchor the Epic piece without pressuring unfinished travel plans.",questions:["What part of the trip is still unsettled?","Do you know which days you will be in Moab?","Would it help if we mapped this around the rest of your itinerary?"]},
  {code:"itinerary_help",label:"Needs Itinerary Help",prompt:"Use Epic's local knowledge to make the whole Moab plan easier.",questions:["How many days will you be in Moab?","What else do you definitely want to do while you are here?","Would you like me to help place this on the best day of your trip?"]},
  {code:"researching",label:"Just Researching",prompt:"Learn what information would actually move them toward a decision.",questions:["What are you still trying to figure out?","What would be most useful for me to send you?","When do you expect to make your decision?"]},
  {code:"other",label:"Something Else",prompt:"Listen first, then summarize the concern back to them before trying to solve it.",questions:["Tell me a little more about what is holding you back.","What would need to be true for this to feel like the right choice?"]},
];

const outcomes=[
  ["booked","Booked on the call"],
  ["quote","Sending quote"],
  ["activity_info","Sending activity information"],
  ["group_discussion","Customer will discuss with group"],
  ["follow_up","Follow up on a specific date"],
  ["researching","Not ready / researching"],
  ["lost","Lost"],
  ["do_not_contact","Do not contact"],
] as const;

function fmtDate(v:string|null){if(!v)return"—";const d=new Date(v.length===10?`${v}T12:00:00`:v);return Number.isNaN(d.getTime())?v:d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});}
const money=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});

export default function LeadWorkModal({lead,profileName,onClose,onOpenIntroduction,onOpenCustomer360}:Props){
  const[objection,setObjection]=useState<ObjectionCode|null>(null);
  const[detail,setDetail]=useState("");
  const[resolution,setResolution]=useState("");
  const[outcome,setOutcome]=useState("");
  const[nextAction,setNextAction]=useState("");
  const[followUp,setFollowUp]=useState("");
  const[saving,setSaving]=useState(false);
  const[status,setStatus]=useState("");
  const selected=useMemo(()=>objectionOptions.find(o=>o.code===objection)||null,[objection]);
  const draft=lead.drafts?.[0];
  const interest=lead.interest_label||draft?.experience_name||"Not specified";
  const phoneHref=lead.phone_e164?`tel:${lead.phone_e164}`:null;

  async function save(){
    if(!objection||!outcome){setStatus("Choose the main objection and the call outcome first.");return;}
    setSaving(true);setStatus("");
    try{
      const r=await fetch("/api/leads/call-workflow",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        opportunity_id:lead.id,
        objection_code:objection,
        objection_detail:detail.trim()||null,
        resolution_note:resolution.trim()||null,
        outcome_code:outcome,
        next_action:nextAction.trim()||null,
        follow_up_at:followUp?new Date(followUp).toISOString():null
      })});
      const p=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(p?.error||"Unable to save call.");
      setStatus("Call saved to the lead.");
    }catch(e){setStatus(e instanceof Error?e.message:"Unable to save call.");}
    finally{setSaving(false);}
  }

  return <div style={{position:"fixed",inset:0,zIndex:1200,background:"rgba(15,23,42,.5)",display:"grid",placeItems:"center",padding:20,overflowY:"auto"}} onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section role="dialog" aria-modal="true" aria-label="Work lead" style={{width:"min(980px,100%)",maxHeight:"94vh",overflowY:"auto",background:"#f7f8fa",borderRadius:18,boxShadow:"0 24px 80px rgba(0,0,0,.28)"}}>
      <header style={{background:"#171717",color:"#fff",padding:"22px 26px",display:"flex",justifyContent:"space-between",gap:18,alignItems:"flex-start"}}>
        <div><div style={{fontSize:12,fontWeight:900,letterSpacing:".12em",color:"#ef6b55"}}>WORK LEAD</div><h2 style={{margin:"5px 0 4px",fontSize:28}}>{lead.customer_name||"Unnamed lead"}</h2><div style={{opacity:.78,fontSize:14}}>{[lead.phone_e164,lead.email].filter(Boolean).join(" · ")}</div></div>
        <button onClick={onClose} aria-label="Close" style={{border:0,background:"transparent",color:"#fff",fontSize:30,cursor:"pointer"}}>×</button>
      </header>

      <div style={{padding:24,display:"grid",gap:18}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}>
          {[
            ["What they shopped",interest],
            ["Visit",lead.activity_window_start?`${fmtDate(lead.activity_window_start)}${lead.activity_window_end&&lead.activity_window_end!==lead.activity_window_start?` – ${fmtDate(lead.activity_window_end)}`:""}`:"No dates yet"],
            ["Lead value",lead.lead_value_cents!=null?money.format(lead.lead_value_cents/100):"—"],
            ["Drafts",String(lead.draft_count||0)],
            ["Last shopped",lead.shopping_last_activity_at?new Date(lead.shopping_last_activity_at).toLocaleString():"—"],
            ["Rep",profileName],
          ].map(([label,value])=><div key={label} style={{background:"#fff",border:"1px solid #e2e7ec",borderRadius:12,padding:"14px 16px"}}><div style={{fontSize:11,fontWeight:900,textTransform:"uppercase",letterSpacing:".07em",opacity:.55}}>{label}</div><div style={{marginTop:5,fontWeight:800}}>{value}</div></div>)}
        </div>

        <section style={{background:"#fff",border:"1px solid #e2e7ec",borderRadius:14,padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap"}}>
            <div><div style={{fontSize:12,fontWeight:900,letterSpacing:".08em",color:"#b9432b"}}>START WITH THE CALL</div><h3 style={{margin:"4px 0 3px",fontSize:22}}>Find out what actually stopped them.</h3><div style={{color:"#606975",lineHeight:1.5}}>Do not start by pitching. Ask the question, listen, then solve the real objection.</div></div>
            {phoneHref?<a href={phoneHref} style={{background:"#c6492d",color:"#fff",padding:"13px 18px",borderRadius:9,fontWeight:900,textDecoration:"none"}}>Call Customer</a>:null}
          </div>
          <div style={{marginTop:16,background:"#f6f3ee",borderRadius:12,padding:"16px 18px",fontSize:18,lineHeight:1.55}}>
            <strong>Opening:</strong> “Hi {lead.customer_name?lead.customer_name.split(" ")[0]:"there"}, this is {profileName.split(" ")[0]} with Epic 4X4 Adventures. I saw you were looking at {interest} for your trip to Moab and wanted to see if I could help with your plans.”
            <div style={{marginTop:12,fontWeight:900,color:"#171717"}}>“Can I ask what stopped you from booking?”</div>
          </div>
        </section>

        <section style={{background:"#fff",border:"1px solid #e2e7ec",borderRadius:14,padding:20}}>
          <h3 style={{margin:"0 0 12px"}}>What stopped them?</h3>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {objectionOptions.map(o=><button key={o.code} type="button" onClick={()=>setObjection(o.code)} style={{border:objection===o.code?"2px solid #c6492d":"1px solid #cfd6dc",background:objection===o.code?"#fff2ee":"#fff",borderRadius:999,padding:"9px 12px",fontWeight:800,cursor:"pointer"}}>{o.label}</button>)}
          </div>
          {selected?<div style={{marginTop:16,display:"grid",gap:12}}>
            <div style={{background:"#fff7ed",borderLeft:"4px solid #c6492d",padding:"13px 15px",lineHeight:1.5}}><strong>Rep guidance:</strong> {selected.prompt}</div>
            <div><strong>Ask next:</strong><ul style={{margin:"8px 0 0",paddingLeft:20,lineHeight:1.7}}>{selected.questions.map(q=><li key={q}>{q}</li>)}</ul></div>
          </div>:null}
          <label style={{display:"grid",gap:6,marginTop:16,fontWeight:800,fontSize:13}}>What did they say?<textarea rows={3} value={detail} onChange={e=>setDetail(e.target.value)} placeholder="Capture the objection in the guest’s own words…" style={{border:"1px solid #d6dde3",borderRadius:9,padding:11,font:"inherit",resize:"vertical"}}/></label>
          <label style={{display:"grid",gap:6,marginTop:12,fontWeight:800,fontSize:13}}>How did we address it?<textarea rows={3} value={resolution} onChange={e=>setResolution(e.target.value)} placeholder="What did you explain, recommend, or solve?" style={{border:"1px solid #d6dde3",borderRadius:9,padding:11,font:"inherit",resize:"vertical"}}/></label>
        </section>

        <section style={{background:"#fff",border:"1px solid #e2e7ec",borderRadius:14,padding:20}}>
          <h3 style={{margin:"0 0 12px"}}>What happens next?</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:8}}>
            {outcomes.map(([code,label])=><button key={code} type="button" onClick={()=>setOutcome(code)} style={{textAlign:"left",border:outcome===code?"2px solid #c6492d":"1px solid #d7dde3",background:outcome===code?"#fff2ee":"#fff",borderRadius:10,padding:"11px 12px",fontWeight:800,cursor:"pointer"}}>{label}</button>)}
          </div>
          <label style={{display:"grid",gap:6,marginTop:14,fontWeight:800,fontSize:13}}>Next action / promise<textarea rows={2} value={nextAction} onChange={e=>setNextAction(e.target.value)} placeholder="Example: Send Hell’s Revenge information and call Friday." style={{border:"1px solid #d6dde3",borderRadius:9,padding:11,font:"inherit",resize:"vertical"}}/></label>
          {outcome==="follow_up"?<label style={{display:"grid",gap:6,marginTop:12,fontWeight:800,fontSize:13}}>Follow-up date and time<input type="datetime-local" value={followUp} onChange={e=>setFollowUp(e.target.value)} style={{border:"1px solid #d6dde3",borderRadius:9,padding:11,font:"inherit"}}/></label>:null}
        </section>

        <section style={{background:"#fff",border:"1px solid #e2e7ec",borderRadius:14,padding:20}}>
          <h3 style={{margin:"0 0 4px"}}>Recommended next actions</h3>
          <div style={{fontSize:13,color:"#6b7280",marginBottom:12}}>Use email to support the conversation—not replace it.</div>
          <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
            <button type="button" onClick={onOpenIntroduction}>Preview Introduction</button>
            <button type="button" onClick={onOpenCustomer360}>Open Customer 360</button>
            <span style={{padding:"8px 10px",borderRadius:8,background:"#f6f3ee",fontSize:13,fontWeight:800}}>Activity Information templates coming next</span>
          </div>
        </section>

        {status?<div style={{padding:"11px 13px",borderRadius:10,background:status.includes("saved")?"#edf8f1":"#fff4e8",fontWeight:800}}>{status}</div>:null}
        <div style={{display:"flex",justifyContent:"flex-end",gap:9,paddingBottom:2}}><button type="button" onClick={onClose}>Close</button><button type="button" disabled={saving} onClick={()=>void save()} style={{background:"#171717",color:"#fff",border:0,borderRadius:9,padding:"11px 16px",fontWeight:900}}>{saving?"Saving…":"Save Call"}</button></div>
      </div>
    </section>
  </div>;
}
