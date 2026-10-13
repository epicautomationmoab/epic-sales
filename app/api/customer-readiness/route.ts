import {NextRequest,NextResponse} from "next/server";
import {getAuthenticatedTeamProfile} from "../../../lib/team-auth";
const BASE=(process.env.NEXT_PUBLIC_SUPABASE_URL||"https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/,"");
const KEY=process.env.SUPABASE_SECRET_KEY||"";
type Rec=Record<string,unknown>;
const respond=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(req:NextRequest){
 const token=req.cookies.get("epic_access_token")?.value;
 const profile=await getAuthenticatedTeamProfile(token);
 if(!token||!profile||profile.role==="workstation")return respond({error:"Employee login required"},401);
 const confirmation=(req.nextUrl.searchParams.get("confirmation")||"").trim().toUpperCase();
 if(!/^[A-Z0-9-]{3,25}$/.test(confirmation))return respond({error:"Invalid reservation"},400);
 const headers={apikey:KEY,Authorization:"Bearer "+KEY};
 async function read(view:string,params:URLSearchParams):Promise<Rec[]>{
  const response=await fetch(BASE+"/rest/v1/"+view+"?"+params.toString(),{headers,cache:"no-store"});
  if(!response.ok)throw new Error(view+" request failed: "+response.status);
  return response.json();
 }
 try{
  const reservations=await read("guest_readiness_history_search_v",new URLSearchParams({select:"*",confirmation_code:"eq."+confirmation,order:"visit_start_time.desc",limit:"10"}));
  const rows=reservations.filter(r=>String(r.confirmation_code||"").toUpperCase()===confirmation);
  if(!rows.length)return respond({rows:[],documents:[]});
  const codes=[...new Set(rows.map(r=>String(r.confirmation_code)))];
  const mpwr=[...new Set(rows.map(r=>String(r.mpwr_confirmation_number||"")).filter(Boolean))];
  const visits=[...new Set(rows.map(r=>String(r.source_store_visit_id||"")).filter(Boolean))];
  const exact=(values:string[])=>"in.("+values.map(v=>'"'+v.replace(/["\\]/g,"")+'"').join(",")+")";
  const [storeDocs,epicDocs,mpwrDocs]=await Promise.all([
   visits.length?read("epic_store_visit_document_evidence_v",new URLSearchParams({select:"store_visit_id,signer_name,signed_pdf_url,waiver_is_adult,signer_category",store_visit_id:exact(visits),limit:"100"})):Promise.resolve([]),
   read("epic_waiver_signatures",new URLSearchParams({select:"id,confirmation_code,signer_full_name,signed_at",confirmation_code:exact(codes),archived_at:"is.null",limit:"100"})),
   mpwr.length?read("scout_mpwr_waivers",new URLSearchParams({select:"mpwr_confirmation_number,rider_name,waiver_url,is_minor,is_passenger",mpwr_confirmation_number:exact(mpwr),limit:"100"})):Promise.resolve([])
  ]);
  const documents=rows.map(row=>{
   const code=String(row.confirmation_code);
   const epic=[
    ...storeDocs.filter(d=>d.store_visit_id===row.source_store_visit_id).map(d=>({name:d.signer_name,url:d.signed_pdf_url,role:d.waiver_is_adult===false||d.signer_category==="minor"?"Minor / child":"Adult Signer"})),
    ...epicDocs.filter(d=>d.confirmation_code===code).map(d=>({name:d.signer_full_name,url:"https://epic-tools-app.vercel.app/api/team/waivers/"+encodeURIComponent(String(d.id))+"/pdf",role:"Adult Signer"}))
   ];
   const polaris=mpwrDocs.filter(d=>d.mpwr_confirmation_number===row.mpwr_confirmation_number).map(d=>({name:d.rider_name,url:d.waiver_url,role:d.is_minor?"Minor":d.is_passenger?"Passenger":"Driver"}));
   return {readinessId:row.readiness_id,confirmation:code,epicReceived:row.epic_document_received_count??epic.length,epicExpected:row.epic_document_expected_count??row.expected_guest_count??0,mpwrReceived:row.mpwr_document_received_count??polaris.length,mpwrExpected:row.mpwr_document_expected_count??0,epic,polaris};
  });
  return respond({rows,documents});
 }catch(e){return respond({error:e instanceof Error?e.message:"Unable to load documents"},502);}
}
