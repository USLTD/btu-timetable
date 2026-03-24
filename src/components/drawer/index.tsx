import type { ComponentChildren, JSX } from 'preact';
import { forwardRef, createPortal } from 'preact/compat';
import { useEffect, useRef, useState, useCallback, useMemo } from 'preact/hooks';
import { DrawerProvider, useDrawerContext } from './context';
import { useControllableState } from './use-controllable-state';
import { useComposedRefs } from './use-composed-refs';
import { usePreventScroll } from './use-prevent-scroll';
import { isSafari } from './browser';
import { set, reset, chain, getTranslate, isVertical, dampenValue } from './helpers';
import {
	TRANSITIONS,
	VELOCITY_THRESHOLD,
	CLOSE_THRESHOLD,
	SCROLL_LOCK_TIMEOUT,
	DRAG_CLASS,
} from './constants';
import type { DialogProps } from './types';

// Portal Props interface
interface PortalProps {
	children: ComponentChildren;
	container?: HTMLElement | null;
}

let previousBodyPosition: {
	position: string;
	top: string;
	left: string;
	height: string;
	right: string;
} | null = null;

function usePositionFixed({
	isOpen,
	modal,
	hasBeenOpened,
	noBodyStyles,
}: {
	isOpen: boolean;
	modal: boolean;
	hasBeenOpened: boolean;
	noBodyStyles: boolean;
}) {
	const scrollPos = useRef(0);

	const setPositionFixed = useCallback(() => {
		if (!isSafari()) return;

		if (previousBodyPosition === null && isOpen && !noBodyStyles) {
			previousBodyPosition = {
				position: document.body.style.position,
				top: document.body.style.top,
				left: document.body.style.left,
				height: document.body.style.height,
				right: 'unset',
			};

			const { scrollX, innerHeight } = window;
			document.body.style.setProperty('position', 'fixed', 'important');
			Object.assign(document.body.style, {
				top: `${-scrollPos.current}px`,
				left: `${-scrollX}px`,
				right: '0px',
				height: 'auto',
			});

			window.setTimeout(
				() =>
					window.requestAnimationFrame(() => {
						const bottomBarHeight = innerHeight - window.innerHeight;
						if (bottomBarHeight && scrollPos.current >= innerHeight) {
							document.body.style.top = `${-(scrollPos.current + bottomBarHeight)}px`;
						}
					}),
				300,
			);
		}
	}, [isOpen, noBodyStyles]);

	const restorePositionSetting = useCallback(() => {
		if (!isSafari()) return;

		if (previousBodyPosition !== null && !noBodyStyles) {
			const y = -Number.parseInt(document.body.style.top, 10);
			const x = -Number.parseInt(document.body.style.left, 10);

			Object.assign(document.body.style, previousBodyPosition);

			window.requestAnimationFrame(() => {
				window.scrollTo(x, y);
			});

			previousBodyPosition = null;
		}
	}, [noBodyStyles]);

	useEffect(() => {
		function onScroll() {
			scrollPos.current = window.scrollY;
		}

		onScroll();
		window.addEventListener('scroll', onScroll);

		return () => {
			window.removeEventListener('scroll', onScroll);
		};
	}, []);

	useEffect(() => {
		if (!modal) return;

		return () => {
			if (typeof document === 'undefined') return;
			const hasDrawerOpened = !!document.querySelector('[data-vaul-drawer]');
			if (hasDrawerOpened) return;
			restorePositionSetting();
		};
	}, [modal, restorePositionSetting]);

	useEffect(() => {
		if (!hasBeenOpened) return;

		if (isOpen) {
			const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
			!isStandalone && setPositionFixed();

			if (!modal) {
				window.setTimeout(() => {
					restorePositionSetting();
				}, 500);
			}
		} else {
			restorePositionSetting();
		}
	}, [isOpen, hasBeenOpened, modal, setPositionFixed, restorePositionSetting]);

	return { restorePositionSetting };
}

// Main Drawer.Root component
export function Root({
	open: openProp,
	onOpenChange,
	children,
	onDrag: onDragProp,
	onRelease: onReleaseProp,
	closeThreshold = CLOSE_THRESHOLD,
	scrollLockTimeout = SCROLL_LOCK_TIMEOUT,
	dismissible = true,
	modal = true,
	onClose,
	noBodyStyles = false,
	direction = 'bottom',
	defaultOpen = false,
	disablePreventScroll = true,
	onAnimationEnd,
	container,
	autoFocus = false,
}: Partial<DialogProps>) {
	const [isOpen = false, setIsOpen] = useControllableState({
		defaultProp: defaultOpen,
		prop: openProp,
		onChange: (o) => {
			onOpenChange?.(o);

			setTimeout(() => {
				onAnimationEnd?.(o);
			}, TRANSITIONS.DURATION * 1000);

			if (!o) {
				document.body.style.pointerEvents = 'auto';
			}
		},
	});

	const [hasBeenOpened, setHasBeenOpened] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [justReleased, setJustReleased] = useState(false);

	const overlayRef = useRef<HTMLDivElement | null>(null);
	const drawerRef = useRef<HTMLDivElement | null>(null);
	const openTime = useRef<Date | null>(null);
	const dragStartTime = useRef<Date | null>(null);
	const lastTimeDragPrevented = useRef<Date | null>(null);
	const isAllowedToDrag = useRef(false);
	const pointerStart = useRef(0);
	const keyboardIsOpen = useRef(false);
	const shouldAnimate = useRef(!defaultOpen);
	const drawerHeightRef = useRef(0);
	const drawerWidthRef = useRef(0);

	useEffect(() => {
		if (isOpen) {
			setHasBeenOpened(true);
			openTime.current = new Date();
		}
	}, [isOpen]);

	usePreventScroll({
		isDisabled:
			!isOpen ||
			isDragging ||
			!modal ||
			justReleased ||
			!hasBeenOpened ||
			disablePreventScroll,
	});

	const { restorePositionSetting } = usePositionFixed({
		isOpen,
		modal,
		hasBeenOpened,
		noBodyStyles,
	});

	const closeDrawer = useCallback(() => {
		setIsOpen(false);
		onClose?.();
	}, [setIsOpen, onClose]);

	function onPress(event: PointerEvent) {
		if (!dismissible) return;
		if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) return;

		drawerHeightRef.current =
			drawerRef.current?.getBoundingClientRect().height || 0;
		drawerWidthRef.current =
			drawerRef.current?.getBoundingClientRect().width || 0;

		setIsDragging(true);
		dragStartTime.current = new Date();

		(event.target as HTMLElement).setPointerCapture(event.pointerId);
		pointerStart.current = isVertical(direction) ? event.pageY : event.pageX;
	}

	function shouldDrag(el: HTMLElement, isDraggingInDirection: boolean) {
		let element = el as HTMLElement | null;
		const highlightedText = window.getSelection()?.toString();
		const swipeAmount = drawerRef.current
			? getTranslate(drawerRef.current, direction)
			: null;
		const date = new Date();

		if (element?.hasAttribute('data-vaul-no-drag') || element?.closest('[data-vaul-no-drag]')) {
			return false;
		}

		if (direction === 'right' || direction === 'left') {
			return true;
		}

		if (openTime.current && date.getTime() - openTime.current.getTime() < 500) {
			return false;
		}

		if (swipeAmount !== null) {
			if (direction === 'bottom' ? swipeAmount > 0 : swipeAmount < 0) {
				return true;
			}
		}

		if (highlightedText && highlightedText.length > 0) {
			return false;
		}

		if (
			lastTimeDragPrevented.current &&
			date.getTime() - lastTimeDragPrevented.current.getTime() < scrollLockTimeout &&
			swipeAmount === 0
		) {
			lastTimeDragPrevented.current = date;
			return false;
		}

		if (isDraggingInDirection) {
			lastTimeDragPrevented.current = date;
			return false;
		}

		while (element) {
			if (element.scrollHeight > element.clientHeight) {
				if (element.scrollTop !== 0) {
					lastTimeDragPrevented.current = new Date();
					return false;
				}

				if (element.getAttribute('role') === 'dialog') {
					return true;
				}
			}

			element = element.parentNode as HTMLElement | null;
		}

		return true;
	}

	function onDrag(event: PointerEvent) {
		if (!drawerRef.current) return;

		if (isDragging) {
			const directionMultiplier = direction === 'bottom' || direction === 'right' ? 1 : -1;
			const draggedDistance =
				(pointerStart.current -
					(isVertical(direction) ? event.pageY : event.pageX)) *
				directionMultiplier;
			const isDraggingInDirection = draggedDistance > 0;

			if (
				!isAllowedToDrag.current &&
				!shouldDrag(event.target as HTMLElement, isDraggingInDirection)
			)
				return;

			drawerRef.current.classList.add(DRAG_CLASS);
			isAllowedToDrag.current = true;

			set(drawerRef.current, {
				transition: 'none',
			});

			set(overlayRef.current, {
				transition: 'none',
			});

			if (isDraggingInDirection) {
				const dampenedDraggedDistance = dampenValue(draggedDistance);
				const translateValue = Math.min(dampenedDraggedDistance * -1, 0) * directionMultiplier;

				set(drawerRef.current, {
					transform: isVertical(direction)
						? `translate3d(0, ${translateValue}px, 0)`
						: `translate3d(${translateValue}px, 0, 0)`,
				});
				return;
			}

			const absDraggedDistance = Math.abs(draggedDistance);
			const drawerDimension =
				direction === 'bottom' || direction === 'top'
					? drawerHeightRef.current
					: drawerWidthRef.current;

			const percentageDragged = absDraggedDistance / drawerDimension;
			const opacityValue = 1 - percentageDragged;

			onDragProp?.(event, percentageDragged);

			set(
				overlayRef.current,
				{
					opacity: `${opacityValue}`,
					transition: 'none',
				},
				true,
			);

			set(drawerRef.current, {
				transform: isVertical(direction)
					? `translate3d(0, ${draggedDistance}px, 0)`
					: `translate3d(${draggedDistance}px, 0, 0)`,
			});
		}
	}

	function onRelease(event: PointerEvent) {
		if (!drawerRef.current || !isDragging) return;

		drawerRef.current.classList.remove(DRAG_CLASS);
		isAllowedToDrag.current = false;
		setIsDragging(false);
		setJustReleased(true);

		setTimeout(() => {
			setJustReleased(false);
		}, 200);

		const directionMultiplier = direction === 'bottom' || direction === 'right' ? 1 : -1;
		const draggedDistance =
			(pointerStart.current - (isVertical(direction) ? event.pageY : event.pageX)) *
			directionMultiplier;

		const dragEndTime = new Date();
		const timeTaken = dragEndTime.getTime() - (dragStartTime.current?.getTime() || 0);
		const distanceMoved = pointerStart.current - (isVertical(direction) ? event.pageY : event.pageX);
		const velocity = Math.abs(distanceMoved) / timeTaken;

		const drawerDimension =
			direction === 'bottom' || direction === 'top'
				? drawerHeightRef.current
				: drawerWidthRef.current;

		const closeDrawerThreshold = drawerDimension * closeThreshold;

		const shouldClose = velocity > VELOCITY_THRESHOLD || Math.abs(draggedDistance) > closeDrawerThreshold;
		const willBeOpen = !(dismissible && shouldClose);

		onReleaseProp?.(event, willBeOpen);

		if (shouldClose) {
			if (dismissible) {
				closeDrawer();
			} else {
				// Snap back
				set(drawerRef.current, {
					transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
					transform: isVertical(direction)
						? 'translate3d(0, 0, 0)'
						: 'translate3d(0, 0, 0)',
				});

				set(overlayRef.current, {
					transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
					opacity: '1',
				});
			}
		} else {
			// Snap back
			set(drawerRef.current, {
				transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
				transform: isVertical(direction)
					? 'translate3d(0, 0, 0)'
					: 'translate3d(0, 0, 0)',
			});

			set(overlayRef.current, {
				transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
				opacity: '1',
			});
		}
	}

	const onNestedDrag = useCallback(() => {}, []);
	const onNestedOpenChange = useCallback(() => {}, []);
	const onNestedRelease = useCallback(() => {}, []);

	const contextValue = useMemo(
		() => ({
			drawerRef,
			overlayRef,
			onPress,
			onRelease,
			onDrag,
			onNestedDrag,
			onNestedOpenChange,
			onNestedRelease,
			openProp: openProp,
			dismissible,
			isOpen,
			isDragging,
			keyboardIsOpen,
			snapPointsOffset: null,
			snapPoints: null,
			handleOnly: false,
			modal,
			shouldFade: true,
			activeSnapPoint: null,
			onOpenChange: setIsOpen,
			setActiveSnapPoint: () => {},
			closeDrawer,
			direction,
			shouldAnimate,
			shouldScaleBackground: false,
			setBackgroundColorOnScale: true,
			noBodyStyles,
			container: container || null,
			autoFocus,
		}),
		[
			isOpen,
			isDragging,
			dismissible,
			modal,
			direction,
			noBodyStyles,
			container,
			autoFocus,
			openProp,
			setIsOpen,
			closeDrawer,
		],
	);

	return <DrawerProvider value={contextValue}>{children}</DrawerProvider>;
}

// Drawer.Overlay component
export const Overlay = forwardRef<HTMLDivElement, JSX.HTMLAttributes<HTMLDivElement>>(
	function Overlay({ onClick, ...rest }, ref) {
		const { isOpen, dismissible, onOpenChange } = useDrawerContext();

		const handleClick = useCallback(
			(event: JSX.TargetedMouseEvent<HTMLDivElement>) => {
				if (onClick) {
					onClick(event);
				}

				if (!event.defaultPrevented && dismissible && onOpenChange) {
					onOpenChange(false);
				}
			},
			[onClick, dismissible, onOpenChange],
		);

		return (
			<div
				{...rest}
				ref={ref}
				data-vaul-overlay=""
				data-vaul-snap-points="false"
				data-state={isOpen ? 'open' : 'closed'}
				onClick={handleClick}
			/>
		);
	},
);

Overlay.displayName = 'Drawer.Overlay';

// Drawer.Content component
export const Content = forwardRef<HTMLDivElement, JSX.HTMLAttributes<HTMLDivElement>>(
	function Content({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel, ...rest }, ref) {
		const {
			drawerRef,
			direction,
			isOpen,
			onPress,
			onDrag,
			onRelease,
		} = useDrawerContext();

		const composedRef = useComposedRefs(ref, drawerRef);

		const handlePointerDown = chain(onPointerDown, onPress);
		const handlePointerMove = chain(onPointerMove, onDrag);
		const handlePointerUp = chain(onPointerUp, onRelease);
		const handlePointerCancel = chain(onPointerCancel, onRelease);

		return (
			<div
				{...rest}
				ref={composedRef}
				data-vaul-drawer=""
				data-vaul-drawer-direction={direction ?? 'bottom'}
				data-vaul-snap-points="false"
				data-state={isOpen ? 'open' : 'closed'}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerCancel}
			/>
		);
	},
);

Content.displayName = 'Drawer.Content';

// Drawer.Title component
export const Title = forwardRef<HTMLHeadingElement, JSX.HTMLAttributes<HTMLHeadingElement>>(
	function Title({ ...rest }, ref) {
		return <h2 {...rest} ref={ref} data-vaul-title="" />;
	},
);

Title.displayName = 'Drawer.Title';

// Drawer.Portal component
export function Portal({ children, container }: PortalProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || typeof document === 'undefined') {
		return null;
	}

	const target = container || document.body;
	return createPortal(children, target);
}

Portal.displayName = 'Drawer.Portal';

// Export as Drawer namespace
export const Drawer = {
	Root,
	Overlay,
	Content,
	Portal,
	Title,
};
