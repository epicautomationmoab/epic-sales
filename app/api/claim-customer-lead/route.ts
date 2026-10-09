import {NextRequest,NextResponse} from "next/server";
import {getAuthenticatedTeamProfile} from "../../../lib/team-auth";
const BASE=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/,"");
const KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";
export async function POST(request:NextRequest){
 const token=request.cookies.get("epic_access_token")?.value;
 const profile=await getAuthenticatedTeamProfile(token);
 if(!token||!profile||profile.role==="workstation")return NextResponse.json({error:"Employee login required"},{status:401});
 const body=await request.json().catch(()=>null);
 const contact=body?.contact_id;
 if(typeof contact!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contact))return NextResponse.json({error:"Valid C360 contact required"},{status:400});
 try{
 const res=await fetch(BASE+"/rest/v1/rpc/epic_claim_customer_sales_lead",{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({p_contact_id:contact}),cache:"no-store"});
 const result=await res.json().catch(()=>({}));
 if(!res.ok)return NextResponse.json({error:result.message||"Unable to claim this customer"},{status:res.status===403?403:409});
 return NextResponse.json(result);
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Claim unavailable"},{status:500});}
}
