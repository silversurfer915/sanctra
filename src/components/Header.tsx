import React, { useEffect, useRef, useState } from 'react';
import { Brand } from './Brand.tsx';
import { LocalClock } from './LocalClock.tsx';
import type { TimerStatus, ViewMode, UserSettings } from '../types/index.ts';
import {
  History,
  EyeOff,
  PanelLeft,
  Sparkles,
} from 'lucide-react';
import type { UserSubscription } from '../types/index.ts';

import { SoundscapePlayer } from './SoundscapePlayer.tsx';

interface HeaderProps {
  currentView: ViewMode;
  userSettings?: UserSettings;
  onUpdateSettings?: (value:Partial<UserSettings>)=>void;
  onSelectView: (view: ViewMode) => void;
  status: TimerStatus;
  isSidebarCollapsed: boolean;
  subscription?: UserSubscription | null;
  onToggleSidebar: () => void;
  onOpenHistory: () => void;
  onEnterTimerOnly?: () => void;
  onOpenYouTube: () => void;
  onOpenPlusEnquiry?: () => void;
  onOpenAiAssistant?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  userSettings,
  onUpdateSettings,
  onSelectView,
  status,
  isSidebarCollapsed,
  subscription,
  onToggleSidebar,
  onOpenHistory,
  onEnterTimerOnly,
  onOpenYouTube,
  onOpenPlusEnquiry,
  onOpenAiAssistant,
}) => {
  const headerRef = useRef<HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const stage = headerRef.current?.parentElement;
    const updateScroll = () => setIsScrolled(currentView !== 'timer' && (stage?.scrollTop ?? 0) > 8);
    updateScroll();
    stage?.addEventListener('scroll', updateScroll, { passive: true });
    return () => stage?.removeEventListener('scroll', updateScroll);
  }, [currentView]);

  // Determine status pill color & text
  const getStatusDisplay = () => {
    switch (status) {
      case 'running':
        return {
          text: 'Focusing',
          dotColor: 'bg-emerald-400',
          ringColor: 'ring-emerald-400/30',
          textColor: 'text-emerald-300',
          pulse: true,
        };
      case 'paused':
        return {
          text: 'Paused',
          dotColor: 'bg-[var(--sanctra-sage)]',
          ringColor: 'ring-[var(--sanctra-sage)]/30',
          textColor: 'text-[var(--sanctra-sage)]',
          pulse: false,
        };
      case 'break-paused':
        return { text: 'Break paused', dotColor: 'bg-[var(--sanctra-sage)]', ringColor: '', textColor: 'text-[var(--sanctra-sage)]', pulse: false };
      case 'break-ready':
      case 'break-running':
        return {
          text: 'Break',
          dotColor: 'bg-teal-400',
          ringColor: 'ring-teal-400/30',
          textColor: 'text-teal-300',
          pulse: true,
        };
      case 'break-complete':
        return {
          text: 'Break Done',
          dotColor: 'bg-teal-300',
          ringColor: 'ring-teal-300/30',
          textColor: 'text-teal-200',
          pulse: false,
        };
      case 'idle':
      default:
        return {
          text: 'Idle',
          dotColor: 'bg-slate-400',
          ringColor: 'ring-slate-400/20',
          textColor: 'text-slate-300',
          pulse: false,
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <header ref={headerRef} data-scrolled={currentView !== 'timer' && isScrolled} className="app-header shrink-0 w-full flex items-center justify-between px-3 sm:px-6 py-3 z-20">
      {/* Left: Sidebar Toggle Button + Mobile Brand Logo + Status Pill */}
      <div className="header-brand-status flex items-center gap-3">
        {/* Sidebar Toggle Button (Desktop & Mobile) */}
        <button
          onClick={onToggleSidebar}
          aria-label={isSidebarCollapsed ? 'Show menu' : 'Hide menu'}
          title={isSidebarCollapsed ? 'Show menu' : 'Hide menu'}
          className="app-header-control"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* Mobile Brand Logo (hidden on lg where sidebar displays brand) */}
        <div
          onClick={() => onSelectView('timer')}
          className={`header-mobile-brand flex items-center gap-2 cursor-pointer select-none ${isSidebarCollapsed ? "" : "lg:hidden"}`}
        >
          <Brand compact />
        </div>

        {/* Live Status Indicator Pill */}
        <div className="header-status flex items-center gap-1.5 sm:gap-2 text-xs font-medium select-none">
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusInfo.dotColor} ${statusInfo.pulse ? 'animate-pulse' : ''}`} />
          <span className={`${statusInfo.textColor} hidden sm:inline`}>{statusInfo.text}</span>
        </div>
      </div>

      {currentView === 'timer' && <LocalClock />}
      {/* Center: Clean Sanctra Title */}
      <div className="hidden items-center gap-2 text-xs font-medium text-slate-300 select-none">
        <span className="text-slate-400 font-medium">Sanctra</span>
        <span>•</span>
        <span className="font-semibold text-white capitalize">
          {{spaces:'Focus Room',landing:'Overview',timer:'Focus Room',planner:'Tasks',calendar:'Calendar',groups:'Focus Groups',analytics:'Analytics',inbox:'Inbox',profile:'Profile',support:'Help & Feedback',admin:'Admin',rankings:'Global Rankings',jeetrack:'JEE Track'}[currentView]}
        </span>
      </div>

      {/* Right Controls: History Modal Trigger */}
      <div className="header-actions flex items-center gap-1.5 sm:gap-2.5">
        {currentView==='timer'&&onEnterTimerOnly&&<button className="app-header-control" aria-label="Enter timer-only view" title="Timer only" onClick={onEnterTimerOnly}><EyeOff size={16}/></button>}
        <SoundscapePlayer
          userSettings={userSettings}
          onUpdateSettings={onUpdateSettings}
          subscription={subscription || null}
          timerStatus={status}
          onOpenYouTube={onOpenYouTube}
          onOpenPlusEnquiry={onOpenPlusEnquiry}
        />

        {onOpenAiAssistant && (
          <button
            onClick={onOpenAiAssistant}
            aria-label="Open Sanctra AI study helper"
            title="Sanctra AI study helper"
            className="app-header-control ai-study-launcher glass-pill"
          >
            <Sparkles className="w-4 h-4 shrink-0" /><span className="hidden md:inline">Sanctra AI</span>
          </button>
        )}

        {/* Session History Modal Trigger */}
        <button
          onClick={onOpenHistory}
          aria-label="View study session history"
          title="Session history"
          className="app-header-control session-history-control"
        >
          <History className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Header;
