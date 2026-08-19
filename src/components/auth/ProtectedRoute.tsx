"use client";

import { useEffect, ReactNode } from "react";
import { useAuthStore } from "@/lib/stores/auth";
import { useRouter, usePathname } from "@/i18n/routing";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole?: string[];
    requiredPermission?: { module: string; action: string };
}

export function ProtectedRoute({
    children,
    requiredRole,
    requiredPermission
}: ProtectedRouteProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, isLoading, user, hasPermission, _hasHydrated } = useAuthStore();

    useEffect(() => {
        if (!_hasHydrated) return; // Wait for Zustand localStorage hydration

        const checkAuth = async () => {
            // Case 1: Store says authenticated
            if (isAuthenticated) {
                // If we have no access token (page reload), try to refresh silently to restore it
                // We do this because we stopped persisting tokens in localStorage
                const { accessToken } = useAuthStore.getState();
                if (!accessToken) {
                    try {
                        const { authApi } = await import("@/lib/api/auth");
                        const tokens = await authApi.refreshToken();
                        useAuthStore.getState().setTokens(tokens.access_token, tokens.refresh_token || "");
                        // After restoring token, re-verify user/roles if needed?
                        // Usually role is in user object which IS persisted. So we are good.
                    } catch (e) {
                        // Refresh failed, silently log out? Or redirect?
                        // If we can't get a token, we can't make API calls.
                        useAuthStore.getState().logout();
                        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
                        return;
                    }
                }

                // Role/Permission Checks
                if (user && requiredRole && !requiredRole.includes(user.role)) {
                    router.push("/unauthorized");
                    return;
                }
                if (user && requiredPermission && !hasPermission(requiredPermission.module, requiredPermission.action)) {
                    router.push("/unauthorized");
                    return;
                }
                return;
            }

            // Case 2: Store says NOT authenticated (e.g. Cleared Storage or New Session)
            if (!isAuthenticated && !isLoading) {
                try {
                    // Try to restore session from HttpOnly Cookie
                    const { authApi } = await import("@/lib/api/auth");
                    const tokens = await authApi.refreshToken();

                    // If success, we have a valid session!
                    // 1. Set Tokens
                    useAuthStore.getState().setTokens(tokens.access_token, tokens.refresh_token || "");

                    // 2. Fetch User Profile
                    const userData = await authApi.getCurrentUser();

                    // 3. Update Store (Login)
                    useAuthStore.getState().login(userData, tokens.access_token, tokens.refresh_token || "");

                    // Don't redirect, let component render children now that we are auth'd

                } catch (e) {
                    // Cookie invalid or missing -> Real Logout -> Redirect
                    router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
                }
            }
        };

        checkAuth();
    }, [isAuthenticated, isLoading, user, requiredRole, requiredPermission, router, pathname, hasPermission, _hasHydrated]);

    // Loading state
    if (isLoading || !_hasHydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="space-y-4 w-full max-w-md p-8">
                    <Skeleton className="h-8 w-3/4 mx-auto" />
                    <Skeleton className="h-4 w-1/2 mx-auto" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
        );
    }

    // Not authenticated
    if (!isAuthenticated) {
        return null;
    }

    // Role check failed
    if (user && requiredRole && !requiredRole.includes(user.role)) {
        return null;
    }

    // Permission check failed
    if (user && requiredPermission && !hasPermission(requiredPermission.module, requiredPermission.action)) {
        return null;
    }

    return <>{children}</>;
}
