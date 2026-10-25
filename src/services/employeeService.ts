import { Employee } from '../types';
import { Store } from './store';
import { AuditService } from './auditService';
import { AuthService } from './authService';

export class EmployeeService {
  private static COLLECTION = 'employees';

  static async getEmployees(): Promise<Employee[]> {
    const list = await Store.getAllDocuments<Employee>(this.COLLECTION);
    return list.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  static async getEmployeeById(id: string): Promise<Employee | null> {
    return await Store.getDocument<Employee>(this.COLLECTION, id);
  }

  static async getEmployeeByEmail(email: string): Promise<Employee | null> {
    const list = await this.getEmployees();
    return list.find((e) => e.workEmail.toLowerCase() === email.toLowerCase()) || null;
  }

  static async getEmployeeByUid(uid: string): Promise<Employee | null> {
    const list = await this.getEmployees();
    return list.find((e) => e.uid === uid) || null;
  }

  static async createEmployee(
    data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>,
    createLoginAccount: boolean,
    tempPassword: string,
    actorEmail: string,
    actorUid: string
  ): Promise<Employee> {
    // Check duplicate email
    const existing = await this.getEmployeeByEmail(data.workEmail);
    if (existing) {
      throw new Error(`An employee with email ${data.workEmail} already exists.`);
    }

    const id = `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let userUid: string | undefined;

    if (createLoginAccount && tempPassword) {
      const user = await AuthService.createEmployeeAccount(
        data.workEmail,
        tempPassword,
        data.fullName,
        id,
        actorEmail,
        actorUid
      );
      userUid = user.uid;
    }

    const employee: Employee = {
      ...data,
      id,
      uid: userUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await Store.setDocument(this.COLLECTION, id, employee);

    // Initialize leave balance for current year
    const currentYear = new Date().getFullYear();
    await Store.setDocument('leaveBalances', `${id}_${currentYear}`, {
      id: `${id}_${currentYear}`,
      employeeId: id,
      year: currentYear,
      annualRemaining: 14,
      sickRemaining: 8,
      casualRemaining: 10,
      unpaidUsed: 0,
    });

    await AuditService.log(
      actorUid,
      actorEmail,
      'hr',
      'CREATED_EMPLOYEE',
      'employee',
      id,
      `Registered employee: ${data.fullName} (${data.employeeCode})`
    );

    return employee;
  }

  static async updateEmployee(
    id: string,
    updates: Partial<Employee>,
    actorEmail: string,
    actorUid: string
  ): Promise<void> {
    const existing = await this.getEmployeeById(id);
    if (!existing) throw new Error('Employee not found.');

    if (updates.workEmail && updates.workEmail.toLowerCase() !== existing.workEmail.toLowerCase()) {
      const dupe = await this.getEmployeeByEmail(updates.workEmail);
      if (dupe && dupe.id !== id) {
        throw new Error(`Email ${updates.workEmail} is already in use by another employee.`);
      }
    }

    await Store.updateDocument(this.COLLECTION, id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    await AuditService.log(
      actorUid,
      actorEmail,
      'hr',
      'UPDATED_EMPLOYEE',
      'employee',
      id,
      `Updated details for ${existing.fullName}`
    );
  }

  static async selfUpdateProfile(
    id: string,
    phone: string,
    address: string,
    actorEmail: string,
    actorUid: string
  ): Promise<void> {
    await Store.updateDocument(this.COLLECTION, id, {
      phone: phone.trim(),
      address: address.trim(),
      updatedAt: new Date().toISOString(),
    });

    await AuditService.log(
      actorUid,
      actorEmail,
      'employee',
      'SELF_UPDATED_PROFILE',
      'employee',
      id,
      'Employee updated own phone/address'
    );
  }

  static async deleteEmployee(id: string, actorEmail: string, actorUid: string): Promise<void> {
    const existing = await this.getEmployeeById(id);
    await Store.deleteDocument(this.COLLECTION, id);

    await AuditService.log(
      actorUid,
      actorEmail,
      'hr',
      'DELETED_EMPLOYEE',
      'employee',
      id,
      `Deleted employee ${existing ? existing.fullName : id}`
    );
  }

  // --- CSV Export & Import ---
  static exportToCSV(employees: Employee[]): string {
    const headers = [
      'Employee Code',
      'Full Name',
      'Work Email',
      'Phone',
      'Department',
      'Designation',
      'Joining Date',
      'Employment Type',
      'Status',
    ];

    const escapeValue = (str: any) => {
      if (str === null || str === undefined) return '""';
      let clean = String(str).replace(/"/g, '""');
      // Neutralize formula injection
      if (/^[=+@-]/.test(clean)) {
        clean = `'${clean}`;
      }
      return `"${clean}"`;
    };

    const rows = employees.map((e) => [
      escapeValue(e.employeeCode),
      escapeValue(e.fullName),
      escapeValue(e.workEmail),
      escapeValue(e.phone),
      escapeValue(e.departmentName || e.departmentId),
      escapeValue(e.designationTitle || e.designationId),
      escapeValue(e.joiningDate),
      escapeValue(e.employmentType),
      escapeValue(e.employmentStatus),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  static parseCSVForDryRun(csvText: string): {
    valid: Array<Partial<Employee>>;
    errors: Array<{ row: number; reason: string }>;
  } {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return { valid: [], errors: [{ row: 1, reason: 'CSV is empty or missing data rows.' }] };
    }

    const valid: Array<Partial<Employee>> = [];
    const errors: Array<{ row: number; reason: string }> = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Basic CSV tokenization handling quotes
      const parts: string[] = [];
      let inQuotes = false;
      let current = '';
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim());

      const code = parts[0]?.replace(/^"|"$/g, '');
      const name = parts[1]?.replace(/^"|"$/g, '');
      const email = parts[2]?.replace(/^"|"$/g, '');
      const phone = parts[3]?.replace(/^"|"$/g, '') || '';
      const dep = parts[4]?.replace(/^"|"$/g, '') || 'General';
      const des = parts[5]?.replace(/^"|"$/g, '') || 'Staff';
      const joinDate = parts[6]?.replace(/^"|"$/g, '') || new Date().toISOString().split('T')[0];
      const type = (parts[7]?.replace(/^"|"$/g, '') as any) || 'Full-time';

      if (!name || name.length < 2) {
        errors.push({ row: i + 1, reason: 'Full Name is missing or too short.' });
        continue;
      }
      if (!email || !email.includes('@')) {
        errors.push({ row: i + 1, reason: 'Invalid or missing work email.' });
        continue;
      }

      valid.push({
        employeeCode: code || `EMP-${100 + i}`,
        fullName: name,
        workEmail: email,
        phone,
        departmentId: dep,
        designationId: des,
        joiningDate: joinDate,
        employmentType: type,
        employmentStatus: 'Active',
      });
    }

    return { valid, errors };
  }
}
