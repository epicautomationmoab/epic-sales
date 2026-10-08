"use client";
import {useEffect,useMemo,useState} from "react";
type Note={id:string;note_text:string;author_name:string|null;created_at:string;mentions?:Array<{id:string;display_name:string;response_status?:string|null;responded_at?:string|null}>};
type Member={id:string;display_name?:string|null;name?:string|null;full_name?:string|null};
export default function InternalConversation({opportunityId}:{opportunityId:string}){
 const threadKey="opp:"+opportunityId;
 const [notes,setNotes]=useState<Note[]>([]);
 const [members,setMembers]=useState<Member[]>([]);
 const [draft,setDraft]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [status,setStatus]=useState("");
 useEffect(()=>{let live=true;async function load(){try{const r=await fetch("/api/inbox?thread_key="+encodeURIComponent(threadKey),{cache:"no-store"});const p=await r.json();if(r.ok&&live)setNotes(p.notes||[]);}catch{}}void load();const timer=window.setInterval(load,15000);return()=>{live=false;window.clearInterval(timer)}},[threadKey]);
 useEffect(()=>{let live=true;fetch("/api/inbox",{cache:"no-store"}).then(r=>r.json()).then(p=>{if(live)setMembers(p.team_members||[])}).catch(()=>{});return()=>{live=false}},[]);
 const match=draft.match(/(?:^|\s)@([\w-]*)$/);
 const candidates=useMemo(()=>match?members.filter(m=>String(m.display_name||m.full_name||m.name||"").toLowerCase().split(/\s+/).some(p=>p.startsWith(match[1].toLowerCase()))).slice(0,8):[],[draft,members,match?.[1]]);
 function tag(member:Member){const name=member.display_name||member.full_name||member.name;if(!name)return;setDraft(v=>v.replace(/(^|\s)@[\w-]*$/,(_,space:string)=>space+"@"+name+" "));}
 async function send(){if(!draft.trim())return;setBusy(true);setError("");setStatus("");try{const r=await fetch("/api/inbox",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"note",thread_key:threadKey,note_text:draft.trim()})});const p=await r.json().catch(()=>({}));if(!r.ok)throw Error(p.error||"Unable to post note");const n=await fetch("/api/inbox?thread_key="+encodeURIComponent(threadKey),{cache:"no-store"});const np=await n.json();if(n.ok)setNotes(np.notes||[]);setDraft("");setStatus("Posted to team conversation.");}catch(e){setError(e instanceof Error?e.message:"Unable to post");}finally{setBusy(false);}}
 return <section style={{border:"1px solid #dbe2ea",borderRadius:12,padding:13,background:"#fff",display:"grid",gap:10}}>
  <div><strong>Internal Team Conversation</strong><div style={{fontSize:11,color:"#627080"}}>Private to Epic employees · shared with Inbox</div></div>
  <div style={{display:"grid",gap:8,maxHeight:270,overflowY:"auto"}}>{notes.length?notes.map(n=><div key={n.id} style={{padding:"9px 10px",borderRadius:9,background:"#f5f7fa",fontSize:12}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:7}}><strong>{n.author_name||"Epic teammate"}</strong><small>{new Date(n.created_at).toLocaleString()}</small></div>
   <div style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",marginTop:5}}>{n.note_text}</div>{(n.mentions||[]).map(m=><div key={m.id} style={{fontSize:11,color:"#626f7d",marginTop:5}}>@{m.display_name}: {m.response_status==="acknowledged"?"Acknowledged":m.response_status==="dismissed"?"Dismissed":m.response_status==="legacy_read"?"Read":m.response_status?"Read":"Awaiting acknowledgment"}{m.responded_at?" · "+new Date(m.responded_at).toLocaleString():""}</div>)}
  </div>):<span style={{fontSize:12,color:"#627080"}}>No internal messages yet.</span>}</div>
  <textarea aria-label="Internal team message" rows={3} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Reply or type @ to tag a teammate…" style={{width:"100%",boxSizing:"border-box",border:"1px solid #cbd5df",borderRadius:9,padding:10,font:"inherit",fontSize:13}}/>
  {candidates.length?<div role="listbox" style={{display:"grid",border:"1px solid #dbe2ea",borderRadius:9,padding:4}}>{candidates.map(m=><button type="button" key={m.id} onClick={()=>tag(m)} style={{border:0,background:"white",textAlign:"left",padding:7,cursor:"pointer"}}>@{m.display_name||m.full_name||m.name}</button>)}</div>:null}
  <button type="button" onClick={()=>void send()} disabled={busy||!draft.trim()} style={{background:"#171717",color:"white",border:0,borderRadius:9,padding:10,cursor:"pointer"}}>{busy?"Posting…":"Post Internal Message"}</button>
  {error?<span role="alert" style={{fontSize:12,color:"#bb2525"}}>{error}</span>:null}{status?<span style={{fontSize:12,color:"#287450"}}>{status}</span>:null}
 </section>;
}
