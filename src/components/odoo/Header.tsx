"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
    Settings,
    Menu,
    LogOut,
    Tent,
} from "lucide-react";
import { Link, useRouter, usePathname } from "@/i18n/routing";

import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/lib/stores/settings";
import { useAuthStore } from "@/lib/stores/auth";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

interface HeaderProps {
    // Props can be cleaned up if no longer used by layout
    onMenuClick?: () => void;
    isSidebarCollapsed?: boolean;
    navigationMode?: 'classic' | 'grid' | 'dock' | 'minimal';
}

export function Header({ onMenuClick, isSidebarCollapsed, navigationMode = 'classic' }: HeaderProps) {
    const t = useTranslations("common"); // Fallback to common or specific namespace
    const tNav = useTranslations("nav");
    const themeColor = useSettingsStore((state) => state.themeColor);
    const router = useRouter();
    const pathname = usePathname();

    // No maintenance mode — simple header
    const showMaintenanceBanner = false;

    // Get real user from auth store
    const { user, logout } = useAuthStore();

    // Build display name from user data
    const displayName = user ? `${user.firstname_ar || ''} ${user.lastname_ar || ''}`.trim() || user.email : 'مستخدم';
    const userInitials = user
        ? (user.firstname_ar?.[0] && user.lastname_ar?.[0]
            ? `${user.firstname_ar[0]}.${user.lastname_ar[0]}`
            : user.firstname_ar?.[0] || user.email?.[0]?.toUpperCase() || 'U')
        : 'U';

    const handleLogout = async () => {
        try {
            // Call backend to clear httpOnly cookie
            const { authApi } = await import("@/lib/api/auth");
            await authApi.logout();
        } catch (error) {
            console.error("Logout API error:", error);
        } finally {
            // Always clear client state regardless of API result
            logout();
            router.push("/login");
        }
    };

    return (
        <header className={cn(
            "h-[48px] w-full flex items-center px-2 justify-between z-50 sticky shadow-sm transition-colors duration-300",
            "bg-primary text-primary-foreground",
            showMaintenanceBanner ? "top-[48px]" : "top-0"
        )}>
            {/* Left Section: Apps Menu & Brand */}
            <div className="flex items-center gap-2">
                {/* Menu Toggle Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                    onClick={onMenuClick}
                >
                    <Menu className="h-5 w-5" />
                </Button>

                <Link href="/camp-registration" className="flex items-center">
                    <div className="font-semibold text-base hidden md:block text-primary-foreground ms-2">
                        <div className="flex items-center gap-2">
                            <Tent className="h-5 w-5" />
                            <span>{(() => {
                                if (pathname.includes('/camp-registration/create')) return tNav('camp_registration') + ' - إنشاء';
                                if (pathname.includes('/camp-registration/allocation')) return 'توزيع)';
                                if (pathname.includes('/camp-registration')) return tNav('camp_registration');
                                if (pathname.includes('/camp-trips')) return tNav('camp_trips');
                                if (pathname.includes('/ministerial-sync')) return tNav('ministerial_sync');
                                return tNav('camp_management');
                            })()}</span>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Center Section: Spacer */}
            <div className="flex-1" />

            {/* Right Section: Actions & Profile */}
            <div className="flex items-center gap-1">
                <ThemeToggle />

                {/* User Profile */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full ms-1 hover:bg-primary-foreground/10 p-0">
                            <Avatar className="h-7 w-7">
                                <AvatarImage src={user?.avatar_url || undefined} alt={displayName} />
                                <AvatarFallback className="bg-primary-foreground/10 text-primary-foreground text-xs">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{displayName}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user?.email || ''}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <Settings className="me-2 h-4 w-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                            <LogOut className="me-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
