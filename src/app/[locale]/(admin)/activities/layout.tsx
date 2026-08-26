import ModuleGuard from '@/components/auth/ModuleGuard';

export default function ActivitiesLayout({ children }: { children: React.ReactNode }) {
    return (
        <ModuleGuard module="activities">
            {children}
        </ModuleGuard>
    );
}
