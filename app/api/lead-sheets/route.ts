import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeamProfile } from "../../../lib/team-auth";
const URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/, "");
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";
async function handler(request:NextRequest,method:"GET"|"POST"){
 const token=request.cookies.get("epic_access_token")?.value;
 const profile=await getAuthenticatedTeamProfile(token);
 if(!token||!profile||profile.role==="workstation")return NextResponse.json({error:"Employee login required"},{status:401});
 const id=method==="GET"?request.nextUrl.searchParams.get("id"):null;
 const phone=method==="GET"?request.nextUrl.searchParams.get("phone"):null;
 const contact=method==="GET"?request.nextUrl.searchParams.get("contact"):null;
 const matchPhone=method==="GET"?request.nextUrl.searchParams.get("match_phone"):null;
 const body=method==="POST"?await request.json().catch(()=>null):null;
 if(method==="POST"&&(!body||typeof body!=="object"||!body.fields||typeof body.fields!=="object"))return NextResponse.json({error:"Invalid sheet"},{status:400});
 const p=method==="GET"?(id?`epicc360_lead_sheets?id=eq.${encodeURIComponent(id)}&select=id,fields,status&limit=1`:contact?`epicc360_lead_sheets?contact_id=eq.${encodeURIComponent(contact)}&status=eq.saved&select=id,customer_name,customer_phone,updated_at,status,fields&order=updated_at.desc&limit=30`:phone?`epicc360_lead_sheets?customer_phone=eq.${encodeURIComponent(phone)}&status=eq.saved&select=id,customer_name,customer_phone,updated_at,status,fields&order=updated_at.desc&limit=30`:"epicc360_lead_sheets?select=id,customer_name,customer_phone,updated_at,status&order=updated_at.desc&limit=20"):"epicc360_lead_sheets?on_conflict=id";
 const payload=method==="POST"?{...(body.id?{id:body.id}:{}),owner_user_id:profile.user_id||profile.id,customer_name:String(body.fields.name||"").slice(0,200),customer_phone:String(body.fields.phone||"").slice(0,50),fields:body.fields,status:body.finalize===true?"saved":"draft",updated_at:new Date().toISOString()}:null;
 try{
 if(method==="GET"&&matchPhone!==null){
  const digits=matchPhone.replace(/\D/g,"");
  const canonical=digits.length===10?"+1"+digits:digits.length===11&&digits.startsWith("1")?"+"+digits:null;
  if(!canonical)return NextResponse.json({ok:true,match:null});
  const response=await fetch(`${URL}/rest/v1/sales_contacts?canonical_phone=eq.${encodeURIComponent(canonical)}&select=id,display_name,tripworks_customer_id&limit=2`,{headers:{apikey:KEY,Authorization:"Bearer "+token},cache:"no-store"});
  if(!response.ok)return NextResponse.json({error:"Unable to match customer"},{status:response.status});
  const rows=await response.json();
  return NextResponse.json({ok:true,match:rows.length===1?rows[0]:null,ambiguous:rows.length>1},{headers:{"Cache-Control":"no-store"}});
 }
 if(method==="POST"&&body.finalize===true){
  const response=await fetch(URL+"/rest/v1/rpc/finalize_epicc360_lead_sheet",{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({p_id:body.id||null,p_fields:body.fields,p_contact_id:body.contactId||null}),cache:"no-store"});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)return NextResponse.json({error:result.message||"Unable to finish saving this Lead Sheet"},{status:response.status});
  return NextResponse.json({ok:true,rows:[result],linked:result.linked,contactId:result.contact_id});
 }
 const response=await fetch(`${URL}/rest/v1/${p}`,{method:method==="POST"?"POST":"GET",headers:{"apikey":KEY,"Authorization":`Bearer ${token}`,"Content-Type":"application/json",...(method==="POST"?{"Prefer":"resolution=merge-duplicates,return=representation"}:{})},body:payload?JSON.stringify(payload):undefined,cache:"no-store"});
 const result=await response.json().catch(()=>[]);
 if(!response.ok)return NextResponse.json({error:"Unable to save or read lead sheet"},{status:response.status});
 return NextResponse.json({ok:true,rows:result},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Lead sheet service unavailable"},{status:502});}
}
export async function GET(r:NextRequest){return handler(r,"GET")}
export async function POST(r:NextRequest){return handler(r,"POST")}
