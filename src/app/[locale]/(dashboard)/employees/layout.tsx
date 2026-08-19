import ModuleGuard from '@/components/auth/ModuleGuard';

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
    return (
        <ModuleGuard module="hr">
            {children}
        </ModuleGuard>
    );
}
