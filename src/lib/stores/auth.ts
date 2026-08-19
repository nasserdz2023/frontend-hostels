import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types
export interface User {
    id: string;
    email: string;
    firstname_ar?: string;
    lastname_ar?: string;
    firstname_fr?: string;
    lastname_fr?: string;
    role: UserRole;
    department?: Department;
    institution_id?: string;
    institution_name?: string;
    avatar_url?: string;
    is_2fa_enabled: boolean;
    permissions: Record<string, string[]>;
    gemini_api_key?: string;
}

export type UserRole =
    | 'dev_admin'
    | 'director'
    | 'dept_head'
    | 'office_head'
    | 'employee'
    | 'activist'
    | 'parent'
    | 'association';

export type Department =
    | 'youth'
    | 'sports'
    | 'investment'
    | 'training';

interface AuthState {
    // State
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    requires2FA: boolean;
    tempToken: string | null; // For 2FA flow
    _hasHydrated: boolean; // Track hydration state

    // Actions
    login: (user: User, accessToken: string, refreshToken?: string) => void;
    logout: () => void;
    setUser: (user: User) => void;
    setTokens: (accessToken: string, refreshToken: string) => void;
    setLoading: (loading: boolean) => void;
    set2FARequired: (tempToken: string) => void;
    complete2FA: (user: User, accessToken: string, refreshToken?: string) => void;
    hasPermission: (module: string, action: string) => boolean;
    setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            // Initial state
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            requires2FA: false,
            tempToken: null,
            _hasHydrated: false,

            setHasHydrated: (state) => {
                set({ _hasHydrated: state });
            },

            // Login action
            login: (user, accessToken, refreshToken) => {
                set({
                    user,
                    accessToken,
                    refreshToken: refreshToken || null,
                    isAuthenticated: true,
                    isLoading: false,
                    requires2FA: false,
                    tempToken: null,
                });
            },

            // Logout action
            logout: () => {
                // Clear persisted storage explicitly
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('djs-auth-storage');
                }
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                    isLoading: false,
                    requires2FA: false,
                    tempToken: null,
                });
            },

            // Update user
            setUser: (user) => {
                set({ user });
            },

            // Update tokens
            setTokens: (accessToken, refreshToken) => {
                set({ accessToken, refreshToken });
            },

            // Set loading state
            setLoading: (isLoading) => {
                set({ isLoading });
            },

            // Set 2FA required (after password verified)
            set2FARequired: (tempToken) => {
                set({
                    requires2FA: true,
                    tempToken,
                    isLoading: false,
                });
            },

            // Complete 2FA verification
            complete2FA: (user, accessToken, refreshToken) => {
                set({
                    user,
                    accessToken,
                    refreshToken: refreshToken || null,
                    isAuthenticated: true,
                    requires2FA: false,
                    tempToken: null,
                    isLoading: false,
                });
            },

            // Check permission
            hasPermission: (module, action) => {
                const { user } = get();
                if (!user) return false;

                // Dev admin has all permissions (handle both uppercase and lowercase)
                if (user.role.toLowerCase() === 'dev_admin') return true;

                // Guard against undefined permissions
                if (!user.permissions) return false;

                const modulePermissions = user.permissions[module] || [];
                return modulePermissions.includes('*') || modulePermissions.includes(action);
            },
        }),
        {
            name: 'djs-auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                // Do NOT persist tokens (Security)
                isAuthenticated: state.isAuthenticated,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);

// Helper to get display name
export function getDisplayName(user: User | null, locale: string = 'ar'): string {
    if (!user) return '';

    if (locale === 'ar') {
        return [user.firstname_ar, user.lastname_ar].filter(Boolean).join(' ') || user.email;
    }

    return [user.firstname_fr, user.lastname_fr].filter(Boolean).join(' ') || user.email;
}

// Role display names
export const ROLE_NAMES: Record<UserRole, { ar: string; fr: string; en: string }> = {
    dev_admin: { ar: 'مدير النظام', fr: 'Admin Système', en: 'System Admin' },
    director: { ar: 'المدير العام', fr: 'Directeur Général', en: 'Director' },
    dept_head: { ar: 'رئيس مصلحة', fr: 'Chef de Service', en: 'Department Head' },
    office_head: { ar: 'رئيس مكتب', fr: 'Chef de Bureau', en: 'Office Head' },
    employee: { ar: 'موظف', fr: 'Employé', en: 'Employee' },
    activist: { ar: 'ناشط', fr: 'Activiste', en: 'Activist' },
    parent: { ar: 'ولي أمر', fr: 'Parent', en: 'Parent' },
    association: { ar: 'جمعية', fr: 'Association', en: 'Association' },
};

// Department display names
export const DEPARTMENT_NAMES: Record<Department, { ar: string; fr: string; en: string }> = {
    youth: { ar: 'مصلحة الشباب', fr: 'Service Jeunesse', en: 'Youth Department' },
    sports: { ar: 'مصلحة الرياضة', fr: 'Service Sports', en: 'Sports Department' },
    investment: { ar: 'مصلحة الاستثمارات', fr: 'Service Investissements', en: 'Investment Department' },
    training: { ar: 'مصلحة التكوين', fr: 'Service Formation', en: 'Training Department' },
};
