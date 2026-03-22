import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { PageContextClient, PageContextServer } from "vike/types";

export type PageContext = PageContextClient | PageContextServer;

const PageContextContext = createContext<PageContext>({} as PageContext);

export function usePageContext() {
  return useContext(PageContextContext);
}

export const PageContextProvider = PageContextContext;
