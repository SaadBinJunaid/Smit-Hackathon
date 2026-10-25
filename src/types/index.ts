export type UserRole = 'admin' | 'hr' | 'employee';

export interface CompanySettings {
  companyName: string;
  officeStartTime: string; // e.g. "09:00"
  graceMinutes: number; // default 15 -> late after 09:15
  halfDayHours: number; // default 5 -> worked hours < 5 means half_day
  weekendDays: number[]; // [0, 6] (0 = Sunday, 6 = Saturday)
  officeLatitude: number;
  officeLongitude: number;
  geofenceRadiusMeters: number; // default 150m
  companyTimezone: string;
  setupComplete: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UserAccount {
  id?: string;
  uid: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  displayName: string;
  active: boolean;
  mustChangePassword?: boolean;
  temporaryPassword?: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  nameLower?: string;
  description?: string;
  headEmployeeId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Designation {
  id: string;
  title: string;
  departmentId: string;
  description?: string;
  createdAt: string;
}

export interface Holiday {
  id: string; // usually YYYY-MM-DD
  date: string; // YYYY-MM-DD
  name: string;
  description?: string;
  createdAt: string;
}

export interface LeaveTypePolicy {
  id: string; // 'annual' | 'sick' | 'casual' | 'unpaid'
  name: string;
  yearlyQuota: number; // 14, 8, 10, 999
  paid: boolean;
}

export interface Employee {
  id: string;
  employeeCode: string; // e.g. EMP-001
  uid?: string;
  fullName: string;
  workEmail: string;
  phone: string;
  address?: string;
  departmentId: string;
  departmentName?: string;
  designationId: string;
  designationTitle?: string;
  joiningDate: string; // YYYY-MM-DD
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
  employmentStatus: 'Active' | 'On leave' | 'Inactive';
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | 'missing_checkout' | 'on_leave';

export interface AttendanceRecord {
  id: string; // {employeeId}_{YYYY-MM-DD}
  employeeId: string;
  employeeUid?: string;
  employeeName: string;
  departmentId?: string;
  departmentName?: string;
  date: string; // YYYY-MM-DD
  checkInAt: string | null; // ISO string
  checkOutAt: string | null; // ISO string
  workedMinutes: number;
  status: AttendanceStatus;
  lateMinutes: number;
  source: 'web' | 'camera' | 'correction';
  location?: {
    latitude: number;
    longitude: number;
    distanceMeters: number;
    withinGeofence: boolean;
  };
  correctionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceCorrectionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  attendanceId: string;
  date: string;
  proposedCheckIn?: string;
  proposedCheckOut?: string;
  proposedStatus: AttendanceStatus;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeUid?: string;
  employeeName: string;
  employeeEmail: string;
  leaveType: 'annual' | 'sick' | 'casual' | 'unpaid';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  workingDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewedBy?: string;
  reviewComment?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  id?: string;
  employeeId: string;
  year: number;
  annualRemaining: number; // starts 14
  sickRemaining: number; // starts 8
  casualRemaining: number; // starts 10
  unpaidUsed: number;
}

export interface SalaryStructure {
  id?: string;
  employeeId: string;
  employeeName?: string;
  basicMonthly: number;
  hra: number; // 40% of basic
  medical: number; // 10% of basic
  allowances: number; // 50% of basic
  grossMonthly: number; // 1.5 * basic
  effectiveFrom: string; // YYYY-MM-DD
  updatedAt: string;
  updatedBy: string;
}

export interface PayrollItem {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  designationTitle: string;
  basic: number;
  hra: number;
  medical: number;
  otherAllowances: number;
  grossSalary: number;
  periodWorkingDays: number;
  workedDays: number;
  absentDays: number;
  halfDays: number;
  unpaidLeaveDays: number;
  perDayRate: number;
  attendanceDeduction: number;
  annualizedGross: number;
  monthlyTax: number;
  netPay: number;
  proratedDays?: number;
}

export interface PayrollRun {
  id: string; // YYYY-MM
  period: string; // YYYY-MM
  monthName: string; // e.g. "October 2026"
  status: 'draft' | 'finalized';
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalTax: number;
  totalNet: number;
  workingDaysInPeriod: number;
  items: Record<string, PayrollItem>;
  createdBy: string;
  createdAt: string;
  finalizedBy?: string;
  finalizedAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: 'all' | 'hr' | 'employees';
  postedBy: string;
  authorRole: UserRole;
  createdAt: string;
  active: boolean;
}

export interface AppNotification {
  id: string;
  recipientUid: string;
  type: 'leave' | 'attendance' | 'payroll' | 'system';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string; // e.g. "FINALIZED_PAYROLL", "APPROVED_LEAVE", "UPDATED_SETTINGS"
  targetType: string;
  targetId: string;
  details: string;
  timestamp: string;
}

export interface AILog {
  id: string;
  actorUid: string;
  actorRole: UserRole;
  requestType: 'chat' | 'smart_leave' | 'dashboard_summary' | 'policy_qa';
  toolNames?: string[];
  success: boolean;
  durationMs: number;
  timestamp: string;
}
