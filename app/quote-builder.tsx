"use client";

import { useEffect, useMemo, useState } from "react";
import { getSalesRates, saveSalesQuote, type SalesRateRow } from "../lib/sales-data";

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
  if (value.includes("guest") || value.includes("adult rider")) return 200;
  if (value.includes("guide car")) return 210;
  if (value.includes("terms")) return 999;
  return 500;
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
      note: row.sales_help_text || row.quantity_label || "Placeholder rate",
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

export default function QuoteBuilder() {
  const [active, setActive] = useState<"leads" | "quotes">("quotes");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [activities, setActivities] = useState<QuoteActivity[]>([blankActivity()]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    getSalesRates()
      .then((rows) => {
        const built = buildExperiences(rows);
        setExperiences(built);
        if (built.length) setActivities([blankActivity(built[0].id)]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load sales rates"))
      .finally(() => setLoading(false));
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
      return {
        ...item,
        qty: { ...item.qty, [ticketId]: Math.max(0, (item.qty[ticketId] ?? 0) + delta) },
      };
    }));
  }

  function addActivity() {
    setActivities((current) => [...current, blankActivity(experiences[0]?.id || "")]);
  }

  function removeActivity(key: string) {
    setActivities((current) => current.length === 1 ? current : current.filter((item) => item.key !== key));
  }

  const calculatedActivities = useMemo(() => activities.map((activity) => {
    const experience = experiences.find((item) => item.id === activity.experienceId);
    const subtotal = experience ? experience.tickets.reduce((sum, ticket) => sum + ticket.price * (activity.qty[ticket.id] ?? 0), 0) : 0;
    const primaryTaxRate = experience?.line === "rental" ? 0.0635 : 0.0735;
    const secondaryTaxRate = experience?.line === "rental" ? 0.025 : 0;
    const primaryTax = subtotal * primaryTaxRate;
    const secondaryTax = subtotal * secondaryTaxRate;
    const tripSafeAmount = activity.tripSafe ? subtotal * 0.09 : 0;
    const premierAmount = experience?.line === "rental" && activity.premier ? 69 : 0;
    const twBase = subtotal + primaryTax + secondaryTax + tripSafeAmount + premierAmount;
    const twFee = twBase * 0.04;
    const total = twBase + twFee;
    return { activity, experience, subtotal, primaryTax, secondaryTax, tripSafeAmount, premierAmount, twFee, total };
  }), [activities, experiences]);

  const totals = calculatedActivities.reduce((sum, item) => ({
    subtotal: sum.subtotal + item.subtotal,
    tax: sum.tax + item.primaryTax + item.secondaryTax,
    tripSafe: sum.tripSafe + item.tripSafeAmount,
    premier: sum.premier + item.premierAmount,
    twFee: sum.twFee + item.twFee,
    total: sum.total + item.total,
  }), { subtotal: 0, tax: 0, tripSafe: 0, premier: 0, twFee: 0, total: 0 });

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
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        activities: activities.map((activity) => ({
          experienceId: activity.experienceId,
          tripSafe: activity.tripSafe,
          premier: activity.premier,
          tickets: Object.entries(activity.qty)
            .filter(([, quantity]) => quantity > 0)
            .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity })),
        })),
      });
      setSaveMessage(result.lead_created_or_attached
        ? `Estimate saved and attached to the lead. Quote ${result.quote_id.slice(0, 8)}.`
        : `Estimate saved. Add an email or phone number to create/attach a lead. Quote ${result.quote_id.slice(0, 8)}.`);
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
            <h2>Sales Leads</h2>
            <p className="muted">Standalone Epic Sales workspace. Saved estimates now attach to an existing open lead by phone/email or create a new lead.</p>
            <div className="leadRow"><strong>New Lead</strong><span className="muted">No quote yet</span><span className="badge">Open</span><button onClick={() => setActive("quotes")}>Build Estimate</button></div>
          </div>
        ) : (
          <div className="grid quoteGrid">
            <section>
              <div className="sectionHeading">
                <div>
                  <h2>Build Estimate</h2>
                  <p className="muted compact">One quote can include multiple tours and rentals.</p>
                </div>
                <button className="secondary" type="button" onClick={addActivity} disabled={!experiences.length}>+ Add Activity</button>
              </div>

              {loading && <div className="card"><p className="muted">Loading Epic experiences and ticket types...</p></div>}
              {error && <div className="card"><p className="muted">{error}</p></div>}

              {!loading && !error && calculatedActivities.map(({ activity, experience }, index) => experience && (
                <div className="card activityCard" key={activity.key}>
                  <div className="activityHeader">
                    <div className="activityNumber">Activity {index + 1}</div>
                    {activities.length > 1 && <button className="removeLink" type="button" onClick={() => removeActivity(activity.key)}>Remove</button>}
                  </div>
                  <div className="field">
                    <label>Experience</label>
                    <select value={activity.experienceId} onChange={(e) => changeExperience(activity.key, e.target.value)}>
                      {experiences.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </div>

                  {experience.tickets.map((ticket) => (
                    <div className="ticketRow" key={ticket.id}>
                      <div>
                        <div className="ticketTitle">{ticket.name} - {money.format(ticket.price)}</div>
                        <div className="ticketMeta">{ticket.note}</div>
                      </div>
                      <div className="qty">
                        <button onClick={() => changeQty(activity.key, ticket.id, -1)}>-</button>
                        <span>{activity.qty[ticket.id] ?? 0}</span>
                        <button onClick={() => changeQty(activity.key, ticket.id, 1)}>+</button>
                      </div>
                    </div>
                  ))}

                  <div className="toggleRow">
                    <div><strong>TripSafe</strong><div className="ticketMeta">Optional protection at 9% for this activity</div></div>
                    <input type="checkbox" checked={activity.tripSafe} onChange={(e) => updateActivity(activity.key, { tripSafe: e.target.checked })} />
                  </div>
                  {experience.line === "rental" && (
                    <div className="toggleRow">
                      <div><strong>Premier Adventure Assure</strong><div className="ticketMeta">$69 for this rental period</div></div>
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
                <div className="quoteActivitySummary" key={activity.key}>
                  <div><strong>{index + 1}. {experience.name}</strong></div>
                  <strong>{money.format(total)}</strong>
                </div>
              ))}
              <div className="summaryRow"><span>Ticket subtotal</span><strong>{money.format(totals.subtotal)}</strong></div>
              <div className="summaryRow"><span>Taxes</span><strong>{money.format(totals.tax)}</strong></div>
              <div className="summaryRow"><span>TripSafe</span><strong>{money.format(totals.tripSafe)}</strong></div>
              {totals.premier > 0 && <div className="summaryRow"><span>Premier Adventure Assure</span><strong>{money.format(totals.premier)}</strong></div>}
              <div className="summaryRow"><span>TripWorks booking fee (4%)</span><strong>{money.format(totals.twFee)}</strong></div>
              <div className="summaryRow total"><span>Estimated OTD</span><span>{money.format(totals.total)}</span></div>
              <div className="field" style={{ marginTop: 20 }}><label>Guest name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" /></div>
              <div className="field"><label>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional unless emailing quote" /></div>
              <div className="field"><label>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" /></div>
              <button className="primary" type="button" onClick={handleSave} disabled={saving}>{saving ? "Saving Estimate..." : "Save Estimate"}</button>
              {saveMessage && <p className="ticketMeta" style={{ marginBottom: 0 }}>{saveMessage}</p>}
              <p className="ticketMeta" style={{ marginBottom: 0 }}>Rates are live from the Sales rate table and currently use $1 placeholders.</p>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
