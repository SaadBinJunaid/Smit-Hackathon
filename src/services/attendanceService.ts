import {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceCorrectionRequest,
  CompanySettings,
} from '../types';
import { Store } from './store';
import { CompanyService } from './companyService';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';

export class AttendanceService {
  private static COLLECTION = 'attendance';
  private static CORRECTIONS_COLLECTION = 'attendanceCorrections';

  /**
   * Calculates Haversine distance in meters between two lat/lng coordinates
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  static async getAttendanceForDate(date: string): Promise<AttendanceRecord[]> {
    const all = await Store.getAllDocuments<AttendanceRecord>(this.COLLECTION);
    return all.filter((r) => r.date === date);
  }

  static async getAttendanceForEmployee(employeeId: string): Promise<AttendanceRecord[]> {
    const all = await Store.getAllDocuments<AttendanceRecord>(this.COLLECTION);
    return all
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  static async getTodayRecord(employeeId: string): Promise<AttendanceRecord | null> {
    const today = this.getTodayDateString();
    const id = `${employeeId}_${today}`;
    return await Store.getDocument<AttendanceRecord>(this.COLLECTION, id);
  }

  static async checkIn(
    employeeId: string,
    employeeName: string,
    departmentName: string = '',
    source: 'web' | 'camera' = 'web',
    coords?: { latitude: number; longitude: number }
  ): Promise<AttendanceRecord> {
    const today = this.getTodayDateString();
    const recordId = `${employeeId}_${today}`;

    const existing = await Store.getDocument<AttendanceRecord>(this.COLLECTION, recordId);
    if (existing && existing.checkInAt) {
      throw new Error(`Already checked in today (${today}) at ${new Date(existing.checkInAt).toLocaleTimeString()}. Multiple check-ins on the same day are rejected.`);
    }

    const settings = (await CompanyService.getSettings()) || {
      officeStartTime: '09:00',
      graceMinutes: 15,
      halfDayHours: 5,
      geofenceRadiusMeters: 150,
      officeLatitude: 24.8607,
      officeLongitude: 67.0011,
    };

    const now = new Date();
    const nowIso = now.toISOString();

    // Check Geofence if coords provided
    let locationData: AttendanceRecord['location'] | undefined;
    if (coords && settings.officeLatitude && settings.officeLongitude) {
      const distance = this.calculateDistance(
        coords.latitude,
        coords.longitude,
        settings.officeLatitude,
        settings.officeLongitude
      );
      locationData = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        distanceMeters: Math.round(distance),
        withinGeofence: distance <= (settings.geofenceRadiusMeters || 150),
      };
    }

    // Determine late status
    const [startH, startM] = settings.officeStartTime.split(':').map(Number);
    const officeStart = new Date(now);
    officeStart.setHours(startH, startM, 0, 0);

    const graceThreshold = new Date(officeStart.getTime() + (settings.graceMinutes || 15) * 60000);
    const isLate = now.getTime() > graceThreshold.getTime();
    const lateMinutes = isLate ? Math.max(0, Math.round((now.getTime() - officeStart.getTime()) / 60000)) : 0;

    const status: AttendanceStatus = isLate ? 'late' : 'present';

    const record: AttendanceRecord = {
      id: recordId,
      employeeId,
      employeeName,
      departmentName,
      date: today,
      checkInAt: nowIso,
      checkOutAt: null,
      workedMinutes: 0,
      status,
      lateMinutes,
      source,
      location: locationData,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await Store.setDocument(this.COLLECTION, recordId, record);

    await AuditService.log(
      employeeId,
      employeeName,
      'employee',
      'ATTENDANCE_CHECKIN',
      'attendance',
      recordId,
      `Check-in recorded at ${now.toLocaleTimeString()} (${status})`
    );

    return record;
  }

  static async checkOut(employeeId: string, employeeName: string): Promise<AttendanceRecord> {
    const today = this.getTodayDateString();
    const recordId = `${employeeId}_${today}`;

    const existing = await Store.getDocument<AttendanceRecord>(this.COLLECTION, recordId);
    if (!existing || !existing.checkInAt) {
      throw new Error('You must check in first before checking out.');
    }
    if (existing.checkOutAt) {
      throw new Error(`Already checked out today at ${new Date(existing.checkOutAt).toLocaleTimeString()}.`);
    }

    const settings = (await CompanyService.getSettings()) || { halfDayHours: 5 };
    const now = new Date();
    const nowIso = now.toISOString();

    const inTime = new Date(existing.checkInAt).getTime();
    const outTime = now.getTime();
    const workedMinutes = Math.max(0, Math.round((outTime - inTime) / 60000));
    const workedHours = workedMinutes / 60;

    let finalStatus = existing.status;
    if (workedHours < (settings.halfDayHours || 5)) {
      finalStatus = 'half_day';
    }

    const updated: AttendanceRecord = {
      ...existing,
      checkOutAt: nowIso,
      workedMinutes,
      status: finalStatus,
      updatedAt: nowIso,
    };

    await Store.setDocument(this.COLLECTION, recordId, updated);

    await AuditService.log(
      employeeId,
      employeeName,
      'employee',
      'ATTENDANCE_CHECKOUT',
      'attendance',
      recordId,
      `Check-out recorded at ${now.toLocaleTimeString()}. Worked: ${workedHours.toFixed(1)} hrs`
    );

    return updated;
  }

  // --- Attendance Corrections ---
  static async getCorrectionRequests(): Promise<AttendanceCorrectionRequest[]> {
    const list = await Store.getAllDocuments<AttendanceCorrectionRequest>(this.CORRECTIONS_COLLECTION);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async requestCorrection(
    employeeId: string,
    employeeName: string,
    date: string,
    proposedStatus: AttendanceStatus,
    reason: string,
    proposedCheckIn?: string,
    proposedCheckOut?: string
  ): Promise<AttendanceCorrectionRequest> {
    const id = `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const req: AttendanceCorrectionRequest = {
      id,
      employeeId,
      employeeName,
      attendanceId: `${employeeId}_${date}`,
      date,
      proposedCheckIn,
      proposedCheckOut,
      proposedStatus,
      reason: reason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await Store.setDocument(this.CORRECTIONS_COLLECTION, id, req);

    await AuditService.log(
      employeeId,
      employeeName,
      'employee',
      'SUBMITTED_ATTENDANCE_CORRECTION',
      'attendanceCorrection',
      id,
      `Requested correction for ${date}: ${reason}`
    );

    return req;
  }

  static async reviewCorrection(
    correctionId: string,
    decision: 'approved' | 'rejected',
    reviewComment: string,
    reviewerEmail: string,
    reviewerUid: string
  ): Promise<void> {
    const req = await Store.getDocument<AttendanceCorrectionRequest>(
      this.CORRECTIONS_COLLECTION,
      correctionId
    );
    if (!req) throw new Error('Correction request not found.');

    const now = new Date().toISOString();
    await Store.updateDocument(this.CORRECTIONS_COLLECTION, correctionId, {
      status: decision,
      reviewedBy: reviewerEmail,
      reviewComment: reviewComment.trim(),
      updatedAt: now,
    });

    if (decision === 'approved') {
      const attendanceId = req.attendanceId;
      const existing = (await Store.getDocument<AttendanceRecord>(this.COLLECTION, attendanceId)) || {
        id: attendanceId,
        employeeId: req.employeeId,
        employeeName: req.employeeName,
        date: req.date,
        checkInAt: req.proposedCheckIn || null,
        checkOutAt: req.proposedCheckOut || null,
        workedMinutes: 480,
        status: req.proposedStatus,
        lateMinutes: 0,
        source: 'correction',
        createdAt: now,
        updatedAt: now,
      };

      await Store.setDocument(this.COLLECTION, attendanceId, {
        ...existing,
        status: req.proposedStatus,
        checkInAt: req.proposedCheckIn || existing.checkInAt,
        checkOutAt: req.proposedCheckOut || existing.checkOutAt,
        source: 'correction',
        correctionNote: `Approved by HR: ${reviewComment}`,
        updatedAt: now,
      });
    }

    // Send notification to employee
    await NotificationService.send(
      req.employeeId,
      'attendance',
      `Attendance Correction ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
      `Your request for ${req.date} was ${decision}. HR note: ${reviewComment || 'No comment provided.'}`
    );

    await AuditService.log(
      reviewerUid,
      reviewerEmail,
      'hr',
      `ATTENDANCE_CORRECTION_${decision.toUpperCase()}`,
      'attendanceCorrection',
      correctionId,
      `Correction for ${req.employeeName} (${req.date}) was ${decision}`
    );
  }
}
