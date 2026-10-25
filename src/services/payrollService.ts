import {
  SalaryStructure,
  PayrollRun,
  PayrollItem,
  Employee,
} from '../types';
import { Store } from './store';
import { EmployeeService } from './employeeService';
import { AttendanceService } from './attendanceService';
import { LeaveService } from './leaveService';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';

export class PayrollService {
  private static STRUCTURES_COLLECTION = 'salaryStructures';
  private static RUNS_COLLECTION = 'payrollRuns';

  // --- Salary Structures ---
  static async getSalaryStructures(): Promise<SalaryStructure[]> {
    return await Store.getAllDocuments<SalaryStructure>(this.STRUCTURES_COLLECTION);
  }

  static async getSalaryStructure(employeeId: string): Promise<SalaryStructure | null> {
    return await Store.getDocument<SalaryStructure>(this.STRUCTURES_COLLECTION, employeeId);
  }

  static async setSalaryStructure(
    employeeId: string,
    basicMonthly: number,
    effectiveFrom: string,
    actorEmail: string,
    actorUid: string
  ): Promise<SalaryStructure> {
    const hra = Math.round(basicMonthly * 0.4); // 40%
    const medical = Math.round(basicMonthly * 0.1); // 10%
    // Gross = 1.5 * basic => Basic + HRA + Medical = 1.0 + 0.4 + 0.1 = 1.5
    const grossMonthly = Math.round(basicMonthly * 1.5);
    const allowances = 0; // HRA and Medical already constitute the full 0.5x allowance

    const structure: SalaryStructure = {
      employeeId,
      basicMonthly,
      hra,
      medical,
      allowances,
      grossMonthly,
      effectiveFrom,
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail,
    };

    await Store.setDocument(this.STRUCTURES_COLLECTION, employeeId, { ...structure, id: employeeId });

    await AuditService.log(
      actorUid,
      actorEmail,
      'hr',
      'UPDATED_SALARY_STRUCTURE',
      'salaryStructure',
      employeeId,
      `Set basic salary to ${basicMonthly} (Gross: ${grossMonthly})`
    );

    return structure;
  }

  // --- Pakistan Annualized Tax Slab Calculator ---
  static calculateTax(annualGross: number): number {
    let annualTax = 0;

    if (annualGross <= 600000) {
      annualTax = 0;
    } else if (annualGross <= 1200000) {
      annualTax = (annualGross - 600000) * 0.05;
    } else if (annualGross <= 2400000) {
      annualTax = 30000 + (annualGross - 1200000) * 0.15;
    } else if (annualGross <= 3600000) {
      annualTax = 210000 + (annualGross - 2400000) * 0.25;
    } else {
      annualTax = 510000 + (annualGross - 3600000) * 0.35;
    }

    return Math.round(annualTax / 12);
  }

  // --- Monthly Payroll Draft Generation ---
  static async getPayrollRuns(): Promise<PayrollRun[]> {
    const list = await Store.getAllDocuments<PayrollRun>(this.RUNS_COLLECTION);
    return list.sort((a, b) => b.period.localeCompare(a.period));
  }

  static async getPayrollRun(period: string): Promise<PayrollRun | null> {
    return await Store.getDocument<PayrollRun>(this.RUNS_COLLECTION, period);
  }

  static async generateDraftPayroll(
    period: string, // YYYY-MM
    actorEmail: string,
    actorUid: string
  ): Promise<PayrollRun> {
    // Check if finalized
    const existing = await this.getPayrollRun(period);
    if (existing && existing.status === 'finalized') {
      throw new Error(`Payroll for period ${period} has already been finalized and locked by Admin.`);
    }

    const [yearStr, monthStr] = period.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-12

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthName = `${monthNames[month - 1]} ${year}`;

    // Days in this month
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const periodStartStr = `${period}-01`;
    const periodEndStr = `${period}-${String(totalDaysInMonth).padStart(2, '0')}`;

    // Count standard working days in month
    const periodWorkingDays = await LeaveService.calculateWorkingDays(periodStartStr, periodEndStr);

    const employees = await EmployeeService.getEmployees();
    const activeEmployees = employees.filter((e) => e.employmentStatus !== 'Inactive');

    const structures = await this.getSalaryStructures();
    const structureMap = new Map(structures.map((s) => [s.employeeId, s]));

    // Fetch all attendance and leave records for the month
    const allAttendance = await Store.getAllDocuments<any>('attendance');
    const monthAttendance = allAttendance.filter((a) => a.date && a.date.startsWith(period));

    const allLeaves = await Store.getAllDocuments<any>('leaveRequests');
    const approvedMonthLeaves = allLeaves.filter(
      (l) => l.status === 'approved' && (l.startDate.startsWith(period) || l.endDate.startsWith(period))
    );

    const items: Record<string, PayrollItem> = {};
    let totalGross = 0;
    let totalDeductions = 0;
    let totalTax = 0;
    let totalNet = 0;

    for (const emp of activeEmployees) {
      const struct = structureMap.get(emp.id) || {
        basicMonthly: 50000, // Reasonable default baseline if not configured yet
        hra: 20000,
        medical: 5000,
        allowances: 0,
        grossMonthly: 75000,
      };

      const gross = struct.grossMonthly;
      const perDayRate = periodWorkingDays > 0 ? gross / periodWorkingDays : 0;

      // Filter attendance for this employee
      const empAttendance = monthAttendance.filter((a) => a.employeeId === emp.id);
      let workedDays = 0;
      let halfDays = 0;

      empAttendance.forEach((a) => {
        if (a.status === 'present' || a.status === 'late') workedDays++;
        else if (a.status === 'half_day') halfDays++;
      });

      // Filter unpaid leaves for this employee
      const empUnpaidLeaves = approvedMonthLeaves.filter(
        (l) => l.employeeId === emp.id && l.leaveType === 'unpaid'
      );
      const unpaidLeaveDays = empUnpaidLeaves.reduce((sum, l) => sum + (l.workingDays || 0), 0);

      // Absent days: expected working days minus (worked + halfDays + approved leaves)
      const empLeaves = approvedMonthLeaves.filter((l) => l.employeeId === emp.id);
      const approvedPaidLeaveDays = empLeaves
        .filter((l) => l.leaveType !== 'unpaid')
        .reduce((sum, l) => sum + (l.workingDays || 0), 0);

      // Check joining date proration
      let proratedDeduction = 0;
      if (emp.joiningDate && emp.joiningDate > periodStartStr && emp.joiningDate <= periodEndStr) {
        const daysMissedBeforeJoining = await LeaveService.calculateWorkingDays(
          periodStartStr,
          emp.joiningDate
        ) - 1; // days before join
        if (daysMissedBeforeJoining > 0) {
          proratedDeduction = daysMissedBeforeJoining * perDayRate;
        }
      }

      const accountedWorkingDays = workedDays + halfDays + approvedPaidLeaveDays + unpaidLeaveDays;
      const absentDays = Math.max(0, periodWorkingDays - accountedWorkingDays);

      // Half-day deduction is 0.5 * per-day rate
      const attendanceDeduction = Math.round(
        (absentDays * perDayRate) +
        (unpaidLeaveDays * perDayRate) +
        (halfDays * 0.5 * perDayRate) +
        proratedDeduction
      );

      // Annualized tax
      const annualGross = gross * 12;
      const monthlyTax = this.calculateTax(annualGross);

      const netPay = Math.max(0, Math.round(gross - attendanceDeduction - monthlyTax));

      const item: PayrollItem = {
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeCode: emp.employeeCode,
        departmentName: emp.departmentName || emp.departmentId,
        designationTitle: emp.designationTitle || emp.designationId,
        basic: struct.basicMonthly,
        hra: struct.hra,
        medical: struct.medical,
        otherAllowances: struct.allowances,
        grossSalary: gross,
        periodWorkingDays,
        workedDays,
        absentDays,
        halfDays,
        unpaidLeaveDays,
        perDayRate: Math.round(perDayRate),
        attendanceDeduction,
        annualizedGross: annualGross,
        monthlyTax,
        netPay,
      };

      items[emp.id] = item;
      totalGross += gross;
      totalDeductions += attendanceDeduction;
      totalTax += monthlyTax;
      totalNet += netPay;
    }

    const run: PayrollRun = {
      id: period,
      period,
      monthName,
      status: 'draft',
      totalEmployees: activeEmployees.length,
      totalGross,
      totalDeductions,
      totalTax,
      totalNet,
      workingDaysInPeriod: periodWorkingDays,
      items,
      createdBy: actorEmail,
      createdAt: new Date().toISOString(),
    };

    await Store.setDocument(this.RUNS_COLLECTION, period, run);

    await AuditService.log(
      actorUid,
      actorEmail,
      'hr',
      'GENERATED_PAYROLL_DRAFT',
      'payrollRun',
      period,
      `Drafted payroll for ${monthName}: Total Gross: ${totalGross}, Net: ${totalNet}`
    );

    return run;
  }

  static async finalizePayroll(
    period: string,
    actorEmail: string,
    actorUid: string
  ): Promise<PayrollRun> {
    const run = await this.getPayrollRun(period);
    if (!run) throw new Error('Payroll run not found. Create a draft first.');
    if (run.status === 'finalized') {
      throw new Error('This payroll run is already finalized.');
    }

    const now = new Date().toISOString();
    const finalizedRun: PayrollRun = {
      ...run,
      status: 'finalized',
      finalizedBy: actorEmail,
      finalizedAt: now,
    };

    await Store.setDocument(this.RUNS_COLLECTION, period, finalizedRun);

    // Notify all employees
    for (const empId of Object.keys(run.items)) {
      await NotificationService.send(
        empId,
        'payroll',
        `Payslip Available for ${run.monthName}`,
        `Your monthly payslip for ${run.monthName} has been finalized. Net Pay: PKR ${run.items[empId].netPay.toLocaleString()}`
      );
    }

    await AuditService.log(
      actorUid,
      actorEmail,
      'admin',
      'FINALIZED_PAYROLL',
      'payrollRun',
      period,
      `Admin finalized and locked payroll for ${run.monthName} (${run.totalEmployees} employees)`
    );

    return finalizedRun;
  }
}
