import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import AuthCallback from './routes/AuthCallback';
import Browse from './routes/Browse';
import Landing from './routes/Landing';
import Login from './routes/Login';
import ProBriefs from './routes/ProBriefs';
import EngagementMessages from './routes/EngagementMessages';
import EngagementThreads from './routes/EngagementThreads';
import ProfessionalProfile from './routes/ProfessionalProfile';
import ProfessionalsEdit from './routes/ProfessionalsEdit';
import ProfessionalsJoin from './routes/ProfessionalsJoin';
import Signup from './routes/Signup';
import AdminLayout from './routes/admin/AdminLayout';
import AdminDashboard from './routes/admin/Dashboard';
import AdminProfessionals from './routes/admin/Professionals';
import AdminBriefs from './routes/admin/Briefs';
import AdminEngagements from './routes/admin/Engagements';
import AdminMetrics from './routes/admin/Metrics';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="professionals" element={<AdminProfessionals />} />
          <Route path="briefs" element={<AdminBriefs />} />
          <Route path="engagements" element={<AdminEngagements />} />
          <Route path="metrics" element={<AdminMetrics />} />
        </Route>

        <Route element={<AppShell />}>
          <Route index element={<Landing />} />
          <Route path="professionals/join" element={<ProfessionalsJoin />} />
          <Route path="professionals/me/edit" element={<ProfessionalsEdit />} />
          <Route path="professionals/:id" element={<ProfessionalProfile />} />

          <Route path="browse" element={<Browse />} />
          <Route path="app" element={<Navigate to="/app/briefs" replace />} />
          <Route path="app/briefs" element={<ProBriefs />} />
          <Route path="app/engagements" element={<EngagementThreads />} />
          <Route
            path="app/engagements/:id"
            element={<EngagementMessages />}
          />
          <Route
            path="profile/create"
            element={<Navigate to="/professionals/join" replace />}
          />

          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="auth/callback" element={<AuthCallback />} />
        </Route>
        {/* Legacy AI pages — everything renders in the floating panel now. */}
        <Route path="converse" element={<Navigate to="/" replace />} />
        <Route path="roadmap" element={<Navigate to="/" replace />} />
        <Route path="brief" element={<Navigate to="/" replace />} />
        <Route path="matches/:briefId" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
