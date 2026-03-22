import type { ComponentChildren, VNode } from "preact";
import { cloneElement } from "preact";
import { useSyncExternalStore } from "@/hooks/use-sync-external-store";
import {
  baseLocale,
  getLocale as runtimeGetLocale,
  locales,
  overwriteGetLocale,
  setLocale,
} from "@/paraglide/runtime";
import type { Locale } from "@/types/i18n";

export const localeNames = {
  en: "English",
  ka: "ქართული",
} as const;

const localeListeners = new Set<() => void>();
let currentLocale: Locale = runtimeGetLocale() as Locale;

if (typeof window !== "undefined") {
  const pathMatch = window.location.pathname.match(/^\/(en|ka)(?=\/|$)/);
  const urlLocale = pathMatch && (locales as readonly string[]).includes(pathMatch[1])
    ? (pathMatch[1] as Locale)
    : null;

  const saved = localStorage.getItem("app-locale");
  const savedLocale =
    saved && (locales as readonly string[]).includes(saved) ? (saved as Locale) : null;

  const docLang = document.documentElement?.lang;
  const docLocale =
    docLang && (locales as readonly string[]).includes(docLang) ? (docLang as Locale) : null;

  // Priority: explicit URL locale segment > saved preference > document lang > runtime default
  if (urlLocale) {
    currentLocale = urlLocale;
  } else if (savedLocale) {
    currentLocale = savedLocale;
  } else if (docLocale) {
    currentLocale = docLocale;
  }
}

overwriteGetLocale(() => currentLocale);

function notifyLocaleChange() {
  for (const listener of localeListeners) {
    listener();
  }
}

export async function setLocaleAndPersist(locale: Locale, persist = true) {
  currentLocale = locale;
  await setLocale(locale, { reload: false });
  if (typeof window !== "undefined" && persist) {
    localStorage.setItem("app-locale", locale);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
    document.documentElement.dir = "ltr";
  }
  notifyLocaleChange();
}

export function getPreferredLocale(): Locale {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("app-locale");
    if (saved && (locales as readonly string[]).includes(saved)) {
      return saved as Locale;
    }
    const nav = navigator.language?.split("-")[0];
    if (nav && (locales as readonly string[]).includes(nav)) {
      return nav as Locale;
    }
  }
  return baseLocale as Locale;
}

export function useLocale(): Locale {
  return useSyncExternalStore(
    (listener) => {
      localeListeners.add(listener);
      return () => {
        localeListeners.delete(listener);
      };
    },
    () => currentLocale,
    () => currentLocale,
  );
}

type RichTextComponent = VNode<{ children?: ComponentChildren }>;
type RichTextNode = { index?: number; children: ComponentChildren[] };

export function renderRichText(
  text: string,
  components: RichTextComponent[],
): ComponentChildren {
  const tokens = tokenize(text);
  const root: RichTextNode = { children: [] };
  const stack: RichTextNode[] = [];

  let current: RichTextNode = root;

  for (const token of tokens) {
    if (token.type === "text") {
      current.children.push(token.value);
      continue;
    }
    if (token.type === "open") {
      const node: RichTextNode = { index: token.index, children: [] };
      stack.push(current);
      current = node;
      continue;
    }
    if (token.type === "close") {
      const node = current;
      const parent = stack.pop() ?? root;
      const component = node.index !== undefined ? components[node.index] : undefined;
      const rendered = component
        ? cloneElement(
          component,
          undefined,
          node.children.length > 0 ? node.children : component.props?.children,
        )
        : node.children;
      parent.children.push(rendered);
      current = parent;
    }
  }

  return root.children;
}

function tokenize(text: string) {
  const tokens: Array<
    | { type: "text"; value: string }
    | { type: "open"; index: number }
    | { type: "close"; index: number }
  > = [];
  const regex = /<\/?\d+>/g;
  let lastIndex = 0;
  let match = regex.exec(text);
  while (match) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    const token = match[0];
    const index = Number(token.replace(/[^\d]/g, ""));
    if (token.startsWith("</")) tokens.push({ type: "close", index });
    else tokens.push({ type: "open", index });
    lastIndex = regex.lastIndex;
    match = regex.exec(text);
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}
