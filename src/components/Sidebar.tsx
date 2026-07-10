import { Home, ChevronLeft, ChevronRight, Clock, FileText, LogOut, Globe } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  recordings?: any[];
  selectedRecordingId?: string | null;
  onSelectRecording?: (id: string | null) => void;
}

export default function Sidebar({ activeTab, onTabChange, collapsed, onToggle, recordings = [], selectedRecordingId, onSelectRecording }: SidebarProps) {
  const { t, language, setLanguage } = useLanguage();
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const { user, logout, isAuthenticated, loginWithRedirect } = useAuth0();
  const displayName = user?.name || user?.nickname || user?.email || 'User';
  const displayEmail = user?.email || '';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const navItems = [
    { id: 'home', icon: Home, label: t('sidebar', 'home'), color: 'text-orange-500', bg: 'bg-orange-500/20' },
  ];

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="flex flex-col h-full text-sm font-medium no-drag relative overflow-hidden">
      {/* Navigation header + toggle */}
      <div className="flex items-center justify-between px-4 pt-2 pb-3 shrink-0">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              key="menu-label"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="font-bold text-white/50 uppercase tracking-widest text-xs whitespace-nowrap overflow-hidden"
            >
              {t('sidebar', 'menu')}
            </motion.span>
          )}
        </AnimatePresence>
        <button 
          onClick={onToggle} 
          className={clsx(
            "p-1.5 hover:bg-white/10 rounded-md text-white/50 shrink-0 transition-colors", 
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav items */}
      <div className="space-y-1 px-3 pb-4 shrink-0">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={clsx(
              "flex items-center w-full py-2 rounded-xl transition-all duration-200",
              collapsed ? "justify-center px-0" : "gap-3 px-3",
              activeTab === item.id 
                ? "bg-[#2A2A2A] text-white" 
                : "text-gray-400 hover:bg-[#2A2A2A]/50 hover:text-white"
            )}
            title={collapsed ? item.label : undefined}
          >
            <div className={clsx("p-1.5 rounded-lg shrink-0", item.bg)}>
              <item.icon className={clsx("w-4 h-4", item.color)} strokeWidth={2.5} />
            </div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  key="nav-label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="truncate overflow-hidden whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>

      {/* History list — only when expanded */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col flex-1 overflow-hidden px-3"
          >
            <div className="font-bold text-white/50 uppercase tracking-widest text-xs mb-3 px-1 shrink-0">
              {t('sidebar', 'history') || 'HISTORY'}
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 pb-4 no-scrollbar">
              {recordings.length === 0 ? (
                <div className="text-white/40 text-xs px-2">No recordings yet</div>
              ) : (
                recordings.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => onSelectRecording?.(rec.id)}
                    className={clsx(
                      "w-full text-left p-2.5 rounded-xl border transition-all duration-200 group flex flex-col gap-1",
                      selectedRecordingId === rec.id && activeTab === 'history'
                        ? "bg-[#1A1A1A] border-white/20 shadow-sm" 
                        : "border-transparent hover:bg-white/5"
                    )}
                  >
                    <div className="font-medium text-white/90 text-sm truncate w-full">{rec.name}</div>
                    <div className="flex items-center justify-between text-[11px] text-white/40 w-full">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Clock className="w-3 h-3 shrink-0"/> 
                        <span className="truncate">{formatDuration(rec.durationMs)}</span>
                      </div>
                      {rec.transcript && (
                        <FileText className="w-3 h-3 text-blue-400/70 shrink-0" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className={clsx("mt-auto pt-3 flex flex-col gap-2 border-t border-white/5 shrink-0", collapsed ? "px-2" : "px-3")}>
        <div className="relative w-full">
          <button 
            onClick={() => setIsLanguageOpen(!isLanguageOpen)}
            className={clsx(
              "w-full py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-xs text-white/70 font-semibold flex items-center justify-center gap-2",
              collapsed ? "px-0 text-[10px]" : "px-3"
            )}
          >
            {collapsed ? (
              language.toUpperCase()
            ) : (
              <>
                <Globe className="w-3.5 h-3.5 opacity-70" />
                {language === 'en' ? 'English' : language === 'pt' ? 'Português' : 'Español'}
              </>
            )}
          </button>
          
          <AnimatePresence>
            {isLanguageOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={clsx(
                  "absolute bottom-full left-0 mb-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 p-1 flex flex-col gap-1",
                  collapsed ? "w-12 -left-1" : "w-full"
                )}
              >
                {[
                  { id: 'en', flag: '🇺🇸', label: 'English' },
                  { id: 'pt', flag: '🇧🇷', label: 'Português' },
                  { id: 'es', flag: '🇪🇸', label: 'Español' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      // @ts-ignore
                      setLanguage(lang.id);
                      setIsLanguageOpen(false);
                    }}
                    className={clsx(
                      "flex items-center text-xs py-1.5 rounded-lg transition-colors",
                      collapsed ? "justify-center px-0" : "gap-2 px-2",
                      language === lang.id ? "bg-orange-500/20 text-orange-400" : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <span className="text-sm">{lang.flag}</span>
                    {!collapsed && <span>{lang.label}</span>}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-1 pb-1 text-[11px] text-gray-500 text-center truncate">
                {t('sidebar', 'proLeft')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={clsx(
          "w-full rounded-xl glass flex items-center gap-2 mb-3 min-w-0",
          collapsed ? "justify-center px-1 py-2" : "px-3 py-2"
        )}>
          {!isAuthenticated ? (
            <button
              onClick={() => loginWithRedirect()}
              className="w-full h-10 flex items-center justify-center rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-sm font-semibold truncate px-2"
            >
              {collapsed ? 'In' : 'Sign In'}
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
                    {initials}
                  </div>
                )}
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden min-w-0"
                    >
                      <div className="font-semibold text-white truncate">{displayName}</div>
                      {displayEmail && (
                        <div className="text-[11px] text-white/40 truncate">{displayEmail}</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.button
                    type="button"
                    onClick={handleLogout}
                    title={t('sidebar', 'signOut')}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="p-1.5 rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  >
                    <LogOut className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
