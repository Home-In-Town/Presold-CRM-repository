import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Pipeline from './pages/Pipeline';
import Playbook from './pages/Playbook';
import Leaderboard from './pages/Leaderboard';
import Reports from './pages/Reports';
import Assets from './pages/Assets';
import Team from './pages/Team';
import Settings from './pages/Settings';
import AIAssistant from './pages/AIAssistant';
import Tasks from './pages/Tasks';
import ContentCreator from './pages/ContentCreator';
import DayPlan from './pages/DayPlan';
import PlaybookB2B from './pages/PlaybookB2B';
import PlaybookDMA from './pages/PlaybookDMA';
import PlaybookContent from './pages/PlaybookContent';

// Smart playbook router — renders the correct playbook based on user role
function PlaybookRouter() {
  const { user } = useAuth();
  if (user?.role === 'B2B_SALES') return <PlaybookB2B />;
  if (user?.role === 'DMA_WHITE_LABEL') return <PlaybookDMA />;
  if (user?.role === 'CONTENT_CREATION') return <PlaybookContent />;
  if (user?.role === 'ADMIN') return <PlaybookAdmin />;
  return <Playbook />;
}

// Admin sees all playbooks with tabs
function PlaybookAdmin() {
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem('admin-playbook-tab') || 'builder'; } catch { return 'builder'; }
  });

  const tabs = [
    { id: 'builder', label: 'Builder / Developer', color: 'brand' },
    { id: 'b2b', label: 'B2B Sales', color: 'cyan' },
    { id: 'dma', label: 'White Label', color: 'orange' },
    { id: 'content', label: 'Content Creator', color: 'pink' },
  ];

  const handleTab = (id) => { setActiveTab(id); localStorage.setItem('admin-playbook-tab', id); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 p-1 bg-dark-800 rounded-xl border border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTab(tab.id)}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? `bg-${tab.color}-500/20 text-${tab.color}-400 border border-${tab.color}-500/30`
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'builder' && <Playbook />}
      {activeTab === 'b2b' && <PlaybookB2B />}
      {activeTab === 'dma' && <PlaybookDMA />}
      {activeTab === 'content' && <PlaybookContent />}
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RoleProtectedRoute({ children, allowedRoles = ['ADMIN', 'SALES_EXECUTIVE', 'B2B_SALES', 'CONTENT_CREATION'] }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}

// Show landing page to unauthenticated, redirect to dashboard for authenticated
function LandingRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/home" element={<LandingRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="playbook" element={<PlaybookRouter />} />
        <Route path="playbook-b2b" element={<PlaybookB2B />} />
        <Route path="playbook-dma" element={<PlaybookDMA />} />
        <Route path="playbook-content" element={<PlaybookContent />} />
        <Route path="leaderboard" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><Leaderboard /></RoleProtectedRoute>} />
        <Route path="reports" element={<Reports />} />
        <Route path="assets" element={<Assets />} />
        <Route path="content" element={<RoleProtectedRoute allowedRoles={["CONTENT_CREATION","ADMIN"]}><ContentCreator /></RoleProtectedRoute>} />
        <Route path="team" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><Team /></RoleProtectedRoute>} />
        <Route path="settings" element={<Settings />} />
        <Route path="ai" element={<AIAssistant />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="90-day-plan" element={<DayPlan />} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
