import { StrictMode, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// Register the service worker with auto-update.
// When a new version is deployed, this will automatically activate
// the new service worker and reload the page so users never get
// stuck on a stale cached version.
const updateSW = registerSW({
  onNeedRefresh() {
    // A new service worker is available — activate it immediately
    // and reload to pick up the latest assets.
    updateSW(true)
  },
  onOfflineReady() {
    console.log('[PWA] App is ready to work offline.')
  },
  immediate: true,
})

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div style={{padding: 20, color: 'red'}}><h1>Something went wrong.</h1><pre>{this.state.error?.message}</pre><pre>{this.state.error?.stack}</pre></div>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
