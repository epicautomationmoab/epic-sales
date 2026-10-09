"use client";
import {useEffect,useMemo,useState} from "react";
import Customer360Modal from "../customer-360/Customer360Modal";
type Item={id:string;opportunityId:string;name:string;kind:string;description:string;at:string;dismissed:boolean;needsAttention?:boolean};
export default function CatchUpFeed({profileId,profileName}:{profileId:string;profileName:string}){
 const accent=profileName==="Jennifer Johnson"?"#009C9B":profileName==="Lonnie Laidman"?"#7c3aed":"#7c3aed";
 const accentDark=profileName==="Jennifer Johnson"?"#00777A":"#6949a5";
 const [items,setItems]=useState<Item[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true),[tab,setTab]=useState<"new"|"dismissed">("new");
 const [hidden,setHidden]=useState<string[]>([]);
 const [openOpportunity,setOpenOpportunity]=useState<string|null>(null);
 const key="epic-catchup-preview-dismissed-"+profileId;
 useEffect(()=>{fetch("/api/my-catch-up",{cache:"no-store"}).then(async r=>{const p=await r.json();if(!r.ok)throw Error(p.error||"Unable to load activity");setItems(p.items||[]);setHidden((p.items||[]).filter((i:Item)=>i.dismissed).map((i:Item)=>i.id))}).catch(e=>setError(String(e.message||e))).finally(()=>setLoading(false))},[key]);
 const hiddenSet=useMemo(()=>new Set(hidden),[hidden]);
 async function update(keys:string[],dismissed:boolean){try{for(const event_key of keys){const r=await fetch("/api/my-catch-up",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event_key,dismissed})});if(!r.ok)throw new Error((await r.json()).error||"Failed to save dismissal");}setHidden(old=>dismissed?[...new Set([...old,...keys])]:old.filter(x=>!keys.includes(x)));}catch(e){setError(e instanceof Error?e.message:"Could not save dismissal");}}
 const visible=items.filter(i=>tab==="new"?!hiddenSet.has(i.id):hiddenSet.has(i.id));
 return <div style={{marginTop:24}}>
 <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap",marginBottom:17}}>
  <button onClick={()=>setTab("new")} style={{cursor:"pointer",padding:"10px 17px",borderRadius:20,border:"1px solid #dcd9e4",background:tab==="new"?accent:"white",color:tab==="new"?"white":"#424151",fontWeight:700}}>To review ({items.filter(i=>!hiddenSet.has(i.id)).length})</button>
  <button onClick={()=>setTab("dismissed")} style={{cursor:"pointer",padding:"10px 17px",borderRadius:20,border:"1px solid #dcd9e4",background:tab==="dismissed"?accent:"white",color:tab==="dismissed"?"white":"#424151",fontWeight:700}}>Dismissed ({items.filter(i=>hiddenSet.has(i.id)).length})</button>
  {tab==="new"&&visible.length>0?<button onClick={()=>update(visible.map(i=>i.id),true)} style={{marginLeft:"auto",padding:"9px 14px",borderRadius:8,border:"1px solid #dedbe4",background:"white",cursor:"pointer"}}>Dismiss all</button>:null}
 </div>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:20}}>
 {[[String(items.length),"Recorded updates"],[String(items.filter(i=>!hiddenSet.has(i.id)).length),"To review"],[String(items.filter(i=>i.kind==="booked").length),"Bookings"],[String(items.filter(i=>i.kind==="shopped").length),"New shopping"]].map(([n,label])=><div key={label} style={{padding:18,background:"white",border:"1px solid #e3e5eb",borderRadius:11}}><strong style={{fontSize:27,color:accentDark}}>{n}</strong><div style={{fontSize:12,color:"#687180",marginTop:3}}>{label}</div></div>)}
 </div>
 {loading?<p>Loading activity…</p>:error?<div role="alert" style={{background:"#fff1ee",padding:18,borderRadius:10}}>Unable to load real Catch-Up activity: {error}</div>:visible.length===0?<div style={{padding:30,textAlign:"center",background:"white",borderRadius:12,border:"1px solid #e6e7ee"}}><strong>{tab==="new"?"All caught up!":"Nothing dismissed yet."}</strong><p style={{color:"#697180"}}>{tab==="new"?"No undismissed activity in the last 14 days.":"Dismissed items can be restored below when available."}</p></div>:<div style={{background:"white",border:"1px solid #e1e3e9",borderRadius:13,overflow:"hidden"}}>{visible.map(i=><div key={i.id} style={{padding:20,borderBottom:"1px solid #edeef2",display:"flex",gap:14,alignItems:"start",flexWrap:"wrap"}}><div style={{flex:1,minWidth:230}}><div style={{fontWeight:800}}>{i.name} <span style={{fontSize:11,background:i.kind==="booked"?"#e6f6ee":"#f0eafb",color:i.kind==="booked"?"#16724c":"#7950a5",padding:"4px 8px",borderRadius:20,marginLeft:6}}>{i.kind==="shopped"?"Shopped again":i.kind==="booked"?"Booked":i.kind}</span></div><p style={{margin:"8px 0",fontSize:14,lineHeight:1.5}}>{i.description}</p><small style={{color:"#7a8190"}}>{new Date(i.at).toLocaleString()}</small></div><div style={{display:"flex",gap:8}}><button type="button" onClick={()=>setOpenOpportunity(i.opportunityId)} style={{padding:"9px 11px",border:"1px solid #ddd",borderRadius:8,background:"white",cursor:"pointer",color:accentDark,fontSize:12}}>Open C360</button><button style={{padding:"9px 12px",border:"1px solid #ddd",borderRadius:8,background:"white",cursor:"pointer"}} onClick={()=>update([i.id],tab==="new")}>{tab==="new"?"Dismiss":"Restore"}</button></div></div>)}</div>}
 <p style={{color:"#828898",fontSize:12,marginTop:16}}>Preview: reads real C360 data from the last 14 days. Dismissals are saved securely per employee and synchronized across devices. C360 records are never deleted.</p>
 {openOpportunity?<Customer360Modal open={true} onClose={()=>setOpenOpportunity(null)} opportunityId={openOpportunity}/>:null}
 </div>;
}
