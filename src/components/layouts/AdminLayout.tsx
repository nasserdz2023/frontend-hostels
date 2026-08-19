"use client";

import { ReactNode, useState } from "react";
import { Header } from "@/components/odoo/Header"
import { Sidebar } from "@/components/odoo/Sidebar";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

interface AdminLayoutProps {
    children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const pathname = usePathname();
    const isAppPage = pathname?.includes('/chat') || pathname?.includes('/email');

    // Auto-collapse for presentation editors to maximize canvas space
    const isPresentationPage = pathname?.includes('/presentations/') || pathname?.includes('/impress-presentations/');

    // FULL BYPASS: Immersive pages (preview, fullscreen) - Don't render AdminLayout at all
    const isImmersivePage = pathname?.includes('/preview') && pathname?.includes('/impress-presentations');

    // FULL BYPASS: Immersive pages skip entire layout
    if (isImmersivePage) {
        return <>{children}</>;
    }

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            {/* Top Header (48px) - Fixed */}
            <Header
                onMenuClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isSidebarCollapsed={isSidebarCollapsed}
                navigationMode="classic"
            />

            <div className="flex flex-1 relative overflow-hidden mt-[48px]">
                {/* Persistent Sidebar - Classic Mode (auto-collapse on presentation pages) */}
                <Sidebar
                    isCollapsed={isSidebarCollapsed || isPresentationPage}
                    className="shrink-0 h-full border-s"
                />

                {/* Main Content Area */}
                <main className={cn(
                    "flex-1 bg-muted/30 transition-all duration-300 flex flex-col min-h-0", // min-h-0 crucial for nested flex scrolling
                    // Standard pages get padding and scroll
                    !isAppPage && "p-6 overflow-auto",
                    // App pages get no padding and handle their own scroll
                    isAppPage && "p-0 overflow-hidden",
                )}>
                    <div className={cn(
                        "w-full h-full",
                        !isAppPage && "max-w-[1440px] mx-auto"
                    )}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
