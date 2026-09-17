"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth";

/**
 * Calls /auth/me on mount to restore auth from shared cookie.
 * This is needed because localStorage is per-origin (djs68.com ≠ employees.djs68.com)
 * but cookies with Domain=.djs68.com are shared across all subdomains.
 */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
    const { initFromCookie, _hasHydrated } = useAuthStore();

    useEffect(() => {
        // Wait for Zustand hydration first
        if (_hasHydrated) {
            initFromCookie();
        }
    }, [_hasHydrated, initFromCookie]);

    return <>{children}</>;
}
