import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import BriefReview from './routes/BriefReview';
import Browse from './routes/Browse';
import Converse from './routes/Converse';
import Landing from './routes/Landing';
import Matches from './routes/Matches';
import ProBriefs from './routes/ProBriefs';
import ProfessionalProfile from './routes/ProfessionalProfile';
import ProfileCreate from './routes/ProfileCreate';
import Roadmap from './routes/Roadmap';

/*
 * Hackathon mode: Google auth is parked. Every route is public and the API
 * acts as the seeded demo user. Login/Signup/AuthCallback/RequireAuth stay
 * in the tree, unreferenced, ready to re-wire after the hackathon.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Landing />} />
          <Route path="professionals/:id" element={<ProfessionalProfile />} />

          {/* Public directory: database reads only, no AI dependency. */}
          <Route path="browse" element={<Browse />} />
          <Route path="app" element={<Navigate to="/app/briefs" replace />} />
          <Route path="app/briefs" element={<ProBriefs />} />
          <Route path="profile/create" element={<ProfileCreate />} />
          <Route path="converse" element={<Converse />} />
          <Route path="brief" element={<BriefReview />} />
          <Route path="matches/:briefId" element={<Matches />} />
          <Route path="roadmap" element={<Roadmap />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
