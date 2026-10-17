import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeamProfile } from "../../../../lib/team-auth";

const url=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/,"");
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";
async function authorized(request:NextRequest){
 const token=request.cookies.get("epic_access_token")?.value;
 const profile=await getAuthenticatedTeamProfile(token);
 return token&&profile&&profile.role!=="workstation"?token:null;
}
async function rpc(token:string,fn:string,body:unknown){
 const response=await fetch(url+"/rest/v1/rpc/"+fn,{method:"POST",cache:"no-store",headers:{"apikey":anonKey,"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(body)});
 if(!response.ok)throw new Error("Identity review service unavailable ("+response.status+").");
 return response.json();
}
export async function GET(request:NextRequest){
 const token=await authorized(request);
 if(!token)return NextResponse.json({error:"Employee login required."},{status:401});
 const p=request.nextUrl.searchParams;
 const name=(p.get("name")||"").trim();
 if(name.length<3||name.length>120)return NextResponse.json({matches:[]});
 try{
  const rows=await rpc(token,"c360_employee_match_suggestions",{p_name:name,p_phone:p.get("phone")||null,p_email:p.get("email")||null,p_source_type:p.get("source_type")||null,p_source_key:p.get("source_key")||null});
  return NextResponse.json({matches:Array.isArray(rows)?rows:[]},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Match lookup unavailable."},{status:502});}
}
export async function POST(request:NextRequest){
 const token=await authorized(request);
 if(!token)return NextResponse.json({error:"Employee login required."},{status:401});
 try{
  const b=await request.json();
  const types=["sales_opportunity","sales_draft","call","tripworks_customer"];
  if(!types.includes(b.left_type)||!types.includes(b.right_type)||!["confirmed","rejected"].includes(b.decision)||typeof b.left_key!=="string"||typeof b.right_key!=="string"||!b.left_key||!b.right_key||b.left_key.length>120||b.right_key.length>120)return NextResponse.json({error:"Invalid match review."},{status:400});
  await rpc(token,"c360_employee_record_identity_review",{p_left_type:b.left_type,p_left_key:b.left_key,p_right_type:b.right_type,p_right_key:b.right_key,p_decision:b.decision});
  return NextResponse.json({ok:true,recorded:true,history_linked:false},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Match review unavailable."},{status:502});}
}
