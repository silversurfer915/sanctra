import {VipMedia} from './VipMedia.tsx';
import React, { useEffect, useState } from 'react';
import { subscribeAdmin, subscribeOpenTicketCount } from '../utils/adminService.ts';
import { Brand } from './Brand.tsx';
import {
  Clock,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Users,
  Inbox,
  Settings,
  HelpCircle,
  User,
  LogIn,
  LogOut,
  X,
  Shield,
  Trophy,
  Crown,
  GraduationCap,
} from 'lucide-react';
import type { ViewMode, AuthUser, UserSettings as SettingsType, UserSubscription } from '../types/index.ts';
import { subscribeInboxUnread } from '../utils/inboxUnread.ts';
import { getCloudDatabase } from '../utils/firebase.ts';
import { publicAvatar, publicStyle } from '../utils/publicIdentity.ts';
import { identityAvatarClass } from './RankingIdentity.tsx';

interface SidebarProps {
  jeeTrackEnabled?: boolean;
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  isCollapsed: boolean;
  currentUser: AuthUser | null;
  userSettings: SettingsType;
  subscription?: UserSubscription | null;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenSettings: (tab?: 'wallpaper' | 'preferences' | 'danger') => void;
  onOpenSupport: () => void;
  onSignOut: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  jeeTrackEnabled = true,
  currentView,
  onSelectView,
  isCollapsed,
  currentUser,
  userSettings,
  subscription,
  onOpenAuth,
  onOpenProfile,
  onOpenSettings,
  onOpenSupport,
  onSignOut,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [admin,setAdmin]=useState(false);
  const [openTickets,setOpenTickets]=useState(0);
  const [mobileViewport,setMobileViewport]=useState(()=>window.matchMedia('(max-width: 1023px)').matches);
  useEffect(()=>{const media=window.matchMedia('(max-width: 1023px)');const change=()=>setMobileViewport(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
  useEffect(()=>{setOpenTickets(0);if(!admin)return;return subscribeOpenTicketCount(setOpenTickets,()=>{});},[admin]);
  const [unreadInbox,setUnreadInbox]=useState(0);
  useEffect(()=>{setAdmin(false);return currentUser && !currentUser.uid.startsWith('guest-') ? subscribeAdmin(currentUser.uid,setAdmin) : undefined;},[currentUser?.uid]);
  useEffect(()=>{
    setUnreadInbox(0);
    const db=getCloudDatabase();
    if(!db||!currentUser||currentUser.uid.startsWith('guest-'))return;
    return subscribeInboxUnread(db,currentUser,setUnreadInbox,!!subscription?.isPlus);
  },[currentUser?.uid,currentUser?.displayName,subscription?.isPlus]);
  const compact = false; // Keep full menu content mounted throughout the slide animation.
  const desktopHidden = isCollapsed;

  const navItems = [
    {
      id: 'timer' as ViewMode,
      label: 'Focus Room',
      icon: Clock,
      badge: null,
      desc: 'Desk Clock & Timer',
    },
    {
      id: 'planner' as ViewMode,
      label: 'Tasks',
      icon: CalendarCheck,
      badge: null,
      desc: 'Your daily plan',
    },
    {id:'calendar' as ViewMode,label:'Calendar',icon:CalendarDays,badge:null,desc:'Tasks and events'},
    {
      id: 'analytics' as ViewMode,
      label: 'Analytics',
      icon: BarChart3,
      badge: null,
      desc: 'Heatmaps & Reports',
    },
    {
      id: 'jeetrack' as ViewMode,
      label: 'JEE Track',
      icon: GraduationCap,
      badge: jeeTrackEnabled ? 'NEW' : 'Paused',
      desc: 'Mocks, Syllabus & Coach',
    },
    {
      id: 'groups' as ViewMode,
      label: 'Focus Groups',
      icon: Users,
      badge: null,
      desc: 'Study circles & rooms',
    },
    {
      id: 'rankings' as ViewMode,
      label: 'Global Rankings',
      icon: Trophy,
      badge: null,
      desc: 'Community momentum',
    },
    {
      id: 'inbox' as ViewMode,
      label: 'Inbox',
      icon: Inbox,
      badge: unreadInbox ? String(Math.min(unreadInbox, 99)) : null,
      desc: 'Updates & group mentions',
    },
  ];

  const handleNavClick = (id: ViewMode) => {
    onSelectView(id);
    onCloseMobile();
  };

  const displayName =
    userSettings.customDisplayName ||
    currentUser?.displayName ||
    (currentUser?.email ? currentUser.email.split('@')[0] : 'Member');

  const avatarSrc = currentUser ? publicAvatar(userSettings,currentUser,subscription||null) : userSettings.avatarUrl||'';

  const ownStyle = publicStyle(userSettings, subscription || null);
  const sidebarAvatarClass = identityAvatarClass(ownStyle);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="sidebar-mobile-scrim fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        inert={mobileViewport ? !isMobileOpen : desktopHidden}
        data-hidden={desktopHidden}
        data-mobile-open={isMobileOpen}
        className={`app-sidebar fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col justify-between glass-panel transition-[width,transform] duration-200 ease-out select-none ${
          'w-64'
        } lg:w-64`}
      >
        {/* Top: Brand Header & Navigation */}
        <div className="flex flex-col">
          {/* Header Brand Bar */}
          <div className={`h-14 flex items-center border-b border-white/10 ${
            compact ? 'justify-center px-2' : 'justify-between px-4'
          }`}>
            <div
              onClick={() => onSelectView('timer')}
              className="flex items-center gap-3 cursor-pointer group"
              title="Sanctra"
            >
              <Brand compact />
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 lg:hidden cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Navigation List */}
          <nav className={`flex flex-col gap-1.5 mt-3 ${compact ? 'px-2' : 'px-3'}`}>
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;

              if (compact) {
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    title={item.label}
                    className={`w-11 h-11 mx-auto flex items-center justify-center rounded-xl transition-all cursor-pointer relative group ${
                      isActive
                        ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                    {isActive && (
                      <span className="absolute right-1.5 top-1.5 w-1.5 h-1.5 rounded-full bg-[var(--sanctra-sage)]" />
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-white/10 text-white font-semibold border border-white/15 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate flex-1 text-left">{item.id==='jeetrack'&&userSettings.jeeTrackOptIn===false?'Explore JEE Track':item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-white/10 text-slate-200 font-bold border border-white/20">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Settings, Support & Profile */}
        <div className={`flex flex-col border-t border-white/10 pb-3 pt-2 gap-1.5 ${
          compact ? 'px-2' : 'px-3'
        }`}>
          {admin && (compact ? (
            <button onClick={()=>handleNavClick('admin')} title="Admin" className={`w-11 h-11 mx-auto flex items-center justify-center rounded-xl transition-all ${currentView==='admin'?'bg-white/10 text-white':'text-slate-400 hover:text-white hover:bg-white/5'}`}><Shield className="w-4 h-4"/></button>
          ) : (
            <button onClick={()=>handleNavClick('admin')} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${currentView==='admin'?'bg-white/10 text-white border border-white/15':'text-slate-400 hover:text-white hover:bg-white/5'}`}><Shield className="w-4 h-4 text-slate-300"/><span>Admin</span>{openTickets>0&&<span className="admin-ticket-count" role="status" aria-label={`${openTickets} open support tickets`}>{openTickets>99?'99+':openTickets}</span>}</button>
          ))}
          {/* Settings Button (includes Background Image & Themes) */}
          {compact ? (
            <button
              onClick={() => {
                onOpenSettings('wallpaper');
                onCloseMobile();
              }}
              title="Settings & Background Image"
              className="w-11 h-11 mx-auto flex items-center justify-center rounded-xl text-slate-400 hover:text-[var(--sanctra-sage)] hover:bg-white/5 transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                onOpenSettings('wallpaper');
                onCloseMobile();
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer group"
            >
              <Settings className="w-4 h-4 text-slate-400 group-hover:text-[var(--sanctra-sage)] transition-transform group-hover:rotate-45" />
              <span>Settings</span>
            </button>
          )}

          {/* Support Desk Button */}
          {(compact ? (
            <button
              onClick={() => {
                onOpenSupport();
                onCloseMobile();
              }}
              title="Support Desk & Feedback"
              className="w-11 h-11 mx-auto flex items-center justify-center rounded-xl text-slate-400 hover:text-[var(--sanctra-sage)] hover:bg-white/5 transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                onOpenSupport();
                onCloseMobile();
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer group"
            >
              <HelpCircle className="w-4 h-4 text-slate-400 group-hover:text-[var(--sanctra-sage)] transition-colors" />
              <span>Help & Feedback</span>
            </button>
          ))}

          {/* Profile / Account Card */}
          <div className="pt-2 border-t border-white/5">
            {currentUser ? (
              /* Authenticated Scholar */
              compact ? (
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => {
                      onOpenProfile();
                      onCloseMobile();
                    }}
                    aria-current={currentView==='profile'?'page':undefined}
                    title={`${displayName} — Profile & Account`}
                    className="w-11 h-11 mx-auto flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/25 hover:bg-white/[0.06] transition-all cursor-pointer relative"
                  >
                    <div className={`sidebar-avatar-wrap compact ${sidebarAvatarClass}`}>
                      {avatarSrc ? (
                        <VipMedia url={avatarSrc} fallback={userSettings.avatarUrl||currentUser.photoURL||''} name={displayName} className="w-full h-full rounded-[inherit] object-cover"/>
                      ) : (
                        <User className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                    <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${subscription?.isPlus ? 'bg-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-300'}`} />
                  </button>
                  <button
                    onClick={onSignOut}
                    title="Sign Out"
                    className="w-11 h-8 mx-auto flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-full flex items-center gap-1.5">
                  <div
                    onClick={() => {
                      onOpenProfile();
                      onCloseMobile();
                    }}
                    className="flex-1 p-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] transition-all flex items-center gap-2.5 cursor-pointer group relative"
                    data-active={currentView==='profile'} title="Profile & Account"
                  >
                    <div className={`sidebar-avatar-wrap ${sidebarAvatarClass}`}>
                      {avatarSrc ? (
                        <VipMedia url={avatarSrc} fallback={userSettings.avatarUrl||currentUser.photoURL||''} name={displayName} className="w-full h-full rounded-[inherit] object-cover shrink-0"/>
                      ) : (
                        <div className="w-full h-full rounded-[inherit] bg-white/5 border border-white/10 text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col text-left overflow-hidden flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
                          {displayName}
                        </span>
                        {subscription?.isPlus && (
                          <span className="plus-badge text-[9px] py-0 px-1.5 shrink-0">
                            <Crown className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate">
                        {currentUser.email || 'Online'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Sign Out Button */}
                  <button
                    onClick={onSignOut}
                    title="Sign Out"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer shrink-0"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )
            ) : (
              /* Signed Out Fallback */
              <button
                onClick={onOpenAuth}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
                title="Sign In"
              >
                <LogIn className="w-4 h-4 shrink-0" />
                {!compact && <span>Sign In</span>}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
