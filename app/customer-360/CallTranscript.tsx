"use client";

import { useState } from "react";

type TranscriptTurn={speaker:"Agent"|"Caller"|"Unknown";text:string};

function chunkReadable(text:string,maxWords=34){
  const words=text.trim().split(/\s+/).filter(Boolean);
  if(words.length<=maxWords)return [text.trim()];
  const chunks:string[]=[];
  let current:string[]=[];
  for(const word of words){
    current.push(word);
    const lower=word.toLowerCase().replace(/[^a-z']/g,"");
    const naturalBreak=current.length>=20&&["okay","awesome","yeah","yep","so"].includes(lower);
    if(current.length>=maxWords||naturalBreak){
      chunks.push(current.join(" "));
      current=[];
    }
  }
  if(current.length)chunks.push(current.join(" "));
  return chunks;
}

function parseTranscript(transcript:string):TranscriptTurn[]{
  const parts=transcript.split(/\b(Agent|Caller):\s*/g).filter(Boolean);
  const turns:TranscriptTurn[]=[];
  let speaker:TranscriptTurn["speaker"]="Unknown";
  for(const part of parts){
    if(part==="Agent"||part==="Caller"){speaker=part;continue;}
    const text=part.trim();
    if(text)turns.push({speaker,text});
  }
  if(turns.length&&turns.some(turn=>turn.speaker!=="Unknown"))return turns;
  return chunkReadable(transcript).map(text=>({speaker:"Unknown" as const,text}));
}

export default function CallTranscript({transcript}:{transcript:string}){
  const turns=parseTranscript(transcript);
  const[open,setOpen]=useState(false);
  return <div style={{marginTop:9}}>
    <button
      type="button"
      onClick={()=>setOpen(value=>!value)}
      aria-expanded={open}
      style={{cursor:"pointer",fontWeight:800,color:"#184f9d",display:"inline-block",border:"1px solid #cad6e4",background:"#fff",borderRadius:8,padding:"7px 10px",fontSize:12}}
    >
      {open?"Hide Transcript":"View Transcript"}
    </button>
    {open?<div style={{marginTop:9,padding:14,border:"1px solid #d7e1ec",borderRadius:10,background:"#f7faff",display:"grid",gap:10,fontSize:13,color:"#253141"}}>
      {turns.map((turn,index)=><div key={index} style={{display:"grid",gridTemplateColumns:"72px minmax(0,1fr)",gap:10,alignItems:"start",paddingBottom:index<turns.length-1?8:0,borderBottom:index<turns.length-1?"1px solid #e7edf4":"none"}}>
        <div style={{fontWeight:900,fontSize:11,textTransform:"uppercase",letterSpacing:".05em",paddingTop:2,color:turn.speaker==="Agent"?"#e4511d":turn.speaker==="Caller"?"#1557b0":"#667085"}}>
          {turn.speaker==="Unknown"?(index===0?"Transcript":""):turn.speaker}
        </div>
        <div style={{lineHeight:1.65,whiteSpace:"pre-wrap",maxWidth:"92ch"}}>{turn.text}</div>
      </div>)}
    </div>:null}
  </div>;
}
