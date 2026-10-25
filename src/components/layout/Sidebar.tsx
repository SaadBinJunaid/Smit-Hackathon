import React from 'react';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarCheck,
  CreditCard,
  Building,
  UserPlus,
  Megaphone,
  FileText,
  CheckSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export type NavTab =
  | 'dashboard'
  | 'employees'
  | 'attendance'
  | 'corrections'
  | 'leaves'
  | 'payroll'
  | 'organization'
  | 'users'
  | 'announcements'
  | 'audit';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenAI: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onOpenAI,
}) => {
  const { role } = useAuth();

  const getNavLinks = (r: UserRole | null) => {
    if (r === 'admin') {
      return [
        { id: 'dashboard', label: 'Company Overview', icon: LayoutDashboard },
        { id: 'employees', label: 'Employee Directory', icon: Users },
        { id: 'attendance', label: 'Attendance Board', icon: Clock },
        { id: 'leaves', label: 'Leave Overview', icon: CalendarCheck },
        { id: 'payroll', label: 'Payroll & Finalize', icon: CreditCard },
        { id: 'organization', label: 'Organization & Policies', icon: Building },
        { id: 'users', label: 'HR User Accounts', icon: UserPlus },
        { id: 'announcements', label: 'Announcements', icon: Megaphone },
        { id: 'audit', label: 'Audit Trail', icon: FileText },
      ];
    }

    if (r === 'hr') {
      return [
        { id: 'dashboard', label: 'HR Dashboard', icon: LayoutDashboard },
        { id: 'employees', label: 'Employees & CSV', icon: Users },
        { id: 'attendance', label: 'Attendance Board', icon: Clock },
        { id: 'corrections', label: 'Correction Requests', icon: CheckSquare },
        { id: 'leaves', label: 'Leave Approvals', icon: CalendarCheck },
        { id: 'payroll', label: 'Salary & Payroll Draft', icon: CreditCard },
        { id: 'announcements', label: 'Announcements', icon: Megaphone },
      ];
    }

    // Employee role
    return [
      { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
      { id: 'attendance', label: 'Attendance & Check-in', icon: Clock },
      { id: 'leaves', label: 'Request Leave & Quotas', icon: CalendarCheck },
      { id: 'payroll', label: 'My Payslips', icon: CreditCard },
      { id: 'announcements', label: 'Announcements', icon: Megaphone },
    ];
  };

  const navLinks = getNavLinks(role);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-500/20">
          H
        </div>
        <div>
          <span className="text-base font-bold text-white tracking-tight">HCM Lite</span>
          <span className="block text-[11px] font-medium text-indigo-400 uppercase tracking-widest">
            {role === 'admin' ? 'Admin Suite' : role === 'hr' ? 'HR Portal' : 'Employee Self-Service'}
          </span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Main Navigation
        </div>

        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id as NavTab);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* AI Assistant Quick Card */}
      <div className="p-3 border-t border-slate-800">
        <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-white">HR AI Assistant</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Query live headcount, today's attendance, policy rules, and Smart Leave.
          </p>
          <button
            onClick={() => {
              onOpenAI();
              onCloseMobile();
            }}
            className="mt-2.5 w-full py-1.5 px-3 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Ask AI Assistant</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:block w-64 h-screen sticky top-0 shrink-0 no-print">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden no-print">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
