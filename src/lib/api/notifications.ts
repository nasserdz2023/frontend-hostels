/**
 * Notifications API Client
 * عميل API الإشعارات
 */
import api from './client';

// ==================== Types ====================

export interface Notification {
    id: string;
    user_id: string;
    type: 'INFO' | 'WARNING' | 'ALERT' | 'ACTION' | 'SUCCESS';
    title: string;
    message: string;
    data: Record<string, any>;
    action_url?: string;
    is_read: boolean;
    read_at?: string;
    sender_type: string;
    created_at: string;
    expires_at?: string;
}

export interface NotificationListResponse {
    items: Notification[];
    total: number;
    unread_count: number;
}

export interface NotificationPreferences {
    id: string;
    user_id: string;
    in_app_enabled: boolean;
    email_enabled: boolean;
    telegram_enabled: boolean;
    telegram_chat_id?: string;
    telegram_username?: string;
    quiet_hours_enabled: boolean;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
    preferences_by_type: Record<string, string[]>;
    updated_at?: string;
}

export interface NotificationTemplate {
    id: string;
    code: string;
    name_ar: string;
    name_fr?: string;
    description?: string;
    type: string;
    title_template_ar: string;
    message_template_ar: string;
    default_channels: string[];
    is_active: boolean;
    created_at: string;
}

export interface BroadcastNotification {
    id: string;
    title_ar: string;
    title_fr?: string;
    message_ar: string;
    message_fr?: string;
    type: string;
    target_roles: string[];
    channels: string[];
    scheduled_at?: string;
    total_recipients: number;
    sent_count: number;
    failed_count: number;
    status: string;
    created_at: string;
    completed_at?: string;
}

export interface NotificationStats {
    total_notifications: number;
    unread_notifications: number;
    notifications_today: number;
    notifications_week: number;
    by_type: Record<string, number>;
    by_channel: Record<string, number>;
    delivery_success_rate: number;
}

// ==================== User API ====================

export const notificationsApi = {
    /**
     * Get user notifications
     */
    async getAll(params?: { skip?: number; limit?: number; unread_only?: boolean }): Promise<NotificationListResponse> {
        const searchParams = new URLSearchParams();
        if (params?.skip) searchParams.append('skip', String(params.skip));
        if (params?.limit) searchParams.append('limit', String(params.limit));
        if (params?.unread_only) searchParams.append('unread_only', 'true');

        const response = await api.get<NotificationListResponse>(`/notifications/?${searchParams.toString()}`);
        return response.data;
    },

    /**
     * Get unread count
     */
    async getUnreadCount(): Promise<number> {
        const response = await api.get<{ unread_count: number }>('/notifications/unread-count');
        return response.data.unread_count;
    },

    /**
     * Mark notification as read
     */
    async markAsRead(id: string): Promise<void> {
        await api.patch(`/notifications/${id}/read`);
    },

    /**
     * Mark all as read
     */
    async markAllAsRead(): Promise<number> {
        const response = await api.post<{ marked_count: number }>('/notifications/read-all');
        return response.data.marked_count;
    },

    /**
     * Delete notification
     */
    async delete(id: string): Promise<void> {
        await api.delete(`/notifications/${id}`);
    },

    /**
     * Get preferences
     */
    async getPreferences(): Promise<NotificationPreferences> {
        const response = await api.get<NotificationPreferences>('/notifications/preferences');
        return response.data;
    },

    /**
     * Update preferences
     */
    async updatePreferences(data: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
        const response = await api.put<NotificationPreferences>('/notifications/preferences', data);
        return response.data;
    },

    /**
     * Web Push Subscribe
     */
    async subscribeWebPush(subscription: PushSubscription): Promise<void> {
        const subJSON = subscription.toJSON();
        const data = {
            endpoint: subJSON.endpoint,
            p256dh: subJSON.keys?.p256dh,
            auth: subJSON.keys?.auth
        };
        await api.post('/notifications/web-push/subscribe', data);
    },

    /**
     * Web Push Unsubscribe
     */
    async unsubscribeWebPush(endpoint: string): Promise<void> {
        await api.delete(`/notifications/web-push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`);
    }
};

// ==================== Admin API ====================

export const notificationsAdminApi = {
    /**
     * Get stats
     */
    async getStats(): Promise<NotificationStats> {
        const response = await api.get<NotificationStats>('/admin/notifications/stats');
        return response.data;
    },

    /**
     * Get all notifications
     */
    async getAll(params?: { skip?: number; limit?: number }): Promise<{ items: Notification[]; total: number }> {
        const searchParams = new URLSearchParams();
        if (params?.skip) searchParams.append('skip', String(params.skip));
        if (params?.limit) searchParams.append('limit', String(params.limit));

        const response = await api.get(`/admin/notifications/?${searchParams.toString()}`);
        return response.data;
    },

    // Templates
    async getTemplates(): Promise<NotificationTemplate[]> {
        const response = await api.get<NotificationTemplate[]>('/admin/notifications/templates');
        return response.data;
    },

    async getTemplate(id: string): Promise<NotificationTemplate> {
        const response = await api.get<NotificationTemplate>(`/admin/notifications/templates/${id}`);
        return response.data;
    },

    async createTemplate(data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
        const response = await api.post<NotificationTemplate>('/admin/notifications/templates', data);
        return response.data;
    },

    async updateTemplate(id: string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
        const response = await api.put<NotificationTemplate>(`/admin/notifications/templates/${id}`, data);
        return response.data;
    },

    async deleteTemplate(id: string): Promise<void> {
        await api.delete(`/admin/notifications/templates/${id}`);
    },

    // Broadcasts
    async getBroadcasts(params?: { skip?: number; limit?: number }): Promise<BroadcastNotification[]> {
        const searchParams = new URLSearchParams();
        if (params?.skip) searchParams.append('skip', String(params.skip));
        if (params?.limit) searchParams.append('limit', String(params.limit));

        const response = await api.get<BroadcastNotification[]>(`/admin/notifications/broadcasts?${searchParams.toString()}`);
        return response.data;
    },

    async sendBroadcast(data: {
        title_ar: string;
        title_fr?: string;
        message_ar: string;
        message_fr?: string;
        type?: string;
        target_roles?: string[];
        target_user_ids?: string[];
        channels?: string[];
        scheduled_at?: string;
    }): Promise<BroadcastNotification> {
        const response = await api.post<BroadcastNotification>('/admin/notifications/broadcast', data);
        return response.data;
    },

    // Logs
    async getLogs(params?: { skip?: number; limit?: number; channel?: string; status?: string }): Promise<{ items: any[]; total: number }> {
        const searchParams = new URLSearchParams();
        if (params?.skip) searchParams.append('skip', String(params.skip));
        if (params?.limit) searchParams.append('limit', String(params.limit));
        if (params?.channel) searchParams.append('channel', params.channel);
        if (params?.status) searchParams.append('status', params.status);

        const response = await api.get(`/admin/notifications/logs?${searchParams.toString()}`);
        return response.data;
    }
};
