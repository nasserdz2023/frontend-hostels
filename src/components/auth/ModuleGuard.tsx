'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { useSettingsStore } from '@/lib/stores/settings';
import { Loader2 } from 'lucide-react';

interface ModuleGuardProps {
    module: string;
    children: React.ReactNode;
    fallbackUrl?: string;
}

export default function ModuleGuard({ module, children, fallbackUrl = '/camp-registration' }: ModuleGuardProps) {
    const { isModuleEnabled, loading, fetchSettings } = useSettingsStore();
    const router = useRouter();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Ensure settings are loaded — use finally() so isReady unblocks even on failure
        fetchSettings().finally(() => setIsReady(true));
    }, []);

    useEffect(() => {
        if (isReady && !loading) {
            if (!isModuleEnabled(module)) {
                router.replace(fallbackUrl);
            }
        }
    }, [isReady, loading, module, fallbackUrl, isModuleEnabled, router]);

    if (loading || !isReady) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!isModuleEnabled(module)) {
        return null; // Will redirect via effect
    }

    return <>{children}</>;
}
