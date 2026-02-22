import { RefreshCw, X } from 'lucide-react';
import { Trans } from '@lingui/react/macro';
import { usePwaUpdate } from '../lib/use-pwa-update.ts';

export function UpdateToast() {
    const { needsRefresh, applyUpdate, dismiss } = usePwaUpdate();
    if (!needsRefresh) return null;

    return (
        <div
            role="alert"
            className="fixed bottom-4 right-4 z-50 max-w-sm bg-blue-600 text-white rounded-xl shadow-lg p-4 flex items-center gap-3 animate-slide-up"
        >
            <RefreshCw className="w-5 h-5 shrink-0 animate-spin-slow" />
            <div className="flex-1 text-sm">
                <p className="font-semibold"><Trans>Update available</Trans></p>
                <p className="text-blue-100 text-xs"><Trans>A new version is ready. Reload to update.</Trans></p>
            </div>
            <button
                onClick={applyUpdate}
                className="px-3 py-1.5 bg-white text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors"
                aria-label="Reload to update"
            >
                <Trans>Reload</Trans>
            </button>
            <button
                onClick={dismiss}
                className="p-1 text-blue-200 hover:text-white transition-colors"
                aria-label="Dismiss update notification"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
