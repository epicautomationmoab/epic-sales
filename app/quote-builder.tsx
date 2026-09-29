"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getRecentSalesQuotes,
  getSalesExperienceFees,
  getSalesBookingLinks,
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
  const [bookingLinks, setBookingLinks] = useState<Record<string, string>>({});
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
  const [emailing, setEmailing] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const customerQuery = new URLSearchParams();
    const contact = params.get("contact");
    const opportunity = params.get("opportunity");
    const reservation = params.get("reservation");
    if (contact) customerQuery.set("contact", contact);
    if (opportunity) customerQuery.set("opportunity", opportunity);
    if (reservation) customerQuery.set("reservation", reservation);
    if (customerQuery.size) {
      fetch(`/api/customer-360?${customerQuery.toString()}`, { cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json().catch(() => null);
          if (!response.ok) throw new Error(payload?.error || "Unable to load customer details.");
          return payload?.customer || null;
        })
        .then((customer) => {
          if (!customer?.identity) return;
          setName(String(customer.identity.name || ""));
          setEmail(String(customer.identity.email || ""));
          setPhone(String(customer.identity.phone || ""));
        })
        .catch((err) => setSaveMessage(err instanceof Error ? err.message : "Unable to load customer details."));
    }

    Promise.all([getSalesRates(), getSalesExperienceFees(), getSalesBookingLinks()])
      .then(([rows, fees, links]) => {
        const built = buildExperiences(rows);
        setExperiences(built);
        setExperienceFees(fees);
        setBookingLinks(Object.fromEntries(links.map((link) => [link.experience_id, link.booking_url])));
        setActivities([blankActivity()]);
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
    setActivities((current) => [...current, blankActivity()]);
  }

  function removeActivity(key: string) {
    setActivities((current) => current.filter((item) => item.key !== key));
  }

  function newQuote() {
    setEditingQuoteId(null);
    setActivities([blankActivity()]);
    setName("");
    setEmail("");
    setPhone("");
    setVisitStart("");
    setVisitEnd("");
    setDetailsOpen(false);
    setSaveMessage("");
    setActive("quotes");
    window.history.replaceState({}, "", window.location.pathname);
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

  async function handleSaveAndEmail() {
    if (!email.trim()) { setSaveMessage("Add a guest email before sending the quote."); return; }
    if (!hasAnyTicket) { setSaveMessage("Add at least one ticket before sending the quote."); return; }
    setEmailing(true); setSaveMessage("");
    try {
      const result = await saveSalesQuote({
        quoteId: editingQuoteId, customerName: name, customerEmail: email, customerPhone: phone,
        visitStart, visitEnd,
        activities: activities.map((activity) => ({
          experienceId: activity.experienceId, tripSafe: activity.tripSafe, premier: activity.premier,
          tickets: Object.entries(activity.qty).filter(([, quantity]) => quantity > 0)
            .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity })),
        })),
      });
      setEditingQuoteId(result.quote_id);
      const first = name.trim().split(/\s+/)[0] || "there";
      const lines = [`Hi ${first},`, "", "I’m excited to help you plan your Moab adventure. I’ve put together the quote below based on your request."];
      for (const item of calculatedActivities) {
        if (!item.experience) continue;
        lines.push("", item.experience.name);
        for (const ticket of item.experience.tickets) {
          const qty = item.activity.qty[ticket.id] ?? 0;
          if (qty > 0) lines.push(`• ${qty} × ${ticket.name} — ${money.format(ticket.price * qty)}`);
        }
        if (item.privateFee > 0) lines.push(`• ${item.privateFeeRule?.fee_label || "Private Tour Fee"} — ${money.format(item.privateFee)}`);
        if (item.activity.tripSafe) lines.push("• TripSafe selected");
        if (item.activity.premier) lines.push("• Premier Adventure Assure selected");
        if (calculatedActivities.filter((activity) => activity.experience).length > 1) lines.push(`Estimated activity total: ${money.format(item.total)}`);
      }
      lines.push("", `Estimated Trip Total: ${money.format(totals.total)}`, "",
        "I'll follow up as we discussed. In the meantime, please call me at 435-220-2700 if you have any questions or if you're ready to book. I'd be happy to take care of it for you.");
      const online = calculatedActivities.filter((item) => item.experience && bookingLinks[item.experience.id]);
      if (online.length) {
        lines.push("", "Prefer to book online?");
        for (const item of online) lines.push("", item.experience!.name, bookingLinks[item.experience!.id]);
        lines.push("", "Availability is not held until a reservation is completed. Online booking will let you choose from currently available dates and departure times.");
      }
      const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
      const quoteCards = calculatedActivities.filter((item) => item.experience).map((item) => {
        const detailRows = item.experience!.tickets.flatMap((ticket) => {
          const qty = item.activity.qty[ticket.id] ?? 0;
          return qty > 0 ? [`<div style="padding:4px 0">• ${qty} × ${escapeHtml(ticket.name)} — ${money.format(ticket.price * qty)}</div>`] : [];
        });
        if (item.privateFee > 0) detailRows.push(`<div style="padding:4px 0">• ${escapeHtml(item.privateFeeRule?.fee_label || "Private Tour Fee")} — ${money.format(item.privateFee)}</div>`);
        if (item.activity.tripSafe) detailRows.push(`<div style="padding:4px 0">• TripSafe — ${money.format(item.tripSafeAmount)}</div>`);
        if (item.activity.premier) detailRows.push(`<div style="padding:4px 0">• Premier Adventure Assure — ${money.format(item.premierAmount)}</div>`);
        detailRows.push(`<div style="padding:4px 0">• Taxes — ${money.format(item.primaryTax + item.secondaryTax)}</div>`);
        detailRows.push(`<div style="padding:4px 0">• TripWorks booking fee (4%) — ${money.format(item.twFee)}</div>`);
        return `<div style="margin:18px 0;padding:18px 20px;border:1px solid #e5e7eb;border-left:4px solid #d9471c;border-radius:8px;background:#ffffff"><div style="font-size:17px;font-weight:700;margin-bottom:8px">${escapeHtml(item.experience!.name)}</div>${detailRows.join("")}<div style="margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-weight:700"><span>Estimated activity total</span><span>${money.format(item.total)}</span></div></div>`;
      }).join("");
      const onlineButtons = online.map((item) => `<div style="margin:7px 0"><a href="${escapeHtml(bookingLinks[item.experience!.id])}" style="color:#d9471c;text-decoration:underline;font-weight:600">Learn more about ${escapeHtml(item.experience!.name)}</a></div>`).join("");
      const messageHtml = `<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:15px;line-height:1.6;max-width:680px"><div style="border-top:5px solid #d9471c;padding-top:22px"><div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#d9471c">Epic 4X4 Adventures</div><div style="font-size:26px;font-weight:700;margin:4px 0 22px">Your Moab Adventure Quote</div><p>Hi ${escapeHtml(first)},</p><p>I’m excited to help you plan your Moab adventure. I’ve put together the quote below based on your request.</p>${quoteCards}<div style="margin:22px 0;padding:16px 20px;background:#f5f5f5;border-radius:8px"><div style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280">Estimated Trip Total</div><div style="font-size:26px;font-weight:700">${money.format(totals.total)}</div></div><p>I’ll follow up as we discussed. In the meantime, please call me at <a href="tel:+14352202700" style="color:#d9471c;text-decoration:none;font-weight:600">435-220-2700</a> if you have any questions or if you’re ready to book. I’d be happy to take care of it for you.</p>${online.length ? `<div style="margin-top:26px"><div style="font-size:15px;font-weight:700;margin-bottom:6px">Want to learn more?</div>${onlineButtons}<p style="font-size:13px;color:#6b7280;margin-top:12px">Availability is not held until a reservation is completed. Online booking will let you choose from currently available dates and departure times.</p></div>` : ""}</div></div>`;
      const response = await fetch("/api/customer-communications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "email", opportunity_id: result.opportunity_id, email: email.trim(),
          customer_name: name.trim() || null, subject: "Your Epic 4X4 Adventure Quote", message_text: lines.join("\n"), message_html: messageHtml
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Unable to send quote email.");
      setDetailsOpen(false);
      setSaveMessage(`Quote emailed to ${email.trim()}.`);
      getRecentSalesQuotes().then(setRecentQuotes).catch(() => undefined);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Unable to save and email quote.");
    } finally { setEmailing(false); }
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
                <div><h2>{editingQuoteId ? `Edit Quote ${editingQuoteId.slice(0, 8)}` : "Build Estimate"}</h2></div>
                <button className="secondary" type="button" onClick={newQuote}>+ New Quote</button>
              </div>
              {loading && <div className="card"><p className="muted">Loading Epic experiences and ticket types...</p></div>}
              {error && <div className="card"><p className="muted">{error}</p></div>}
              {!loading && !error && calculatedActivities.map(({ activity, experience, privateFeeRule, privateFee, rentalDays }, index) => (
                <div className="card activityCard" key={activity.key}>
                  <div className="activityHeader"><div className="activityNumber">Activity {index + 1}</div>{activities.length > 1 && <button className="removeLink" type="button" onClick={() => removeActivity(activity.key)}>Remove</button>}</div>
                  <div className="field"><label>Experience</label><select value={activity.experienceId} onChange={(e) => changeExperience(activity.key, e.target.value)}><option value="">None</option>{experiences.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
                  {experience ? experience.tickets.map((ticket) => (
                    <div className="ticketRow" key={ticket.id}>
                      <div><div className="ticketTitle">{ticket.name} - {money.format(ticket.price)}</div><div className="ticketMeta">{ticket.note}</div></div>
                      <div className="qty"><button onClick={() => changeQty(activity.key, ticket.id, -1)}>-</button><span>{activity.qty[ticket.id] ?? 0}</span><button onClick={() => changeQty(activity.key, ticket.id, 1)}>+</button></div>
                    </div>
                  )) : null}
                  {privateFeeRule && (
                    <div className="toggleRow">
                      <div><strong>{privateFeeRule.fee_label}</strong><div className="ticketMeta">Automatically added once to this private tour, regardless of vehicle quantity.</div></div>
                      <strong>{money.format(privateFee)}</strong>
                    </div>
                  )}
                  {experience ? <div className="toggleRow"><div><strong>TripSafe</strong><div className="ticketMeta">Optional protection at 9% for this activity</div></div><input type="checkbox" checked={activity.tripSafe} onChange={(e) => updateActivity(activity.key, { tripSafe: e.target.checked })} /></div> : null}
                  {experience?.line === "rental" && (
                    <div className="toggleRow">
                      <div><strong>Premier Adventure Assure</strong><div className="ticketMeta">$69/day · currently {rentalDays} day{rentalDays === 1 ? "" : "s"}</div></div>
                      <input type="checkbox" checked={activity.premier} onChange={(e) => updateActivity(activity.key, { premier: e.target.checked })} />
                    </div>
                  )}
                </div>
              ))}
              {!loading && !error && <button className="addActivityFull" type="button" onClick={addActivity}>{activities.length ? "+ Add Another Activity" : "+ Add Activity"}</button>}
            </section>

            <section className="card summaryCard">
              <h2>Quote Summary</h2>
              {!calculatedActivities.some((item) => Boolean(item.experience)) ? <p className="muted">Add an activity to begin an estimate.</p> : null}
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
            <button className="secondary modalSecondary" type="button" onClick={handleSaveAndEmail} disabled={!email || saving || emailing}>{emailing ? "Saving & Emailing..." : "Save & Email Quote"}</button>
          </div>
        </div>
      )}
    </main>
  );
}
