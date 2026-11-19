import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { useTheme } from '@/hooks/useTheme';
import ScrollToTop from './components/ScrollToTop';

import AppLayout from '@/components/AppLayout';

const Login = lazy(() => import('@/pages/Login'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Home = lazy(() => import('@/pages/Home'));
const Triage = lazy(() => import('@/pages/Triage'));
const MoodDiary = lazy(() => import('@/pages/MoodDiary'));
const Debriefing = lazy(() => import('@/pages/Debriefing'));
const Accessibility = lazy(() => import('@/pages/Accessibility'));
const Settings = lazy(() => import('@/pages/Settings'));

function AppRoutes() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    }>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/triagem" element={<Triage />} />
          <Route path="/diario" element={<MoodDiary />} />
          <Route path="/debriefing" element={<Debriefing />} />
          <Route path="/acessibilidade" element={<Accessibility />} />
          <Route path="/configuracoes" element={<Settings />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  useTheme();
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <AppRoutes />
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App
