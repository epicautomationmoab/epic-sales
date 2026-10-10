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
 const body=method==="POST"?await request.json().catch(()=>null):null;
 if(method==="POST"&&(!body||typeof body!=="object"||!body.fields||typeof body.fields!=="object"))return NextResponse.json({error:"Invalid sheet"},{status:400});
 const p=method==="GET"?(id?`epicc360_lead_sheets?id=eq.${encodeURIComponent(id)}&select=id,fields,status&limit=1`:phone?`epicc360_lead_sheets?customer_phone=eq.${encodeURIComponent(phone)}&status=eq.saved&select=id,customer_name,customer_phone,updated_at,status,fields&order=updated_at.desc&limit=30`:"epicc360_lead_sheets?select=id,customer_name,customer_phone,updated_at,status&order=updated_at.desc&limit=20"):"epicc360_lead_sheets?on_conflict=id";
 let matchedContactId:string|null=null;
 if(method==="POST"&&body.finalize===true){
   const digits=String(body.fields.phone||"").replace(/[^0-9]/g,"").slice(-10);
   if(digits.length===10){
     const lookup=await fetch(URL+"/rest/v1/sales_contacts?select=id&canonical_phone=like.*"+digits+"&limit=3",{headers:{apikey:KEY,Authorization:"Bearer "+token},cache:"no-store"});
     if(lookup.ok){
       const matches=await lookup.json() as Array<{id:string}>;
       if(matches.length===1)matchedContactId=matches[0].id;
       if(matches.length>1)return NextResponse.json({error:"Several contacts match the phone number. Select the correct customer before linking."},{status:409});
     }
   }
 }
 const payload=method==="POST"?{...(body.id?{id:body.id}:{}),owner_user_id:profile.user_id||profile.id,customer_name:String(body.fields.name||"").slice(0,200),customer_phone:String(body.fields.phone||"").slice(0,50),fields:body.fields,...(matchedContactId?{contact_id:matchedContactId}:{}),status:body.finalize===true?"saved":"draft",updated_at:new Date().toISOString()}:null;
 try{
 const response=await fetch(`${URL}/rest/v1/${p}`,{method:method==="POST"?"POST":"GET",headers:{"apikey":KEY,"Authorization":`Bearer ${token}`,"Content-Type":"application/json",...(method==="POST"?{"Prefer":"resolution=merge-duplicates,return=representation"}:{})},body:payload?JSON.stringify(payload):undefined,cache:"no-store"});
 const result=await response.json().catch(()=>[]);
 if(!response.ok)return NextResponse.json({error:"Unable to save or read lead sheet"},{status:response.status});
 return NextResponse.json({ok:true,rows:result},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Lead sheet service unavailable"},{status:502});}
}
export async function GET(r:NextRequest){return handler(r,"GET")}
export async function POST(r:NextRequest){return handler(r,"POST")}
