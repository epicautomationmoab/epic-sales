import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import QuoteBuilder from "./quote-builder";
import { getAuthenticatedTeamProfile } from "../lib/team-auth";

export default async function HomePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("epic_access_token")?.value;
  const profile = await getAuthenticatedTeamProfile(accessToken);
  if (!profile) redirect("/employee-login");
  return <QuoteBuilder />;
}
