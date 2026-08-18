import { DefaultViewPreference } from "@/components/default-view-preference";
import { ServicesManager } from "@/components/services-manager";
import type { Provider } from "@/lib/effective-services";
import {
  getHouseholdProviders,
  getPersonalProviders,
} from "@/lib/server/membership";
import { requirePageMembership } from "@/lib/server/page-session";
import { createTmdbClient } from "@/lib/tmdb";

export default async function ServicesPage() {
  const { userId, membership } = await requirePageMembership();
  const [householdServices, personalServices] = await Promise.all([
    getHouseholdProviders(membership.householdId),
    getPersonalProviders(userId, membership.householdId),
  ]);

  let catalog: Provider[] = [];
  try {
    catalog = await createTmdbClient().listWatchProviders(
      membership.household.region,
    );
  } catch {
    catalog = [...householdServices, ...personalServices];
  }

  return (
    <div className="space-y-8">
      <DefaultViewPreference
        initialDefaultListView={membership.defaultListView}
      />
      <ServicesManager
        householdName={membership.household.name}
        inviteCode={membership.household.inviteCode}
        region={membership.household.region}
        catalog={catalog}
        householdServices={householdServices}
        personalServices={personalServices}
      />
    </div>
  );
}
