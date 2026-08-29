import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plane,
  Sparkles,
  ShieldCheck,
  Globe,
  User,
  ChevronDown,
  LogOut,
  Settings,
  HelpCircle,
  Menu,
} from 'lucide-react';
import { AssistantLanguage } from '../../types/assistant';

interface AssistantTopNavProps {
  language: AssistantLanguage;
  onLanguageChange: (lang: AssistantLanguage) => void;
  onOpenMobileSidebar: () => void;
  onOpenSettings: () => void;
  isLoggedIn: boolean;
  onToggleAuth: () => void;
}

export const AssistantTopNav: React.FC<AssistantTopNavProps> = ({
  language,
  onLanguageChange,
  onOpenMobileSidebar,
  onOpenSettings,
  isLoggedIn,
  onToggleAuth,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-slate-900 text-white shadow-md">
      <div className="mx-auto flex h-16 w-full items-center justify-between px-3 sm:px-5">
        {/* Left: Mobile Menu Toggle + Logo & Product Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open conversation menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <Menu className="h-5.5 w-5.5" />
          </button>

          <Link
            to="/"
            className="group flex items-center gap-2.5 transition-transform active:scale-98"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sm ring-1 ring-white/20">
              <Plane className="h-5 w-5 transform transition-transform group-hover:-rotate-12" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-base font-bold tracking-tight text-white sm:text-lg">
                AirlineBooking
              </span>
              <span className="hidden text-[0.7rem] font-medium tracking-wide text-sky-400 sm:block">
                AI TRAVEL CONCIERGE
              </span>
            </div>
          </Link>

          <div className="hidden h-5 w-px bg-slate-700 md:block" />

          {/* Assistant Badge */}
          <div className="hidden items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-950/60 px-3 py-1 text-xs font-semibold text-sky-300 md:flex">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span>AirlineBooking Assistant</span>
          </div>
        </div>

        {/* Right: Security Status, Language & Account */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Connection Status Indicator */}
          <div
            className="hidden items-center gap-2 rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300 ring-1 ring-slate-700 sm:flex"
            title="Encrypted connection to Airline Booking Agent Pipeline"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-mono text-[0.72rem] font-medium text-slate-200">
              Connected · SSL
            </span>
          </div>

          {/* Language Selector */}
          <div className="flex items-center rounded-lg bg-slate-800 p-0.5 ring-1 ring-slate-700">
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                language === 'en'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label="Switch language to English"
            >
              <Globe className="h-3 w-3" />
              <span>EN</span>
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('vi')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                language === 'vi'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label="Switch language to Vietnamese"
            >
              <span>VI</span>
            </button>
          </div>

          {/* User Account Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-expanded={showUserMenu}
              aria-haspopup="true"
              className="flex items-center gap-2 rounded-xl bg-slate-800/90 py-1.5 pr-2.5 pl-2 text-xs font-medium text-white transition-all hover:bg-slate-700 ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 font-bold text-white shadow-xs">
                {isLoggedIn ? 'AM' : <User className="h-4 w-4" />}
              </div>
              <span className="hidden font-sans text-xs font-semibold text-slate-200 sm:inline">
                {isLoggedIn ? 'Alex Morgan' : 'Guest User'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-700 bg-slate-900 p-1.5 text-xs text-slate-200 shadow-xl ring-1 ring-black/10">
                  <div className="border-b border-slate-800 px-3 py-2.5">
                    <p className="font-semibold text-white">
                      {isLoggedIn ? 'Alex Morgan' : 'Guest Account'}
                    </p>
                    <p className="text-[0.7rem] text-slate-400">
                      {isLoggedIn
                        ? 'alex.morgan@skyalliance.com · Frequent Flyer #8821'
                        : 'Not signed in'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenSettings();
                      setShowUserMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                  >
                    <Settings className="h-4 w-4 text-sky-400" />
                    <span>Preferences & Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onOpenSettings();
                      setShowUserMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                  >
                    <HelpCircle className="h-4 w-4 text-cyan-400" />
                    <span>Help & Policy FAQ</span>
                  </button>

                  <div className="my-1 border-t border-slate-800" />

                  <button
                    type="button"
                    onClick={() => {
                      onToggleAuth();
                      setShowUserMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left font-semibold text-sky-400 transition-colors hover:bg-sky-950/60"
                  >
                    <LogOut className="h-4 w-4 text-sky-400" />
                    <span>{isLoggedIn ? 'Sign Out' : 'Sign In'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
