import api, { PaginatedResponse } from './client';

// ==================== Types ====================

export interface User {
    id: string;
    email: string;
    firstname_ar?: string;
    lastname_ar?: string;
    firstname_fr?: string;
    lastname_fr?: string;
    firstname_en?: string;
    lastname_en?: string;
    role: UserRole;
    role_id?: string; // RBAC Role ID
    rbac_role?: {
        id: string;
        name: string;
        name_ar?: string;
        name_en?: string;
        name_fr?: string;
    }; // RBAC Role Details
    is_active: boolean;
    is_verified: boolean;
    is_2fa_enabled: boolean;
    language: string;
    theme: string;
    created_at: string;
    last_login?: string;
    avatar?: string;
    employee?: LinkedEmployee;
    gemini_api_key?: string;
}

export type UserRole =
    | 'DEV_ADMIN'
    | 'DIRECTOR'
    | 'DEPT_HEAD'
    | 'OFFICE_HEAD'
    | 'EMPLOYEE'
    | 'ACTIVIST'
    | 'PARENT'
    | 'ASSOCIATION';

export interface UserFilters {
    role?: UserRole;
    is_active?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}

export interface CreateUserDTO {
    email: string;
    password: string;
    firstname_ar?: string;
    lastname_ar?: string;
    firstname_fr?: string;
    lastname_fr?: string;
    firstname_en?: string;
    lastname_en?: string;
    role: UserRole;
    language?: string;
    theme?: string;
}

export interface UpdateUserDTO {
    firstname_ar?: string;
    lastname_ar?: string;
    firstname_fr?: string;
    lastname_fr?: string;
    firstname_en?: string;
    lastname_en?: string;
    role?: UserRole;
    is_active?: boolean;
    language?: string;
    theme?: string;
}

export interface UserStats {
    total_users: number;
    active_users: number;
    inactive_users: number;
    verified_users: number;
    users_with_2fa: number;
    new_users_7d: number;
    new_users_30d: number;
    users_by_role: Record<string, number>;
}

export interface LinkedEmployee {
    id: string;
    firstname_ar: string;
    lastname_ar: string;
    firstname_fr?: string;
    lastname_fr?: string;
    email?: string;
    employee_number?: string;
    grade_text?: string;
    position_text?: string;
    linked_to?: {
        id: string;
        name: string;
    };
}

export interface Session {
    id: string;
    user_id: string;
    ip_address?: string;
    user_agent?: string;
    is_active: boolean;
    created_at: string;
    last_activity?: string;
    is_current?: boolean;
    user_email?: string;
    user_name?: string;
}

export interface SessionStats {
    active_sessions: number;
    mobile_sessions: number;
    desktop_sessions: number;
    sessions_today: number;
    unique_active_users: number;
}

export interface Device {
    id: string;
    device_fingerprint: string;
    device_name?: string;
    device_type?: string;
    browser?: string;
    os?: string;
    is_trusted: boolean;
    is_blocked: boolean;
    first_seen: string;
    last_seen: string;
    first_ip?: string;
}

export interface SecurityAlert {
    id: string;
    user_id?: string;
    alert_type: string;
    severity: string;
    title_ar?: string;
    title_en?: string;
    description?: string;
    ip_address?: string;
    is_read: boolean;
    is_resolved: boolean;
    created_at: string;
    resolved_at?: string;
}

export interface Permission {
    id: string;
    code: string;
    name_ar: string;
    name_en?: string;
    group: string;
    description_ar?: string;
    is_sensitive: boolean;
    display_order: number;
}

export interface PermissionGroup {
    id: string;
    code: string;
    name_ar: string;
    name_en?: string;
    icon?: string;
    display_order: number;
}

export interface RolePermissions {
    role: string;
    role_name_ar: string;
    role_name_en?: string;
    role_name_fr?: string;
    description_ar?: string;
    description_en?: string;
    description_fr?: string;
    permissions: string[];
    users_count: number;
}

// ==================== Users API ====================

export const usersApi = {
    /**
     * Get paginated list of users
     */
    async getAll(filters?: UserFilters): Promise<User[]> {
        const params = new URLSearchParams();
        if (filters?.role) params.append('role', filters.role);
        if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
        if (filters?.search) params.append('search', filters.search);
        if (filters?.page) params.append('skip', String((filters.page - 1) * (filters.limit || 20)));
        if (filters?.limit) params.append('limit', String(filters.limit));

        const response = await api.get<User[]>(`/users/?${params.toString()}`);
        return response.data;
    },

    /**
     * Get pending users (Admin)
     */
    async getPending(): Promise<User[]> {
        const response = await api.get<User[]>('/users/pending');
        return response.data;
    },

    /**
     * Approve user
     */
    async approve(id: string): Promise<{ message: string }> {
        const response = await api.post<{ message: string }>(`/users/${id}/approve`);
        return response.data;
    },

    /**
     * Reject user
     */
    async reject(id: string): Promise<{ message: string }> {
        const response = await api.post<{ message: string }>(`/users/${id}/reject`);
        return response.data;
    },

    /**
     * Get user statistics
     */
    async getStats(): Promise<UserStats> {
        const response = await api.get<UserStats>('/users/stats');
        return response.data;
    },

    /**
     * Get user by ID
     */
    async getById(id: string): Promise<User> {
        const response = await api.get<User>(`/users/${id}`);
        return response.data;
    },

    /**
     * Create new user
     */
    async create(data: CreateUserDTO): Promise<User> {
        const response = await api.post<User>('/users/', data);
        return response.data;
    },

    /**
     * Update user
     */
    async update(id: string, data: UpdateUserDTO): Promise<User> {
        const response = await api.patch<User>(`/users/${id}`, data);
        return response.data;
    },

    /**
     * Delete (deactivate) user
     */
    async delete(id: string): Promise<void> {
        await api.delete(`/users/${id}`);
    },

    /**
     * Toggle user status
     */
    async toggleStatus(id: string): Promise<User> {
        const response = await api.post<User>(`/users/${id}/toggle-status`);
        return response.data;
    },

    /**
     * Reset user password (admin)
     */
    async resetPassword(id: string, newPassword: string): Promise<void> {
        await api.post(`/users/${id}/reset-password`, { new_password: newPassword });
    },

    /**
     * Send reset password link to user email
     */
    async sendResetLink(id: string): Promise<void> {
        await api.post(`/users/${id}/reset-password-email`);
    },

    /**
     * Disable 2FA for user (admin)
     */
    async disable2FA(id: string): Promise<void> {
        await api.post(`/users/${id}/disable-2fa`);
    },

    /**
     * Link user to employee
     */
    async linkEmployee(userId: string, employeeId: string): Promise<{ message: string }> {
        const response = await api.post<{ message: string }>(`/users/${userId}/link-employee/${employeeId}`);
        return response.data;
    },

    /**
     * Unlink user from employee
     */
    async unlinkEmployee(userId: string): Promise<{ message: string }> {
        const response = await api.delete<{ message: string }>(`/users/${userId}/unlink-employee`);
        return response.data;
    },

    /**
     * Get linked employee
     */
    async getLinkedEmployee(userId: string): Promise<LinkedEmployee | null> {
        const response = await api.get<LinkedEmployee | null>(`/users/${userId}/employee`);
        return response.data;
    },

    /**
     * Get available (unlinked) employees
     */
    async getAvailableEmployees(search?: string): Promise<LinkedEmployee[]> {
        const params = search ? `?search=${encodeURIComponent(search)}` : '';
        const response = await api.get<LinkedEmployee[]>(`/users/available-employees/list${params}`);
        return response.data;
    },

    /**
     * Get RBAC Roles List
     */
    async getRolesList(): Promise<any[]> {
        const response = await api.get<any[]>('/users/roles/list');
        return response.data;
    },
};

// ==================== Permissions API ====================

export const permissionsApi = {
    /**
     * Get all permissions
     */
    async getAll(): Promise<Permission[]> {
        const response = await api.get<Permission[]>('/permissions/');
        return response.data;
    },

    /**
     * Get permission groups
     */
    async getGroups(): Promise<PermissionGroup[]> {
        const response = await api.get<PermissionGroup[]>('/permissions/groups');
        return response.data;
    },

    /**
     * Get permissions by group
     */
    async getByGroup(group: string): Promise<Permission[]> {
        const response = await api.get<Permission[]>(`/permissions/by-group/${group}`);
        return response.data;
    },

    /**
     * Get all roles with permissions
     */
    async getRoles(): Promise<RolePermissions[]> {
        const response = await api.get<RolePermissions[]>('/permissions/roles');
        return response.data;
    },

    /**
     * Get permissions for a role
     */
    async getRolePermissions(role: string): Promise<RolePermissions> {
        const response = await api.get<RolePermissions>(`/permissions/roles/${role}`);
        return response.data;
    },

    /**
     * Update role permissions
     */
    async updateRolePermissions(role: string, permissionCodes: string[]): Promise<void> {
        await api.put(`/permissions/roles/${role}`, { permission_codes: permissionCodes });
    },

    /**
     * Get effective permissions for user
     */
    async getUserPermissions(userId: string): Promise<{ permissions: string[]; overrides_count: number }> {
        const response = await api.get<{ user_id: string; role: string; permissions: string[]; overrides_count: number }>(
            `/permissions/users/${userId}/permissions`
        );
        return { permissions: response.data.permissions, overrides_count: response.data.overrides_count };
    },

    /**
     * Add permission override for user
     */
    async addUserOverride(userId: string, permissionCode: string, granted: boolean, reason?: string): Promise<void> {
        await api.post(`/permissions/users/${userId}/permissions`, {
            permission_code: permissionCode,
            granted,
            reason,
        });
    },

    /**
     * Remove permission override for user
     */
    async removeUserOverride(userId: string, permissionCode: string): Promise<void> {
        await api.delete(`/permissions/users/${userId}/permissions/${permissionCode}`);
    },

    /**
     * Seed default permissions
     */
    async seed(): Promise<{ message: string }> {
        const response = await api.post<{ message: string }>('/permissions/seed');
        return response.data;
    },
};

// ==================== Sessions API ====================

export const sessionsApi = {
    /**
     * Get active sessions (admin)
     */
    async getActive(skip = 0, limit = 50): Promise<Session[]> {
        const response = await api.get<Session[]>(`/sessions/active?skip=${skip}&limit=${limit}`);
        return response.data;
    },

    /**
     * Get session stats
     */
    async getStats(): Promise<SessionStats> {
        const response = await api.get<SessionStats>('/sessions/stats');
        return response.data;
    },

    /**
     * Get session analytics
     */
    async getAnalytics(days = 7): Promise<{ daily_sessions: any[]; hourly_distribution: any[] }> {
        const response = await api.get<{ daily_sessions: any[]; hourly_distribution: any[]; period_days: number }>(
            `/sessions/analytics?days=${days}`
        );
        return response.data;
    },

    /**
     * Revoke session
     */
    async revoke(sessionId: string): Promise<void> {
        await api.delete(`/sessions/${sessionId}`);
    },

    /**
     * Get user sessions
     */
    async getUserSessions(userId: string, includeInactive = false): Promise<Session[]> {
        const response = await api.get<Session[]>(
            `/sessions/users/${userId}?include_inactive=${includeInactive}`
        );
        return response.data;
    },

    /**
     * Revoke all user sessions
     */
    async revokeAllUserSessions(userId: string): Promise<{ message: string }> {
        const response = await api.post<{ message: string }>(`/sessions/users/${userId}/revoke-all`);
        return response.data;
    },

    /**
     * Get user devices
     */
    async getUserDevices(userId: string): Promise<Device[]> {
        const response = await api.get<Device[]>(`/sessions/users/${userId}/devices`);
        return response.data;
    },

    /**
     * Trust device
     */
    async trustDevice(deviceId: string): Promise<void> {
        await api.post(`/sessions/devices/${deviceId}/trust`);
    },

    /**
     * Block device
     */
    async blockDevice(deviceId: string): Promise<void> {
        await api.post(`/sessions/devices/${deviceId}/block`);
    },

    /**
     * Get security alerts
     */
    async getAlerts(isResolved?: boolean, severity?: string): Promise<SecurityAlert[]> {
        const params = new URLSearchParams();
        if (isResolved !== undefined) params.append('is_resolved', String(isResolved));
        if (severity) params.append('severity', severity);

        const response = await api.get<SecurityAlert[]>(`/sessions/security/alerts?${params.toString()}`);
        return response.data;
    },

    /**
     * Get unresolved alerts count
     */
    async getAlertsCount(): Promise<number> {
        const response = await api.get<{ count: number }>('/sessions/security/alerts/count');
        return response.data.count;
    },

    /**
     * Resolve alert
     */
    async resolveAlert(alertId: string, note?: string): Promise<void> {
        await api.post(`/sessions/security/alerts/${alertId}/resolve`, { resolution_note: note });
    },

    /**
     * Mark alert as read
     */
    async markAlertRead(alertId: string): Promise<void> {
        await api.post(`/sessions/security/alerts/${alertId}/read`);
    },
};

// ==================== Constants ====================

export const USER_ROLE_LABELS: Record<UserRole, { ar: string; en: string; fr: string }> = {
    DEV_ADMIN: { ar: 'مدير النظام', en: 'System Admin', fr: 'Admin Système' },
    DIRECTOR: { ar: 'المدير العام', en: 'Director', fr: 'Directeur' },
    DEPT_HEAD: { ar: 'رئيس مصلحة', en: 'Department Head', fr: 'Chef de Service' },
    OFFICE_HEAD: { ar: 'رئيس مكتب', en: 'Office Head', fr: 'Chef de Bureau' },
    EMPLOYEE: { ar: 'موظف', en: 'Employee', fr: 'Employé' },
    ACTIVIST: { ar: 'ناشط', en: 'Activist', fr: 'Activiste' },
    PARENT: { ar: 'ولي أمر', en: 'Parent', fr: 'Parent' },
    ASSOCIATION: { ar: 'جمعية', en: 'Association', fr: 'Association' },
};

export const USER_ROLE_COLORS: Record<UserRole, string> = {
    DEV_ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    DIRECTOR: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    DEPT_HEAD: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    OFFICE_HEAD: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    EMPLOYEE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    ACTIVIST: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    PARENT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    ASSOCIATION: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
};

export const ALERT_SEVERITY_COLORS: Record<string, string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
};

export const ALERT_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
    new_device: { ar: 'جهاز جديد', en: 'New Device' },
    new_location: { ar: 'موقع جديد', en: 'New Location' },
    failed_attempts: { ar: 'محاولات فاشلة', en: 'Failed Attempts' },
    concurrent_sessions: { ar: 'جلسات متزامنة', en: 'Concurrent Sessions' },
    unusual_activity: { ar: 'نشاط غير معتاد', en: 'Unusual Activity' },
    password_expired: { ar: 'انتهاء كلمة المرور', en: 'Password Expired' },
    '2fa_disabled': { ar: 'تعطيل 2FA', en: '2FA Disabled' },
};
