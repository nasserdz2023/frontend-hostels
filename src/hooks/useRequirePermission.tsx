"use client";

import { useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UseRequirePermissionOptions {
    module: string;
    action: string;
    redirectTo404?: boolean;
}

/**
 * Hook to check if the current user has a required permission.
 * If not, redirects to 404 page.
 *
 * @example
 * const { isAuthorized, isChecking } = useRequirePermission({
 *     module: 'activities',
 *     action: 'seasons.manage'
 * });
 *
 * if (isChecking) return <Loading />;
 * if (!isAuthorized) return null; // Will redirect to 404
 */
export function useRequirePermission({
    module,
    action,
    redirectTo404 = true
}: UseRequirePermissionOptions) {
    const { hasPermission, isAuthenticated, _hasHydrated } = useAuthStore();
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // Wait for auth store to hydrate
        if (!_hasHydrated) return;

        // Not authenticated - let ProtectedRoute handle this
        if (!isAuthenticated) {
            setIsChecking(false);
            setIsAuthorized(false);
            return;
        }

        // Check permission
        const permitted = hasPermission(module, action);

        if (!permitted && redirectTo404) {
            notFound();
        }

        setIsAuthorized(permitted);
        setIsChecking(false);
    }, [module, action, hasPermission, isAuthenticated, _hasHydrated, redirectTo404]);

    return { isAuthorized, isChecking };
}

/**
 * Access Denied Component - shown when user is authenticated but lacks permission
 */
export function AccessDenied({ module, action }: { module: string; action: string }) {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div className="bg-red-50 dark:bg-red-950/20 rounded-full p-6 mb-6">
                <ShieldX className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                ممنوع الوصول
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
                ليس لديك الصلاحية للوصول لهذه الصفحة.
                إذا كنت تعتقد أن هذا خطأ، تواصل مع مسؤول النظام.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 font-mono">
                الصلاحية المطلوبة: {module}.{action}
            </p>
            <div className="flex gap-3">
                <Button variant="outline" onClick={() => router.back()}>
                    العودة للخلف
                </Button>
                <Button onClick={() => router.push('/dashboard')}>
                    لوحة التحكم
                </Button>
            </div>
        </div>
    );
}

/**
 * HOC wrapper component for permission-protected pages
 */
interface PermissionGuardProps {
    children: React.ReactNode;
    module: string;
    action: string;
    fallback?: React.ReactNode;
}

export function PermissionGuard({
    children,
    module,
    action,
    fallback
}: PermissionGuardProps) {
    const { hasPermission, isAuthenticated, _hasHydrated } = useAuthStore();
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (!_hasHydrated) return;

        if (!isAuthenticated) {
            // Not authenticated - let layout/middleware handle redirect to login
            setIsChecking(false);
            setIsAuthorized(false);
            return;
        }

        const permitted = hasPermission(module, action);
        setIsAuthorized(permitted);
        setIsChecking(false);
    }, [module, action, hasPermission, isAuthenticated, _hasHydrated]);

    if (isChecking) {
        return fallback || (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    // User is authenticated but lacks permission - show Access Denied
    if (isAuthenticated && !isAuthorized) {
        return <AccessDenied module={module} action={action} />;
    }

    // User is not authenticated - return null (layout will redirect to login)
    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
