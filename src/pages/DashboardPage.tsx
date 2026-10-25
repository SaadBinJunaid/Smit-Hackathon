import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  CalendarCheck,
  CreditCard,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Building,
  CheckCircle2,
  Calendar,
  ArrowRight,
  LogOut,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { EmployeeService } from '../services/employeeService';
import { AttendanceService } from '../services/attendanceService';
import { LeaveService } from '../services/leaveService';
import { PayrollService } from '../services/payrollService';
import { AnnouncementService } from '../services/announcementService';
import { AIService } from '../services/aiService';
import { CompanyService } from '../services/companyService';
import {
  Employee,
  AttendanceRecord,
  LeaveRequest,
  LeaveBalance,
  PayrollRun,
  Announcement,
  Holiday,
} from '../types';

interface DashboardPageProps {
  onNavigate: (tab: any) => void;
  onOpenAI: () => void;
  onOpenSmartLeave: () => void;
  onViewPayslip: (run: PayrollRun, employeeId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenAI,
  onOpenSmartLeave,
  onViewPayslip,
}) => {
  const { user, role, settings } = useAuth();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [latestPayroll, setLatestPayroll] = useState<PayrollRun | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Employee specific states
  const [myTodayRecord, setMyTodayRecord] = useState<AttendanceRecord | null>(null);
  const [myBalance, setMyBalance] = useState<LeaveBalance | null>(null);
  const [checkingInOut, setCheckingInOut] = useState(false);
  const [checkActionMsg, setCheckActionMsg] = useState<string | null>(null);

  // AI Insights
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [user, role]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const emps = await EmployeeService.getEmployees();
      setEmployees(emps);

      const today = AttendanceService.getTodayDateString();
      const att = await AttendanceService.getAttendanceForDate(today);
      setTodayAttendance(att);

      const leaves = await LeaveService.getLeaveRequests();
      setLeaveRequests(leaves);

      const runs = await PayrollService.getPayrollRuns();
      setLatestPayroll(runs.length > 0 ? runs[0] : null);

      const anns = await AnnouncementService.getAnnouncements();
      setAnnouncements(anns.slice(0, 4));

      const hols = await CompanyService.getHolidays();
      setHolidays(hols);

      // Employee specific
      if (user?.employeeId) {
        const todayRec = await AttendanceService.getTodayRecord(user.employeeId);
        setMyTodayRecord(todayRec);

        const bal = await LeaveService.getLeaveBalance(user.employeeId);
        setMyBalance(bal);
      }
    } catch (e) {
      console.warn('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    setLoadingInsights(true);
    const activeStaff = employees.filter((e) => e.employmentStatus === 'Active').length;
    const present = todayAttendance.filter((a) => a.status === 'present').length;
    const late = todayAttendance.filter((a) => a.status === 'late').length;
    const absent = Math.max(0, activeStaff - (present + late));
    const pendingLeaves = leaveRequests.filter((l) => l.status === 'pending').length;
    const attRate = activeStaff > 0 ? (((present + late) / activeStaff) * 100).toFixed(1) + '%' : '0%';

    const kpis = {
      headcount: activeStaff,
      presentToday: present,
      lateToday: late,
      absentToday: absent,
      pendingLeaves,
      attendanceRate: attRate,
    };

    const insights = await AIService.generateDashboardInsights(kpis);
    setAiInsights(insights);
    setLoadingInsights(false);
  };

  // Employee Check-in Action
  const handleEmployeeCheckIn = async () => {
    if (!user || !user.employeeId) return;
    setCheckingInOut(true);
    setCheckActionMsg(null);

    try {
      // Get browser geolocation if available
      let coords: { latitude: number; longitude: number } | undefined;
      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
        } catch {
          // Geolocation optional fallback
        }
      }

      const rec = await AttendanceService.checkIn(
        user.employeeId,
        user.displayName || user.email,
        'Staff',
        'web',
        coords
      );
      setMyTodayRecord(rec);
      setCheckActionMsg(`Checked in successfully at ${new Date(rec.checkInAt!).toLocaleTimeString()} (${rec.status})`);
      await loadDashboardData();
    } catch (err: any) {
      setCheckActionMsg(`Error: ${err.message}`);
    } finally {
      setCheckingInOut(false);
    }
  };

  // Employee Check-out Action
  const handleEmployeeCheckOut = async () => {
    if (!user || !user.employeeId) return;
    setCheckingInOut(true);
    setCheckActionMsg(null);

    try {
      const rec = await AttendanceService.checkOut(
        user.employeeId,
        user.displayName || user.email
      );
      setMyTodayRecord(rec);
      setCheckActionMsg(`Checked out at ${new Date(rec.checkOutAt!).toLocaleTimeString()} (Worked: ${(rec.workedMinutes / 60).toFixed(1)} hrs)`);
      await loadDashboardData();
    } catch (err: any) {
      setCheckActionMsg(`Error: ${err.message}`);
    } finally {
      setCheckingInOut(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Aggregating live records...</p>
        </div>
      </div>
    );
  }

  // Calculate Metrics from REAL records only
  const activeEmployees = employees.filter((e) => e.employmentStatus === 'Active');
  const totalHeadcount = activeEmployees.length;
  const presentCount = todayAttendance.filter((a) => a.status === 'present').length;
  const lateCount = todayAttendance.filter((a) => a.status === 'late').length;
  const halfDayCount = todayAttendance.filter((a) => a.status === 'half_day').length;
  const onLeaveToday = todayAttendance.filter((a) => a.status === 'on_leave').length;
  const absentCount = Math.max(0, totalHeadcount - (presentCount + lateCount + halfDayCount + onLeaveToday));

  // Attendance rate formula from brief: (present + late + missing_checkout + 0.5 * half_day) / (total - on_leave)
  const attendanceDenominator = Math.max(1, totalHeadcount - onLeaveToday);
  const attendanceRate = totalHeadcount > 0
    ? (((presentCount + lateCount + halfDayCount * 0.5) / attendanceDenominator) * 100).toFixed(1) + '%'
    : '0%';

  const latePercentage = (presentCount + lateCount) > 0
    ? (((lateCount) / (presentCount + lateCount)) * 100).toFixed(1) + '%'
    : '0%';

  const pendingLeavesCount = leaveRequests.filter((l) => l.status === 'pending').length;
  const payrollTotal = latestPayroll ? `PKR ${latestPayroll.totalNet.toLocaleString()}` : 'PKR 0';

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Welcome back, {user?.displayName || 'Team Member'}
            </h2>
            <Badge variant="indigo" size="sm">
              {role === 'admin' ? 'Admin Portal' : role === 'hr' ? 'HR Portal' : 'Employee Portal'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}{' '}
            • Office Start: {settings?.officeStartTime || '09:00'} (Grace: {settings?.graceMinutes || 15}m)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {role === 'employee' && (
            <button
              onClick={onOpenSmartLeave}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Leave</span>
            </button>
          )}

          <button
            onClick={onOpenAI}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            <span>Ask AI Assistant</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROLE: ADMIN DASHBOARD */}
      {/* ======================================================== */}
      {role === 'admin' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Headcount"
              value={totalHeadcount}
              subtitle={`${employees.length} total registered records`}
              icon={Users}
              iconColor="text-indigo-600"
              iconBg="bg-indigo-50"
            />
            <StatCard
              title="Attendance Rate"
              value={attendanceRate}
              subtitle={`${presentCount} present, ${absentCount} absent today`}
              icon={Clock}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              title="Late Arrival %"
              value={latePercentage}
              subtitle={`${lateCount} checked in after grace period`}
              icon={AlertTriangle}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            />
            <StatCard
              title="Monthly Payroll"
              value={payrollTotal}
              subtitle={latestPayroll ? `${latestPayroll.monthName} (${latestPayroll.status})` : 'No runs drafted yet'}
              icon={CreditCard}
              iconColor="text-purple-600"
              iconBg="bg-purple-50"
            />
          </div>

          {/* AI Executive Summary Box */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg ring-1 ring-indigo-400/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Executive KPI Insights</h3>
                  <p className="text-xs text-indigo-200">
                    Live insights generated strictly from company records
                  </p>
                </div>
              </div>

              <button
                onClick={handleGenerateInsights}
                disabled={loadingInsights}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>{loadingInsights ? 'Analyzing...' : 'Generate New Insights'}</span>
              </button>
            </div>

            {aiInsights.length > 0 ? (
              <div className="space-y-2 text-xs text-indigo-100 bg-white/5 p-4 rounded-xl border border-white/10">
                {aiInsights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{insight}</span>
                  </div>
                ))}
                <p className="text-[10px] text-indigo-300 pt-1 italic">
                  [AI-generated summary based on current live data]
                </p>
              </div>
            ) : (
              <p className="text-xs text-indigo-200">
                Click &ldquo;Generate New Insights&rdquo; to analyze today&apos;s attendance, headcount distribution, and
                operational metrics.
              </p>
            )}
          </div>

          {/* Activity & Empty state check */}
          {employees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Employee Records Found"
              description="Your company setup is complete! Switch to HR Portal or use Employees to register staff and start tracking attendance and payroll."
              actionText="Manage Employees"
              onAction={() => onNavigate('employees')}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Attendance snapshot */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Today&apos;s Attendance Breakdown</h3>
                  <button
                    onClick={() => onNavigate('attendance')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Board</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center py-2 bg-slate-50 rounded-xl mb-4">
                  <div className="p-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Present</p>
                    <p className="text-xl font-bold text-emerald-600">{presentCount}</p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Late</p>
                    <p className="text-xl font-bold text-amber-600">{lateCount}</p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Half-Day</p>
                    <p className="text-xl font-bold text-orange-600">{halfDayCount}</p>
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Absent</p>
                    <p className="text-xl font-bold text-rose-600">{absentCount}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1.5">
                  <p>• Grace Threshold: Check-ins after 09:15 AM are automatically marked Late.</p>
                  <p>• Half-day Policy: Shifts with less than 5 worked hours are counted as 0.5x day.</p>
                </div>
              </div>

              {/* Pending Approvals & Action Items */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Pending Workflow Approvals</h3>
                  <span className="text-xs font-semibold text-indigo-600">
                    {pendingLeavesCount} pending
                  </span>
                </div>

                {pendingLeavesCount === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                    No pending leave requests awaiting review.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaveRequests
                      .filter((l) => l.status === 'pending')
                      .slice(0, 3)
                      .map((req) => (
                        <div
                          key={req.id}
                          className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{req.employeeName}</span>
                            <span className="text-slate-500 block text-[11px]">
                              {req.leaveType.toUpperCase()} Leave • {req.startDate} to {req.endDate} ({req.workingDays} days)
                            </span>
                          </div>
                          <button
                            onClick={() => onNavigate('leaves')}
                            className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md font-semibold text-[11px] cursor-pointer"
                          >
                            Review
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ROLE: HR DASHBOARD */}
      {/* ======================================================== */}
      {role === 'hr' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Staff"
              value={totalHeadcount}
              subtitle="Registered active personnel"
              icon={Users}
              iconColor="text-indigo-600"
              iconBg="bg-indigo-50"
            />
            <StatCard
              title="Present Today"
              value={presentCount + lateCount}
              subtitle={`${lateCount} arrived after grace period`}
              icon={Clock}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              title="Pending Leaves"
              value={pendingLeavesCount}
              subtitle="Awaiting HR approval"
              icon={CalendarCheck}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            />
            <StatCard
              title="Payroll Draft"
              value={latestPayroll ? latestPayroll.status.toUpperCase() : 'NOT DRAFTED'}
              subtitle={latestPayroll ? latestPayroll.monthName : 'Current month ready'}
              icon={CreditCard}
              iconColor="text-purple-600"
              iconBg="bg-purple-50"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">HR Management Workflows</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onNavigate('employees')}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left transition-all cursor-pointer group"
                >
                  <Users className="w-5 h-5 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-800">Add / View Employees</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Directory & CSV import/export</p>
                </button>

                <button
                  onClick={() => onNavigate('attendance')}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left transition-all cursor-pointer group"
                >
                  <Clock className="w-5 h-5 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-800">Attendance Board</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Monitor daily check-ins</p>
                </button>

                <button
                  onClick={() => onNavigate('leaves')}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left transition-all cursor-pointer group"
                >
                  <CalendarCheck className="w-5 h-5 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-800">Review Leaves ({pendingLeavesCount})</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Approve or reject requests</p>
                </button>

                <button
                  onClick={() => onNavigate('payroll')}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left transition-all cursor-pointer group"
                >
                  <CreditCard className="w-5 h-5 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-800">Payroll Drafts</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Calculate monthly salaries</p>
                </button>
              </div>
            </div>

            {/* Late comers today */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Today&apos;s Late Arrivals</h3>
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold">
                  {lateCount} late
                </span>
              </div>

              {lateCount === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  Punctuality is high: No employees checked in past the grace threshold today.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {todayAttendance
                    .filter((a) => a.status === 'late')
                    .map((rec) => (
                      <div key={rec.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-800">{rec.employeeName}</p>
                          <p className="text-[11px] text-slate-500">
                            Check-in: {rec.checkInAt ? new Date(rec.checkInAt).toLocaleTimeString() : 'N/A'}
                          </p>
                        </div>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
                          +{rec.lateMinutes} mins late
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ROLE: EMPLOYEE DASHBOARD */}
      {/* ======================================================== */}
      {role === 'employee' && (
        <div className="space-y-6">
          {/* Quick Check-in / Check-out Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wider block mb-1">
                  Daily Attendance Tracker
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {myTodayRecord?.checkInAt
                    ? myTodayRecord.checkOutAt
                      ? 'Shift Completed Today'
                      : 'Currently Checked In'
                    : 'Not Checked In Yet'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  {myTodayRecord?.checkInAt && (
                    <span>
                      In: {new Date(myTodayRecord.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                      ({myTodayRecord.status.toUpperCase()})
                    </span>
                  )}
                  {myTodayRecord?.checkOutAt && (
                    <span className="ml-2">
                      • Out: {new Date(myTodayRecord.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                      ({(myTodayRecord.workedMinutes / 60).toFixed(1)} hrs worked)
                    </span>
                  )}
                </p>
                {checkActionMsg && (
                  <p className="text-xs text-indigo-300 font-medium mt-2 bg-white/10 px-3 py-1.5 rounded-lg inline-block">
                    {checkActionMsg}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {!myTodayRecord?.checkInAt ? (
                  <button
                    onClick={handleEmployeeCheckIn}
                    disabled={checkingInOut}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    <span>{checkingInOut ? 'Recording...' : 'Web Check-In'}</span>
                  </button>
                ) : !myTodayRecord.checkOutAt ? (
                  <button
                    onClick={handleEmployeeCheckOut}
                    disabled={checkingInOut}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-900/30 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{checkingInOut ? 'Recording...' : 'Web Check-Out'}</span>
                  </button>
                ) : (
                  <div className="px-4 py-2 bg-white/10 rounded-xl text-xs font-semibold text-emerald-300 flex items-center gap-1.5 border border-white/10">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Attendance Complete</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Leave Quotas Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Your Leave Entitlements & Balances</h3>
              <button
                onClick={() => onNavigate('leaves')}
                className="text-xs text-indigo-600 font-semibold hover:text-indigo-800"
              >
                Apply for Leave
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Annual Leave</p>
                <p className="text-2xl font-black text-indigo-600 mt-1">
                  {myBalance?.annualRemaining ?? 14}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">out of 14 days quota</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Sick Leave</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  {myBalance?.sickRemaining ?? 8}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">out of 8 days quota</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Casual Leave</p>
                <p className="text-2xl font-black text-amber-600 mt-1">
                  {myBalance?.casualRemaining ?? 10}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">out of 10 days quota</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Unpaid Taken</p>
                <p className="text-2xl font-black text-slate-700 mt-1">
                  {myBalance?.unpaidUsed ?? 0}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">days deducted</p>
              </div>
            </div>
          </div>

          {/* Latest Finalized Payslip Card */}
          {latestPayroll && latestPayroll.status === 'finalized' && user?.employeeId && latestPayroll.items[user.employeeId] && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Latest Payslip: {latestPayroll.monthName}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Net Take-Home: PKR {latestPayroll.items[user.employeeId].netPay.toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onViewPayslip(latestPayroll, user.employeeId!)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>View & Print Payslip</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Announcements Feed for all users */}
      {announcements.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Company Announcements</h3>
            <button
              onClick={() => onNavigate('announcements')}
              className="text-xs text-indigo-600 font-semibold hover:text-indigo-800"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-slate-900">{ann.title}</h4>
                  <Badge variant="indigo" size="sm">
                    {ann.audience}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                  {ann.body}
                </p>
                <p className="text-[10px] text-slate-400 mt-2">
                  Posted by {ann.postedBy} • {new Date(ann.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
