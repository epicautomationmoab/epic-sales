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
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function dateWindow(lead: SalesLead) {
  if (!lead.activity_window_start) return "No dates yet";
  if (!lead.activity_window_end || lead.activity_window_end === lead.activity_window_start) return formatDate(lead.activity_window_start);
  return `${formatDate(lead.activity_window_start)} – ${formatDate(lead.activity_window_end)}`;
}

export default function LeadsClient({ leads }: { leads: SalesLead[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SalesLead | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((lead) => [lead.customer_name, lead.email, lead.phone_e164, lead.interest_label, lead.claimed_by_name, lead.assigned_rep_name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q)));
  }, [leads, query]);

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
              <tr key={lead.id} onClick={() => setSelected(lead)}>
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
        <div className={styles.backdrop} onMouseDown={() => setSelected(null)}>
          <aside className={styles.drawer} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div><div className={styles.eyebrow}>Sales Lead</div><h2>{selected.customer_name || "Unnamed lead"}</h2><p>{selected.email || "No email"} · {selected.phone_e164 || "No phone"}</p></div>
              <button className={styles.close} onClick={() => setSelected(null)}>×</button>
            </div>

            <div className={styles.drawerActions}>
              <a className={styles.primaryAction} href={`/?lead=${encodeURIComponent(selected.id)}`}>Build Quote</a>
            </div>

            <div className={styles.factGrid}>
              <div><span>Visit Window</span><strong>{dateWindow(selected)}</strong></div>
              <div><span>Lead Value</span><strong>{money.format((selected.lead_value_cents || 0) / 100)}</strong></div>
              <div><span>Claimed By</span><strong>{selected.claimed_by_name || "Unclaimed"}</strong></div>
              <div><span>Method</span><strong>{selected.source_method || "—"}</strong></div>
            </div>

            {(selected.lead_capture_note || selected.party_needs) ? <section className={styles.drawerSection}><h3>Lead Details</h3>{selected.party_needs ? <p>{selected.party_needs}</p> : null}{selected.lead_capture_note ? <p>{selected.lead_capture_note}</p> : null}</section> : null}

            <section className={styles.drawerSection}><h3>TripWorks Drafts</h3>{selected.drafts?.length ? selected.drafts.map((draft) => <div className={styles.recordCard} key={draft.id}><div className={styles.recordTitle}>{draft.experience_name || "TripWorks draft"}</div><div>{draft.option_name || ""}</div><div className={styles.recordMeta}>{formatDate(draft.activity_date)} · {money.format((draft.value_cents || 0) / 100)} · {draft.confirmation_code || "No code"}</div><div className={styles.recordMeta}>Created by {draft.created_by_name || "Unknown"} · {draft.last_trip_status || "Draft"}</div></div>) : <p className={styles.mutedText}>No linked TripWorks drafts.</p>}</section>

            <section className={styles.drawerSection}><h3>Notes</h3>{selected.notes?.length ? selected.notes.map((note) => <div className={styles.recordCard} key={note.id}><div>{note.note_text || ""}</div><div className={styles.recordMeta}>{note.author_name || "Unknown"} · {formatDate(note.created_at)}</div></div>) : <p className={styles.mutedText}>No notes yet.</p>}</section>

            <section className={styles.drawerSection}><h3>Assignment History</h3>{selected.assignments?.length ? selected.assignments.map((assignment) => <div className={styles.recordCard} key={assignment.id}><div className={styles.recordTitle}>{assignment.assigned_rep_name || "Unassigned"}</div><div className={styles.recordMeta}>Assigned {formatDate(assignment.assigned_at)}{assignment.unassigned_at ? ` · Ended ${formatDate(assignment.unassigned_at)}` : " · Current"}</div></div>) : <p className={styles.mutedText}>No assignment history.</p>}</section>
          </aside>
        </div>
      ) : null}
    </>
  );
}
