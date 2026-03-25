const cache = new WeakMap<HTMLElement, Record<string, string>>();

export function set(el: HTMLElement | null, styles: Record<string, string>, ignoreCache = false) {
	if (!el || !(el instanceof HTMLElement)) return;

	const originalStyles: Record<string, string> = {};

	for (const [key, value] of Object.entries(styles)) {
		if (key.startsWith('--')) {
			el.style.setProperty(key, value);
			continue;
		}

		originalStyles[key] = (el.style as unknown as Record<string, string>)[key];
		(el.style as unknown as Record<string, string>)[key] = value;
	}

	if (ignoreCache) return;

	cache.set(el, originalStyles);
}

export function reset(el: HTMLElement | null, prop: string) {
	if (!el || !(el instanceof HTMLElement)) return;

	const originalStyles = cache.get(el);

	if (!originalStyles) {
		return;
	}

	(el.style as unknown as Record<string, string>)[prop] = originalStyles[prop];
}

export const isVertical = (direction: 'top' | 'bottom' | 'left' | 'right') => {
	switch (direction) {
		case 'top':
		case 'bottom':
			return true;
		case 'left':
		case 'right':
			return false;
	}
};

export function getTranslate(
	element: HTMLElement | null,
	direction: 'top' | 'bottom' | 'left' | 'right',
) {
	if (!element) {
		return null;
	}

	const style = window.getComputedStyle(element);
	const transform =
		style.transform || (style as unknown as Record<string, string>).webkitTransform || (style as unknown as Record<string, string>).mozTransform;

	let mat = transform.match(/^matrix3d\((.+)\)$/);
	if (mat) {
		// https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix3d
		const values = mat[1].split(',').map((v) => v.trim());
		return Number.parseFloat(values[isVertical(direction) ? 13 : 12]);
	}

	// https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix
	mat = transform.match(/^matrix\((.+)\)$/);
	if (!mat) {
		return null;
	}
	const values = mat[1].split(',').map((v) => v.trim());
	return Number.parseFloat(values[isVertical(direction) ? 5 : 4]);
}

export function dampenValue(v: number) {
	return 8 * (Math.log(v + 1) - 2);
}

export function assignStyle(element: HTMLElement | null, style: Partial<CSSStyleDeclaration>) {
	if (!element) return () => {};
	const prevStyle = element.style.cssText;
	Object.assign(element.style, style);
	return () => {
		element.style.cssText = prevStyle;
	};
}

/**
 * Receives functions as arguments and returns a new function that calls all.
 */
export function chain<T extends unknown[]>(...fns: Array<((...args: T) => void) | undefined>) {
	return (...args: T) => {
		for (const fn of fns) {
			if (typeof fn === 'function') {
				fn(...args);
			}
		}
	};
}
