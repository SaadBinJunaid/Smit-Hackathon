import React, { useState, useEffect } from 'react';
import {
  Bell,
  Sparkles,
  LogOut,
  ChevronDown,
  Shield,
  UserCheck,
  User,
  Building2,
  Check,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole, AppNotification } from '../../types';
import { NotificationService } from '../../services/notificationService';
import { Badge } from '../common/Badge';

interface NavbarProps {
  onOpenAI: () => void;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAI, onToggleMobileMenu }) => {
  const { user, role, settings, logout, switchRoleForTesting } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    const list = await NotificationService.getNotificationsForUser(user.employeeId || user.uid);
    setNotifications(list);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    if (!user) return;
    await NotificationService.markAllAsRead(user.employeeId || user.uid);
    await loadNotifications();
  };

  const getRoleBadgeVariant = (r: UserRole | null) => {
    if (r === 'admin') return 'purple';
    if (r === 'hr') return 'indigo';
    return 'emerald';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 no-print">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Workspace */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">
                {settings?.companyName || 'HCM Lite'}
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Saylani Hackathon HR Management
              </p>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Role Switcher for Hackathon Demo testing */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors border border-slate-200/80 cursor-pointer"
              title="Fast role switcher for testing all role permissions"
            >
              <span className="hidden sm:inline text-slate-500 font-normal">Active Role:</span>
              <Badge variant={getRoleBadgeVariant(role)} size="sm">
                {role || 'Role'}
              </Badge>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900">Switch Role Context</p>
                  <p className="text-[11px] text-slate-500">Test role-scoped permissions instantly</p>
                </div>

                {(['admin', 'hr', 'employee'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={async () => {
                      await switchRoleForTesting(r);
                      setShowRoleSwitcher(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors text-left ${
                      role === r
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {r === 'admin' && <Shield className="w-3.5 h-3.5 text-purple-600" />}
                      {r === 'hr' && <UserCheck className="w-3.5 h-3.5 text-indigo-600" />}
                      {r === 'employee' && <User className="w-3.5 h-3.5 text-emerald-600" />}
                      <span className="capitalize">{r === 'hr' ? 'HR Manager' : r}</span>
                    </div>
                    {role === r && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Assistant button */}
          <button
            onClick={onOpenAI}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200 animate-pulse" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                loadNotifications();
              }}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 py-3 z-50">
                <div className="flex items-center justify-between px-4 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-[11px] font-semibold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No notifications right now.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3.5 hover:bg-slate-50 transition-colors ${
                          !n.read ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.body}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                          {new Date(n.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="hidden md:block text-right">
              <p className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">
                {user?.displayName || user?.email || 'User'}
              </p>
              <p className="text-[10px] text-slate-500 capitalize">{role || 'Member'}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
