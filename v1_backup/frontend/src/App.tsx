import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ContractList from './pages/ContractList';
import ContractForm from './pages/ContractForm';
import ContractDetail from './pages/ContractDetail';
import PendingApprovals from './pages/PendingApprovals';
import InProgressContracts from './pages/InProgressContracts';
import CompletedContracts from './pages/CompletedContracts';
import RejectedContracts from './pages/RejectedContracts';
import WorkflowSettings from './pages/WorkflowSettings';
import UserManagement from './pages/UserManagement';
import AdminReports from './pages/AdminReports';

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) {
    return <div style={{ padding: 80, textAlign: 'center', fontSize: 20 }}>403 - 權限不足</div>;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="contracts" element={<ContractList />} />
        <Route path="contracts/new" element={<ContractForm />} />
        <Route path="contracts/:id" element={<ContractDetail />} />
        <Route path="contracts/:id/edit" element={<ContractForm />} />
        <Route path="approvals/pending" element={<PendingApprovals />} />
        <Route path="approvals/in-progress" element={<InProgressContracts />} />
        <Route path="approvals/completed" element={<CompletedContracts />} />
        <Route path="approvals/rejected" element={<RejectedContracts />} />
        <Route path="settings/workflows" element={<PrivateRoute roles={['admin']}><WorkflowSettings /></PrivateRoute>} />
        <Route path="admin/users" element={<PrivateRoute roles={['admin']}><UserManagement /></PrivateRoute>} />
        <Route path="admin/reports" element={<PrivateRoute roles={['admin']}><AdminReports /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}
