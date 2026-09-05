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

const SUPABASE_URL = "https://kbuxcvqzicnydqllyong.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Jw6uPe9tju4BGeUI6vkucQ_MI-EiRVZ";

export async function getSalesRates(): Promise<SalesRateRow[]> {
  const params = new URLSearchParams({
    select: "experience_id,experience_name,business_line,ticket_type_id,ticket_type_name,unit_price_cents,quantity_label,sales_help_text",
    is_active: "eq.true",
    order: "business_line.asc,experience_name.asc,ticket_type_name.asc",
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/sales_quote_rates?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Unable to load sales rates (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  return response.json() as Promise<SalesRateRow[]>;
}
