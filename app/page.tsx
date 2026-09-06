import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import QuoteBuilder from "./quote-builder";
import { getAuthenticatedTeamProfile } from "../lib/team-auth";

const navLink = {
  color: "#cfd7e3",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "11px 12px",
  borderRadius: 8,
} as const;

export default async function HomePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("epic_access_token")?.value;
  const profile = await getAuthenticatedTeamProfile(accessToken);
  if (!profile) redirect("/employee-login");

  return (
    <>
      <style>{`.quote-host .topbar{display:none!important}`}</style>
      <aside style={{ position: "fixed", inset: "0 auto 0 0", width: 220, background: "#111926", color: "#cfd7e3", display: "flex", flexDirection: "column", zIndex: 30, boxShadow: "8px 0 28px rgba(9,17,29,.12)" }}>
        <div style={{ minHeight: 112, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: "-.04em" }}>EPIC 4X4</div>
          <div style={{ marginTop: 8, fontSize: 11, fontWeight: 900, letterSpacing: ".14em", color: "#ff6a24" }}>SALES</div>
        </div>
        <nav style={{ padding: "16px 12px 8px", display: "grid", gap: 6 }}>
          <a href="/leads" style={navLink}>◇ Leads</a>
          <a href="/" style={{ ...navLink, background: "rgba(255,255,255,.08)", color: "#fff", boxShadow: "inset 3px 0 0 #ff6a24" }}>◇ Quote Builder</a>
          <a href="/missed-calls" style={navLink}>◇ Missed Calls</a>
          <a href="/call-recordings" style={navLink}>◇ Call Recordings</a>
          <span style={{ ...navLink, opacity: .52 }}>◇ Inbox / Needs Review</span>
        </nav>
        <div style={{ marginTop: "auto", padding: 16, borderTop: "1px solid rgba(255,255,255,.08)", fontSize: 11, color: "#8f9aaa" }}>
          <div>Signed in as</div>
          <strong style={{ display: "block", marginTop: 4, color: "#fff", fontSize: 13 }}>{profile.display_name}</strong>
        </div>
      </aside>
      <div className="quote-host">
        <QuoteBuilder />
      </div>
    </>
  );
}
