import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTeamProfile } from "../../../lib/team-auth";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kbuxcvqzicnydqllyong.supabase.co").replace(/\/+$/, "");
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";
const EPIC_TIME_ZONE = "America/Denver";

async function auth(request: NextRequest) {
  const accessToken = request.cookies.get("epic_access_token")?.value;
  const profile = await getAuthenticatedTeamProfile(accessToken);
  return profile && accessToken && profile.role !== "workstation" ? { accessToken, profile } : null;
}

async function rpc(accessToken: string, body: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_epic_customer_360`, {
    method: "POST",
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Request failed (${response.status})`);
  return text ? JSON.parse(text) : null;
}

async function reservationIdForConfirmation(accessToken:string, confirmation:string) {
  const response=await fetch(`${SUPABASE_URL}/rest/v1/operational_reservations?confirmation_code=eq.${encodeURIComponent(confirmation)}&select=id&order=updated_at.desc&limit=1`,{
    headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${accessToken}`},cache:"no-store"
  });
  if(!response.ok)return null;
  const rows=await response.json().catch(()=>[]) as Array<{id:string}>;
  return rows[0]?.id||null;
}

function zonedParts(date:Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EPIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read=(type:string)=>Number(parts.find(part=>part.type===type)?.value||0);
  return { year:read("year"),month:read("month"),day:read("day"),hour:read("hour"),minute:read("minute"),second:read("second") };
}

// TripWorks reservation start/end values arrive as Moab wall-clock times but are stored with +00.
// Reinterpret those clock fields in America/Denver so the UI does not subtract 6/7 hours.
function normalizeTripWorksWallTime(value:unknown) {
  if(typeof value!=="string"||!value)return value;
  const match=value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if(!match)return value;
  const target={year:Number(match[1]),month:Number(match[2]),day:Number(match[3]),hour:Number(match[4]),minute:Number(match[5]),second:Number(match[6])};
  const targetAsUtc=Date.UTC(target.year,target.month-1,target.day,target.hour,target.minute,target.second);
  let guess=new Date(targetAsUtc);
  for(let i=0;i<3;i+=1){
    const current=zonedParts(guess);
    const currentAsUtc=Date.UTC(current.year,current.month-1,current.day,current.hour,current.minute,current.second);
    const delta=targetAsUtc-currentAsUtc;
    if(delta===0)break;
    guess=new Date(guess.getTime()+delta);
  }
  return guess.toISOString();
}

function normalizeCustomerReservationTimes(customer:any) {
  if(!customer||!Array.isArray(customer.reservations))return customer;
  return {
    ...customer,
    reservations: customer.reservations.map((reservation:any)=>({
      ...reservation,
      start_time: normalizeTripWorksWallTime(reservation.start_time),
      end_time: normalizeTripWorksWallTime(reservation.end_time),
    })),
  };
}

export async function GET(request: NextRequest) {
  const session = await auth(request);
  if (!session) return NextResponse.json({ error: "Employee login required." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  let reservationId=params.get("reservation")||null;
  const confirmation=params.get("confirmation")||null;
  if(!reservationId&&confirmation) reservationId=await reservationIdForConfirmation(session.accessToken,confirmation);

  const body = {
    p_contact_id: params.get("contact") || null,
    p_opportunity_id: params.get("opportunity") || null,
    p_reservation_id: reservationId,
    p_phone: params.get("phone") || null,
    p_email: params.get("email") || null,
  };

  if (!Object.values(body).some(Boolean)) return NextResponse.json({ error: "Customer identity is required." }, { status: 400 });

  try {
    const customer = normalizeCustomerReservationTimes(await rpc(session.accessToken, body));
    return NextResponse.json({ ok: true, customer });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load Customer 360." }, { status: 500 });
  }
}
