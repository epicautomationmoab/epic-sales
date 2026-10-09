import {NextRequest,NextResponse} from "next/server";
import {getAuthenticatedTeamProfile} from "../../../lib/team-auth";
const ROOT=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/,"");
const KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";
async function call(token:string,fn:string,body:object){
 const response=await fetch(ROOT+"/rest/v1/rpc/"+fn,{method:"POST",headers:{"apikey":KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"});
 const payload=await response.json().catch(()=>null);
 if(!response.ok)throw Error(payload?.message||"Catch-Up request failed ("+response.status+")");
 return payload;
}
async function auth(request:NextRequest){
 const token=request.cookies.get("epic_access_token")?.value;
 const profile=await getAuthenticatedTeamProfile(token);
 return token&&profile&&profile.role!=="workstation"?token:null;
}
export async function GET(request:NextRequest){
 const token=await auth(request);
 if(!token)return NextResponse.json({error:"Employee login required"},{status:401});
 try {const items=await call(token,"epic_catchup_items",{});return NextResponse.json({items:Array.isArray(items)?items:[],lookbackDays:60});}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Catch-Up unavailable"},{status:500});}
}
export async function POST(request:NextRequest){
 const token=await auth(request);
 if(!token)return NextResponse.json({error:"Employee login required"},{status:401});
 const body=await request.json().catch(()=>null);
 if(typeof body?.event_key!=="string"||body.event_key.length>160||typeof body?.dismissed!=="boolean")return NextResponse.json({error:"Invalid request"},{status:400});
 try {await call(token,"epic_catchup_set_dismissed",{p_event_key:body.event_key,p_dismissed:body.dismissed});return NextResponse.json({ok:true});}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to update Catch-Up"},{status:500});}
}
