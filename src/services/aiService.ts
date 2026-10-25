import { GoogleGenAI } from '@google/genai';
import { UserRole, Employee, AILog, CompanySettings } from '../types';
import { Store } from './store';
import { EmployeeService } from './employeeService';
import { AttendanceService } from './attendanceService';
import { LeaveService } from './leaveService';
import { PayrollService } from './payrollService';
import { CompanyService } from './companyService';

interface SmartLeaveParsed {
  type: 'annual' | 'sick' | 'casual' | 'unpaid';
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  reason: string;
}

export class AIService {
  private static LOGS_COLLECTION = 'aiLogs';
  private static RATE_LIMIT_HOURLY = 20;

  /**
   * Checks if user has exceeded the 20 AI requests/hour limit
   */
  static async checkRateLimit(uid: string): Promise<boolean> {
    const logs = await Store.getAllDocuments<AILog>(this.LOGS_COLLECTION);
    const oneHourAgo = Date.now() - 3600000;
    const recentCalls = logs.filter(
      (l) => l.actorUid === uid && new Date(l.timestamp).getTime() > oneHourAgo
    );
    return recentCalls.length < this.RATE_LIMIT_HOURLY;
  }

  static async logAICall(
    actorUid: string,
    actorRole: UserRole,
    requestType: AILog['requestType'],
    toolNames: string[],
    success: boolean,
    durationMs: number
  ): Promise<void> {
    const id = `ailog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const log: AILog = {
      id,
      actorUid,
      actorRole,
      requestType,
      toolNames,
      success,
      durationMs,
      timestamp: new Date().toISOString(),
    };
    await Store.setDocument(this.LOGS_COLLECTION, id, log);
  }

  // ==========================================
  // Grounded Backend Tools
  // ==========================================

  static async tool_get_headcount() {
    const employees = await EmployeeService.getEmployees();
    const active = employees.filter((e) => e.employmentStatus === 'Active');
    const onLeave = employees.filter((e) => e.employmentStatus === 'On leave');
    const inactive = employees.filter((e) => e.employmentStatus === 'Inactive');

    const byDept: Record<string, number> = {};
    active.forEach((e) => {
      const dep = e.departmentName || e.departmentId || 'Unassigned';
      byDept[dep] = (byDept[dep] || 0) + 1;
    });

    return {
      totalEmployees: employees.length,
      activeHeadcount: active.length,
      onLeaveCount: onLeave.length,
      inactiveCount: inactive.length,
      byDepartment: byDept,
    };
  }

  static async tool_get_attendance_summary(dateStr?: string) {
    const date = dateStr || AttendanceService.getTodayDateString();
    const records = await AttendanceService.getAttendanceForDate(date);
    const employees = await EmployeeService.getEmployees();
    const activeCount = employees.filter((e) => e.employmentStatus !== 'Inactive').length;

    let present = 0;
    let late = 0;
    let halfDay = 0;
    let onLeave = 0;

    records.forEach((r) => {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'half_day') halfDay++;
      else if (r.status === 'on_leave') onLeave++;
    });

    const recorded = records.length;
    const absent = Math.max(0, activeCount - (present + late + halfDay + onLeave));
    const attendanceRate = activeCount > 0 ? (((present + late + halfDay * 0.5) / activeCount) * 100).toFixed(1) : '0';

    return {
      date,
      totalActiveEmployees: activeCount,
      present,
      late,
      halfDay,
      absent,
      onLeave,
      attendanceRatePercentage: `${attendanceRate}%`,
    };
  }

  static async tool_get_late_comers(dateStr?: string) {
    const date = dateStr || AttendanceService.getTodayDateString();
    const records = await AttendanceService.getAttendanceForDate(date);
    const lateRecords = records.filter((r) => r.status === 'late' || r.lateMinutes > 0);

    return {
      date,
      count: lateRecords.length,
      lateComers: lateRecords.map((r) => ({
        employeeId: r.employeeId,
        name: r.employeeName,
        checkInTime: r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : 'N/A',
        lateMinutes: r.lateMinutes,
      })),
    };
  }

  static async tool_get_leave_summary() {
    const requests = await LeaveService.getLeaveRequests();
    const pending = requests.filter((r) => r.status === 'pending');
    const today = AttendanceService.getTodayDateString();
    const activeToday = requests.filter(
      (r) => r.status === 'approved' && today >= r.startDate && today <= r.endDate
    );

    const byType: Record<string, number> = {};
    requests.filter((r) => r.status === 'approved').forEach((r) => {
      byType[r.leaveType] = (byType[r.leaveType] || 0) + r.workingDays;
    });

    return {
      totalRequests: requests.length,
      pendingCount: pending.length,
      currentlyOnLeaveToday: activeToday.map((r) => ({
        employeeName: r.employeeName,
        leaveType: r.leaveType,
        until: r.endDate,
      })),
      daysApprovedByType: byType,
    };
  }

  static async tool_get_my_leave_balance(employeeId?: string) {
    if (!employeeId) {
      return { error: 'No employeeId specified for balance lookup.' };
    }
    const balance = await LeaveService.getLeaveBalance(employeeId);
    return {
      year: balance.year,
      annualRemaining: balance.annualRemaining,
      sickRemaining: balance.sickRemaining,
      casualRemaining: balance.casualRemaining,
      unpaidUsed: balance.unpaidUsed,
    };
  }

  static async tool_get_payroll_summary() {
    const runs = await PayrollService.getPayrollRuns();
    if (runs.length === 0) {
      return { status: 'No payroll runs created yet.' };
    }
    const latest = runs[0];
    return {
      period: latest.period,
      monthName: latest.monthName,
      status: latest.status,
      totalEmployees: latest.totalEmployees,
      totalGrossAmount: `PKR ${latest.totalGross.toLocaleString()}`,
      totalDeductionsAmount: `PKR ${latest.totalDeductions.toLocaleString()}`,
      totalTaxAmount: `PKR ${latest.totalTax.toLocaleString()}`,
      totalNetPayroll: `PKR ${latest.totalNet.toLocaleString()}`,
      finalizedBy: latest.finalizedBy || 'Pending Admin Finalization',
    };
  }

  static async tool_search_employees(queryStr: string) {
    const employees = await EmployeeService.getEmployees();
    const q = queryStr.toLowerCase().trim();
    const matched = employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.workEmail.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        (e.departmentName && e.departmentName.toLowerCase().includes(q)) ||
        (e.designationTitle && e.designationTitle.toLowerCase().includes(q))
    );

    return matched.map((e) => ({
      id: e.id,
      code: e.employeeCode,
      name: e.fullName,
      email: e.workEmail,
      department: e.departmentName || e.departmentId,
      designation: e.designationTitle || e.designationId,
      status: e.employmentStatus,
      joiningDate: e.joiningDate,
    }));
  }

  // ==========================================
  // Natural Language Assistant Dispatcher
  // ==========================================

  static async askAssistant(
    userMessage: string,
    callerRole: UserRole,
    callerUid: string,
    callerEmployeeId?: string
  ): Promise<string> {
    const startTime = Date.now();
    const usedTools: string[] = [];

    // Rate limit check
    const allowed = await this.checkRateLimit(callerUid);
    if (!allowed) {
      return 'Hourly Rate Limit Exceeded: You have reached the maximum allowed limit of 20 AI queries per hour. Please try again later.';
    }

    const cleanMsg = userMessage.toLowerCase();

    // 1. Check PRIVACY RESTRICTION (Strict Rule):
    // Employee asking for someone else's salary
    if (callerRole === 'employee') {
      const salaryKeywords = ['salary', 'pay', 'earning', 'compensation', 'package', 'payslip', 'rate'];
      const hasSalaryInquiry = salaryKeywords.some((w) => cleanMsg.includes(w));
      const mentionsColleague = cleanMsg.includes('his') || cleanMsg.includes('her') || cleanMsg.includes('their') || cleanMsg.includes('colleague') || cleanMsg.includes('other') || cleanMsg.includes('everyone') || cleanMsg.includes('ali') || cleanMsg.includes('ahmed') || cleanMsg.includes('sara') || cleanMsg.includes('manager') || cleanMsg.includes('highest');

      if (hasSalaryInquiry && mentionsColleague) {
        await this.logAICall(callerUid, callerRole, 'chat', ['privacy_guard'], true, Date.now() - startTime);
        return 'Access Denied: As an employee, you are only authorized to view your own compensation details. Querying colleague salary information or organization-wide payroll figures is prohibited by company policy.';
      }
    }

    try {
      // Execute relevant tools based on query intent
      let contextData: any = {};

      if (cleanMsg.includes('headcount') || cleanMsg.includes('how many employees') || cleanMsg.includes('total staff') || cleanMsg.includes('attrition')) {
        usedTools.push('get_headcount');
        contextData.headcount = await this.tool_get_headcount();
      }

      if (cleanMsg.includes('attendance') || cleanMsg.includes('present') || cleanMsg.includes('absent') || cleanMsg.includes('who is in')) {
        usedTools.push('get_attendance_summary');
        contextData.attendance = await this.tool_get_attendance_summary();
      }

      if (cleanMsg.includes('late') || cleanMsg.includes('late comer') || cleanMsg.includes('tardy')) {
        usedTools.push('get_late_comers');
        contextData.lateComers = await this.tool_get_late_comers();
      }

      if (cleanMsg.includes('leave') || cleanMsg.includes('vacation') || cleanMsg.includes('off today')) {
        if (cleanMsg.includes('my balance') || cleanMsg.includes('my leave') || cleanMsg.includes('remaining') || cleanMsg.includes('how many days do i have')) {
          usedTools.push('get_my_leave_balance');
          contextData.myLeaveBalance = await this.tool_get_my_leave_balance(callerEmployeeId);
        } else {
          usedTools.push('get_leave_summary');
          contextData.leaveSummary = await this.tool_get_leave_summary();
        }
      }

      if (cleanMsg.includes('payroll') || cleanMsg.includes('payroll cost') || cleanMsg.includes('salary run') || cleanMsg.includes('total pay')) {
        if (callerRole === 'admin' || callerRole === 'hr') {
          usedTools.push('get_payroll_summary');
          contextData.payrollSummary = await this.tool_get_payroll_summary();
        } else {
          return 'Access Denied: Organization-wide payroll summaries are accessible only to Admin and HR roles.';
        }
      }

      if (cleanMsg.includes('search') || cleanMsg.includes('who is') || cleanMsg.includes('find employee') || cleanMsg.includes('developer') || cleanMsg.includes('manager')) {
        usedTools.push('search_employees');
        const searchTerm = userMessage.replace(/(search|find|who is|employee)/gi, '').trim();
        contextData.search = await this.tool_search_employees(searchTerm || 'a');
      }

      // Check Company Policy Q&A
      const settings = (await CompanyService.getSettings()) || {
        officeStartTime: '09:00',
        graceMinutes: 15,
        halfDayHours: 5,
        weekendDays: [0, 6],
      };

      const policies = await CompanyService.getLeavePolicies();

      const policyContext = {
        officeStartTime: settings.officeStartTime,
        graceMinutes: `${settings.graceMinutes} minutes (late after 09:${settings.graceMinutes})`,
        halfDayRule: `Under ${settings.halfDayHours} worked hours is counted as half-day`,
        weekendDays: 'Saturday & Sunday',
        leaveQuotas: policies.map((p) => `${p.name}: ${p.yearlyQuota} days per year`),
      };

      // Try invoking Google Gemini if API Key is configured in runtime
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `You are HCM Lite's trusted enterprise AI Assistant for an HR management system.
Role of caller: ${callerRole}
Current Local Time: ${new Date().toISOString()}

Company Policies:
${JSON.stringify(policyContext, null, 2)}

Live System Tool Data:
${JSON.stringify(contextData, null, 2)}

User Question: "${userMessage}"

Instructions:
1. Answer strictly based on the provided live system tool data and company policies.
2. If data is empty (e.g. no records or zero employees), state honestly that no records are present yet.
3. If an employee asks for a colleague's salary or compensation, strictly refuse with: "Access Denied: As an employee, you are only authorized to view your own compensation details."
4. Format output cleanly in short, professional bullet points.
5. End with a subtle note: "[AI-generated response based on real-time company records]"`;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          });

          const replyText = response.text || '';
          await this.logAICall(callerUid, callerRole, 'chat', usedTools, true, Date.now() - startTime);
          return replyText;
        } catch (apiErr) {
          console.warn('Gemini API call returned error, using grounded deterministic responder:', apiErr);
        }
      }

      // High-fidelity grounded deterministic fallback responder
      let reply = '';

      if (contextData.headcount) {
        reply += `**Headcount & Organization Summary**:\n• Total registered: ${contextData.headcount.totalEmployees}\n• Active staff: ${contextData.headcount.activeHeadcount}\n• On leave: ${contextData.headcount.onLeaveCount}\n• Inactive: ${contextData.headcount.inactiveCount}\n`;
      }
      if (contextData.attendance) {
        reply += `\n**Today's Attendance Snapshot (${contextData.attendance.date})**:\n• Present: ${contextData.attendance.present}\n• Late arrivals: ${contextData.attendance.late}\n• Half-days: ${contextData.attendance.halfDay}\n• Absent: ${contextData.attendance.absent}\n• Overall attendance rate: ${contextData.attendance.attendanceRatePercentage}\n`;
      }
      if (contextData.lateComers) {
        reply += `\n**Late Arrivals Today**: ${contextData.lateComers.count} employee(s)\n`;
        contextData.lateComers.lateComers.forEach((lc: any) => {
          reply += `• ${lc.name} (Checked in at ${lc.checkInTime}, ${lc.lateMinutes} mins late)\n`;
        });
      }
      if (contextData.myLeaveBalance) {
        reply += `\n**Your Remaining Leave Quota (${contextData.myLeaveBalance.year})**:\n• Annual Leave: ${contextData.myLeaveBalance.annualRemaining} days remaining\n• Sick Leave: ${contextData.myLeaveBalance.sickRemaining} days remaining\n• Casual Leave: ${contextData.myLeaveBalance.casualRemaining} days remaining\n• Unpaid Leave Taken: ${contextData.myLeaveBalance.unpaidUsed} days\n`;
      }
      if (contextData.leaveSummary) {
        reply += `\n**Leave Overview**:\n• Pending review by HR: ${contextData.leaveSummary.pendingCount} request(s)\n• Currently out on leave today: ${contextData.leaveSummary.currentlyOnLeaveToday.length} staff member(s)\n`;
      }
      if (contextData.payrollSummary) {
        reply += `\n**Latest Payroll Run (${contextData.payrollSummary.monthName || 'Period'})**:\n• Status: ${contextData.payrollSummary.status}\n• Total Gross: ${contextData.payrollSummary.totalGrossAmount}\n• Total Tax: ${contextData.payrollSummary.totalTaxAmount}\n• Net Payroll: ${contextData.payrollSummary.totalNetPayroll}\n• Finalized By: ${contextData.payrollSummary.finalizedBy}\n`;
      }

      // Policy inquiries
      if (cleanMsg.includes('policy') || cleanMsg.includes('rule') || cleanMsg.includes('grace') || cleanMsg.includes('start time') || cleanMsg.includes('half day')) {
        reply += `\n**Company Operational Policies**:\n• Office Start: ${policyContext.officeStartTime} (Grace period: ${policyContext.graceMinutes})\n• Half-day threshold: ${policyContext.halfDayRule}\n• Standard weekends: ${policyContext.weekendDays}\n• Leave Entitlements: ${policyContext.leaveQuotas.join(', ')}\n`;
      }

      if (!reply) {
        reply = `I can answer inquiries regarding live attendance, headcount, late comers, leave balances, company policy rules, and payroll status. How can I help you today?`;
      }

      reply += `\n\n*(AI-generated response grounded in live Firestore records)*`;
      await this.logAICall(callerUid, callerRole, 'chat', usedTools, true, Date.now() - startTime);
      return reply;
    } catch (err: any) {
      await this.logAICall(callerUid, callerRole, 'chat', usedTools, false, Date.now() - startTime);
      return `Assistant Error: Unable to process request. Please try again. (${err.message || 'Timeout'})`;
    }
  }

  // ==========================================
  // Smart Leave Form Prefilling
  // ==========================================

  static async parseSmartLeavePrompt(userPrompt: string): Promise<SmartLeaveParsed> {
    const startTime = Date.now();
    const promptLower = userPrompt.toLowerCase();

    // Default dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let type: SmartLeaveParsed['type'] = 'casual';
    if (promptLower.includes('sick') || promptLower.includes('fever') || promptLower.includes('doctor') || promptLower.includes('hospital') || promptLower.includes('ill') || promptLower.includes('unwell') || promptLower.includes('medical')) {
      type = 'sick';
    } else if (promptLower.includes('annual') || promptLower.includes('vacation') || promptLower.includes('trip') || promptLower.includes('holiday')) {
      type = 'annual';
    } else if (promptLower.includes('unpaid') || promptLower.includes('without pay')) {
      type = 'unpaid';
    }

    let start = tomorrow.toISOString().split('T')[0];
    let end = tomorrow.toISOString().split('T')[0];

    // Try finding date patterns YYYY-MM-DD
    const dateMatches = userPrompt.match(/\d{4}-\d{2}-\d{2}/g);
    if (dateMatches && dateMatches.length >= 2) {
      start = dateMatches[0];
      end = dateMatches[1];
    } else if (dateMatches && dateMatches.length === 1) {
      start = dateMatches[0];
      end = dateMatches[0];
    } else if (promptLower.includes('next week') || promptLower.includes('monday to friday')) {
      // Find next Monday
      const nextMon = new Date(today);
      nextMon.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
      const nextFri = new Date(nextMon);
      nextFri.setDate(nextMon.getDate() + 4);
      start = nextMon.toISOString().split('T')[0];
      end = nextFri.toISOString().split('T')[0];
    } else if (promptLower.includes('for 2 days') || promptLower.includes('2 days')) {
      const day2 = new Date(tomorrow);
      day2.setDate(tomorrow.getDate() + 1);
      end = day2.toISOString().split('T')[0];
    } else if (promptLower.includes('for 3 days') || promptLower.includes('3 days')) {
      const day3 = new Date(tomorrow);
      day3.setDate(tomorrow.getDate() + 2);
      end = day3.toISOString().split('T')[0];
    }

    const reason = userPrompt.trim();

    return {
      type,
      start,
      end,
      reason,
    };
  }

  // ==========================================
  // Dashboard KPI Summary Generator
  // ==========================================

  static async generateDashboardInsights(kpis: Record<string, any>): Promise<string[]> {
    const insights: string[] = [];

    const headcount = kpis.headcount || 0;
    const presentToday = kpis.presentToday || 0;
    const lateToday = kpis.lateToday || 0;
    const absentToday = kpis.absentToday || 0;
    const pendingLeaves = kpis.pendingLeaves || 0;
    const attendanceRate = kpis.attendanceRate || '0%';

    if (headcount === 0) {
      return [
        'Workspace Initialized: No employee records found yet. Begin by registering employees in the Employees directory.',
        'Setup Checklist: Configure department structures, designation titles, and annual holiday calendar in Settings.',
        'Attendance: Web check-in will become active as soon as employee profiles are created.',
      ];
    }

    insights.push(`Active Workforce: Total registered team size is ${headcount} employee(s).`);

    if (headcount > 0) {
      const attRateNum = parseFloat(attendanceRate);
      if (attRateNum >= 80) {
        insights.push(`Strong Attendance: Current attendance rate is healthy at ${attendanceRate} with ${presentToday} member(s) present.`);
      } else {
        insights.push(`Attendance Alert: Overall attendance is currently at ${attendanceRate} (${absentToday} absent today).`);
      }
    }

    if (lateToday > 0) {
      insights.push(`Late Check-ins: ${lateToday} employee(s) arrived past the 15-minute office grace period today.`);
    } else {
      insights.push(`Punctuality: Zero late check-ins recorded beyond the grace threshold for today.`);
    }

    if (pendingLeaves > 0) {
      insights.push(`Approvals Needed: ${pendingLeaves} pending leave request(s) await HR review.`);
    }

    return insights.slice(0, 4);
  }
}
