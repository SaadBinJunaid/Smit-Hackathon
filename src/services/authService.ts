import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updatePassword as fbUpdatePassword,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase';
import { Store } from './store';
import { UserAccount, UserRole } from '../types';
import { CompanyService } from './companyService';
import { AuditService } from './auditService';

export class AuthService {
  private static USERS_COLLECTION = 'users';

  static async getUsers(): Promise<UserAccount[]> {
    return await Store.getAllDocuments<UserAccount>(this.USERS_COLLECTION);
  }

  static async getUser(uid: string): Promise<UserAccount | null> {
    return await Store.getDocument<UserAccount>(this.USERS_COLLECTION, uid);
  }

  static async createFirstAdmin(
    email: string,
    pass: string,
    companyName: string,
    officeStart: string = '09:00',
    graceMinutes: number = 15,
    halfDayHours: number = 5
  ): Promise<UserAccount> {
    const isSetup = await CompanyService.isSetupComplete();
    if (isSetup) {
      throw new Error('Initial setup has already been completed. Contact the system administrator.');
    }

    let uid = `admin_${Date.now()}`;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      uid = cred.user.uid;
    } catch (err: any) {
      console.warn('Firebase Auth createUser fallback (using local persistent auth):', err.message);
    }

    const adminUser: UserAccount = {
      uid,
      email,
      role: 'admin',
      displayName: 'System Admin',
      active: true,
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    };

    await Store.setDocument(this.USERS_COLLECTION, uid, adminUser);

    // Complete company setup
    await CompanyService.completeFirstRunSetup(
      {
        companyName,
        officeStartTime: officeStart,
        graceMinutes,
        halfDayHours,
      },
      email,
      uid
    );

    localStorage.setItem('hcm_current_user', JSON.stringify(adminUser));
    return adminUser;
  }

  static async createHRAccount(
    email: string,
    tempPass: string,
    displayName: string,
    actorEmail: string,
    actorUid: string
  ): Promise<UserAccount> {
    let uid = `hr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, tempPass);
      uid = cred.user.uid;
    } catch (err: any) {
      console.warn('Firebase Auth createUser HR fallback:', err.message);
    }

    const hrUser: UserAccount = {
      uid,
      email,
      role: 'hr',
      displayName: displayName.trim() || 'HR Manager',
      active: true,
      mustChangePassword: true,
      temporaryPassword: tempPass,
      createdAt: new Date().toISOString(),
    };

    await Store.setDocument(this.USERS_COLLECTION, uid, hrUser);

    await AuditService.log(
      actorUid,
      actorEmail,
      'admin',
      'CREATED_HR_ACCOUNT',
      'user',
      uid,
      `Created HR account for ${email}`
    );

    return hrUser;
  }

  static async createEmployeeAccount(
    email: string,
    tempPass: string,
    displayName: string,
    employeeId: string,
    actorEmail: string,
    actorUid: string
  ): Promise<UserAccount> {
    let uid = `emp_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, tempPass);
      uid = cred.user.uid;
    } catch (err: any) {
      console.warn('Firebase Auth createUser Employee fallback:', err.message);
    }

    const empUser: UserAccount = {
      uid,
      email,
      role: 'employee',
      employeeId,
      displayName,
      active: true,
      mustChangePassword: true,
      temporaryPassword: tempPass,
      createdAt: new Date().toISOString(),
    };

    await Store.setDocument(this.USERS_COLLECTION, uid, empUser);

    await AuditService.log(
      actorUid,
      actorEmail,
      'hr',
      'CREATED_EMPLOYEE_AUTH',
      'user',
      uid,
      `Created login account for employee ${displayName} (${email})`
    );

    return empUser;
  }

  static async login(email: string, pass: string): Promise<UserAccount> {
    let fbUid: string | null = null;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      fbUid = cred.user.uid;
    } catch (err: any) {
      console.warn('Firebase Auth sign in error or offline, checking registered accounts:', err.message);
    }

    const users = await this.getUsers();
    let matchedUser = users.find((u) => (fbUid && u.uid === fbUid) || u.email.toLowerCase() === email.toLowerCase());

    if (!matchedUser) {
      // Check if user was registered directly or check if first run
      const isSetup = await CompanyService.isSetupComplete();
      if (!isSetup) {
        throw new Error('Company has not been set up yet. Please complete initial setup first.');
      }
      throw new Error('Invalid email or password. Please verify your credentials.');
    }

    if (!matchedUser.active) {
      throw new Error('This account has been deactivated. Please contact HR or the Administrator.');
    }

    localStorage.setItem('hcm_current_user', JSON.stringify(matchedUser));
    return matchedUser;
  }

  static async changePassword(newPass: string, user: UserAccount): Promise<void> {
    if (auth.currentUser) {
      try {
        await fbUpdatePassword(auth.currentUser, newPass);
      } catch (e: any) {
        console.warn('Firebase update password error:', e.message);
      }
    }

    const updated: UserAccount = {
      ...user,
      mustChangePassword: false,
      temporaryPassword: undefined,
    };

    await Store.setDocument(this.USERS_COLLECTION, user.uid, updated);
    localStorage.setItem('hcm_current_user', JSON.stringify(updated));

    await AuditService.log(
      user.uid,
      user.email,
      user.role,
      'CHANGED_PASSWORD',
      'user',
      user.uid,
      'User changed account password'
    );
  }

  static getCurrentUser(): UserAccount | null {
    try {
      const raw = localStorage.getItem('hcm_current_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  static async toggleUserStatus(uid: string, active: boolean, actorEmail: string, actorUid: string): Promise<void> {
    await Store.updateDocument(this.USERS_COLLECTION, uid, { active });
    await AuditService.log(
      actorUid,
      actorEmail,
      'admin',
      'TOGGLED_USER_STATUS',
      'user',
      uid,
      `User ${uid} status changed to ${active ? 'active' : 'inactive'}`
    );
  }

  static async logout(): Promise<void> {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Logout error:', e);
    }
    localStorage.removeItem('hcm_current_user');
  }
}
