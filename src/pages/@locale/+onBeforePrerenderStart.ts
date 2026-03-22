import { locales } from "@/paraglide/runtime";

export async function onBeforePrerenderStart() {
  return locales.map((locale) => `/${locale}`);
}
