import {NextRequest,NextResponse} from "next/server";
import {getAuthenticatedTeamProfile} from "../../../lib/team-auth";
const raw=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co";
const base=(/^https?:\/\//.test(raw)?raw:`https://${raw}`).replace(/\/+$/,"");
async function authorize(request:NextRequest) {
 const profile=await getAuthenticatedTeamProfile(request.cookies.get("epic_access_token")?.value);
 return profile&&profile.role!=="workstation"?profile:null;
}
async function rest<T>(path:string,init?:RequestInit):Promise<T>{
 const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";
 const token=init?.headers && (init.headers as Record<string,string>)["x-epic-access-token"];
 if(!token)throw Error("Employee session unavailable.");
 const result=await fetch(`${base}/rest/v1/${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${token}`,"Content-Type":"application/json"},cache:"no-store"});
 const text=await result.text();
 if(!result.ok)throw Error(text||`Supabase request failed: ${result.status}`);
 return text?JSON.parse(text) as T:undefined as T;
}
type Note={note_id:string;confirmation_code:string|null;note_text:string;note_scope:string;source:string;visible_in_readiness:boolean;author_name:string|null;created_at:string};
export async function GET(request:NextRequest) {
 if(!await authorize(request))return NextResponse.json({error:"Employee login required."},{status:401});
 const codes=Array.from(new Set((request.nextUrl.searchParams.get("confirmations")||"").split(",").map(v=>v.trim().toUpperCase()).filter(v=>/^[A-Z0-9-]{3,25}$/.test(v)))).slice(0,30);
 if(!codes.length)return NextResponse.json({ok:true,notes:[]});
 try {
 const notes=await rest<Note[]>("rpc/epic_unified_notes_for_reservations",{method:"POST",headers:{"x-epic-access-token":request.cookies.get("epic_access_token")?.value||""},body:JSON.stringify({p_confirmations:codes})});
 return NextResponse.json({ok:true,notes});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to load notes."},{status:500});}
}
export async function POST(request:NextRequest) {
 const profile=await authorize(request);if(!profile)return NextResponse.json({error:"Employee login required."},{status:401});
 try {
 const body=await request.json();
 const code=String(body.confirmation_code||"").trim().toUpperCase(),text=String(body.note_text||"").trim();
 if(!/^[A-Z0-9-]{3,25}$/.test(code)||!text||text.length>4000)return NextResponse.json({error:"Valid reservation and note required."},{status:400});
 const rows=await rest<Note[]>("epic_unified_notes",{method:"POST",headers:{Prefer:"return=representation","x-epic-access-token":request.cookies.get("epic_access_token")?.value||""},body:JSON.stringify({confirmation_code:code,note_text:text,note_scope:"reservation",source:"c360",visible_in_readiness:body.visible_in_readiness===true,author_name:profile.display_name})});
 return NextResponse.json({ok:true,note:rows[0]});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to save note."},{status:500});}
}
export async function PATCH(request:NextRequest) {
 if(!await authorize(request))return NextResponse.json({error:"Employee login required."},{status:401});
 try {
 const b=await request.json(),id=String(b.note_id||"");
 if(!/^[a-f0-9-]{36}$/i.test(id)||typeof b.visible_in_readiness!=="boolean")return NextResponse.json({error:"Note and readiness selection required."},{status:400});
 const rows=await rest<Note[]>(`epic_unified_notes?note_id=eq.${id}&note_scope=eq.reservation`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({visible_in_readiness:b.visible_in_readiness,updated_at:new Date().toISOString()})});
 if(!rows.length)return NextResponse.json({error:"Note unavailable."},{status:404});
 return NextResponse.json({ok:true,note:rows[0]});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to update note."},{status:500});}
}
