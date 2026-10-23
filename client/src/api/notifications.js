import { mockDb, delay } from './client';

export const notificationsApi = {
  async getNotifications() {
    await delay(100);
    const notifs = mockDb.getNotifications();
    const currentUser = mockDb.getCurrentUser();

    // Filter by role or show all for admin/demo
    const filtered = notifs.filter((n) => {
      if (!currentUser?.role) return true;
      if (n.role === currentUser.role || n.role === 'ALL') return true;
      return false;
    });

    return {
      success: true,
      data: filtered,
      unreadCount: filtered.filter((n) => !n.read).length,
    };
  },

  async markAsRead(notificationId) {
    await delay(50);
    const notifs = mockDb.getNotifications();
    const updated = notifs.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    mockDb.saveNotifications(updated);
    return { success: true };
  },

  async markAllAsRead() {
    await delay(50);
    const notifs = mockDb.getNotifications();
    const updated = notifs.map((n) => ({ ...n, read: true }));
    mockDb.saveNotifications(updated);
    return { success: true };
  },

  async addNotification(payload) {
    mockDb.addNotification(payload);
    return { success: true };
  },
};
