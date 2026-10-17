import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeamProfile } from "../../../lib/team-auth";

const supabaseUrl=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/,"");

export async function POST(request:NextRequest){
  const token=request.cookies.get("epic_access_token")?.value;
  const profile=await getAuthenticatedTeamProfile(token);
  if(!token||!profile||profile.role==="workstation"){
    return NextResponse.json({error:"Employee login required."},{status:401});
  }
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY;
  if(!secret)return NextResponse.json({error:"Contact validation is not configured."},{status:503});
  let body:Record<string,unknown>;
  try{body=await request.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
  const phone=typeof body.phone==="string"?body.phone.trim():"";
  const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
  const contactId=typeof body.contact_id==="string"?body.contact_id:null;
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||phone.replace(/\D/g,"").length<10||phone.length>40||email.length>254){
    return NextResponse.json({error:"A valid phone and email are required for an exact identity check."},{status:400});
  }
  if(contactId&&!/^[a-f0-9]{8}-[a-f0-9-]{27,}$/i.test(contactId)){
    return NextResponse.json({error:"Invalid contact reference."},{status:400});
  }
  try{
    const response=await fetch(supabaseUrl+"/rest/v1/rpc/c360_contact_pair_match_preflight",{
      method:"POST",cache:"no-store",
      headers:{apikey:secret,Authorization:"Bearer "+secret,"Content-Type":"application/json"},
      body:JSON.stringify({p_phone:phone,p_email:email,p_exclude_contact:contactId})
    });
    if(!response.ok)throw new Error("Contact validation failed.");
    const matches=await response.json();
    return NextResponse.json({exact_matches:Array.isArray(matches)?matches:[],checked:true,merged:false},{headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({error:"Contact validation is currently unavailable."},{status:502});}
}
