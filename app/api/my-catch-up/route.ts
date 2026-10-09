import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeamProfile } from "../../../lib/team-auth";
const URL_BASE=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/,"");
const KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";
type Row=Record<string,any>;
async function read(token:string,table:string,params:Record<string,string>):Promise<Row[]>{
 const u=new URL(URL_BASE+"/rest/v1/"+table);
 for(const [key,val] of Object.entries(params))u.searchParams.set(key,val);
 const res=await fetch(u,{headers:{apikey:KEY,Authorization:"Bearer "+token},cache:"no-store"});
 if(!res.ok)throw new Error(table+" could not be read ("+res.status+")");
 return await res.json();
}
export async function GET(req:NextRequest){
 const token=req.cookies.get("epic_access_token")?.value;
 const user=await getAuthenticatedTeamProfile(token);
 if(!token||!user||user.role==="workstation")return NextResponse.json({error:"Employee login required"},{status:401});
 const since=new Date(Date.now()-14*86400000).toISOString();
 try{
   const assignments=await read(token,"sales_opportunity_assignment_history",{assigned_profile_id:"eq."+user.id,select:"opportunity_id,assigned_at,unassigned_at",order:"assigned_at.desc",limit:"500"});
   const ownedIds=[...new Set(assignments.map(a=>a.opportunity_id))];
   if(!ownedIds.length)return NextResponse.json({items:[],profileName:user.display_name,lookbackDays:14});
   const ids=ownedIds.slice(0,150);
   const byIds=(table:string,select:string,order:string,limit="500")=>read(token,table,{opportunity_id:"in.("+ids.join(",")+")",select,order,limit});
   const [leads,notes,states,draftLinks,workflows]=await Promise.all([
      read(token,"sales_opportunities",{id:"in.("+ids.join(",")+")",select:"id,customer_name,status,shopping_last_activity_at,claimed_by_profile_id,claimed_by_name,booked_at,matched_booking_confirmation_code,matched_booking_trip_id,closed_at,closed_by_profile_id,closed_by_name",limit:"150"}),
      byIds("sales_opportunity_notes","id,opportunity_id,author_profile_id,author_name,note_text,created_at","created_at.desc"),
      byIds("sales_opportunity_status_history","id,opportunity_id,changed_by_profile_id,changed_by_name,from_status,to_status,changed_at","changed_at.desc"),
      byIds("sales_opportunity_drafts","opportunity_id,draft_id,created_at","created_at.desc"),
      byIds("sales_lead_call_workflows","id,opportunity_id,rep_profile_id,rep_name,outcome_code,created_at","created_at.desc")
   ]);
   const draftIds=[...new Set(draftLinks.map(d=>d.draft_id))].slice(0,300);
   const drafts=draftIds.length?await read(token,"sales_drafts",{id:"in.("+draftIds.join(",")+")",select:"id,confirmation_code,first_seen_at,tripworks_created_at,created_by_user_id,created_by_name,converted_at,value_cents,experience_name",limit:"300"}):[];
   const draftMap=new Map(drafts.map(d=>[d.id,d]));
   const leadMap=new Map(leads.map(l=>[l.id,l]));
   const ownedAt=(id:string,at:string)=>assignments.some(a=>a.opportunity_id===id&&a.assigned_at<=at&&(!a.unassigned_at||a.unassigned_at>=at));
   const items:Array<{id:string;opportunityId:string;name:string;kind:string;description:string;at:string;needsAttention:boolean;source:string}>=[];
   const push=(id:string,kind:string,description:string,at:string|null,unique:string,needsAttention=false)=>{
     const lead=leadMap.get(id);
     if(!lead||!at||at<since||!ownedAt(id,at))return;
     items.push({id:unique,opportunityId:id,name:lead.customer_name||"Unknown customer",kind,description,at,needsAttention,source:"C360"});
   };
   for(const n of notes){if(n.author_profile_id===user.id)continue;push(n.opportunity_id,"note",(n.author_name||"A colleague")+" added a note: "+String(n.note_text||"").slice(0,110),n.created_at,"note:"+n.id);}
   for(const h of states){if(h.changed_by_profile_id===user.id)continue;push(h.opportunity_id,"status","Lead changed to "+h.to_status+(h.changed_by_name?" by "+h.changed_by_name:""),h.changed_at,"status:"+h.id);}
   for(const w of workflows){if(w.rep_profile_id===user.id)continue;push(w.opportunity_id,"handled",(w.rep_name||"A teammate")+" recorded a sales follow-up"+(w.outcome_code?": "+w.outcome_code:""),w.created_at,"workflow:"+w.id);}
   for(const link of draftLinks){
      const d=draftMap.get(link.draft_id);if(!d)continue;
      const self=d.created_by_user_id!=null&&user.tripworks_user_id!=null&&String(d.created_by_user_id)===String(user.tripworks_user_id);
      if(self||(!d.created_by_user_id&&d.created_by_name===user.display_name))continue;
      const born=d.tripworks_created_at||d.first_seen_at||link.created_at;
      // Only genuinely new drafts after an assignment, not a mere updated timestamp.
      push(link.opportunity_id,"shopped","Customer shopped again: "+(d.experience_name||"new draft"),born,"draft:"+d.id,false);
      if(d.converted_at)push(link.opportunity_id,"booked","Draft became a booking"+(d.value_cents!=null?" · "+new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(d.value_cents)/100):""),d.converted_at,"converted:"+d.id);
   }
   items.sort((a,b)=>b.at.localeCompare(a.at));
   return NextResponse.json({items:items.slice(0,250),profileName:user.display_name,lookbackDays:14});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Catch-Up unavailable",items:[]},{status:500});}
}
