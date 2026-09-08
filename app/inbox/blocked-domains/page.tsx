import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedTeamProfile } from "../../../lib/team-auth";
import BlockedDomainsClient from "./BlockedDomainsClient";

export default async function BlockedDomainsPage(){
  const cookieStore=await cookies();
  const accessToken=cookieStore.get("epic_access_token")?.value;
  const profile=await getAuthenticatedTeamProfile(accessToken);
  if(!profile||!accessToken)redirect("/employee-login");
  if(profile.role!=="admin"&&profile.role!=="manager")redirect("/inbox");
  return <BlockedDomainsClient/>;
}
