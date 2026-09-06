export type SalesRateRow = {
  experience_id: string;
  experience_name: string | null;
  business_line: "tour" | "rental" | string;
  ticket_type_id: string;
  ticket_type_name: string;
  unit_price_cents: number;
  quantity_label: string | null;
  sales_help_text: string | null;
};

export type SaveQuoteActivity = {
  experienceId: string;
  tripSafe: boolean;
  premier: boolean;
  tickets: Array<{ ticketTypeId: string; quantity: number }>;
};

export type SaveQuoteResult = {
  quote_id: string;
  opportunity_id: string | null;
  total_cents: number;
  lead_created_or_attached: boolean;
  visit_start_date?: string | null;
  visit_end_date?: string | null;
};

export type RecentSalesQuote = {
  quote_id: string;
  opportunity_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone_e164: string | null;
  visit_start_date: string | null;
  visit_end_date: string | null;
  status: string;
  total_cents: number;
  created_at: string;
};

export type SalesQuoteDetail = {
  quote: RecentSalesQuote & Record<string, unknown>;
  activities: Array<{
    id: string;
    experience_id: string;
    experience_name: string;
    business_line: string;
    activity_order: number;
    tripsafe_selected: boolean;
    premier_selected: boolean;
    items: Array<{
      ticket_type_id: string;
      ticket_type_name: string;
      quantity: number;
      unit_price_cents: number;
      line_total_cents: number;
    }>;
  }>;
};

const SUPABASE_URL = "https://kbuxcvqzicnydqllyong.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";

const apiHeaders = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  "Content-Type": "application/json",
};

export async function getSalesRates(): Promise<SalesRateRow[]> {
  const params = new URLSearchParams({
    select: "experience_id,experience_name,business_line,ticket_type_id,ticket_type_name,unit_price_cents,quantity_label,sales_help_text",
    is_active: "eq.true",
    experience_id: "neq.17328",
    ticket_type_name: "not.in.(Guest,Adult Rider,Terms and Conditions)",
    order: "business_line.asc,experience_name.asc,ticket_type_name.asc",
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/sales_quote_rates?${params.toString()}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Unable to load sales rates (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  return response.json() as Promise<SalesRateRow[]>;
}

export async function saveSalesQuote(input: {
  quoteId?: string | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  visitStart?: string;
  visitEnd?: string;
  activities: SaveQuoteActivity[];
}): Promise<SaveQuoteResult> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_epic_sales_quote_v4`, {
    method: "POST",
    headers: apiHeaders,
    body: JSON.stringify({
      p_quote_id: input.quoteId || null,
      p_customer_name: input.customerName || null,
      p_customer_email: input.customerEmail || null,
      p_customer_phone: input.customerPhone || null,
      p_visit_start: input.visitStart || null,
      p_visit_end: input.visitEnd || null,
      p_activities: input.activities,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Unable to save estimate (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  return response.json() as Promise<SaveQuoteResult>;
}

export async function getRecentSalesQuotes(limit = 25): Promise<RecentSalesQuote[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_recent_epic_sales_quotes`, {
    method: "POST",
    headers: apiHeaders,
    body: JSON.stringify({ p_limit: limit }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Unable to load saved quotes (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  return response.json() as Promise<RecentSalesQuote[]>;
}

export async function getSalesQuoteDetail(quoteId: string): Promise<SalesQuoteDetail> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_epic_sales_quote_detail`, {
    method: "POST",
    headers: apiHeaders,
    body: JSON.stringify({ p_quote_id: quoteId }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Unable to open quote (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  const result = await response.json();
  if (!result) throw new Error("Quote not found.");
  return result as SalesQuoteDetail;
}
