import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AppStoreProvider } from './store/AppStore'
import { ToastProvider } from './components/Toast'
import { PortalViewProvider } from './store/PortalView'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppStoreProvider>
        <PortalViewProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </PortalViewProvider>
      </AppStoreProvider>
    </HashRouter>
  </React.StrictMode>,
)
