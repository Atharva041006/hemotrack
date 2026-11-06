import { Navigate, Route, Routes } from 'react-router'
import Dashboard from './pages/Dashboard.jsx'
import DonorManagement from './pages/DonorManagement.jsx'
import DonationManagement from './pages/DonationManagement.jsx'
import InventoryManagement from './pages/InventoryManagement.jsx'
import RequestManagement from './pages/RequestManagement.jsx'
import IssueManagement from './pages/IssueManagement.jsx'
import Reports from './pages/Reports.jsx'
import DesignSystemPreview from './pages/DesignSystemPreview.jsx'
import { EmergencyDemoProvider } from './data/emergencyDemo.jsx'

export default function App() {
  return (
    <EmergencyDemoProvider><Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/donors" element={<DonorManagement />} />
      <Route path="/donations" element={<DonationManagement />} />
      <Route path="/inventory" element={<InventoryManagement />} />
      <Route path="/requests" element={<RequestManagement />} />
      <Route path="/issues" element={<IssueManagement />} />
      <Route path="/reports" element={<Reports />} />
      {import.meta.env.DEV && <Route path="/design-system-preview" element={<DesignSystemPreview />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></EmergencyDemoProvider>
  )
}
