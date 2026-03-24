import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { DrawerContextValue } from './types';

const DrawerContext = createContext<DrawerContextValue | null>(null);

export const DrawerProvider = DrawerContext.Provider;

export function useDrawerContext() {
	const context = useContext(DrawerContext);
	if (!context) {
		throw new Error('useDrawerContext must be used within a Drawer.Root');
	}
	return context;
}
