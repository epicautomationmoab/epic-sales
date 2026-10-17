import {NextRequest,NextResponse} from "next/server";
import {getAuthenticatedTeamProfile} from "../../../../lib/team-auth";
const url=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/,"");
const apiKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";
async function run(request:NextRequest,fn:string,args:unknown){
 const token=request.cookies.get("epic_access_token")?.value;
 const profile=await getAuthenticatedTeamProfile(token);
 if(!token||!profile||profile.role==="workstation")return NextResponse.json({error:"Employee login required"},{status:401});
 const res=await fetch(url+"/rest/v1/rpc/"+fn,{method:"POST",headers:{apikey:apiKey,Authorization:"Bearer "+token,"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify(args)});
 const data=await res.json().catch(()=>null);
 return NextResponse.json(res.ok?data:{error:data?.message||"Readiness contact request failed"},{status:res.ok?200:400,headers:{"Cache-Control":"no-store"}});
}
export async function GET(request:NextRequest){
 const phone=request.nextUrl.searchParams.get("phone")||"";
 if(phone.length>32||!phone)return NextResponse.json({error:"Phone required"},{status:400});
 return run(request,"c360_employee_readiness_candidates",{p_phone:phone});
}
export async function POST(request:NextRequest){
 const body=await request.json().catch(()=>null);
 if(!body||typeof body.phone!=="string"||typeof body.confirmation!=="string"||typeof body.expected_phone!=="string"||typeof body.expected_email!=="string")return NextResponse.json({error:"Reservation review required"},{status:400});
 return run(request,"c360_employee_apply_readiness_contact",{p_phone:body.phone,p_confirmation:body.confirmation,p_expected_phone:body.expected_phone,p_expected_email:body.expected_email});
}