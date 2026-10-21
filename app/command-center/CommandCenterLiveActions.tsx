"use client";

import { useEffect, useState } from "react";
import PingBadge from "../PingBadge";
import IncomingCallPopup from "../IncomingCallPopup";

/**
 * Preview-only integration component. Reuses actual C360 live-call/Lead Sheet
 * and ping behaviors; never replaces the original customer or inbox routes.
 */
export default function CommandCenterLiveActions() {
  const [mentions, setMentions] = useState(0);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/my-catch-up", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active) setMentions(Number(data.mentions?.unread_count || 0));
      } catch { /* Existing My Catch-Up route remains the source of truth. */ }
    }
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 18 }}>
        <button type="button" onClick={() => window.dispatchEvent(new Event("epicc360:new-lead-sheet"))}
          style={{ cursor: "pointer", background: "#bd3028", color: "#fff", border: 0, borderRadius: 22, padding: "11px 17px", fontWeight: 750 }}>
          + New Lead Sheet
        </button>
        <a href="/my-catch-up" style={{ color: "#264361", fontSize: 13, textDecoration: "none", padding: "9px 12px", border: "1px solid #cad4de", borderRadius: 9 }}>
          My Catch-Up{mentions > 0 ? " · " + mentions + " mentions" : ""}
        </a>
        <span style={{ fontSize: 13, padding: "9px 12px", border: "1px solid #cad4de", borderRadius: 9 }}>
          <a href="/epic-ping" style={{ color: "#264361", textDecoration: "none" }}>Epic Ping</a>
          {" "}<PingBadge endpoint="/api/epic-ping" href="/epic-ping" />
        </span>
        <a href="/customers" style={{ color: "#52667c", fontSize: 13 }}>Original C360</a>
      </div>
      <IncomingCallPopup />
    </>
  );
}
