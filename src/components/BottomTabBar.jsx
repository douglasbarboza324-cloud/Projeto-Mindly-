import React from "react";
import { Link, useLocation } from "react-router-dom";

/**
 * Fixed bottom tab bar for mobile screens.
 * Renders a visual divider before items marked `professional: true`
 * to separate personal tools from professional tools.
 * Uses safe-area-inset-bottom to clear device home indicators/notches.
 */
export default function BottomTabBar({ items }) {
  const location = useLocation();

  return (
    <nav
      aria-label="Navegação principal"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t flex items-center justify-around select-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const active = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 py-2 px-1 flex-1 transition-colors select-none ${
              active ? "text-primary" : "text-muted-foreground"
            } ${item.professional ? "border-l border-border" : ""}`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
