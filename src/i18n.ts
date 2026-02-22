import { i18n } from "@lingui/core";
import { messages as enMessages } from "./locales/en/messages.po";

export const locales = {
  en: "English",
  ka: "ქართული",
} as const;

export type Locale = keyof typeof locales;

export const defaultLocale: Locale = "en";

export async function loadCatalog(locale: Locale) {
  if (locale === defaultLocale) {
    // Default locale is bundled — no network request needed
    i18n.loadAndActivate({ locale, messages: enMessages });
    return;
  }
  const { messages } = await import(`./locales/${locale}/messages.po`);
  i18n.loadAndActivate({ locale, messages });
}

export { i18n };

