import {cookies} from "next/headers";
import {getAuthenticatedTeamProfile} from "../../lib/team-auth";
import styles from "../staff-booking/StaffBooking.module.css";

const money=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"});

function dateLabel(value:string|null){
  if(!value)return "—";
  const date=new Date(value+"T12:00:00");
  return Number.isNaN(date.getTime())?value:date.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"});
}

export default async function QuoteBookingHelperPage({searchParams}:{searchParams:Promise<{quote?:string;customer?:string;email?:string;phone?:string;experience?:string;date?:string;time?:string;total?:string;tickets?:string;tripsafe?:string;premier?:string}>}){
  const params=await searchParams;
  const store=await cookies();
  const token=store.get("epic_access_token")?.value;
  const profile=await getAuthenticatedTeamProfile(token);
  if(!profile||!token||profile.role==="workstation"){
    return <main className={styles.shell}><section className={styles.card}>Employee login required.</section></main>;
  }

  let tickets:Array<{name:string;quantity:number}>=[];
  try{tickets=JSON.parse(params.tickets||"[]");}catch{}
  const totalCents=Number(params.total||0);

  return <main className={styles.shell}><section className={styles.card}>
    <div className={styles.top}>
      <div>
        <div className={styles.eyebrow}>EpicC360 · Staff Booking</div>
        <h1>Book It</h1>
        <p className={styles.name}>{params.customer||"Quote Customer"}</p>
      </div>
      <div className={styles.draft}>Quote</div>
    </div>
    <div className={styles.warning}>Use the TripWorks booking window. Keep this helper visible and match the quote exactly.</div>
    <div className={styles.grid}>
      <div><span>Activity / Vehicle</span><strong>{params.experience||"—"}</strong></div>
      <div><span>Date</span><strong>{dateLabel(params.date||null)}</strong></div>
      <div><span>Time</span><strong>{params.time||"—"}</strong></div>
      <div><span>Quoted Total</span><strong>{Number.isFinite(totalCents)?money.format(totalCents/100):"—"}</strong></div>
    </div>
    {(params.email||params.phone)?<section className={styles.section}><h2>Guest</h2>{params.email?<div className={styles.line}><div><strong>{params.email}</strong></div></div>:null}{params.phone?<div className={styles.line}><div><strong>{params.phone}</strong></div></div>:null}</section>:null}
    {tickets.length?<section className={styles.section}><h2>Tickets / Vehicles</h2>{tickets.map((ticket,index)=><div className={styles.line} key={index}><div><strong>{ticket.name}</strong></div><em>Qty {ticket.quantity}</em></div>)}</section>:null}
    {(params.tripsafe==="1"||params.premier==="1")?<section className={styles.section}><h2>Protection</h2>{params.tripsafe==="1"?<div className={styles.line}><div><strong>TripSafe</strong></div><em>Selected</em></div>:null}{params.premier==="1"?<div className={styles.line}><div><strong>Premier Adventure Assure</strong></div><em>Selected</em></div>:null}</section>:null}
    <div className={styles.total}><span>Quote Total</span><strong>{Number.isFinite(totalCents)?money.format(totalCents/100):"—"}</strong></div>
  </section></main>;
}
