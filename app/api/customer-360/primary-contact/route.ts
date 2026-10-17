import {NextRequest,NextResponse} from "next/server";
import {getAuthenticatedTeamProfile} from "../../../../lib/team-auth";
const url=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/,"");
const apiKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";
export async function POST(request:NextRequest){
 const token=request.cookies.get("epic_access_token")?.value;
 const profile=await getAuthenticatedTeamProfile(token);
 if(!token||!profile||profile.role==="workstation")return NextResponse.json({error:"Employee login required"},{status:401});
 try{
  const body=await request.json();
  if(typeof body.phone!=="string"||typeof body.primary_phone!=="string"||body.phone.length>32||body.primary_phone.length>32||typeof body.primary_email!=="string"||body.primary_email.length>254)return NextResponse.json({error:"Invalid contact choices"},{status:400});
  const response=await fetch(url+"/rest/v1/rpc/c360_employee_update_link_primary",{method:"POST",cache:"no-store",headers:{apikey:apiKey,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({p_phone:body.phone,p_primary_phone:body.primary_phone,p_primary_email:body.primary_email||null})});
  const result=await response.json().catch(()=>null);
  if(!response.ok)return NextResponse.json({error:result?.message||"Could not save primary contacts"},{status:400});
  return NextResponse.json({ok:true,contacts:result},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Save failed"},{status:500});}
}