"use client";

type Destination = {title:string;detail:string;href:string;audience:"team"|"guest"};
const destinations:Destination[]=[
 {title:"Guest Readiness",detail:"Open the full current Readiness application with its documents, payments, notices, and operational controls.",href:"https://team.myepicreservation.com/team/readiness",audience:"team"},
 {title:"Arrival Board",detail:"Open the guest-facing arrivals display: tours, rentals, visit time, directions and kiosk codes.",href:"https://team.myepicreservation.com/team/arrival-board",audience:"guest"},
 {title:"Kiosk",detail:"Open the existing guest self-service lookup and Guest Portal handoff.",href:"https://team.myepicreservation.com/kiosk",audience:"guest"},
 {title:"Tour Dispatch",detail:"Open current guide and tour-dispatch operations.",href:"https://team.myepicreservation.com/team/tour-dispatch",audience:"team"},
 {title:"Deposits On-Hold",detail:"Open Victor's existing deposit-review workflow.",href:"https://team.myepicreservation.com/team/deposits-on-hold",audience:"team"},
 {title:"Held-Over Rentals",detail:"Open the rental carryover workflow.",href:"https://team.myepicreservation.com/team/active-rentals",audience:"team"},
];
export default function OperationalLaunches(){
 return <section aria-label="Existing operations workspaces" style={{marginTop:28}}>
   <div style={{fontSize:11,letterSpacing:2,color:"#76889b"}}>EXISTING OPERATIONAL SYSTEMS</div>
   <h2 style={{fontSize:20,margin:"7px 0 6px"}}>Guest Operations</h2>
   <p style={{fontSize:13,color:"#52667c",maxWidth:720}}>These launch the real existing EpicTools functions, not a simplified replacement. You may need to sign in separately until secure cross-site access is implemented.</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:12}}>
     {destinations.map(item=><a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",color:"#22334a",background:"#fff",border:"1px solid #dfe6ef",borderRadius:12,padding:16,display:"block"}}>
       <div style={{fontSize:10,fontWeight:800,letterSpacing:1,color:item.audience==="guest"?"#905b22":"#576f8a"}}>{item.audience==="guest"?"GUEST-FACING SCREEN":"STAFF WORKSPACE"}</div>
       <div style={{fontSize:16,fontWeight:800,marginTop:8}}>{item.title} ↗</div>
       <div style={{fontSize:12,color:"#53677f",lineHeight:1.5,marginTop:8}}>{item.detail}</div>
     </a>)}
   </div>
 </section>
}
