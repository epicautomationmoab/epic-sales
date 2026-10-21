import "./mobile.css";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedTeamProfile } from "../../lib/team-auth";
import CustomersClient from "../customers/CustomersClient";
import CommandCenterLiveActions from "./CommandCenterLiveActions";
import OperationalLaunches from "./OperationalLaunches";

// ISOLATED DESIGN BRANCH ONLY. This route reuses real C360 customer behavior.
// Existing /customers, existing sidebars, APIs, auth and staff actions are untouched.
type LinkDef = { label: string; href: string; owner: "sales" | "tools"; management?: boolean };
const groups: { name: string; links: LinkDef[] }[] = [
  { name: "SALES & RESERVATIONS", links: [
    { label: "Inbox", href: "/inbox", owner: "sales" },
    { label: "My Catch-Up", href: "/my-catch-up", owner: "sales" },
    { label: "Missed Calls", href: "/missed-calls", owner: "sales" },
    { label: "Sales Opportunities", href: "/leads", owner: "sales" },
    { label: "Quote Builder", href: "/quote", owner: "sales" },
    { label: "Customer 360", href: "/command-center", owner: "sales" },
    { label: "Phone Report", href: "/phone-report", owner: "sales" },
    { label: "Call Recordings", href: "/call-recordings", owner: "sales" },
  ]},
  { name: "READINESS & OPERATIONS", links: [
    { label: "Guest Readiness", href: "/team/readiness", owner: "tools" },
    { label: "Arrival Board", href: "/team/arrival-board", owner: "tools" },
    { label: "Kiosk", href: "/kiosk", owner: "tools" },
    { label: "Guest Lookup", href: "/team/previous-guests", owner: "tools" },
    { label: "Held-Over Rentals", href: "/team/active-rentals", owner: "tools" },
    { label: "Deposits On-Hold", href: "/team/deposits-on-hold", owner: "tools" },
    { label: "Tour Dispatch", href: "/team/tour-dispatch", owner: "tools" },
    { label: "Rental Inbox", href: "/team/service-inbox/rentals", owner: "tools" },
    { label: "Tour Inbox", href: "/team/service-inbox/tours", owner: "tools" },
    { label: "Exceptions", href: "/team/email-delivery", owner: "tools" },
  ]},
  { name: "TEAM & ADMINISTRATION", links: [
    { label: "Epic Ping (Sales)", href: "/epic-ping", owner: "sales" },
    { label: "Epic Ping (Operations)", href: "/team/epic-ping", owner: "tools" },
    { label: "Referral Partners", href: "/team/referral-partners", owner: "tools", management: true },
    { label: "Manage Users", href: "/team/auth-setup", owner: "tools", management: true },
    { label: "Blocked Email Domains", href: "/inbox/blocked-domains", owner: "sales", management: true },
  ]},
];
const toolsBase = "https://team.myepicreservation.com";

export default async function CommandCenterPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; open?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get("epic_access_token")?.value;
  const profile = await getAuthenticatedTeamProfile(token);
  if (!profile || !token || profile.role === "workstation") redirect("/employee-login");
  const canManage = profile.role === "admin" || profile.role === "manager";
  return (
    <div className="epic-command-center" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "minmax(230px,270px) minmax(0,1fr)", background: "#f5f7fa", color: "#17263b", fontFamily: "Arial,Helvetica,sans-serif" }}>
      <aside style={{ background: "#17263a", color: "#f4f7fc", padding: "24px 16px" }}>
        <div style={{ fontSize: 20, fontWeight: 850, letterSpacing: 1 }}>EPIC</div>
        <div style={{ fontSize: 12, color: "#b9cadb", marginBottom: 24 }}>COMMAND CENTER · INTEGRATION REVIEW</div>
        {groups.map(group => (
          <nav key={group.name} aria-label={group.name} style={{ marginBottom: 23 }}>
            <div style={{ fontSize: 10, letterSpacing: 1.6, color: "#9cacc0", marginBottom: 8 }}>{group.name}</div>
            {group.links.filter(item => !item.management || canManage).map(item => (
              <a key={item.owner + item.href}
                href={item.owner === "tools" ? toolsBase + item.href : item.href}
                style={{ display: "block", padding: "9px 12px", borderRadius: 8, margin: "3px 0", textDecoration: "none", color: "inherit", background: item.href === "/command-center" ? "#334a65" : "transparent", fontSize: 13 }}>
                {item.label}{item.owner === "tools" ? " ↗" : ""}
              </a>
            ))}
          </nav>
        ))}
        <div style={{ marginTop: 16, fontSize: 12, color: "#b4c4d6" }}>{profile.display_name}</div>
        <a href="/customers" style={{ color: "#c4e4ff", fontSize: 12 }}>Open original C360</a>
      </aside>
      <main style={{ padding: "30px clamp(16px,3vw,46px)", minWidth: 0 }}>
        <div style={{ padding: 13, borderRadius: 10, background: "#fff9e9", border: "1px solid #ead4a7", fontSize: 12, marginBottom: 22 }}>
          Development-only integration route. Real C360 components and APIs; existing operations links open their unchanged application. No new shared SSO, booking or duplicate message handler.
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div><div style={{ color: "#7c8998", fontSize: 11, letterSpacing: 2 }}>CUSTOMER WORKSPACE</div><h1 style={{ margin: "5px 0" }}>Customer 360</h1></div>
          <a href="/inbox" style={{ border: "1px solid #c6d2df", padding: "10px 15px", borderRadius: 9, color: "#263d58", textDecoration: "none" }}>Open full Inbox ↗</a>
        </div>
        <p style={{ maxWidth: 800, color: "#516175", fontSize: 14 }}>This workspace uses Epic's existing customer search and original Customer360Modal. Opening a customer runs the existing real C360 workflows, including communications, Lead Sheet, notes, quotes, follow-ups, individual drafts and the existing Book It helper.</p>
        <CommandCenterLiveActions />
        <section style={{ background: "#fff", border: "1px solid #e2e7ef", borderRadius: 14, padding: "20px", marginTop: 21 }}>
          <CustomersClient initialQuery={params.q || ""} autoOpen={params.open === "1"} userId={profile.user_id || profile.id} />
        </section>
        <OperationalLaunches />
      </main>
    </div>
  );
}
