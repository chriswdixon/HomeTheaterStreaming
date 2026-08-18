import { redirect } from "next/navigation";
import { defaultListPath } from "@/lib/default-list-view";
import { requirePageMembership } from "@/lib/server/page-session";

export default async function StartPage() {
  const { membership } = await requirePageMembership();
  redirect(defaultListPath(membership.defaultListView));
}
