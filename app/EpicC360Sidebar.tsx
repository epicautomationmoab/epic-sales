"use client";

import { useEffect, useState } from "react";
import PingBadge from "./PingBadge";
type ActiveSection = "inbox" | "missed-calls" | "phone-report" | "leads" | "customers" | "quote" | "call-recordings" | "ping" | "catch-up";

type Props = {
  active: ActiveSection;
  profileName: string;
  className: string;
  navClassName: string;
  activeClassName: string;
  footerClassName: string;
  canManage?: boolean;
};

const items: Array<{ key: ActiveSection; href: string; label: string }> = [
  { key: "inbox", href: "/inbox", label: "Inbox" },
  { key: "ping", href: "/epic-ping", label: "Epic Ping" },
  { key: "catch-up", href: "/my-catch-up", label: "My Catch-Up" },
  { key: "missed-calls", href: "/missed-calls", label: "Missed Calls" },
  { key: "leads", href: "/leads", label: "Sales Opportunities" },
  { key: "quote", href: "/quote", label: "Quote Builder" },
  { key: "customers", href: "/customers", label: "C360" },
  { key: "phone-report", href: "/phone-report", label: "Phone Report" },
  { key: "call-recordings", href: "/call-recordings", label: "Call Recordings" },
];

export default function EpicC360Sidebar({
  active,
  profileName,
  className,
  navClassName,
  activeClassName,
  footerClassName,
  canManage = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mentionCount, setMentionCount] = useState(0);
  useEffect(() => { let mounted=true; const refresh=async()=>{try{const r=await fetch("/api/my-catch-up",{cache:"no-store"});if(!r.ok)return;const data=await r.json();if(mounted)setMentionCount(Number(data.mentions?.unread_count||0));}catch{}};void refresh();const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh()},15000);return()=>{mounted=false;window.clearInterval(timer)};},[]);
  const [loggingOut, setLoggingOut] = useState(false);
  async function logout() {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("Unable to log out.");
      window.location.assign("/employee-login");
    } catch {
      setLoggingOut(false);
      window.alert("Unable to log out. Please try again.");
    }
  }
  return (
    <aside className={className}>
      <div className="epicC360Brand">
        <img src="https://myepicreservation.com/epic-logo.png" alt="Epic 4X4 Adventures" />
        <div className="epicC360Product">EpicC360</div>
        <div className="epicC360Tagline">Every customer. One complete history.</div>
      </div>
      <nav className={navClassName}>
        {items.map((item) => item.key === "customers" ? (<>
          <button key="new-lead-sheet" type="button" onClick={() => window.dispatchEvent(new Event("epicc360:new-lead-sheet"))} style={{display:"block",width:"calc(100% - 22px)",margin:"7px 11px 12px",padding:"11px 12px",border:"1px solid #e33732",borderRadius:24,background:"#c92320",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",textAlign:"center"}}>+ New Lead Sheet</button>
          <a key={item.key} className={active === item.key ? activeClassName : undefined} href={item.href}>{item.label}</a>
        </>) : (
          <a key={item.key} className={active === item.key ? activeClassName : undefined} href={item.href}>
            {item.label}{item.key==="catch-up"&&mentionCount>0?<span aria-label={`${mentionCount} unread mentions`} style={{marginLeft:8,padding:"2px 7px",background:"#d84a27",borderRadius:12,color:"#fff",fontSize:11,fontWeight:800}}>{mentionCount}</span>:null}{item.key==="ping"?<PingBadge endpoint="/api/epic-ping" href="/epic-ping"/>:null}
          </a>
        ))}
        {canManage ? <a href="/inbox/blocked-domains">Blocked Email Domains</a> : null}
      </nav>
      <div className={footerClassName}>
        <div>Signed in as</div>
        <button type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} style={{background:"transparent",border:0,color:"inherit",cursor:"pointer",font:"inherit",fontWeight:800,padding:"5px 0",display:"flex",gap:8,alignItems:"center",textAlign:"left"}}>{profileName}<span aria-hidden="true">{menuOpen ? "▴" : "▾"}</span></button>
        {menuOpen ? <button type="button" onClick={logout} disabled={loggingOut} style={{marginTop:6,padding:"9px 15px",background:"#293342",color:"#fff",border:"1px solid #566174",borderRadius:8,cursor:"pointer",fontWeight:700}}>{loggingOut ? "Logging out..." : "Log out"}</button> : null}
      </div>
    </aside>
  );
}
