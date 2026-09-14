import { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import AppLayout from './layouts/AppLayout';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';

const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Quests = lazy(() => import('./pages/Quests'));
const Character = lazy(() => import('./pages/Character'));
const Loadout = lazy(() => import('./pages/Loadout'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Campaign = lazy(() => import('./pages/Campaign'));
const Intel = lazy(() => import('./pages/Intel'));
const Outpost = lazy(() => import('./pages/Outpost'));
const Shop = lazy(() => import('./pages/Shop'));
const History = lazy(() => import('./pages/History'));
const Settings = lazy(() => import('./pages/Settings'));

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route element={<AuthLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>

          {/* Protected routes */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/quests" element={<Quests />} />
            <Route path="/character" element={<Character />} />
            <Route path="/loadout" element={<Loadout />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/campaign" element={<Campaign />} />
            <Route path="/intel" element={<Intel />} />
            <Route path="/outpost" element={<Outpost />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
