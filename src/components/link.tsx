import type { AnchorHTMLAttributes } from "preact";
import { usePageContext } from "@/renderer/usePageContext";
import type { Locale } from "@/types/i18n";

export function Link({
  href,
  locale,
  ...props
}: { locale?: Locale } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const pageContext = usePageContext();

  locale = locale ?? (pageContext.routeParams.locale as Locale | undefined);
  if (locale && typeof href === "string") {
    const normalized = href.startsWith("/") ? href : `/${href}`;
    href = `/${locale}${normalized}`;
  }
  return <a href={href} {...props} />;
}
