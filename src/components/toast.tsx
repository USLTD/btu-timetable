import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useCallback, useContext, useEffect, useRef, useState } from "preact/hooks";
import { CheckCircle, AlertCircle, Info, X } from "lucide-preact";
import { cx } from "@/lib/cx";

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => { } });

export function useToast() {
    return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ComponentChildren }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timeoutsRef = useRef<Map<number, number>>(new Map());

    const addToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = nextId++;
        setToasts(prev => [...prev, { id, message, type }]);
        const timeoutId = window.setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
            timeoutsRef.current.delete(id);
        }, 3000);
        timeoutsRef.current.set(id, timeoutId);
    }, []);

    const removeToast = useCallback((id: number) => {
        const timeoutId = timeoutsRef.current.get(id);
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
            timeoutsRef.current.delete(id);
        }
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        return () => {
            for (const timeoutId of timeoutsRef.current.values()) {
                clearTimeout(timeoutId);
            }
            timeoutsRef.current.clear();
        };
    }, []);

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}
            {/* Toast container */}
            {toasts.length > 0 && (
                <div class={styles.container} role="status" aria-live="polite" aria-atomic="true">
                    {toasts.map(t => (
                        <div
                            key={t.id}
                            class={cx(
                              styles.toastBase,
                              "animate-slide-up",
                              t.type === "success"
                                ? styles.toastSuccess
                                : t.type === "error"
                                  ? styles.toastError
                                  : styles.toastInfo
                            )}
                            role="alert"
                            aria-atomic="true"
                        >
                            {t.type === "success" && <CheckCircle class={styles.icon} />}
                            {t.type === "error" && <AlertCircle class={styles.icon} />}
                            {t.type === "info" && <Info class={styles.icon} />}
                            <span class={styles.message}>{t.message}</span>
                            <button type="button" onClick={() => removeToast(t.id)} class={styles.closeButton} aria-label="Close notification">
                                <X class={styles.closeIcon} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </ToastContext.Provider>
    );
}

const styles = {
  container:
    "fixed bottom-4 right-4 z-[99999] max-w-sm pointer-events-none flex flex-col space-y-2",
  toastBase:
    "pointer-events-auto flex items-center py-3 px-4 rounded-lg shadow-lg text-sm font-medium space-x-2",
  toastSuccess: "bg-green-600 text-white",
  toastError: "bg-red-600 text-white",
  toastInfo: "bg-gray-800 text-white dark:bg-gray-700",
  icon: "w-4 h-4 shrink-0",
  message: "flex-1",
  closeButton: "p-1.5 shrink-0 cursor-pointer transition-opacity hover:opacity-70 min-w-[44px] min-h-[44px] flex items-center justify-center",
  closeIcon: "w-3.5 h-3.5",
};
