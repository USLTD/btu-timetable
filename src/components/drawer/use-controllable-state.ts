import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

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

	useEffect(() => {
		if (prevValueRef.current !== value) {
			if (onChange && value !== undefined) {
				onChange(value);
			}
			prevValueRef.current = value;
		}
	}, [value, onChange]);

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

	const setValue = useCallback(
		(nextValue: T | ((prev: T) => T)) => {
			if (isControlled) {
				const value =
					typeof nextValue === 'function'
						? (nextValue as (prev: T) => T)(prop as T)
						: nextValue;
				if (value !== prop && onChange) {
					onChange(value);
				}
			} else {
				setUncontrolledProp(nextValue as T);
			}
		},
		[isControlled, prop, setUncontrolledProp, onChange],
	);

	return [value, setValue] as const;
}
