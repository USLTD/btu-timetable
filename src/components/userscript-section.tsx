import { ClientOnly } from "@/components/client-only";
import { UserscriptHintClient } from "@/components/userscript-hint-client";
import { UserscriptHintSkeleton } from "@/components/skeletons/userscript-hint-skeleton";

export function UserscriptSection() {
  return (
    <ClientOnly skeleton={<UserscriptHintSkeleton />}>
      <UserscriptHintClient />
    </ClientOnly>
  );
}
