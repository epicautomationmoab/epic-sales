"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getRecentSalesQuotes,
  getSalesExperienceFees,
  getSalesQuoteDetail,
  getSalesRates,
  saveSalesQuote,
  type RecentSalesQuote,
  type SalesExperienceFee,
  type SalesRateRow,
} from "../lib/sales-data";

type Ticket = { id: string; name: string; price: number; note?: string };
type Experience = { id: string; name: string; line: "tour" | "rental"; tickets: Ticket[] };
type QuoteActivity = {
  key: string;
  experienceId: string;
  qty: Record<string, number>;
  tripSafe: boolean;
  premier: boolean;
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function ticketSortRank(name: string) {
  const value = name.toLowerCase();
  if (value.includes("3 hour")) return 10;
  if (value.includes("5 hour") || value.includes("half-day") || value.includes("half day")) return 20;
  if (value.includes("9 hour") || value.includes("full-day") || value.includes("full day")) return 30;
  if (value.includes("24 hour")) return 40;
  const dayMatch = value.match(/(\d+)\s*[- ]?day/);
  if (dayMatch) return 40 + Number(dayMatch[1]) * 10;
  if (value.includes("vehicle") || value.includes("rzr") || value.includes("pro r") || value.includes("pro s") || value.includes("xpedition")) return 100;
  if (value.includes("guide car")) return 210;
  return 500;
}

function rentalDaysFromTicket(name: string) {
  const value = name.toLowerCase();
  const dayMatch = value.match(/(\d+)\s*[- ]?day/);
  return dayMatch ? Number(dayMatch[1]) : 1;
}

function buildExperiences(rows: SalesRateRow[]): Experience[] {
  const grouped = new Map<string, Experience>();
  for (const row of rows) {
    const line: "tour" | "rental" = row.business_line === "rental" ? "rental" : "tour";
    if (!grouped.has(row.experience_id)) {
      grouped.set(row.experience_id, {
        id: row.experience_id,
        name: row.experience_name || `Experience ${row.experience_id}`,
        line,
        tickets: [],
      });
    }
    grouped.get(row.experience_id)!.tickets.push({
      id: row.ticket_type_id,
      name: row.ticket_type_name,
      price: row.unit_price_cents / 100,
      note: row.sales_help_text || row.quantity_label || "Sales rate",
    });
  }

  for (const experience of grouped.values()) {
    experience.tickets.sort((a, b) => {
      const rank = ticketSortRank(a.name) - ticketSortRank(b.name);
      return rank || a.name.localeCompare(b.name);
    });
  }

  return Array.from(grouped.values()).sort((a, b) => {
    if (a.line !== b.line) return a.line === "tour" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function blankActivity(experienceId = ""): QuoteActivity {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    experienceId,
    qty: {},
    tripSafe: false,
    premier: false,
  };
}

function quoteName(quote: RecentSalesQuote) {
  return quote.customer_name || quote.customer_email || quote.customer_phone_e164 || `Quote ${quote.quote_id.slice(0, 8)}`;
}

function dateRange(quote: RecentSalesQuote) {
  if (!quote.visit_start_date) return "Dates not set";
  if (!quote.visit_end_date || quote.visit_end_date === quote.visit_start_date) return quote.visit_start_date;
  return `${quote.visit_start_date} to ${quote.visit_end_date}`;
}

export default function QuoteBuilder() {
  const [active, setActive] = useState<"leads" | "quotes">("quotes");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [experienceFees, setExperienceFees] = useState<SalesExperienceFee[]>([]);
  const [activities, setActivities] = useState<QuoteActivity[]>([blankActivity()]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [visitStart, setVisitStart] = useState("");
  const [visitEnd, setVisitEnd] = useState("");
  const [recentQuotes, setRecentQuotes] = useState<RecentSalesQuote[]>([]);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    Promise.all([getSalesRates(), getSalesExperienceFees()])
      .then(([rows, fees]) => {
        const built = buildExperiences(rows);
        setExperiences(built);
        setExperienceFees(fees);
        if (built.length) setActivities([blankActivity(built[0].id)]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load sales pricing"))
      .finally(() => setLoading(false));

    getRecentSalesQuotes().then(setRecentQuotes).catch(() => undefined);
  }, []);

  function updateActivity(key: string, changes: Partial<QuoteActivity>) {
    setActivities((current) => current.map((item) => item.key === key ? { ...item, ...changes } : item));
  }

  function changeExperience(key: string, experienceId: string) {
    updateActivity(key, { experienceId, qty: {}, tripSafe: false, premier: false });
  }

  function changeQty(activityKey: string, ticketId: string, delta: number) {
    setActivities((current) => current.map((item) => {
      if (item.key !== activityKey) return item;
      return { ...item, qty: { ...item.qty, [ticketId]: Math.max(0, (item.qty[ticketId] ?? 0) + delta) } };
    }));
  }

  function addActivity() {
    setActivities((current) => [...current, blankActivity(experiences[0]?.id || "")]);
  }

  function removeActivity(key: string) {
    setActivities((current) => current.length === 1 ? current : current.filter((item) => item.key !== key));
  }

  function newQuote() {
    setEditingQuoteId(null);
    setActivities([blankActivity(experiences[0]?.id || "")]);
    setName("");
    setEmail("");
    setPhone("");
    setVisitStart("");
    setVisitEnd("");
    setSaveMessage("");
    setActive("quotes");
  }

  async function openQuote(quoteId: string) {
    setOpening(true);
    setSaveMessage("");
    try {
      const detail = await getSalesQuoteDetail(quoteId);
      const q = detail.quote;
      setEditingQuoteId(quoteId);
      setName(String(q.customer_name || ""));
      setEmail(String(q.customer_email || ""));
      setPhone(String(q.customer_phone_e164 || ""));
      setVisitStart(String(q.visit_start_date || ""));
      setVisitEnd(String(q.visit_end_date || ""));
      setActivities(detail.activities.map((activity) => ({
        key: activity.id,
        experienceId: activity.experience_id,
        tripSafe: activity.tripsafe_selected,
        premier: activity.premier_selected,
        qty: Object.fromEntries(activity.items.map((item) => [item.ticket_type_id, item.quantity])),
      })));
      setActive("quotes");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Unable to open quote.");
    } finally {
      setOpening(false);
    }
  }

  const calculatedActivities = useMemo(() => activities.map((activity) => {
    const experience = experiences.find((item) => item.id === activity.experienceId);
    const privateFeeRule = experienceFees.find((fee) => fee.experience_id === activity.experienceId);
    const privateFee = privateFeeRule ? privateFeeRule.fee_cents / 100 : 0;
    const subtotal = experience ? experience.tickets.reduce((sum, ticket) => sum + ticket.price * (activity.qty[ticket.id] ?? 0), 0) : 0;
    const pricingBase = subtotal + privateFee;
    const primaryTaxRate = experience?.line === "rental" ? 0.0635 : 0.0735;
    const secondaryTaxRate = experience?.line === "rental" ? 0.025 : 0;
    const primaryTax = pricingBase * primaryTaxRate;
    const secondaryTax = pricingBase * secondaryTaxRate;
    const tripSafeAmount = activity.tripSafe ? pricingBase * 0.09 : 0;
    let rentalDays = 1;
    if (experience?.line === "rental") {
      rentalDays = experience.tickets.reduce((maxDays, ticket) => {
        return (activity.qty[ticket.id] ?? 0) > 0 ? Math.max(maxDays, rentalDaysFromTicket(ticket.name)) : maxDays;
      }, 1);
    }
    const premierAmount = experience?.line === "rental" && activity.premier ? 69 * rentalDays : 0;
    const twBase = pricingBase + primaryTax + secondaryTax + tripSafeAmount + premierAmount;
    const twFee = twBase * 0.04;
    const total = twBase + twFee;
    return {
      activity,
      experience,
      privateFeeRule,
      privateFee,
      subtotal,
      primaryTax,
      secondaryTax,
      tripSafeAmount,
      premierAmount,
      rentalDays,
      twFee,
      total,
    };
  }), [activities, experiences, experienceFees]);

  const totals = calculatedActivities.reduce((sum, item) => ({
    subtotal: sum.subtotal + item.subtotal,
    privateFees: sum.privateFees + item.privateFee,
    tax: sum.tax + item.primaryTax + item.secondaryTax,
    tripSafe: sum.tripSafe + item.tripSafeAmount,
    premier: sum.premier + item.premierAmount,
    twFee: sum.twFee + item.twFee,
    total: sum.total + item.total,
  }), { subtotal: 0, privateFees: 0, tax: 0, tripSafe: 0, premier: 0, twFee: 0, total: 0 });

  const hasAnyTicket = activities.some((activity) => Object.values(activity.qty).some((quantity) => quantity > 0));

  async function handleSave() {
    if (!hasAnyTicket) {
      setSaveMessage("Add at least one ticket before saving the estimate.");
      return;
    }
    setSaving(true);
    setSaveMessage("");
    try {
      const result = await saveSalesQuote({
        quoteId: editingQuoteId,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        visitStart,
        visitEnd,
        activities: activities.map((activity) => ({
          experienceId: activity.experienceId,
          tripSafe: activity.tripSafe,
          premier: activity.premier,
          tickets: Object.entries(activity.qty)
            .filter(([, quantity]) => quantity > 0)
            .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity })),
        })),
      });
      setEditingQuoteId(result.quote_id);
      setDetailsOpen(false);
      setSaveMessage(result.lead_created_or_attached
        ? `Estimate saved and attached to the lead. Quote ${result.quote_id.slice(0, 8)}.`
        : `Estimate saved as quote ${result.quote_id.slice(0, 8)}. Add email or phone later to attach it to a lead.`);
      getRecentSalesQuotes().then(setRecentQuotes).catch(() => undefined);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Unable to save estimate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">Epic <span>Sales</span></div>
        <nav className="nav">
          <button className={active === "leads" ? "active" : ""} onClick={() => setActive("leads")}>Leads</button>
          <button className={active === "quotes" ? "active" : ""} onClick={() => setActive("quotes")}>Quote Builder</button>
        </nav>
      </header>

      <section className="content">
        {active === "leads" ? (
          <div className="card">
            <div className="sectionHeading">
              <div><h2>Saved Quotes & Leads</h2><p className="muted compact">Open any quote to add contact info, dates, or change the estimate.</p></div>
              <button className="secondary" onClick={newQuote}>+ Build Estimate</button>
            </div>
            {recentQuotes.length === 0 ? <p className="muted">No saved quotes yet.</p> : recentQuotes.map((quote) => (
              <div className="leadRow" key={quote.quote_id}>
                <div><strong>{quoteName(quote)}</strong><div className="ticketMeta">Quote {quote.quote_id.slice(0, 8)} · {dateRange(quote)}</div></div>
                <span className="muted">{quote.opportunity_id ? "Lead attached" : "Quote only"}</span>
                <span className="badge">{quote.status}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <strong>{money.format(quote.total_cents / 100)}</strong>
                  <button className="secondary" onClick={() => openQuote(quote.quote_id)} disabled={opening}>{opening ? "Opening..." : "Open / Edit"}</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid quoteGrid">
            <section>
              <div className="sectionHeading">
                <div><h2>{editingQuoteId ? `Edit Quote ${editingQuoteId.slice(0, 8)}` : "Build Estimate"}</h2><p className="muted compact">One quote can include multiple tours and rentals.</p></div>
                <button className="secondary" type="button" onClick={addActivity} disabled={!experiences.length}>+ Add Activity</button>
              </div>
              {loading && <div className="card"><p className="muted">Loading Epic experiences and ticket types...</p></div>}
              {error && <div className="card"><p className="muted">{error}</p></div>}
              {!loading && !error && calculatedActivities.map(({ activity, experience, privateFeeRule, privateFee, rentalDays }, index) => experience && (
                <div className="card activityCard" key={activity.key}>
                  <div className="activityHeader"><div className="activityNumber">Activity {index + 1}</div>{activities.length > 1 && <button className="removeLink" type="button" onClick={() => removeActivity(activity.key)}>Remove</button>}</div>
                  <div className="field"><label>Experience</label><select value={activity.experienceId} onChange={(e) => changeExperience(activity.key, e.target.value)}>{experiences.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                  {experience.tickets.map((ticket) => (
                    <div className="ticketRow" key={ticket.id}>
                      <div><div className="ticketTitle">{ticket.name} - {money.format(ticket.price)}</div><div className="ticketMeta">{ticket.note}</div></div>
                      <div className="qty"><button onClick={() => changeQty(activity.key, ticket.id, -1)}>-</button><span>{activity.qty[ticket.id] ?? 0}</span><button onClick={() => changeQty(activity.key, ticket.id, 1)}>+</button></div>
                    </div>
                  ))}
                  {privateFeeRule && (
                    <div className="toggleRow">
                      <div><strong>{privateFeeRule.fee_label}</strong><div className="ticketMeta">Automatically added once to this private tour, regardless of vehicle quantity.</div></div>
                      <strong>{money.format(privateFee)}</strong>
                    </div>
                  )}
                  <div className="toggleRow"><div><strong>TripSafe</strong><div className="ticketMeta">Optional protection at 9% for this activity</div></div><input type="checkbox" checked={activity.tripSafe} onChange={(e) => updateActivity(activity.key, { tripSafe: e.target.checked })} /></div>
                  {experience.line === "rental" && (
                    <div className="toggleRow">
                      <div><strong>Premier Adventure Assure</strong><div className="ticketMeta">$69/day · currently {rentalDays} day{rentalDays === 1 ? "" : "s"}</div></div>
                      <input type="checkbox" checked={activity.premier} onChange={(e) => updateActivity(activity.key, { premier: e.target.checked })} />
                    </div>
                  )}
                </div>
              ))}
              {!loading && !error && <button className="addActivityFull" type="button" onClick={addActivity}>+ Add Another Activity</button>}
            </section>

            <section className="card summaryCard">
              <h2>Quote Summary</h2>
              {calculatedActivities.map(({ activity, experience, total }, index) => experience && (
                <div className="quoteActivitySummary" key={activity.key}><div><strong>{index + 1}. {experience.name}</strong></div><strong>{money.format(total)}</strong></div>
              ))}
              <div className="summaryRow"><span>Ticket subtotal</span><strong>{money.format(totals.subtotal)}</strong></div>
              {totals.privateFees > 0 && <div className="summaryRow"><span>Private Tour Fee{calculatedActivities.filter((item) => item.privateFee > 0).length > 1 ? "s" : ""}</span><strong>{money.format(totals.privateFees)}</strong></div>}
              <div className="summaryRow"><span>Taxes</span><strong>{money.format(totals.tax)}</strong></div>
              <div className="summaryRow"><span>TripSafe</span><strong>{money.format(totals.tripSafe)}</strong></div>
              {totals.premier > 0 && <div className="summaryRow"><span>Premier Adventure Assure</span><strong>{money.format(totals.premier)}</strong></div>}
              <div className="summaryRow"><span>TripWorks booking fee (4%)</span><strong>{money.format(totals.twFee)}</strong></div>
              <div className="summaryRow total"><span>Estimated OTD</span><span>{money.format(totals.total)}</span></div>
              <button className="primary" type="button" onClick={() => setDetailsOpen(true)}>{editingQuoteId ? "Update Estimate" : "Save Estimate"}</button>
              {saveMessage && <p className="ticketMeta" style={{ marginBottom: 0 }}>{saveMessage}</p>}
            </section>
          </div>
        )}
      </section>

      {detailsOpen && (
        <div className="modalBackdrop" onMouseDown={() => setDetailsOpen(false)}>
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <div className="sectionHeading"><div><h2>{editingQuoteId ? "Update Quote Details" : "Save Quote"}</h2><p className="muted compact">Contact info is optional unless you want this attached to a lead.</p></div><button className="removeLink" onClick={() => setDetailsOpen(false)}>Close</button></div>
            <div className="field"><label>Guest name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" /></div>
            <div className="field"><label>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" /></div>
            <div className="field"><label>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" /></div>
            <div className="modalDates">
              <div className="field"><label>Moab arrival / first activity</label><input type="date" value={visitStart} onChange={(e) => setVisitStart(e.target.value)} /></div>
              <div className="field"><label>Moab departure / last activity</label><input type="date" value={visitEnd} onChange={(e) => setVisitEnd(e.target.value)} /></div>
            </div>
            <button className="primary" type="button" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editingQuoteId ? "Update Quote" : "Save Quote"}</button>
            <button className="secondary modalSecondary" type="button" disabled={!email}>Save & Email Quote (email wiring next)</button>
          </div>
        </div>
      )}
    </main>
  );
}
