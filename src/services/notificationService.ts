import { AppNotification } from '../types';
import { Store } from './store';

export class NotificationService {
  private static COLLECTION = 'notifications';

  static async send(
    recipientUid: string,
    type: AppNotification['type'],
    title: string,
    body: string
  ): Promise<void> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const item: AppNotification = {
      id,
      recipientUid,
      type,
      title,
      body,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await Store.setDocument(this.COLLECTION, id, item);
  }

  static async getNotificationsForUser(recipientUid: string): Promise<AppNotification[]> {
    const all = await Store.getAllDocuments<AppNotification>(this.COLLECTION);
    return all
      .filter((n) => n.recipientUid === recipientUid || n.recipientUid === 'all')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async markAsRead(notificationId: string): Promise<void> {
    await Store.updateDocument(this.COLLECTION, notificationId, { read: true });
  }

  static async markAllAsRead(recipientUid: string): Promise<void> {
    const list = await this.getNotificationsForUser(recipientUid);
    for (const item of list) {
      if (!item.read) {
        await this.markAsRead(item.id);
      }
    }
  }
}
