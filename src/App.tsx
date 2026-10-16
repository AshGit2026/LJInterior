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
import React, { useEffect, useState } from 'react';
import { logAccess, fetchClientIp, getBlockedIps } from './lib/firebase';

import { TooltipProvider } from './components/ui/tooltip';

function BlockedGuard({ children }: { children: React.ReactNode }) {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    async function checkBlock() {
      try {
        const [ip, blockedList] = await Promise.all([
          fetchClientIp(),
          getBlockedIps()
        ]);
        if (ip && blockedList.includes(ip)) {
          setIsBlocked(true);
        }
      } catch (err) {
        console.warn('Block check error:', err);
      }
    }
    checkBlock();
  }, []);

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-xl shadow-lg border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">접근이 제한되었습니다</h1>
          <p className="text-sm text-gray-600 mb-4">
            비정상적이거나 반복적인 접근 감지로 인해 해당 네트워크(IP)의 접속이 차단되었습니다.
          </p>
          <p className="text-xs text-gray-400">
            오류인 경우 관리자(대표전화 또는 이메일)로 문의해 주세요.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

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
            <BlockedGuard>
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
            </BlockedGuard>
          </Router>
        </AuthProvider>
      </TooltipProvider>
    </HelmetProvider>
  );
}
