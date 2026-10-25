import { AuditLog, UserRole } from '../types';
import { Store } from './store';

export class AuditService {
  private static COLLECTION = 'auditLogs';

  static async log(
    actorUid: string,
    actorEmail: string,
    actorRole: UserRole,
    action: string,
    targetType: string,
    targetId: string,
    details: string
  ): Promise<void> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const entry: AuditLog = {
      id,
      actorUid,
      actorEmail,
      actorRole,
      action,
      targetType,
      targetId,
      details,
      timestamp: new Date().toISOString(),
    };

    await Store.setDocument(this.COLLECTION, id, entry);
  }

  static async getLogs(): Promise<AuditLog[]> {
    const logs = await Store.getAllDocuments<AuditLog>(this.COLLECTION);
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
