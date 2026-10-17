import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeamProfile } from "../../../lib/team-auth";

const url=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/,"");
export async function GET(request:NextRequest){
  const token=request.cookies.get("epic_access_token")?.value;
  const profile=await getAuthenticatedTeamProfile(token);
  if(!token||!profile||profile.role==="workstation")return NextResponse.json({error:"Employee login required."},{status:401});
  const name=(request.nextUrl.searchParams.get("name")||"").trim();
  if(name.length<3||name.length>120)return NextResponse.json({matches:[]});
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY;
  if(!key)return NextResponse.json({error:"Candidate review is not configured on this deployment."},{status:503});
  const phone=(request.nextUrl.searchParams.get("phone")||"").slice(0,40);
  const email=(request.nextUrl.searchParams.get("email")||"").slice(0,200);
  try{
    const result=await fetch(url+"/rest/v1/rpc/c360_grouped_possible_identity_matches",{
      method:"POST",cache:"no-store",
      headers:{"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json"},
      body:JSON.stringify({p_name:name,p_phone:phone||null,p_email:email||null,p_limit:8})
    });
    if(!result.ok)throw new Error("Match lookup unavailable ("+result.status+").");
    const rows=await result.json();
    const digits=(s:string)=>s.replace(/\D/g,"").slice(-10);
    // Hide groups known by the exact contact pair; they are handled by automatic matching.
    const matches=(Array.isArray(rows)?rows:[]).filter((r:any)=>!(
      digits(phone).length===10&&digits(String(r.candidate_phone||""))===digits(phone)&&
      email.length>0&&String(r.candidate_email||"").toLowerCase()===email.toLowerCase()
    ));
    return NextResponse.json({matches},{headers:{"Cache-Control":"no-store"}});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Match lookup unavailable."},{status:502});}
}
