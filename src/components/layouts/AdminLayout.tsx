"use client";

import { ReactNode, useState } from "react";
import { Header } from "@/components/odoo/Header"
import { Sidebar } from "@/components/odoo/Sidebar";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
    children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            {/* Top Header (48px) - Fixed */}
            <Header
                onMenuClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isSidebarCollapsed={isSidebarCollapsed}
            />

            <div className="flex flex-1 relative overflow-hidden mt-[48px]">
                {/* Persistent Sidebar */}
                <Sidebar
                    isCollapsed={isSidebarCollapsed}
                    className="shrink-0 h-full border-s"
                />

                {/* Main Content Area */}
                <main className={cn(
                    "flex-1 bg-muted/30 transition-all duration-300 flex flex-col min-h-0",
                    "p-6 overflow-auto"
                )}>
                    <div className={cn(
                        "w-full h-full",
                        "max-w-[1440px] mx-auto"
                    )}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
