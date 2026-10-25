import { LeaveRequest, LeaveBalance, LeaveTypePolicy } from '../types';
import { Store } from './store';
import { CompanyService } from './companyService';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';

export class LeaveService {
  private static REQUESTS_COLLECTION = 'leaveRequests';
  private static BALANCES_COLLECTION = 'leaveBalances';

  static async getLeaveRequests(): Promise<LeaveRequest[]> {
    const list = await Store.getAllDocuments<LeaveRequest>(this.REQUESTS_COLLECTION);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async getLeaveRequestsForEmployee(employeeId: string): Promise<LeaveRequest[]> {
    const all = await this.getLeaveRequests();
    return all.filter((l) => l.employeeId === employeeId);
  }

  static async getLeaveBalance(employeeId: string, year: number = new Date().getFullYear()): Promise<LeaveBalance> {
    const id = `${employeeId}_${year}`;
    const balance = await Store.getDocument<LeaveBalance>(this.BALANCES_COLLECTION, id);
    if (balance) return balance;

    // Default balance
    const def: LeaveBalance = {
      employeeId,
      year,
      annualRemaining: 14,
      sickRemaining: 8,
      casualRemaining: 10,
      unpaidUsed: 0,
    };
    await Store.setDocument(this.BALANCES_COLLECTION, id, { ...def, id });
    return def;
  }

  /**
   * Calculates working days between two ISO dates (inclusive),
   * excluding weekends (Sat/Sun) and configured holidays.
   */
  static async calculateWorkingDays(startDateStr: string, endDateStr: string): Promise<number> {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (start > end) return 0;

    const holidays = await CompanyService.getHolidays();
    const holidayDates = new Set(holidays.map((h) => h.date));

    let count = 0;
    const cur = new Date(start);

    while (cur <= end) {
      const dayOfWeek = cur.getDay(); // 0 = Sunday, 6 = Saturday
      const dateString = cur.toISOString().split('T')[0];

      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDates.has(dateString);

      if (!isWeekend && !isHoliday) {
        count++;
      }

      cur.setDate(cur.getDate() + 1);
    }

    return count;
  }

  static async applyLeave(
    employeeId: string,
    employeeName: string,
    employeeEmail: string,
    leaveType: 'annual' | 'sick' | 'casual' | 'unpaid',
    startDate: string,
    endDate: string,
    reason: string
  ): Promise<LeaveRequest> {
    if (startDate > endDate) {
      throw new Error('Start date cannot be after end date.');
    }

    const workingDays = await this.calculateWorkingDays(startDate, endDate);
    if (workingDays === 0) {
      throw new Error('Selected date range contains only weekends or official holidays. No working days requested.');
    }

    // Check balance
    const currentYear = new Date(startDate).getFullYear();
    const balance = await this.getLeaveBalance(employeeId, currentYear);

    if (leaveType === 'annual' && workingDays > balance.annualRemaining) {
      throw new Error(`Insufficient Annual Leave balance. Requested: ${workingDays} days, Available: ${balance.annualRemaining} days.`);
    }
    if (leaveType === 'sick' && workingDays > balance.sickRemaining) {
      throw new Error(`Insufficient Sick Leave balance. Requested: ${workingDays} days, Available: ${balance.sickRemaining} days.`);
    }
    if (leaveType === 'casual' && workingDays > balance.casualRemaining) {
      throw new Error(`Insufficient Casual Leave balance. Requested: ${workingDays} days, Available: ${balance.casualRemaining} days.`);
    }

    // Check overlap with existing active leaves
    const existingLeaves = await this.getLeaveRequestsForEmployee(employeeId);
    const hasOverlap = existingLeaves.some(
      (l) =>
        (l.status === 'pending' || l.status === 'approved') &&
        !(endDate < l.startDate || startDate > l.endDate)
    );

    if (hasOverlap) {
      throw new Error('You already have a pending or approved leave request overlapping with this date range.');
    }

    const id = `leave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const req: LeaveRequest = {
      id,
      employeeId,
      employeeName,
      employeeEmail,
      leaveType,
      startDate,
      endDate,
      workingDays,
      reason: reason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await Store.setDocument(this.REQUESTS_COLLECTION, id, req);

    await AuditService.log(
      employeeId,
      employeeEmail,
      'employee',
      'APPLIED_LEAVE',
      'leaveRequest',
      id,
      `Applied for ${workingDays} day(s) ${leaveType} leave (${startDate} to ${endDate})`
    );

    return req;
  }

  static async reviewLeave(
    requestId: string,
    decision: 'approved' | 'rejected',
    reviewComment: string,
    reviewerEmail: string,
    reviewerUid: string
  ): Promise<void> {
    const req = await Store.getDocument<LeaveRequest>(this.REQUESTS_COLLECTION, requestId);
    if (!req) throw new Error('Leave request not found.');

    if (req.status !== 'pending') {
      throw new Error(`Cannot review request that is already ${req.status}.`);
    }

    const now = new Date().toISOString();
    await Store.updateDocument(this.REQUESTS_COLLECTION, requestId, {
      status: decision,
      reviewedBy: reviewerEmail,
      reviewComment: reviewComment.trim(),
      reviewedAt: now,
      updatedAt: now,
    });

    // If approved, deduct balance
    if (decision === 'approved') {
      const year = new Date(req.startDate).getFullYear();
      const balance = await this.getLeaveBalance(req.employeeId, year);

      let annual = balance.annualRemaining;
      let sick = balance.sickRemaining;
      let casual = balance.casualRemaining;
      let unpaid = balance.unpaidUsed;

      if (req.leaveType === 'annual') annual = Math.max(0, annual - req.workingDays);
      if (req.leaveType === 'sick') sick = Math.max(0, sick - req.workingDays);
      if (req.leaveType === 'casual') casual = Math.max(0, casual - req.workingDays);
      if (req.leaveType === 'unpaid') unpaid += req.workingDays;

      await Store.setDocument(this.BALANCES_COLLECTION, `${req.employeeId}_${year}`, {
        ...balance,
        annualRemaining: annual,
        sickRemaining: sick,
        casualRemaining: casual,
        unpaidUsed: unpaid,
      });
    }

    // Send notification
    await NotificationService.send(
      req.employeeId,
      'leave',
      `Leave Request ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
      `Your ${req.leaveType} leave request (${req.startDate} to ${req.endDate}) was ${decision}. Comment: ${reviewComment || 'None'}`
    );

    await AuditService.log(
      reviewerUid,
      reviewerEmail,
      'hr',
      `LEAVE_${decision.toUpperCase()}`,
      'leaveRequest',
      requestId,
      `${decision.toUpperCase()} ${req.leaveType} leave for ${req.employeeName}`
    );
  }

  static async cancelLeave(requestId: string, employeeId: string, employeeEmail: string): Promise<void> {
    const req = await Store.getDocument<LeaveRequest>(this.REQUESTS_COLLECTION, requestId);
    if (!req) throw new Error('Leave request not found.');

    if (req.employeeId !== employeeId) {
      throw new Error('You can only cancel your own leave requests.');
    }
    if (req.status !== 'pending') {
      throw new Error('Only pending leave requests can be cancelled.');
    }

    await Store.updateDocument(this.REQUESTS_COLLECTION, requestId, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });

    await AuditService.log(
      employeeId,
      employeeEmail,
      'employee',
      'CANCELLED_LEAVE',
      'leaveRequest',
      requestId,
      `Employee cancelled pending ${req.leaveType} leave`
    );
  }
}
