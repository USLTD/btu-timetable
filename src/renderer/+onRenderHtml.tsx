import { renderToString } from "preact-render-to-string";
import { dangerouslySkipEscape, escapeInject } from "vike/server";
import type { OnRenderHtmlAsync } from "vike/types";
import { Head, THEME_INIT_SCRIPT } from "./Head";
import { PageShell } from "./PageShell";
import { setLocaleAndPersist } from "@/lib/i18n";
import { baseLocale } from "@/paraglide/runtime";
import type { Locale } from "@/types/i18n";

export const onRenderHtml: OnRenderHtmlAsync = async (pageContext) => {
  const { Page, pageProps } = pageContext;
  const locale =
    (pageContext.routeParams?.locale as Locale | undefined) ??
    (pageContext.locale as Locale | undefined) ??
    (baseLocale as Locale);
  await setLocaleAndPersist(locale, false);
  const pageHtml = renderToString(
    <PageShell pageContext={pageContext}>
      <Page {...pageProps} />
    </PageShell>
  );

  const headHtml = renderToString(<Head />);
  const themeScript = `<script>${THEME_INIT_SCRIPT}</script>`;
  const title = "Easy BTU Timetable";
  const lang = locale ?? "en";

  const documentHtml = escapeInject`<!DOCTYPE html>
<html lang="${lang}" dir="ltr">
  <head>
    <title>${title}</title>
    ${dangerouslySkipEscape(headHtml)}
    ${dangerouslySkipEscape(themeScript)}
  </head>
  <body>
    <div id="page-view">${dangerouslySkipEscape(pageHtml)}</div>
  </body>
</html>`;

  return { documentHtml };
};
