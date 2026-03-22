import "@/style.css";
import "virtual:uno.css";
import { registerSW } from "virtual:pwa-register";
import type { ComponentChildren } from "preact";
import { useEffect } from "preact/hooks";
import type { PageContext } from "vike/types";
import { ErrorBoundary } from "@/components/error-boundary";
import { SystemBanner } from "@/components/system-banner";
import { ToastProvider } from "@/components/toast";
import { UpdateToast } from "@/components/update-toast";
import { notifyNeedsRefresh, setUpdateSW } from "@/hooks/use-pwa-update";
import { restoreFromHash } from "@/lib/url-state";
import * as m from "@/paraglide/messages";
import { PageContextProvider } from "./usePageContext";

let swInitialized = false;

export function PageShell({
  pageContext,
  children,
}: {
  pageContext: PageContext;
  children: ComponentChildren;
}) {
  useEffect(() => {
    restoreFromHash();

    if (!swInitialized) {
      const updateSW = registerSW({
        onNeedRefresh() {
          notifyNeedsRefresh();
        },
        onOfflineReady() {
          // eslint-disable-next-line no-console
          console.log("App is ready for offline use");
        },
      });
      setUpdateSW(updateSW);
      swInitialized = true;
    }
  }, []);

  return (
    <PageContextProvider.Provider value={pageContext}>
      <ErrorBoundary>
        <ToastProvider>
          <SystemBanner text={m.app_is_in_beta()} size="sm" />
          <div id="page-content">{children}</div>
          <UpdateToast />
        </ToastProvider>
      </ErrorBoundary>
    </PageContextProvider.Provider>
  );
}
