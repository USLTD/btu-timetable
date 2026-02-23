import { useEffect, useRef, type ReactNode } from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';
import { useMobile } from '../lib/use-mobile.ts';

interface ResponsiveDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

/** Adaptive dialog: bottom drawer on mobile, custom overlay modal on desktop. */
export function ResponsiveDialog({ open, onClose, title, children }: ResponsiveDialogProps) {
    const isMobile = useMobile();
    const overlayRef = useRef<HTMLDivElement>(null);

    // Lock body scroll when desktop modal is open
    useEffect(() => {
        if (isMobile || !open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [open, isMobile]);

    // Close on Escape key for desktop modal
    useEffect(() => {
        if (isMobile || !open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, isMobile, onClose]);

    // Focus trap for desktop modal (#11)
    useEffect(() => {
        if (isMobile || !open) return;
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
    }, [open, isMobile]);

    if (isMobile) {
        return (
            <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="bg-white dark:bg-gray-900 flex flex-col rounded-t-2xl mt-24 fixed bottom-0 left-0 right-0 z-50 max-h-[90vh]">
                        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 dark:bg-gray-600 mt-3" />
                        <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                            <Drawer.Title className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</Drawer.Title>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="px-4 py-4 overflow-y-auto flex-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {children}
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        );
    }

    // Desktop: custom overlay modal (no native <dialog> for backward compatibility)
    if (!open) return null;

    return (
        <div
            ref={overlayRef}
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] border border-gray-200 dark:border-gray-700 mx-4 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="px-6 py-5 overflow-y-auto text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
}
