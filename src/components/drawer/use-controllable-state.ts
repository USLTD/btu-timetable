import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

function useCallbackRef<T extends (...args: unknown[]) => unknown>(
	callback: T | undefined,
): T {
	const callbackRef = useRef(callback);

	useEffect(() => {
		callbackRef.current = callback;
	});

	return useMemo(
		() =>
			((...args) => callbackRef.current?.(...args)) as T,
		[],
	);
}

function useUncontrolledState<T>({
	defaultProp,
	onChange,
}: {
	defaultProp?: T;
	onChange?: (value: T) => void;
}) {
	const uncontrolledState = useState<T | undefined>(defaultProp);
	const [value] = uncontrolledState;
	const prevValueRef = useRef(value);
	const handleChange = useCallbackRef(onChange);

	useEffect(() => {
		if (prevValueRef.current !== value) {
			handleChange?.(value as T);
			prevValueRef.current = value;
		}
	}, [value, handleChange]);

	return uncontrolledState;
}

export function useControllableState<T>({
	prop,
	defaultProp,
	onChange = () => {},
}: {
	prop?: T;
	defaultProp?: T;
	onChange?: (value: T) => void;
}) {
	const [uncontrolledProp, setUncontrolledProp] = useUncontrolledState({
		defaultProp,
		onChange,
	});
	const isControlled = prop !== undefined;
	const value = isControlled ? prop : uncontrolledProp;
	const handleChange = useCallbackRef(onChange);

	const setValue = useCallback(
		(nextValue: T | ((prev: T) => T)) => {
			if (isControlled) {
				const setter = nextValue as (prev: T) => T;
				const value =
					typeof nextValue === 'function' ? setter(prop as T) : nextValue;
				if (value !== prop) handleChange(value as T);
			} else {
				setUncontrolledProp(nextValue);
			}
		},
		[isControlled, prop, setUncontrolledProp, handleChange],
	);

	return [value, setValue] as const;
}
