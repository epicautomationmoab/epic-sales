import {NextRequest,NextResponse} from "next/server";
import {getAuthenticatedTeamProfile} from "../../../lib/team-auth";
const ROOT=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/,"");
const KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"";
async function rest(token:string,path:string,init?:RequestInit){
 const r=await fetch(ROOT+"/rest/v1/"+path,{...init,headers:{apikey:KEY,Authorization:"Bearer "+token,"Content-Type":"application/json",...(init?.headers||{})},cache:"no-store"});
 const p=await r.json().catch(()=>null);
 if(!r.ok)throw Error(p?.message||p?.error||"Follow-up request failed");
 return p;
}
async function auth(req:NextRequest){const token=req.cookies.get("epic_access_token")?.value;const user=await getAuthenticatedTeamProfile(token);return token&&user&&user.active&&user.role!=="workstation"?{token,user}:null;}
const err=(e:unknown)=>NextResponse.json({error:e instanceof Error?e.message:"Follow-up unavailable"},{status:500});
export async function GET(req:NextRequest){
 const a=await auth(req);if(!a)return NextResponse.json({error:"Employee login required"},{status:401});
 try{
  const supervisor=a.user.role==="admin"||a.user.role==="manager";
  const query=req.nextUrl.searchParams;
  const filters=["select=*,sales_opportunities(customer_name,status)","order=due_at.asc","limit=300"];
  if(query.get("scope")==="team"&&supervisor){}else if(query.get("opportunity_id")){filters.push("opportunity_id=eq."+encodeURIComponent(query.get("opportunity_id")!));}
  else filters.push("assigned_to_profile_id=eq."+encodeURIComponent(a.user.id));
  return NextResponse.json({items:await rest(a.token,"sales_followups?"+filters.join("&")),profile:a.user.id,supervisor});
 }catch(e){return err(e)}
}
export async function POST(req:NextRequest){
 const a=await auth(req);if(!a)return NextResponse.json({error:"Employee login required"},{status:401});
 try{
  const b=await req.json();
  if(!/^[0-9a-f-]{36}$/i.test(String(b.opportunity_id||""))||!String(b.title||"").trim()||String(b.title).length>240||!b.due_at||!Number.isFinite(Date.parse(b.due_at)))return NextResponse.json({error:"Customer, task and valid due date required"},{status:400});
  const assigned=String(b.assigned_to_profile_id||a.user.id);
  const people=await rest(a.token,"team_profiles?id=eq."+encodeURIComponent(assigned)+"&active=eq.true&select=id,role&limit=1");
  if(!people?.length||people[0].role==="workstation")return NextResponse.json({error:"Select an active employee"},{status:400});
  const opp=await rest(a.token,"sales_opportunities?id=eq."+encodeURIComponent(b.opportunity_id)+"&select=id&limit=1");
  if(!opp?.length)return NextResponse.json({error:"Customer opportunity not found"},{status:404});
  const [item]=await rest(a.token,"sales_followups",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({opportunity_id:b.opportunity_id,created_by_profile_id:a.user.id,assigned_to_profile_id:assigned,title:String(b.title).trim(),context_note:String(b.context_note||"").slice(0,3000),due_at:new Date(b.due_at).toISOString(),source:String(b.source||"c360").slice(0,80)})});
  await rest(a.token,"sales_followup_events",{method:"POST",body:JSON.stringify({followup_id:item.id,actor_profile_id:a.user.id,event_type:"created",next_due_at:item.due_at})});
  return NextResponse.json({item});
 }catch(e){return err(e)}
}
export async function PATCH(req:NextRequest){
 const a=await auth(req);if(!a)return NextResponse.json({error:"Employee login required"},{status:401});
 try{
  const b=await req.json();const id=String(b.id||"");
  if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Invalid follow-up"},{status:400});
  const found=await rest(a.token,"sales_followups?id=eq."+encodeURIComponent(id)+"&select=*&limit=1");
  if(!found?.length)return NextResponse.json({error:"Follow-up not found or not permitted"},{status:404});
  const prev=found[0];
  let patch:Record<string,unknown>={},event="",note=String(b.note||"").slice(0,3000);
  if(b.action==="complete"&&["contacted","booked","no_longer_needed"].includes(b.outcome)&&note.trim()){
   patch={status:"completed",outcome:b.outcome,completed_at:new Date().toISOString(),completed_by_profile_id:a.user.id};event="completed";
  }else if(b.action==="attempt"&&["no_answer","voicemail"].includes(b.outcome)){
   event="attempted";note=[b.outcome,note].filter(Boolean).join(": ");
  }else if(b.action==="reschedule"&&b.due_at&&Number.isFinite(Date.parse(b.due_at))){
   patch={due_at:new Date(b.due_at).toISOString(),status:"pending",outcome:null};event="rescheduled";
  }else if(b.action==="reassign"&&/^[0-9a-f-]{36}$/i.test(String(b.assigned_to_profile_id||""))){
   patch={assigned_to_profile_id:b.assigned_to_profile_id};event="reassigned";note="Reassigned to "+b.assigned_to_profile_id+". "+note;
  }else return NextResponse.json({error:"Valid action and outcome required; completion needs a note"},{status:400});
  if(Object.keys(patch).length)await rest(a.token,"sales_followups?id=eq."+encodeURIComponent(id),{method:"PATCH",body:JSON.stringify({...patch,updated_at:new Date().toISOString()})});
  await rest(a.token,"sales_followup_events",{method:"POST",body:JSON.stringify({followup_id:id,actor_profile_id:a.user.id,event_type:event,note,previous_due_at:prev.due_at,next_due_at:patch.due_at||null})});
  return NextResponse.json({ok:true});
 }catch(e){return err(e)}
}
