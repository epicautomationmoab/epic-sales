"use client";

import { useMemo, useState } from "react";
import styles from "./Leads.module.css";

export type SalesLead = {
  id: string;
  customer_name: string | null;
  email: string | null;
  phone_e164: string | null;
  status: string;
  lead_value_cents: number | null;
  draft_count: number | null;
  source_method: string | null;
  assigned_rep_name: string | null;
  claimed_by_name: string | null;
  claimed_at: string | null;
  activity_window_start: string | null;
  activity_window_end: string | null;
  shopping_last_activity_at: string | null;
  interest_label: string | null;
  party_needs: string | null;
  lead_capture_note: string | null;
  is_past_guest: boolean | null;
  prior_booking_count: number | null;
  drafts: Array<{
    id: string;
    confirmation_code: string | null;
    experience_name: string | null;
    option_name: string | null;
    activity_date: string | null;
    value_cents: number | null;
    trip_method: string | null;
    created_by_name: string | null;
    last_trip_status: string | null;
    first_seen_at?: string | null;
    last_seen_at?: string | null;
  }>;
  notes: Array<{
    id: string;
    author_name: string | null;
    note_text: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>;
  assignments: Array<{
    id: string;
    assigned_rep_name: string | null;
    assigned_at: string | null;
    unassigned_at: string | null;
    assignment_source: string | null;
  }>;
  calls?: Array<{
    id: string;
    direction: string | null;
    call_type: string | null;
    answered: boolean | null;
    voicemail: boolean | null;
    occurred_at: string | null;
    duration_seconds: number | null;
    recording_player_url: string | null;
    recording_url: string | null;
    call_summary: string | null;
    transcription_text: string | null;
    tracking_phone_number: string | null;
  }>;
  texts?: Array<{
    id: string;
    direction: string | null;
    message_body: string | null;
    status: string | null;
    agent_name: string | null;
    occurred_at: string | null;
    source_number: string | null;
    destination_number: string | null;
  }>;
  quotes?: Array<{
    id: string;
    status: string | null;
    experience_name: string | null;
    total_cents: number | null;
    created_by_name: string | null;
    created_at: string | null;
    updated_at: string | null;
    emailed_at: string | null;
    visit_start_date: string | null;
    visit_end_date: string | null;
  }>;
};

type TimelineItem = {
  id: string;
  kind: "note" | "call" | "text" | "assignment" | "draft" | "quote";
  at: string | null;
  title: string;
  body?: string | null;
  meta?: string | null;
  href?: string | null;
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value: string | null) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function dateWindow(lead: SalesLead) {
  if (!lead.activity_window_start) return "No dates yet";
  if (!lead.activity_window_end || lead.activity_window_end === lead.activity_window_start) return formatDate(lead.activity_window_start);
  return `${formatDate(lead.activity_window_start)} – ${formatDate(lead.activity_window_end)}`;
}

function durationLabel(seconds: number | null) {
  if (!seconds && seconds !== 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins ? `${mins}m ${secs}s` : `${secs}s`;
}

function activityTimeline(lead: SalesLead): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const note of lead.notes || []) {
    items.push({ id: `note-${note.id}`, kind: "note", at: note.created_at, title: "Note added", body: note.note_text, meta: note.author_name || "Unknown author" });
  }
  for (const call of lead.calls || []) {
    const status = call.voicemail ? "Voicemail" : call.answered === false ? "Missed call" : call.direction === "outbound" ? "Outbound call" : "Inbound call";
    items.push({
      id: `call-${call.id}`,
      kind: "call",
      at: call.occurred_at,
      title: status,
      body: call.call_summary || call.transcription_text || null,
      meta: [durationLabel(call.duration_seconds), call.tracking_phone_number ? `via ${call.tracking_phone_number}` : null].filter(Boolean).join(" · "),
      href: call.recording_player_url || call.recording_url || null,
    });
  }
  for (const text of lead.texts || []) {
    items.push({
      id: `text-${text.id}`,
      kind: "text",
      at: text.occurred_at,
      title: text.direction === "outbound" ? "Text sent" : "Text received",
      body: text.message_body,
      meta: [text.agent_name, text.status].filter(Boolean).join(" · "),
    });
  }
  for (const assignment of lead.assignments || []) {
    items.push({
      id: `assignment-${assignment.id}`,
      kind: "assignment",
      at: assignment.assigned_at,
      title: `Lead assigned to ${assignment.assigned_rep_name || "Unknown"}`,
      meta: assignment.assignment_source || null,
    });
    if (assignment.unassigned_at) {
      items.push({ id: `unassignment-${assignment.id}`, kind: "assignment", at: assignment.unassigned_at, title: `Assignment ended for ${assignment.assigned_rep_name || "Unknown"}` });
    }
  }
  for (const draft of lead.drafts || []) {
    items.push({
      id: `draft-${draft.id}`,
      kind: "draft",
      at: draft.first_seen_at || draft.last_seen_at || null,
      title: `TripWorks draft: ${draft.experience_name || "Draft"}`,
      body: draft.option_name || null,
      meta: [draft.confirmation_code, draft.created_by_name, draft.last_trip_status].filter(Boolean).join(" · "),
    });
  }
  for (const quote of lead.quotes || []) {
    items.push({
      id: `quote-${quote.id}`,
      kind: "quote",
      at: quote.created_at,
      title: `Epic quote ${quote.status || "saved"}`,
      body: quote.experience_name || null,
      meta: [money.format((quote.total_cents || 0) / 100), quote.created_by_name, quote.emailed_at ? "Emailed" : null].filter(Boolean).join(" · "),
    });
  }

  return items.sort((a, b) => {
    const av = a.at ? new Date(a.at).getTime() : 0;
    const bv = b.at ? new Date(b.at).getTime() : 0;
    return bv - av;
  });
}

export default function LeadsClient({ leads: initialLeads }: { leads: SalesLead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const selected = useMemo(() => leads.find((lead) => lead.id === selectedId) || null, [leads, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((lead) => [lead.customer_name, lead.email, lead.phone_e164, lead.interest_label, lead.claimed_by_name, lead.assigned_rep_name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q)));
  }, [leads, query]);

  const timeline = useMemo(() => selected ? activityTimeline(selected) : [], [selected]);

  async function mutateLead(action: "claim" | "release" | "note") {
    if (!selected) return;
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, opportunity_id: selected.id, note_text: action === "note" ? noteText : undefined }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Unable to update lead.");

      setLeads((current) => current.map((lead) => {
        if (lead.id !== selected.id) return lead;
        if (action === "claim") return { ...lead, claimed_by_name: payload.claimed_by_name || lead.claimed_by_name, assigned_rep_name: payload.claimed_by_name || lead.assigned_rep_name, claimed_at: payload.claimed_at || new Date().toISOString() };
        if (action === "release") return { ...lead, claimed_by_name: null, assigned_rep_name: null, claimed_at: null };
        if (action === "note" && payload.note) return { ...lead, notes: [payload.note, ...(lead.notes || [])] };
        return lead;
      }));
      if (action === "note") setNoteText("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update lead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.toolbar}>
        <div><strong>Open Leads {filtered.length}</strong><div className={styles.toolbarSub}>Click any lead to open the full working record.</div></div>
        <input className={styles.search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, email, activity, rep…" />
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead><tr><th>Customer</th><th>Activity Window</th><th>Interest</th><th>Method</th><th>Owner</th><th>Drafts</th><th>Lead Value</th></tr></thead>
          <tbody>
            {filtered.map((lead) => (
              <tr key={lead.id} onClick={() => setSelectedId(lead.id)}>
                <td><div className={styles.mainLine}>{lead.customer_name || "Unnamed lead"}{lead.is_past_guest ? <span className={styles.vip}>Past Guest</span> : null}</div><div className={styles.subLine}>{lead.phone_e164 || lead.email || "No contact info"}</div></td>
                <td><div className={styles.mainLine}>{dateWindow(lead)}</div><div className={styles.subLine}>Last activity {formatDate(lead.shopping_last_activity_at)}</div></td>
                <td><div className={styles.mainLine}>{lead.interest_label || lead.drafts?.[0]?.experience_name || "Not specified"}</div><div className={styles.subLine}>{lead.party_needs || lead.drafts?.[0]?.option_name || ""}</div></td>
                <td>{lead.source_method || lead.drafts?.[0]?.trip_method || "—"}</td>
                <td>{lead.claimed_by_name || lead.assigned_rep_name || <span className={styles.unclaimed}>Unclaimed</span>}</td>
                <td className={styles.center}><strong>{lead.draft_count || lead.drafts?.length || 0}</strong></td>
                <td className={styles.money}>{money.format((lead.lead_value_cents || 0) / 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length ? <div className={styles.empty}>No open leads match that search.</div> : null}
      </div>

      {selected ? (
        <div className={styles.backdrop} onMouseDown={() => setSelectedId(null)}>
          <aside className={styles.drawer} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div><div className={styles.eyebrow}>Sales Lead</div><h2>{selected.customer_name || "Unnamed lead"}</h2><p>{selected.email || "No email"} · {selected.phone_e164 || "No phone"}</p></div>
              <button className={styles.close} onClick={() => setSelectedId(null)}>×</button>
            </div>

            <div className={styles.drawerActions}>
              <a className={styles.primaryAction} href={`/?lead=${encodeURIComponent(selected.id)}`}>Build Quote</a>
              {selected.claimed_by_name ? <button className={styles.secondaryAction} disabled={busy} onClick={() => mutateLead("release")}>Release Lead</button> : <button className={styles.secondaryAction} disabled={busy} onClick={() => mutateLead("claim")}>Claim Lead</button>}
            </div>
            {actionError ? <div className={styles.actionError}>{actionError}</div> : null}

            <div className={styles.factGrid}>
              <div><span>Visit Window</span><strong>{dateWindow(selected)}</strong></div>
              <div><span>Lead Value</span><strong>{money.format((selected.lead_value_cents || 0) / 100)}</strong></div>
              <div><span>Claimed By</span><strong>{selected.claimed_by_name || "Unclaimed"}</strong></div>
              <div><span>Method</span><strong>{selected.source_method || "—"}</strong></div>
            </div>

            {(selected.lead_capture_note || selected.party_needs) ? <section className={styles.drawerSection}><h3>Lead Details</h3>{selected.party_needs ? <p>{selected.party_needs}</p> : null}{selected.lead_capture_note ? <p>{selected.lead_capture_note}</p> : null}</section> : null}

            <section className={styles.drawerSection}>
              <div className={styles.sectionHeading}><h3>Activity Timeline</h3><span>{timeline.length} items</span></div>
              {timeline.length ? timeline.map((item) => <div className={`${styles.timelineItem} ${styles[`kind_${item.kind}`] || ""}`} key={item.id}><div className={styles.timelineTop}><strong>{item.title}</strong><span>{formatDateTime(item.at)}</span></div>{item.body ? <div className={styles.timelineBody}>{item.body}</div> : null}{item.meta ? <div className={styles.recordMeta}>{item.meta}</div> : null}{item.href ? <a className={styles.recordingLink} href={item.href} target="_blank" rel="noreferrer">Play recording</a> : null}</div>) : <p className={styles.mutedText}>No linked activity yet.</p>}
            </section>

            <section className={styles.drawerSection}>
              <h3>Add Note</h3>
              <textarea className={styles.noteBox} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note for the sales team…" maxLength={4000} />
              <button className={styles.secondaryAction} disabled={busy || !noteText.trim()} onClick={() => mutateLead("note")}>{busy ? "Saving…" : "Save Note"}</button>
            </section>

            <section className={styles.drawerSection}><h3>TripWorks Drafts</h3>{selected.drafts?.length ? selected.drafts.map((draft) => <div className={styles.recordCard} key={draft.id}><div className={styles.recordTitle}>{draft.experience_name || "TripWorks draft"}</div><div>{draft.option_name || ""}</div><div className={styles.recordMeta}>{formatDate(draft.activity_date)} · {money.format((draft.value_cents || 0) / 100)} · {draft.confirmation_code || "No code"}</div><div className={styles.recordMeta}>Created by {draft.created_by_name || "Unknown"} · {draft.last_trip_status || "Draft"}</div></div>) : <p className={styles.mutedText}>No linked TripWorks drafts.</p>}</section>

            <section className={styles.drawerSection}><h3>Assignment History</h3>{selected.assignments?.length ? selected.assignments.map((assignment) => <div className={styles.recordCard} key={assignment.id}><div className={styles.recordTitle}>{assignment.assigned_rep_name || "Unassigned"}</div><div className={styles.recordMeta}>Assigned {formatDate(assignment.assigned_at)}{assignment.unassigned_at ? ` · Ended ${formatDate(assignment.unassigned_at)}` : " · Current"}</div></div>) : <p className={styles.mutedText}>No assignment history.</p>}</section>
          </aside>
        </div>
      ) : null}
    </>
  );
}
