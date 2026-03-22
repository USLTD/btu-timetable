import { hydrate, render } from "preact";
import type { OnRenderClientAsync } from "vike/types";
import { PageShell } from "./PageShell";
import { setLocaleAndPersist } from "@/lib/i18n";
import type { Locale } from "@/types/i18n";

export const onRenderClient: OnRenderClientAsync = async (pageContext) => {
  const { Page, pageProps } = pageContext;
  const locale = pageContext.routeParams?.locale as Locale | undefined;
  if (locale) {
    await setLocaleAndPersist(locale, true);
    document.documentElement.lang = locale;
  }
  const container = document.getElementById("page-view");
  if (!container) {
    throw new Error("Missing #page-view container for hydration");
  }

  const page = (
    <PageShell pageContext={pageContext}>
      <Page {...pageProps} />
    </PageShell>
  );

  if (pageContext.isHydration) {
    hydrate(page, container);
  } else {
    render(page, container);
  }
};
