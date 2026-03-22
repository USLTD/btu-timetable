import type { JSX } from "preact";
import type { Locale } from "@/types/i18n";

declare global {
  namespace Vike {
    interface PageContext {
      // Type of pageContext.user
      locale?: Locale | undefined;
      pageProps?: Record<string, unknown>;

      Page: () => JSX.Element;
    }
  }
}
