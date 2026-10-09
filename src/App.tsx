import { Navigate, Route, Routes } from 'react-router-dom'
import { DemoBar } from './components/DemoBar'
import { AccountantLayout } from './components/AccountantLayout'
import { ClientLayout } from './components/ClientLayout'
import Dashboard from './pages/accountant/Dashboard'
import Requests from './pages/accountant/Requests'
import RequestDetail from './pages/accountant/RequestDetail'
import Clients from './pages/accountant/Clients'
import ClientDetail from './pages/accountant/ClientDetail'
import Documents from './pages/accountant/Documents'
import DocumentDetail from './pages/accountant/DocumentDetail'
import SettingsPage from './pages/accountant/Settings'
import ClientHome from './pages/client/ClientHome'
import ClientRequest from './pages/client/ClientRequest'
import ClientUploads from './pages/client/ClientUploads'
import ClientMessages from './pages/client/ClientMessages'

export default function App() {
  return (
    <>
      <DemoBar />
      <Routes>
        <Route element={<AccountantLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="requests" element={<Requests />} />
          <Route path="requests/:id" element={<RequestDetail />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="documents" element={<Documents />} />
          <Route path="documents/:id" element={<DocumentDetail />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="portal" element={<ClientLayout />}>
          <Route index element={<ClientHome />} />
          <Route path="requests/:id" element={<ClientRequest />} />
          <Route path="uploads" element={<ClientUploads />} />
          <Route path="messages" element={<ClientMessages />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
