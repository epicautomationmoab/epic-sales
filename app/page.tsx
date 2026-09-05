"use client";

import { useMemo, useState } from "react";

type Ticket = { id: string; name: string; price: number; note?: string };
type Experience = { id: string; name: string; line: "tour" | "rental"; tickets: Ticket[] };

const experiences: Experience[] = [
  {
    id: "hells-pro-r",
    name: "Hell's Revenge - Pro R Ultimate Experience",
    line: "tour",
    tickets: [
      { id: "pro-r-2", name: "2-Seat Pro R Ultimate", price: 1, note: "Placeholder rate" },
      { id: "adult-rider", name: "Adult Rider", price: 1, note: "Placeholder rate" },
      { id: "guide-passenger", name: "Guide Car Passenger", price: 1, note: "Placeholder rate" },
    ],
  },
  {
    id: "gateway",
    name: "Gateway to Hell's Revenge and Fins N' Things",
    line: "tour",
    tickets: [
      { id: "rzr-12", name: "2026 RZR 1000 for 1 - 2 People", price: 1, note: "Placeholder rate" },
      { id: "rzr-34", name: "2026 RZR 1000 for 3 - 4 People", price: 1, note: "Placeholder rate" },
    ],
  },
  {
    id: "discovery",
    name: "Moab Discovery Tour",
    line: "tour",
    tickets: [
      { id: "xp5", name: "5-Seat Polaris Xpedition XP5 Northstar", price: 1, note: "Select number of vehicles, not number of people." },
      { id: "guest", name: "Guest", price: 1, note: "Passenger count placeholder" },
      { id: "guide-rider", name: "Guide Car Rider", price: 1, note: "Placeholder rate" },
    ],
  },
  {
    id: "rental-placeholder",
    name: "Rental Experience Placeholder",
    line: "rental",
    tickets: [
      { id: "rental-ticket", name: "Rental Ticket Type", price: 1, note: "Placeholder rate until rate sheet is entered" },
    ],
  },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function HomePage() {
  const [active, setActive] = useState<"leads" | "quotes">("quotes");
  const [experienceId, setExperienceId] = useState(experiences[0].id);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [tripSafe, setTripSafe] = useState(false);
  const [premier, setPremier] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const experience = experiences.find((e) => e.id === experienceId) ?? experiences[0];
  const subtotal = useMemo(
    () => experience.tickets.reduce((sum, ticket) => sum + ticket.price * (qty[ticket.id] ?? 0), 0),
    [experience, qty]
  );

  const taxRate = experience.line === "tour" ? 0.0735 : 0.0635 + 0.025;
  const tax = subtotal * taxRate;
  const tripSafeAmount = tripSafe ? subtotal * 0.09 : 0;
  const premierAmount = experience.line === "rental" && premier ? 69 : 0;
  const twBase = subtotal + tax + tripSafeAmount + premierAmount;
  const twFee = twBase * 0.04;
  const total = twBase + twFee;

  function changeQty(id: string, delta: number) {
    setQty((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) + delta) }));
  }

  function changeExperience(nextId: string) {
    setExperienceId(nextId);
    setQty({});
    setTripSafe(false);
    setPremier(false);
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
            <p className="muted">Foundation only. Lead persistence and call linking will be wired to Supabase next.</p>
            <div className="leadRow"><strong>New Lead</strong><span className="muted">No quote yet</span><span className="badge">Open</span><button onClick={() => setActive("quotes")}>Build Estimate</button></div>
          </div>
        ) : (
          <div className="grid">
            <section className="card">
              <h2>Build Estimate</h2>
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
                    <button aria-label={`Decrease ${ticket.name}`} onClick={() => changeQty(ticket.id, -1)}>-</button>
                    <span>{qty[ticket.id] ?? 0}</span>
                    <button aria-label={`Increase ${ticket.name}`} onClick={() => changeQty(ticket.id, 1)}>+</button>
                  </div>
                </div>
              ))}

              <div className="toggleRow">
                <div><strong>TripSafe</strong><div className="ticketMeta">Optional 9% protection toggle</div></div>
                <input type="checkbox" checked={tripSafe} onChange={(e) => setTripSafe(e.target.checked)} />
              </div>

              {experience.line === "rental" && (
                <div className="toggleRow">
                  <div><strong>Premier Adventure Assure</strong><div className="ticketMeta">$69 per rental period/day rule placeholder</div></div>
                  <input type="checkbox" checked={premier} onChange={(e) => setPremier(e.target.checked)} />
                </div>
              )}
            </section>

            <section className="card">
              <h2>Quote Summary</h2>
              <div className="summaryRow"><span>Ticket subtotal</span><strong>{money.format(subtotal)}</strong></div>
              <div className="summaryRow"><span>Tax ({(taxRate * 100).toFixed(2)}%)</span><strong>{money.format(tax)}</strong></div>
              <div className="summaryRow"><span>TripSafe</span><strong>{money.format(tripSafeAmount)}</strong></div>
              {experience.line === "rental" && <div className="summaryRow"><span>Premier Adventure Assure</span><strong>{money.format(premierAmount)}</strong></div>}
              <div className="summaryRow"><span>TripWorks booking fee (4%)</span><strong>{money.format(twFee)}</strong></div>
              <div className="summaryRow total"><span>Estimated OTD</span><span>{money.format(total)}</span></div>

              <div className="field" style={{ marginTop: 20 }}>
                <label>Guest name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional for now" />
              </div>
              <div className="field">
                <label>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional for now" />
              </div>
              <button className="primary" type="button">Save Estimate (wiring next)</button>
              <p className="ticketMeta" style={{ marginBottom: 0 }}>All ticket prices are intentionally set to $1 placeholders until the real rate table is loaded.</p>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
