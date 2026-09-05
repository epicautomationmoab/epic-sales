"use client";

import { useEffect, useMemo, useState } from "react";
import { getSalesRates, type SalesRateRow } from "../lib/sales-data";

type Ticket = { id: string; name: string; price: number; note?: string };
type Experience = { id: string; name: string; line: "tour" | "rental"; tickets: Ticket[] };

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

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
  return Array.from(grouped.values()).sort((a, b) => a.line === b.line ? a.name.localeCompare(b.name) : a.line.localeCompare(b.line));
}

export default function QuoteBuilder() {
  const [active, setActive] = useState<"leads" | "quotes">("quotes");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [experienceId, setExperienceId] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [tripSafe, setTripSafe] = useState(false);
  const [premier, setPremier] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getSalesRates()
      .then((rows) => {
        const built = buildExperiences(rows);
        setExperiences(built);
        setExperienceId(built[0]?.id || "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load sales rates"))
      .finally(() => setLoading(false));
  }, []);

  const experience = experiences.find((item) => item.id === experienceId) ?? experiences[0];
  const subtotal = useMemo(() => experience ? experience.tickets.reduce((sum, ticket) => sum + ticket.price * (qty[ticket.id] ?? 0), 0) : 0, [experience, qty]);
  const taxRate = experience?.line === "rental" ? 0.0635 + 0.025 : 0.0735;
  const tax = subtotal * taxRate;
  const tripSafeAmount = tripSafe ? subtotal * 0.09 : 0;
  const premierAmount = experience?.line === "rental" && premier ? 69 : 0;
  const twBase = subtotal + tax + tripSafeAmount + premierAmount;
  const twFee = twBase * 0.04;
  const total = twBase + twFee;

  const changeQty = (id: string, delta: number) => setQty((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) + delta) }));
  const changeExperience = (id: string) => {
    setExperienceId(id);
    setQty({});
    setTripSafe(false);
    setPremier(false);
  };

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
            <p className="muted">Standalone Epic Sales workspace. Lead persistence and call linking are next.</p>
            <div className="leadRow"><strong>New Lead</strong><span className="muted">No quote yet</span><span className="badge">Open</span><button onClick={() => setActive("quotes")}>Build Estimate</button></div>
          </div>
        ) : (
          <div className="grid">
            <section className="card">
              <h2>Build Estimate</h2>
              {loading && <p className="muted">Loading Epic experiences and ticket types...</p>}
              {error && <p className="muted">{error}</p>}
              {experience && (
                <>
                  <div className="field">
                    <label>Experience</label>
                    <select value={experienceId} onChange={(e) => changeExperience(e.target.value)}>
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
                        <button onClick={() => changeQty(ticket.id, -1)}>-</button>
                        <span>{qty[ticket.id] ?? 0}</span>
                        <button onClick={() => changeQty(ticket.id, 1)}>+</button>
                      </div>
                    </div>
                  ))}
                  <div className="toggleRow">
                    <div><strong>TripSafe</strong><div className="ticketMeta">Optional protection at 9%</div></div>
                    <input type="checkbox" checked={tripSafe} onChange={(e) => setTripSafe(e.target.checked)} />
                  </div>
                  {experience.line === "rental" && (
                    <div className="toggleRow">
                      <div><strong>Premier Adventure Assure</strong><div className="ticketMeta">$69 protection option</div></div>
                      <input type="checkbox" checked={premier} onChange={(e) => setPremier(e.target.checked)} />
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="card">
              <h2>Quote Summary</h2>
              <div className="summaryRow"><span>Ticket subtotal</span><strong>{money.format(subtotal)}</strong></div>
              <div className="summaryRow"><span>Tax ({(taxRate * 100).toFixed(2)}%)</span><strong>{money.format(tax)}</strong></div>
              <div className="summaryRow"><span>TripSafe</span><strong>{money.format(tripSafeAmount)}</strong></div>
              {experience?.line === "rental" && <div className="summaryRow"><span>Premier Adventure Assure</span><strong>{money.format(premierAmount)}</strong></div>}
              <div className="summaryRow"><span>TripWorks booking fee (4%)</span><strong>{money.format(twFee)}</strong></div>
              <div className="summaryRow total"><span>Estimated OTD</span><span>{money.format(total)}</span></div>
              <div className="field" style={{ marginTop: 20 }}><label>Guest name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional for now" /></div>
              <div className="field"><label>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional for now" /></div>
              <button className="primary" type="button">Save Estimate (next)</button>
              <p className="ticketMeta" style={{ marginBottom: 0 }}>Rates are live from the Sales rate table and currently use $1 placeholders.</p>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
