import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

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

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = nextId++;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}
            {/* Toast container */}
            {toasts.length > 0 && (
                <div className="fixed bottom-4 right-4 z-[99999] flex flex-col gap-2 max-w-sm pointer-events-none">
                    {toasts.map(t => (
                        <div
                            key={t.id}
                            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-up ${t.type === 'success'
                                ? 'bg-green-600 text-white'
                                : t.type === 'error'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-800 text-white dark:bg-gray-700'
                                }`}
                        >
                            {t.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
                            {t.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
                            {t.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
                            <span className="flex-1">{t.message}</span>
                            <button onClick={() => removeToast(t.id)} className="p-0.5 hover:opacity-70 shrink-0">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </ToastContext.Provider>
    );
}
