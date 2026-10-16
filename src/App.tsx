/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute'; // Import ProtectedRoute
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import About from './pages/About';
import Portfolio from './pages/Portfolio';
import Reservation from './pages/Reservation';
import Login from './pages/Login';
import MyPage from './pages/MyPage';
import Admin from './pages/Admin';
import AdminLogs from './pages/AdminLogs';
import { useEffect } from 'react';
import { logAccess } from './lib/firebase';

import { TooltipProvider } from './components/ui/tooltip';

function LogTracker() {
  const location = useLocation();
  useEffect(() => {
    logAccess(location.pathname + location.search);
  }, [location]);
  return null;
}

export default function App() {
  const siteUrl = (import.meta as any).env.VITE_SITE_URL || 'https://ljinterior.com';

  return (
    <HelmetProvider>
      <Helmet>
        <link rel="canonical" href={siteUrl} />
      </Helmet>
      <TooltipProvider>
        <AuthProvider>
          <Router>
            <LogTracker />
            <ScrollToTop />
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/reservation" element={<Reservation />} />
                <Route path="/login" element={<Login />} />
                {/* Wrapped protected routes */}
                <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="/admin/logs" element={<ProtectedRoute><AdminLogs /></ProtectedRoute>} />
              </Routes>
            </Layout>
          </Router>
        </AuthProvider>
      </TooltipProvider>
    </HelmetProvider>
  );
}
