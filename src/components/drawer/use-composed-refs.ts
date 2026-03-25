import type { Ref } from 'preact';
import { useCallback } from 'preact/hooks';

/**
 * Set a given ref to a given value
 * This utility takes care of different types of refs: callback refs and RefObject(s)
 */
export function setRef<T>(ref: Ref<T> | undefined, value: T) {
	if (typeof ref === 'function') {
		ref(value);
	} else if (ref !== null && ref !== undefined) {
		(ref as { current: T }).current = value;
	}
}

/**
 * A utility to compose multiple refs together
 * Accepts callback refs and RefObject(s)
 */
export function composeRefs<T>(...refs: (Ref<T> | undefined)[]) {
	return (node: T) => {
		for (const ref of refs) {
			setRef(ref, node);
		}
	};
}

/**
 * A custom hook that composes multiple refs
 * Accepts callback refs and RefObject(s)
 */
export function useComposedRefs<T>(...refs: (Ref<T> | undefined)[]) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: refs are intentionally used directly
	return useCallback(composeRefs(...refs), refs);
}
