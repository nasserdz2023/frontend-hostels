"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationDropdown } from "./NotificationDropdown";
import { notificationsApi } from "@/lib/api/notifications";
import { useNotificationWS } from "@/hooks/useNotificationWS";
import { useWebPush } from "@/hooks/useWebPush";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
    /** Whether the bell is rendered inside a header (primary-colored background) */
    inHeader?: boolean;
    className?: string;
}

export function NotificationBell({ inHeader = true, className }: NotificationBellProps) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Fallback polling function (used when WS not available)
    const fetchUnreadCount = useCallback(async () => {
        try {
            const count = await notificationsApi.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error("Failed to fetch unread count:", error);
        }
    }, []);

    // WebSocket for real-time notifications
    useNotificationWS({
        onNewNotification: (notification) => {
            // When a new notification arrives, increment unread count
            setUnreadCount((prev) => prev + 1);
        },
        onUnreadCount: (count) => {
            setUnreadCount(count);
            // Only mark as WS connected once we receive data
            if (!wsConnected) {
                setWsConnected(true);
            }
        },
    });

    // Initial fetch on mount + polling fallback (every 60 seconds as backup)
    useEffect(() => {
        fetchUnreadCount();

        // Keep a slow polling interval as fallback (60s instead of 30s since WS is primary)
        pollIntervalRef.current = setInterval(fetchUnreadCount, 60000);
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [fetchUnreadCount]);

    // Override polling interval when WS is connected — reduce to keep-alive only
    useEffect(() => {
        if (wsConnected && pollIntervalRef.current) {
            // Reduce polling frequency when WS is active (every 5 min as safety net)
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = setInterval(fetchUnreadCount, 300000);
        }
    }, [wsConnected, fetchUnreadCount]);

    // Initialize Web Push (existing functionality)
    const { isSupported, permission, subscribe } = useWebPush();

    useEffect(() => {
        if (isSupported && permission === "default") {
            const timer = setTimeout(() => {
                subscribe();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isSupported, permission, subscribe]);

    const handleToggle = () => {
        setIsOpen((prev) => !prev);
    };

    const handleClose = () => {
        setIsOpen(false);
        fetchUnreadCount();
    };

    return (
        <div className={cn("relative", className)}>
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "relative h-8 w-8",
                    inHeader
                        ? "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                        : "text-muted-foreground hover:text-foreground"
                )}
                onClick={handleToggle}
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span
                        className={cn(
                            "absolute -top-0.5 -end-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] text-white font-medium flex items-center justify-center",
                            "bg-red-500"
                        )}
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <NotificationDropdown
                    onClose={handleClose}
                    onCountChange={setUnreadCount}
                />
            )}
        </div>
    );
}
