import type { Config } from "vike/types";

export default {
  clientRouting: true,
  hydrationCanBeAborted: true,
  passToClient: ["pageProps", "routeParams", "is404", "locale", "urlPathname"],
} satisfies Config;
