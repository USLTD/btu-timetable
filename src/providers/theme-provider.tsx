import type { ComponentChildren } from "preact";

export function ThemeProvider({ children }: { children: ComponentChildren }) {
  return <>{children}</>;
}
