"use client";
import {useEffect,useState} from "react";
export default function ManagerView(){
const [people,setPeople]=useState<any[]>([]);
const [person,setPerson]=useState("");
const [events,setEvents]=useState<any[]>([]);
const [error,setError]=useState("");
useEffect(()=>{fetch("/api/followups?scope=members").then(r=>r.json()).then(d=>setPeople(d.members||[])).catch(()=>{})},[]);
useEffect(()=>{if(!person){setEvents([]);return}fetch("/api/my-catch-up?employee="+encodeURIComponent(person)).then(r=>r.json().then(d=>{if(!r.ok)throw Error(d.error);return d})).then(d=>{setEvents(d.items||[]);setError("")}).catch(e=>setError(String(e)))},[person]);
return <section><h2>Employee Catch-Up (Read Only)</h2><select aria-label="Employee" value={person} onChange={e=>setPerson(e.target.value)}><option value="">Select employee</option>{people.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select>{error?<p role="alert">{error}</p>:null}{person?events.map(x=><p key={x.id}>{x.name}: {x.description} — {new Date(x.at).toLocaleString()} {x.dismissed?"(reviewed)":""}</p>):null}</section>
}