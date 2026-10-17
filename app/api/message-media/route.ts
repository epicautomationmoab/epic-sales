import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeamProfile } from "../../../lib/team-auth";

const BASE=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co").replace(/\\/$/,"");
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET="c360-message-media";
type MediaRow={id:string;provider_event_id:string;storage_path:string|null;content_type:string|null;ingestion_status:string};
async function session(request:NextRequest){
 const token=request.cookies.get("epic_access_token")?.value;
 const profile=await getAuthenticatedTeamProfile(token);
 return token&&profile&&profile.role!=="workstation"?profile:null;
}
export async function GET(req:NextRequest){
 if(!await session(req))return NextResponse.json({error:"Employee login required"},{status:401});
 if(!SERVICE_KEY)return NextResponse.json({error:"Media service not configured"},{status:503});
 const hdr={apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`};
 const id=req.nextUrl.searchParams.get("id");
 if(id){
   if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:"Invalid attachment"},{status:400});
   const lookup=await fetch(`${BASE}/rest/v1/c360_message_attachments?id=eq.${id}&ingestion_status=eq.stored&select=id,storage_path,content_type&limit=1`,{headers:hdr,cache:"no-store"});
   if(!lookup.ok)return NextResponse.json({error:"Media lookup unavailable"},{status:503});
   const rows=await lookup.json() as MediaRow[];
   const media=rows[0];
   if(!media?.storage_path||!media.storage_path.startsWith("podium/")&&!media.storage_path.startsWith("callrail/")&&!media.storage_path.startsWith("telnyx/"))return NextResponse.json({error:"Image unavailable"},{status:404});
   const content=await fetch(`${BASE}/storage/v1/object/authenticated/${BUCKET}/${media.storage_path.split("/").map(encodeURIComponent).join("/")}`,{headers:hdr,cache:"no-store"});
   if(!content.ok)return NextResponse.json({error:"Image unavailable"},{status:404});
   const mime=media.content_type||"application/octet-stream";
   if(!["image/jpeg","image/png","image/webp","image/gif"].includes(mime))return NextResponse.json({error:"Unsupported media"},{status:415});
   return new NextResponse(content.body,{headers:{"Content-Type":mime,"Cache-Control":"private, no-store","Content-Security-Policy":"default-src 'none'; sandbox","X-Content-Type-Options":"nosniff"}});
 }
 const events=(req.nextUrl.searchParams.get("events")||"").split(",").filter(x=>/^[a-zA-Z0-9:_-]{1,120}$/.test(x)).slice(0,100);
 if(!events.length)return NextResponse.json({attachments:[]});
 const params=new URLSearchParams({select:"id,provider_event_id,content_type",ingestion_status:"eq.stored",provider_event_id:`in.(${events.join(",")})`,order:"created_at.asc"});
 const response=await fetch(`${BASE}/rest/v1/c360_message_attachments?${params}`,{headers:hdr,cache:"no-store"});
 if(!response.ok)return NextResponse.json({error:"Media lookup unavailable"},{status:503});
 return NextResponse.json({attachments:await response.json()},{headers:{"Cache-Control":"private, no-store"}});
}
