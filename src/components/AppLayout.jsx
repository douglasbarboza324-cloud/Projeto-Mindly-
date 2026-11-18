import React, { useState, useEffect } from "react";
import { Outlet, Link, Navigate, useLocation } from "react-router-dom";
import { BookHeart, MessageCircleHeart, ListTodo, Home, Settings as SettingsIcon, Briefcase } from "lucide-react";
import { localData, setLocalDataOwner } from "@/api/localData";
import { supabase } from "@/api/profile";
import EmergencyButton from "@/components/EmergencyButton";
import ConsentModal from "@/components/ConsentModal";
import MindlyLogo from "@/components/MindlyLogo";
import BottomTabBar from "@/components/BottomTabBar";
import Onboarding, { shouldShowOnboarding } from "@/components/Onboarding";

const personalNav = [
  { path: "/", icon: Home, label: "Início" },
  { path: "/triagem", icon: MessageCircleHeart, label: "Triagem" },
  { path: "/diario", icon: BookHeart, label: "Diário" },
  { path: "/debriefing", icon: ListTodo, label: "Organizador" },
];

const professionalNav = [
  { path: "/acessibilidade", icon: Briefcase, label: "Acessibilidade", professional: true },
];

const allNavItems = [...personalNav, ...professionalNav];

export default function AppLayout() {
  const location = useLocation();
  const [needsConsent, setNeedsConsent] = useState(false);
  const [checkingConsent, setCheckingConsent] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    if (!supabase) { setUser(null); return; }
    supabase.auth.getSession().then(({ data }) => {
      const nextUser = data.session?.user || null;
      setLocalDataOwner(nextUser?.id);
      setUser(nextUser);
    }).catch(() => { setLocalDataOwner(null); setUser(null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;
      setLocalDataOwner(nextUser?.id);
      setUser(nextUser);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      setNeedsConsent(false);
      setCheckingConsent(false);
      return;
    }
    setCheckingConsent(true);
    const checkConsent = async () => {
      try {
        const consents = await localData.consents.list();
        if (!consents || consents.length === 0) {
          setNeedsConsent(true);
        }
      } catch {
        setNeedsConsent(true);
      } finally {
        setCheckingConsent(false);
      }
    };
    checkConsent();
  }, [user?.id, user]);

  useEffect(() => {
    if (!checkingConsent && !needsConsent && shouldShowOnboarding()) {
      setShowOnboarding(true);
    }
  }, [checkingConsent, needsConsent]);

  if (user === undefined) return <div className="fixed inset-0 flex items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (checkingConsent) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <ConsentModal open={needsConsent} onConsent={() => setNeedsConsent(false)} />
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col border-r bg-card/80 backdrop-blur-sm z-40">
        <div className="p-6">
          <MindlyLogo className="w-9 h-9" showText />
          <p className="text-xs text-muted-foreground mt-2">Bem-estar & autoconhecimento</p>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-4 pt-2 pb-1">
            Jornada Pessoal
          </p>
          {personalNav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all select-none ${
                  active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-4 pt-4 pb-1">
            Ferramentas Profissionais
          </p>
          {professionalNav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all select-none ${
                  active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t space-y-1">
          <Link
            to="/configuracoes"
            aria-current={location.pathname === "/configuracoes" ? "page" : undefined}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all select-none ${
              location.pathname === "/configuracoes"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <SettingsIcon className="w-5 h-5" />
            Configurações
          </Link>
        </div>
      </aside>

      {/* Mobile header — safe area aware */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 bg-card/90 backdrop-blur-md border-b z-40 select-none"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between px-4 h-16">
          <MindlyLogo className="w-8 h-8" showText />
          <div className="flex items-center gap-1">
            <Link
              to="/configuracoes"
              className={`p-3 rounded-lg transition-colors select-none ${
                location.pathname === "/configuracoes"
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-muted-foreground"
              }`}
              aria-label="Configurações"
            >
              <SettingsIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-dvh pb-24 lg:pb-0">
        <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <BottomTabBar items={allNavItems} />

      <EmergencyButton />
    </div>
  );
}
