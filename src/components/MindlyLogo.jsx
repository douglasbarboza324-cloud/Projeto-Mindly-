import React from "react";

export default function MindlyLogo({ className = "w-8 h-8", showText = false, textClassName = "" }) {
  return (
    <div className="flex items-center gap-2">
      <div className={className}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <rect width="40" height="40" rx="12" fill="url(#mindly-grad)" />
          <path
            d="M20 29c-.5 0-1-.2-1.4-.5C14 25 10 22 10 17.5 10 15 12 13 14.5 13c1.7 0 3.3 1 4.5 2.5C20.2 14 21.8 13 23.5 13 26 13 28 15 28 17.5c0 4.5-4 7.5-8.6 11-.4.3-.9.5-1.4.5z"
            fill="white"
          />
          <circle cx="16.5" cy="17" r="1.2" fill="#3B82F6" />
          <circle cx="23.5" cy="17" r="1.2" fill="#3B82F6" />
          <path d="M17 21c1 1 5 1 6 0" stroke="#3B82F6" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          <defs>
            <linearGradient id="mindly-grad" x1="0" y1="0" x2="40" y2="40">
              <stop stopColor="#3B82F6" />
              <stop offset="1" stopColor="#FBBF24" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {showText && (
        <span className={`font-heading font-bold text-xl text-foreground ${textClassName}`}>
          Mindly
        </span>
      )}
    </div>
  );
}