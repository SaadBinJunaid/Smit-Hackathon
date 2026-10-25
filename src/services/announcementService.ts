import { Announcement, UserRole } from '../types';
import { Store } from './store';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';

export class AnnouncementService {
  private static COLLECTION = 'announcements';

  static async getAnnouncements(): Promise<Announcement[]> {
    const list = await Store.getAllDocuments<Announcement>(this.COLLECTION);
    return list
      .filter((a) => a.active)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async postAnnouncement(
    title: string,
    body: string,
    audience: 'all' | 'hr' | 'employees',
    postedBy: string,
    authorRole: UserRole,
    actorUid: string
  ): Promise<Announcement> {
    const id = `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ann: Announcement = {
      id,
      title: title.trim(),
      body: body.trim(),
      audience,
      postedBy,
      authorRole,
      createdAt: new Date().toISOString(),
      active: true,
    };

    await Store.setDocument(this.COLLECTION, id, ann);

    // Broadcast notification
    await NotificationService.send('all', 'system', `New Announcement: ${title}`, body.substring(0, 100));

    await AuditService.log(
      actorUid,
      postedBy,
      authorRole,
      'POSTED_ANNOUNCEMENT',
      'announcement',
      id,
      `Published announcement: ${title} (Audience: ${audience})`
    );

    return ann;
  }

  static async deleteAnnouncement(id: string, actorEmail: string, actorUid: string, actorRole: UserRole): Promise<void> {
    await Store.updateDocument(this.COLLECTION, id, { active: false });
    await AuditService.log(
      actorUid,
      actorEmail,
      authorRoleOrAdmin(actorRole),
      'DELETED_ANNOUNCEMENT',
      'announcement',
      id,
      `Removed announcement ${id}`
    );
  }
}

function authorRoleOrAdmin(role: UserRole): UserRole {
  return role;
}
