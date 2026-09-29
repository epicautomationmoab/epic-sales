import {cookies} from "next/headers";
import {getAuthenticatedTeamProfile} from "../../lib/team-auth";
import styles from "./StaffBooking.module.css";

const SUPABASE_URL=(process.env.NEXT_PUBLIC_SUPABASE_URL||"").replace(/\/+$/,"");
const SUPABASE_KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"";
const money=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"});

function dateLabel(value:string|null){
  if(!value)return "—";
  const date=new Date(value+"T12:00:00");
  return Number.isNaN(date.getTime())?value:date.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"});
}

export default async function StaffBookingPage({searchParams}:{searchParams:Promise<{draft?:string}>}){
  const params=await searchParams;
  const draftId=params.draft||"";
  const store=await cookies();
  const token=store.get("epic_access_token")?.value;
  const profile=await getAuthenticatedTeamProfile(token);
  if(!profile||!token||profile.role==="workstation") return <main className={styles.shell}><section className={styles.card}>Employee login required.</section></main>;
  if(!draftId)return <main className={styles.shell}><section className={styles.card}>Draft is required.</section></main>;

  const query=new URLSearchParams({id:"eq."+draftId,select:"id,confirmation_code,customer_name,activity_date,start_time,experience_name,option_name,value_cents,tripworks_customer_code,raw_payload"});
  const response=await fetch(SUPABASE_URL+"/rest/v1/sales_drafts?"+query.toString(),{headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+token},cache:"no-store"});
  const rows=await response.json().catch(()=>[]);
  const row=rows[0];
  if(!response.ok||!row)return <main className={styles.shell}><section className={styles.card}>Unable to load booking draft.</section></main>;

  const trip=row.raw_payload||{};
  const order=Array.isArray(trip.tripOrders)?trip.tripOrders[0]||{}:{};
  const booking=Array.isArray(order.bookings)?order.bookings[0]||{}:{};
  const slot=order.experience_timeslot||{};
  const addons=Array.isArray(booking.addons)?booking.addons:[];
  const products=Array.isArray(booking.booking_products)?booking.booking_products:[];
  const customerCode=row.tripworks_customer_code||trip?.customer?.code||null;
  const customerUrl=customerCode?"https://epic4x4.tripworks.com/customer/"+encodeURIComponent(customerCode)+"/trips":null;

  return <main className={styles.shell}><section className={styles.card}>
    <div className={styles.top}><div><div className={styles.eyebrow}>EpicC360 · Staff Booking</div><h1>Book It</h1><p className={styles.name}>{row.customer_name||"Customer"}</p></div><div className={styles.draft}>Draft {row.confirmation_code||"—"}</div></div>
    <div className={styles.warning}>Create a NEW TripWorks booking. Do not reserve the e-commerce draft.</div>
    <div className={styles.grid}>
      <div><span>Activity / Vehicle</span><strong>{row.experience_name||"—"}</strong></div>
      <div><span>Date</span><strong>{dateLabel(row.activity_date)}</strong></div>
      <div><span>Time</span><strong>{slot?.time_label||"—"}</strong></div>
      <div><span>Duration / Option</span><strong>{row.option_name||"—"}</strong></div>
    </div>
    {addons.length?<section className={styles.section}><h2>Add-ons / Protection</h2>{addons.map((addon:any,index:number)=><div className={styles.line} key={index}><div><strong>{addon?.name||addon?.experience_addon?.title||"Add-on"}</strong>{addon?.experience_addon?.title&&addon.experience_addon.title!==addon.name?<span>{addon.experience_addon.title}</span>:null}</div><em>{typeof addon?.price==="number"?money.format(addon.price/100):""}</em></div>)}</section>:null}
    {products.length?<section className={styles.section}><h2>Products</h2>{products.map((product:any,index:number)=><div className={styles.line} key={index}><div><strong>{product?.name||product?.product?.name||"Product"}</strong>{product?.quantity?<span>Qty {product.quantity}</span>:null}</div><em>{typeof product?.price==="number"?money.format(product.price/100):""}</em></div>)}</section>:null}
    <div className={styles.total}><span>Draft Total</span><strong>{typeof row.value_cents==="number"?money.format(row.value_cents/100):"—"}</strong></div>
    <div className={styles.actions}>{customerUrl?<a className={styles.primary} href={customerUrl} target="_blank" rel="noreferrer">Open Customer in TripWorks</a>:null}</div>
  </section></main>;
}
