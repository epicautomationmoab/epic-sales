import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeamProfile } from "../../../lib/team-auth";

const URL_BASE=(process.env.NEXT_PUBLIC_SUPABASE_URL||"").replace(/\/+$/,"");
const ANON=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"";
const SECRET=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"";
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"no-store"}});
const safeCode=(value:string)=>/^[A-Z0-9-]{3,25}$/.test(value);

export async function GET(req:NextRequest){
 const token=req.cookies.get("epic_access_token")?.value;
 const employee=await getAuthenticatedTeamProfile(token);
 if(!employee||employee.role==="workstation"||!token)return json({error:"Employee login required"},401);
 const code=(req.nextUrl.searchParams.get("confirmation")||"").trim().toUpperCase();
 if(!safeCode(code))return json({error:"Invalid confirmation"},400);
 if(!URL_BASE||!ANON)return json({error:"Readiness configuration unavailable"},503);
 const headers={apikey:ANON,Authorization:"Bearer "+token};
 const params=new URLSearchParams({confirmation_code:"eq."+code,select:"readiness_id,confirmation_code,visit_start_time,business_line,ohv_required,ohv_certificate_uploaded,mpwr_document_received_count,mpwr_document_expected_count,handoff_status",order:"visit_start_time.desc",limit:"15"});
 const res=await fetch(URL_BASE+"/rest/v1/guest_readiness_operational?"+params,{headers,cache:"no-store"});
 if(!res.ok)return json({error:"Readiness status unavailable"},502);
 const rows=await res.json() as Array<Record<string,unknown>>;
 // Service-role document lookup is permitted only AFTER an authenticated team lookup
 // has returned this reservation through the employee's own RLS permissions.
 const ids=rows.map(r=>String(r.readiness_id||"")).filter(Boolean);
 let certificates:Array<{readinessId:string;driverName:string;filename:string;uploadedAt:string;viewUrl:string|null}>=[];
 if(ids.length&&SECRET){
   const filter="in.("+ids.map(id=>'"'+id.replace(/["\\]/g,"")+'"').join(",")+")";
   const q=new URLSearchParams({readiness_id:filter,select:"readiness_id,driver_name,original_filename,storage_path,uploaded_at",order:"uploaded_at.desc",limit:"100"});
   const sh={apikey:SECRET,Authorization:"Bearer "+SECRET};
   const response=await fetch(URL_BASE+"/rest/v1/ohv_certificate_uploads?"+q,{headers:sh,cache:"no-store"});
   if(response.ok){
     const uploads=await response.json() as Array<{readiness_id:string;driver_name:string;original_filename:string;storage_path:string;uploaded_at:string}>;
     certificates=await Promise.all(uploads.map(async u=>{
       let viewUrl:string|null=null;
       if(u.storage_path&&!u.storage_path.includes("..")){
         const signed=await fetch(URL_BASE+"/storage/v1/object/sign/ohv-certificates/"+u.storage_path.split("/").map(encodeURIComponent).join("/"),{method:"POST",headers:{...sh,"Content-Type":"application/json"},body:JSON.stringify({expiresIn:300}),cache:"no-store"});
         if(signed.ok){const data=await signed.json();const path=data.signedURL||data.signedUrl;if(typeof path==="string")viewUrl=path.startsWith("http")?path:URL_BASE+"/storage/v1"+path;}
       }
       return {readinessId:u.readiness_id,driverName:u.driver_name,filename:u.original_filename,uploadedAt:u.uploaded_at,viewUrl};
     }));
   }
 }
 return json({rows,certificates,documentsAvailable:Boolean(SECRET)});
}
