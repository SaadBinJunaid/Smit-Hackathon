import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SetupPage } from './pages/SetupPage';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { AttendancePage } from './pages/AttendancePage';
import { CorrectionsPage } from './pages/CorrectionsPage';
import { LeavePage } from './pages/LeavePage';
import { PayrollPage } from './pages/PayrollPage';
import { OrganizationPage } from './pages/OrganizationPage';
import { HRUsersPage } from './pages/HRUsersPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { AIChatDrawer } from './components/ai/AIChatDrawer';
import { SmartLeaveModal } from './components/ai/SmartLeaveModal';
import { PayslipModal } from './components/payroll/PayslipModal';
import { PayrollRun, PayrollItem } from './types';

const MainShell: React.FC = () => {
  const { user, role, loading, isSetupComplete } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [isSmartLeaveOpen, setIsSmartLeaveOpen] = useState(false);

  // Payslip modal state
  const [payslipRun, setPayslipRun] = useState<PayrollRun | null>(null);
  const [payslipItem, setPayslipItem] = useState<PayrollItem | null>(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  // If initial load in progress
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Initializing HCM Lite...</p>
        </div>
      </div>
    );
  }

  // 1. First-run company setup
  if (!isSetupComplete) {
    return <SetupPage />;
  }

  // 2. Unauthenticated user
  if (!user) {
    return <LoginPage />;
  }

  // 3. User must change temporary password on first sign-in
  if (user.mustChangePassword) {
    return <ChangePasswordPage />;
  }

  const handleOpenPayslip = (run: PayrollRun, employeeId: string) => {
    const item = run.items[employeeId];
    if (item) {
      setPayslipRun(run);
      setPayslipItem(item);
      setIsPayslipOpen(true);
    }
  };

  const renderActivePage = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenAI={() => setIsAIDrawerOpen(true)}
            onOpenSmartLeave={() => setIsSmartLeaveOpen(true)}
            onViewPayslip={handleOpenPayslip}
          />
        );
      case 'employees':
        return <EmployeesPage />;
      case 'attendance':
        return <AttendancePage />;
      case 'corrections':
        return <CorrectionsPage />;
      case 'leaves':
        return <LeavePage onOpenSmartLeave={() => setIsSmartLeaveOpen(true)} />;
      case 'payroll':
        return <PayrollPage onViewPayslip={handleOpenPayslip} />;
      case 'organization':
        return <OrganizationPage />;
      case 'users':
        return <HRUsersPage />;
      case 'announcements':
        return <AnnouncementsPage />;
      case 'audit':
        return <AuditLogPage />;
      default:
        return (
          <DashboardPage
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenAI={() => setIsAIDrawerOpen(true)}
            onOpenSmartLeave={() => setIsSmartLeaveOpen(true)}
            onViewPayslip={handleOpenPayslip}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenAI={() => setIsAIDrawerOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onOpenAI={() => setIsAIDrawerOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {renderActivePage()}
        </main>
      </div>

      {/* Global AI Assistant Drawer */}
      <AIChatDrawer
        isOpen={isAIDrawerOpen}
        onClose={() => setIsAIDrawerOpen(false)}
        onOpenSmartLeave={() => setIsSmartLeaveOpen(true)}
      />

      {/* Global Smart Leave Application Modal */}
      <SmartLeaveModal
        isOpen={isSmartLeaveOpen}
        onClose={() => setIsSmartLeaveOpen(false)}
        onSubmitted={() => setCurrentTab('leaves')}
      />

      {/* Printable Payslip Modal */}
      <PayslipModal
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        run={payslipRun}
        item={payslipItem}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainShell />
    </AuthProvider>
  );
}
