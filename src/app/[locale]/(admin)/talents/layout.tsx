import ModuleGuard from '@/components/auth/ModuleGuard';

export default function TalentsLayout({ children }: { children: React.ReactNode }) {
    return (
        <ModuleGuard module="talents">
            {children}
        </ModuleGuard>
    );
}
