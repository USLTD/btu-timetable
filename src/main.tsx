import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from '@lingui/react'
import { i18n, loadCatalog, defaultLocale, type Locale, locales } from './i18n.ts'
import { loadState } from './lib/storage.ts'
import { restoreFromHash } from './lib/url-state.ts'
import { ErrorBoundary } from './components/error-boundary.tsx'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.tsx'

// If the URL contains a shared hash, write it to localStorage
// BEFORE React mounts so usePersistedState picks it up immediately.
restoreFromHash();

// Register service worker for offline support + auto-update
registerSW({
  onNeedRefresh() {
    // A new version of the app is available; auto-update on next navigation
    // Could show a toast here, but autoUpdate handles it silently
  },
  onOfflineReady() {
    console.log('App is ready for offline use');
  },
})

// Restore persisted locale (or fall back to default)
const saved = loadState<Locale>('app-locale');
const startLocale = saved && saved in locales ? saved : defaultLocale;

loadCatalog(startLocale).then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <I18nProvider i18n={i18n}>
          <App />
        </I18nProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
})
