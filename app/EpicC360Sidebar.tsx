"use client";

import { useState } from "react";
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
  { key: "leads", href: "/leads", label: "Abandoned Cart" },
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
        {items.map((item) => (
          <a key={item.key} className={active === item.key ? activeClassName : undefined} href={item.href}>
            {item.label}{item.key==="ping"?<PingBadge endpoint="/api/epic-ping" href="/epic-ping"/>:null}
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
