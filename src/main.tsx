import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from '@lingui/react'
import { i18n, loadCatalog, defaultLocale, type Locale, locales } from './i18n.ts'
import { loadState } from './lib/storage.ts'
import { restoreFromHash } from './lib/url-state.ts'
import { setUpdateSW, notifyNeedsRefresh } from './lib/use-pwa-update.ts'
import { ErrorBoundary } from './components/error-boundary.tsx'
import { UpdateToast } from './components/update-toast.tsx'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.tsx'

import { ToastProvider } from './components/toast.tsx'

// If the URL contains a shared hash, write it to localStorage
// BEFORE React mounts so usePersistedState picks it up immediately.
restoreFromHash();

// Register service worker for offline support + auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    notifyNeedsRefresh();
  },
  onOfflineReady() {
    console.log('App is ready for offline use');
  },
});
setUpdateSW(updateSW);

// Restore persisted locale (or fall back to default)
const saved = loadState<Locale>('app-locale');
const startLocale = saved && saved in locales ? saved : defaultLocale;

loadCatalog(startLocale).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <I18nProvider i18n={i18n}>
          <ToastProvider>
            <App />
          </ToastProvider>
          <UpdateToast />
        </I18nProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
})
