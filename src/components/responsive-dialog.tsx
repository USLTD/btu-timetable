import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Drawer } from "@/components/drawer";
import "@/components/drawer/drawer.css";
import { X } from "lucide-preact";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cx } from "@/lib/cx";

interface ResponsiveDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ComponentChildren;
}

/** Adaptive dialog: bottom drawer on mobile, animated overlay modal on desktop. */
export function ResponsiveDialog({ open, onClose, title, children }: ResponsiveDialogProps) {
    const isMobile = useIsMobile();
    const overlayRef = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    const [animating, setAnimating] = useState(false);

    // Manage open/close animation lifecycle for desktop modal
    useEffect(() => {
        if (isMobile) return;
        let rafId: number | null = null;
        let timerId: number | null = null;
        if (open) {
            setVisible(true);
            // Trigger enter animation on next frame
            rafId = requestAnimationFrame(() => setAnimating(true));
        } else if (visible) {
            // Start exit animation
            setAnimating(false);
            timerId = window.setTimeout(() => setVisible(false), 200);
        }
        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            if (timerId !== null) clearTimeout(timerId);
        };
    }, [open, isMobile, visible]);

    // Lock body scroll when desktop modal is open
    useEffect(() => {
        if (isMobile || !open) return;
        const prev = document.body.style.overflow;
        const prevPaddingRight = document.body.style.paddingRight;

        // Calculate scrollbar width to prevent layout shift
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = "hidden";
        document.body.style.paddingRight = `${scrollbarWidth}px`;

        return () => {
            document.body.style.overflow = prev;
            document.body.style.paddingRight = prevPaddingRight;
        };
    }, [open, isMobile]);

    // Close on Escape key for desktop modal
    useEffect(() => {
        if (isMobile || !visible) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [visible, isMobile, onClose]);

    // Focus trap for desktop modal (#11)
    useEffect(() => {
        if (isMobile || !visible) return;
        const el = overlayRef.current;
        if (!el) return;
        const focusable = el.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) focusable[0].focus();

        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [visible, isMobile]);

    if (isMobile) {
        return (
            <Drawer.Root open={open} onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
                <Drawer.Portal>
                    <Drawer.Overlay class={styles.mobileOverlay} />
                    <Drawer.Content class={styles.mobileContent}>
                        <div class={styles.mobileHandle} />
                        <div class={styles.mobileHeader}>
                            <Drawer.Title class={styles.mobileTitle}>{title}</Drawer.Title>
                            <button type="button" onClick={onClose} class={styles.closeButton} aria-label="Close dialog">
                                <X class={styles.closeIcon} />
                            </button>
                        </div>
                        <div class={styles.mobileBody}>
                            {children}
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        );
    }

    // Desktop: animated overlay modal
    if (!visible) return null;

    return (
        <div
            ref={overlayRef}
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
            onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
            class={cx(styles.desktopOverlay, animating ? styles.desktopOverlayActive : styles.desktopOverlayIdle)}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
        >
            <div class={cx(styles.desktopCard, animating ? styles.desktopCardActive : styles.desktopCardIdle)}>
                <div class={styles.desktopHeader}>
                    <h2 class={styles.desktopTitle}>{title}</h2>
                    <button type="button" onClick={onClose} class={styles.closeButton} aria-label="Close dialog">
                        <X class={styles.closeIcon} />
                    </button>
                </div>
                <div class={styles.desktopBody}>
                    {children}
                </div>
            </div>
        </div>
    );
}

const styles = {
  mobileOverlay: "fixed inset-0 z-50 bg-black/40",
  mobileContent:
    "fixed left-0 right-0 bottom-0 z-50 mt-24 max-h-[90vh] flex flex-col rounded-t-2xl bg-white dark:bg-gray-900",
  mobileHandle: "w-12 h-1.5 mt-3 mx-auto rounded-full bg-gray-300 shrink-0 dark:bg-gray-600",
  mobileHeader:
    "pt-4 pb-2 px-4 flex items-center justify-between border-b border-gray-200 gap-2 dark:border-gray-700",
  mobileTitle: "text-lg font-bold text-gray-800 dark:text-gray-100",
  mobileBody: "p-4 overflow-y-auto flex-1 min-h-0 text-sm text-gray-700 leading-relaxed dark:text-gray-300",
  desktopOverlay: "fixed inset-0 z-50 flex items-center justify-center transition-colors",
  desktopOverlayActive: "bg-black/40",
  desktopOverlayIdle: "bg-black/0",
  desktopCard:
    "w-full max-w-[42rem] max-h-[80vh] m-4 flex flex-col rounded-xl border border-gray-200 bg-white shadow-2xl transition-[transform,opacity] duration-200 dark:border-gray-700 dark:bg-gray-900",
  desktopCardActive: "opacity-100 scale-100 translate-y-0",
  desktopCardIdle: "opacity-0 scale-95 translate-y-4",
  desktopHeader:
    "pt-5 pb-3 px-6 flex items-center justify-between border-b border-gray-200 gap-2 shrink-0 dark:border-gray-700",
  desktopTitle: "text-xl font-bold text-gray-800 dark:text-gray-100",
  desktopBody: "p-5 px-6 overflow-y-auto flex-1 min-h-0 text-sm text-gray-700 leading-relaxed dark:text-gray-300",
  closeButton: "p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700",
  closeIcon: "w-5 h-5 text-gray-500",
};
