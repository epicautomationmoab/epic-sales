import { NextRequest, NextResponse } from "next/server";
const BASE=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/,"");
const PUBLIC_KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export async function POST(request:NextRequest){
 const token=request.cookies.get("epic_access_token")?.value;
 if(!token)return NextResponse.json({error:"Employee login required"},{status:401});
 const body=await request.text();
 const res=await fetch(`${BASE}/functions/v1/podium-social-send`,{method:"POST",headers:{Authorization:`Bearer ${token}`,...(PUBLIC_KEY?{apikey:PUBLIC_KEY}:{}),"Content-Type":"application/json"},body,cache:"no-store"});
 const data=await res.json().catch(()=>null);
 if(!res.ok)return NextResponse.json({error:typeof data?.error==="string"?data.error:"Social message was not confirmed"},{status:res.status});
 return NextResponse.json(data);
}