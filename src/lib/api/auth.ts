import api, { getErrorMessage } from './client';
import type { User } from '@/lib/stores/auth';

// Request types
export interface LoginRequest {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface TwoFactorVerifyRequest {
    temp_token: string;
    code: string;
}

// Response types
export interface LoginResponse {
    access_token: string;
    refresh_token?: string; // Optional (HttpOnly Cookie)
    user: User;
    requires_2fa?: boolean;
    temp_token?: string;
}

export interface RefreshResponse {
    access_token: string;
    refresh_token: string;
}

export interface TwoFactorSetupResponse {
    secret: string;
    uri: string;
}

export interface Session {
    id: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
    last_activity: string;
    is_active: boolean;
    is_current: boolean;
}

export type UserType = 'ACTIVIST' | 'PARENT' | 'ASSOCIATION';

export interface RegisterRequest {
    user_type: UserType;
    email: string;
    password: string;
    firstname_ar: string;
    lastname_ar: string;
    phone?: string;
    // Activist fields
    birth_date?: string;
    gender?: string;
    // Parent fields
    children_count?: number;
    // Association fields
    association_name?: string;
    registration_number?: string;
    activity_field?: string;
    institution_id?: string;
    // Common
    address?: string;
}

export interface RegisterResponse {
    message: string;
    user: {
        id: string;
        email: string;
        firstname_ar: string;
        lastname_ar: string;
        role: string;
    };
}

// Auth API functions
export const authApi = {
    /**
     * Login with email and password
     */
    async login(data: LoginRequest): Promise<LoginResponse> {
        const formData = new URLSearchParams();
        formData.append('username', data.email);
        formData.append('password', data.password);
        formData.append('grant_type', 'password');
        formData.append('scope', '');
        formData.append('client_id', '');
        formData.append('client_secret', '');

        const response = await api.post<LoginResponse>('/auth/login', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            params: {
                remember_me: data.rememberMe
            }
        });
        return response.data;
    },

    /**
     * Verify 2FA code (Login)
     */
    async verify2FA(data: TwoFactorVerifyRequest): Promise<LoginResponse> {
        const response = await api.post<LoginResponse>('/auth/login/verify-2fa', null, {
            params: {
                temp_token: data.temp_token,
                code: data.code
            }
        });
        return response.data;
    },

    /**
     * Refresh access token
     */
    async refreshToken(): Promise<RefreshResponse> {
        const response = await api.post<RefreshResponse>('/auth/refresh');
        return response.data;
    },

    /**
     * Logout current session
     */
    async logout(): Promise<void> {
        await api.post('/auth/logout');
    },

    /**
     * Get current user
     */
    async getCurrentUser(): Promise<User> {
        const response = await api.get<User>('/auth/me');
        return response.data;
    },

    /**
     * Update Profile
     */
    async updateProfile(data: Partial<User>): Promise<User> {
        const response = await api.put<User>('/auth/me', data);
        return response.data;
    },

    /**
     * Verify Email
     */
    async verifyEmail(token: string): Promise<{ message: string }> {
        const response = await api.get<{ message: string }>(`/auth/verify-email/${token}`);
        return response.data;
    },

    /**
     * Setup 2FA - Get Secret & QR
     */
    async setup2FA(): Promise<TwoFactorSetupResponse> {
        const response = await api.post<TwoFactorSetupResponse>('/auth/2fa/setup');
        return response.data;
    },

    /**
     * Enable 2FA - Verify & Activate
     */
    async enable2FA(code: string, secret: string): Promise<void> {
        await api.post('/auth/2fa/enable', null, {
            params: { code, secret }
        });
    },

    /**
     * Disable 2FA
     */
    async disable2FA(code: string): Promise<void> {
        await api.post('/auth/2fa/disable', null, {
            params: { code }
        });
    },

    /**
     * Get active sessions
     */
    async getSessions(): Promise<Session[]> {
        const response = await api.get<Session[]>('/auth/sessions');
        return response.data;
    },

    /**
     * Revoke a session
     */
    async revokeSession(sessionId: string): Promise<void> {
        await api.delete(`/auth/sessions/${sessionId}`);
    },

    /**
     * Revoke all other sessions
     */
    async revokeAllSessions(): Promise<void> {
        await api.delete('/auth/sessions');
    },

    /**
     * Request password reset
     */
    async requestPasswordReset(email: string): Promise<void> {
        await api.post('/auth/password/reset', { email });
    },

    /**
     * Confirm password reset
     */
    async confirmPasswordReset(token: string, password: string): Promise<void> {
        await api.post('/auth/password/confirm', { token, password });
    },
    /**
     * Generate 10 new Backup Codes
     */
    async generateBackupCodes(): Promise<{ codes: string[] }> {
        const response = await api.post<{ codes: string[] }>('/auth/2fa/backup-codes/generate');
        return response.data;
    },

    /**
     * Change password (authenticated user)
     */
    async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
        const response = await api.post<{ message: string }>('/auth/change-password', {
            old_password: oldPassword,
            new_password: newPassword,
        });
        return response.data;
    },

    /**
     * Public registration
     */
    async register(data: RegisterRequest): Promise<RegisterResponse> {
        const response = await api.post<RegisterResponse>('/auth/register', data);
        return response.data;
    },
};

export { getErrorMessage };
