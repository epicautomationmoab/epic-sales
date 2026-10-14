import {NextRequest,NextResponse} from "next/server";
import {getAuthenticatedTeamProfile} from "../../../lib/team-auth";
export const dynamic="force-dynamic";
const BASE=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co").replace(/\\/+$/,"");
const KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"";
async function rpc(token:string,name:string,body:object){const r=await fetch(BASE+"/rest/v1/rpc/"+name,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"});if(!r.ok)throw Error("Lookup failed");return r.json()}
export async function GET(request:NextRequest){
 const token=request.cookies.get("epic_access_token")?.value;
 const profile=await getAuthenticatedTeamProfile(token);
 if(!profile||!token||!profile.tripworks_user_id||profile.role==="workstation")return NextResponse.json({candidates:[]});
 const since=request.nextUrl.searchParams.get("since")||new Date(Date.now()-30000).toISOString();
 const start=new Date(since);if(isNaN(start.getTime()))return NextResponse.json({error:"Invalid date"},{status:400});
 const floor=new Date(Math.max(start.getTime(),Date.now()-30*60000)).toISOString();
 const url=BASE+"/rest/v1/operational_reservations?"+new URLSearchParams({select:"confirmation_code,latest_payload,trip_payload",reserved_at:"gte."+floor,limit:"250"});
 try{
 const r=await fetch(url,{headers:{apikey:KEY,Authorization:"Bearer "+token},cache:"no-store"});
 if(!r.ok)throw Error("Reservations unavailable");
 const rows=await r.json() as Array<{confirmation_code:string;latest_payload?:{created_by_user_avatar?:{id?:number|string}};trip_payload?:{created_by_user_avatar?:{id?:number|string}}}>;
 const confirmations=[...new Set(rows.filter(x=>Number((x.latest_payload||x.trip_payload)?.created_by_user_avatar?.id)===profile.tripworks_user_id).map(x=>x.confirmation_code).filter(Boolean))];
 if(!confirmations.length)return NextResponse.json({candidates:[]});
 const results=await Promise.all(confirmations.map(code=>rpc(token,"get_epic_c360_readiness_docs",{p_confirmation:code}).catch(()=>null)));
 const candidates=results.flatMap((v,i)=>{const d=v?.documents?.[0];return d?.readinessId?[{readiness_id:d.readinessId,confirmation_code:confirmations[i]}]:[]});
 return NextResponse.json({candidates},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({candidates:[]},{headers:{"Cache-Control":"no-store"}})}
}
