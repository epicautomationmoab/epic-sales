import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedTeamProfile } from "../../lib/team-auth";
import EpicC360Sidebar from "../EpicC360Sidebar";

const examples = [
  { name:"Sarah Mitchell", state:"Needs reply", kind:"urgent", when:"Saturday · 2:14 PM", description:"Replied to your rental quote. She wants to change vehicles.", detail:"Customer replied · rental quote", initial:"SM" },
  { name:"Michael Roberts", state:"Follow up", kind:"urgent", when:"Sunday · 10:42 AM", description:"Called and left a voicemail about his upcoming tour.", detail:"New voicemail", initial:"MR" },
  { name:"Jennifer Adams", state:"Booked", kind:"done", when:"Sunday · 3:28 PM", description:"Price completed the reservation. $1,248 booked.", detail:"Handled by Price", initial:"JA" },
  { name:"David Wilson", state:"FYI", kind:"info", when:"Sunday · 11:16 AM", description:"Main St added a note with the customer's updated preferences.", detail:"New customer note", initial:"DW" },
  { name:"Amanda Collins", state:"Closed", kind:"done", when:"Saturday · 5:03 PM", description:"Another team member closed the lead with a documented resolution.", detail:"Handled by team", initial:"AC" },
  { name:"Robert Lee", state:"Lost", kind:"info", when:"Sunday · 4:15 PM", description:"Customer chose not to book. Reason added to the lead.", detail:"Lead outcome updated", initial:"RL" },
];
const palette:Record<string,{background:string;color:string}> = {
  urgent:{background:"#fff0ed",color:"#b93420"}, done:{background:"#eaf8f0",color:"#17724d"},info:{background:"#f2efff",color:"#7552aa"}
};
export default async function CatchUpPreviewPage(){
  const token=(await cookies()).get("epic_access_token")?.value;
  const profile=await getAuthenticatedTeamProfile(token);
  if(!profile)redirect("/employee-login");
  const first=(profile.display_name||"there").split(" ")[0];
  return <main style={{display:"flex",minHeight:"100vh",background:"#f5f6f8",color:"#20232c",fontFamily:"Arial,sans-serif"}}>
    <EpicC360Sidebar active="leads" profileName={profile.display_name} />
    <section style={{flex:1,minWidth:0,padding:"32px clamp(16px,4vw,52px)",maxWidth:1150,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"start",flexWrap:"wrap"}}>
        <div><div style={{letterSpacing:2,fontSize:11,fontWeight:800,color:"#8364ad"}}>EPIC C360 · MY CATCH-UP</div><h1 style={{fontSize:30,margin:"10px 0 7px"}}>Welcome back, {first}!</h1><p style={{color:"#666c79",margin:0}}>Here’s what happened with your claimed customers while you were away.</p></div>
        <a href="/leads" style={{background:"#fff",border:"1px solid #dfe0e7",borderRadius:9,padding:"11px 15px",color:"#464b56",textDecoration:"none",fontWeight:700,fontSize:13}}>← Back to Sales</a>
      </div>
      <div style={{marginTop:22,background:"#f1e9fa",border:"1px solid #e4d7f2",color:"#614480",padding:"12px 15px",borderRadius:11,fontSize:13}}><strong>Layout preview · illustrative customer data.</strong> This page does not read real customer activity or send notifications. No leads are changed.</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:13,margin:"24px 0"}}>
        {[["6","Customer updates"],["2","Need attention"],["2","Already handled"],["2","Other outcomes"]].map(([n,label],i)=><div key={label} style={{background:"#fff",borderRadius:12,border:"1px solid #e4e6ed",padding:"20px 19px",boxShadow:"0 2px 8px #22222205"}}><div style={{fontSize:30,fontWeight:800,color:i===1?"#c74435":i===2?"#16724c":"#725199"}}>{n}</div><div style={{color:"#626977",fontSize:13,marginTop:4}}>{label}</div></div>)}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}><h2 style={{fontSize:19,margin:0}}>Your claimed people</h2><span style={{fontSize:12,color:"#716b7a",background:"#fff",border:"1px solid #e1dce7",padding:"7px 11px",borderRadius:30}}>Since your last visit · concept</span></div>
      <div style={{background:"#fff",border:"1px solid #e4e6ed",borderRadius:14,overflow:"hidden"}}>
        {examples.map((item,index)=><div key={item.name} style={{display:"flex",gap:14,padding:"19px 20px",borderBottom:index===examples.length-1?"none":"1px solid #edf0f3",alignItems:"start"}}>
          <div style={{width:39,height:39,flexShrink:0,borderRadius:12,display:"grid",placeItems:"center",fontSize:12,fontWeight:800,background:"#f3ecfc",color:"#7951aa"}}>{item.initial}</div>
          <div style={{flex:1,minWidth:0}}><div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><strong style={{fontSize:15}}>{item.name}</strong><span style={{borderRadius:30,padding:"4px 9px",fontSize:11,fontWeight:800,...palette[item.kind]}}>{item.state}</span></div>
          <p style={{margin:"7px 0",color:"#404856",fontSize:14,lineHeight:1.5}}>{item.description}</p><div style={{fontSize:12,color:"#878a96"}}>{item.detail} · {item.when}</div></div>
          <span style={{fontSize:13,color:"#94899f"}}>›</span>
        </div>)}
      </div>
      <div style={{marginTop:20,background:"#fff",border:"1px solid #e4e6ed",borderRadius:12,padding:18}}><strong style={{fontSize:14}}>Important: claimed history stays included.</strong><p style={{fontSize:13,color:"#606775",lineHeight:1.6,margin:"7px 0 0"}}>When connected to live data, this view should include people claimed by the logged-in teammate during the selected period even if they subsequently became Booked, Closed, or Lost. Completed teammate actions should appear as handled—not as new work.</p></div>
    </section>
  </main>;
}
