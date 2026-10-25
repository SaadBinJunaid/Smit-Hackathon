import {
  CompanySettings,
  Department,
  Designation,
  Holiday,
  LeaveTypePolicy,
} from '../types';
import { Store } from './store';
import { AuditService } from './auditService';

export const DEFAULT_LEAVE_POLICIES: LeaveTypePolicy[] = [
  { id: 'annual', name: 'Annual Leave', yearlyQuota: 14, paid: true },
  { id: 'sick', name: 'Sick Leave', yearlyQuota: 8, paid: true },
  { id: 'casual', name: 'Casual Leave', yearlyQuota: 10, paid: true },
  { id: 'unpaid', name: 'Unpaid Leave', yearlyQuota: 999, paid: false },
];

export const DEFAULT_SETTINGS: CompanySettings = {
  companyName: '',
  officeStartTime: '09:00',
  graceMinutes: 15,
  halfDayHours: 5,
  weekendDays: [0, 6], // Sunday = 0, Saturday = 6
  officeLatitude: 24.8607, // Default Karachi coordinate
  officeLongitude: 67.0011,
  geofenceRadiusMeters: 150,
  companyTimezone: 'Asia/Karachi',
  setupComplete: false,
  createdAt: new Date().toISOString(),
};

export class CompanyService {
  private static SETTINGS_KEY = 'companySettings';
  private static MAIN_DOC = 'main';

  // --- Settings ---
  static async getSettings(): Promise<CompanySettings | null> {
    const doc = await Store.getDocument<CompanySettings & { id: string }>(
      this.SETTINGS_KEY,
      this.MAIN_DOC
    );
    return doc;
  }

  static async isSetupComplete(): Promise<boolean> {
    const settings = await this.getSettings();
    return Boolean(settings && settings.setupComplete);
  }

  static async completeFirstRunSetup(
    settings: Partial<CompanySettings>,
    actorEmail: string,
    actorUid: string
  ): Promise<CompanySettings> {
    const fullSettings: CompanySettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
      setupComplete: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await Store.setDocument(this.SETTINGS_KEY, this.MAIN_DOC, {
      ...fullSettings,
      id: this.MAIN_DOC,
    });

    // Save initial leave policies
    for (const policy of DEFAULT_LEAVE_POLICIES) {
      await Store.setDocument('leaveTypes', policy.id, { ...policy, id: policy.id });
    }

    await AuditService.log(
      actorUid,
      actorEmail,
      'admin',
      'COMPANY_SETUP_COMPLETED',
      'companySettings',
      this.MAIN_DOC,
      `Company initialized: ${fullSettings.companyName}`
    );

    return fullSettings;
  }

  static async updateSettings(
    updates: Partial<CompanySettings>,
    actorEmail: string,
    actorUid: string
  ): Promise<void> {
    const existing = await this.getSettings();
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await Store.setDocument(this.SETTINGS_KEY, this.MAIN_DOC, {
      ...merged,
      id: this.MAIN_DOC,
    });

    await AuditService.log(
      actorUid,
      actorEmail,
      'admin',
      'SETTINGS_UPDATED',
      'companySettings',
      this.MAIN_DOC,
      `Updated settings: officeStart=${merged.officeStartTime}, grace=${merged.graceMinutes}`
    );
  }

  // --- Departments ---
  static async getDepartments(): Promise<Department[]> {
    const deps = await Store.getAllDocuments<Department>('departments');
    return deps.sort((a, b) => a.name.localeCompare(b.name));
  }

  static async createDepartment(
    name: string,
    description: string = '',
    actorEmail: string,
    actorUid: string
  ): Promise<Department> {
    const id = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const dep: Department = {
      id,
      name: name.trim(),
      nameLower: name.trim().toLowerCase(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await Store.setDocument('departments', id, dep);
    await AuditService.log(
      actorUid,
      actorEmail,
      'admin',
      'CREATED_DEPARTMENT',
      'department',
      id,
      `Created department ${name}`
    );
    return dep;
  }

  static async updateDepartment(
    id: string,
    updates: Partial<Department>,
    actorEmail: string,
    actorUid: string
  ): Promise<void> {
    await Store.updateDocument('departments', id, updates);
    await AuditService.log(
      actorUid,
      actorEmail,
      'admin',
      'UPDATED_DEPARTMENT',
      'department',
      id,
      `Updated department ${updates.name || id}`
    );
  }

  static async deleteDepartment(
    id: string,
    actorEmail: string,
    actorUid: string
  ): Promise<void> {
    await Store.deleteDocument('departments', id);
    await AuditService.log(
      actorUid,
      actorEmail,
      'admin',
      'DELETED_DEPARTMENT',
      'department',
      id,
      `Deleted department ${id}`
    );
  }

  // --- Designations ---
  static async getDesignations(): Promise<Designation[]> {
    const list = await Store.getAllDocuments<Designation>('designations');
    return list.sort((a, b) => a.title.localeCompare(b.title));
  }

  static async createDesignation(
    title: string,
    departmentId: string,
    description: string = '',
    actorEmail: string,
    actorUid: string
  ): Promise<Designation> {
    const id = `des_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const des: Designation = {
      id,
      title: title.trim(),
      departmentId,
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };
    await Store.setDocument('designations', id, des);
    await AuditService.log(
      actorUid,
      actorEmail,
      'admin',
      'CREATED_DESIGNATION',
      'designation',
      id,
      `Created designation ${title}`
    );
    return des;
  }

  static async deleteDesignation(
    id: string,
    actorEmail: string,
    actorUid: string
  ): Promise<void> {
    await Store.deleteDocument('designations', id);
    await AuditService.log(
      actorUid,
      actorEmail,
      'admin',
      'DELETED_DESIGNATION',
      'designation',
      id,
      `Deleted designation ${id}`
    );
  }

  // --- Holidays ---
  static async getHolidays(): Promise<Holiday[]> {
    const list = await Store.getAllDocuments<Holiday>('holidays');
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }

  static async addHoliday(
    date: string,
    name: string,
    description: string = '',
    actorEmail: string,
    actorUid: string
  ): Promise<Holiday> {
    const id = date;
    const holiday: Holiday = {
      id,
      date,
      name: name.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };
    await Store.setDocument('holidays', id, holiday);
    await AuditService.log(
      actorUid,
      actorEmail,
      'admin',
      'ADDED_HOLIDAY',
      'holiday',
      id,
      `Added holiday on ${date}: ${name}`
    );
    return holiday;
  }

  static async deleteHoliday(
    id: string,
    actorEmail: string,
    actorUid: string
  ): Promise<void> {
    await Store.deleteDocument('holidays', id);
    await AuditService.log(
      actorUid,
      actorEmail,
      'admin',
      'DELETED_HOLIDAY',
      'holiday',
      id,
      `Deleted holiday ${id}`
    );
  }

  // --- Leave Policies ---
  static async getLeavePolicies(): Promise<LeaveTypePolicy[]> {
    const list = await Store.getAllDocuments<LeaveTypePolicy>('leaveTypes');
    return list.length > 0 ? list : DEFAULT_LEAVE_POLICIES;
  }

  static async updateLeavePolicy(
    id: string,
    yearlyQuota: number,
    actorEmail: string,
    actorUid: string
  ): Promise<void> {
    await Store.updateDocument('leaveTypes', id, { yearlyQuota });
    await AuditService.log(
      actorUid,
      actorEmail,
      'admin',
      'UPDATED_LEAVE_POLICY',
      'leavePolicy',
      id,
      `Updated quota for ${id} to ${yearlyQuota}`
    );
  }
}
