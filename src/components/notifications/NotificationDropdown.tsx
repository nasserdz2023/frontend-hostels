"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { ar, fr, enUS } from "date-fns/locale";
import type { Locale } from "date-fns";
import {
    Info,
    AlertTriangle,
    AlertCircle,
    ClipboardList,
    CheckCircle,
    Check,
    CheckCheck,
    Trash2,
    ExternalLink,
    Loader2,
    Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { notificationsApi, Notification } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";

interface NotificationDropdownProps {
    onClose?: () => void;
    onCountChange?: (count: number) => void;
}

const typeConfig = {
    INFO: { icon: Info, color: "text-blue-500" },
    WARNING: { icon: AlertTriangle, color: "text-yellow-500" },
    ALERT: { icon: AlertCircle, color: "text-red-500" },
    ACTION: { icon: ClipboardList, color: "text-purple-500" },
    SUCCESS: { icon: CheckCircle, color: "text-green-500" },
} as const;

function getLocale(locale: string): Locale {
    const map: Record<string, Locale> = { ar, fr, en: enUS };
    return map[locale] || enUS;
}

export function NotificationDropdown({ onClose, onCountChange }: NotificationDropdownProps) {
    const t = useTranslations("notifications");
    const locale = useLocale();
    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch notifications on mount
    useEffect(() => {
        fetchNotifications();
        // Poll count
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose?.();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const response = await notificationsApi.getAll({ limit: 10 });
            setNotifications(response.items);
            setUnreadCount(response.unread_count);
            onCountChange?.(response.unread_count);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const count = await notificationsApi.getUnreadCount();
            setUnreadCount(count);
            onCountChange?.(count);
        } catch (e) {
            console.error("Failed to poll notifications:", e);
        }
    };

    const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await notificationsApi.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            onCountChange?.(Math.max(0, unreadCount - 1));
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            onCountChange?.(0);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await notificationsApi.delete(id);
            const wasUnread = notifications.find(n => n.id === id)?.is_read === false;
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (wasUnread) {
                setUnreadCount(prev => Math.max(0, prev - 1));
                onCountChange?.(Math.max(0, unreadCount - 1));
            }
        } catch (error) {
            console.error("Failed to delete notification:", error);
        }
    };

    const handleClick = (notification: Notification) => {
        if (!notification.is_read) {
            notificationsApi.markAsRead(notification.id);
        }
        if (notification.action_url) {
            router.push(notification.action_url);
        }
        onClose?.();
    };

    const getIcon = (type: string) => {
        const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.INFO;
        const Icon = config.icon;
        return <Icon className={cn("h-4 w-4", config.color)} />;
    };

    const formatTime = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), {
                addSuffix: true,
                locale: getLocale(locale),
            });
        } catch {
            return "";
        }
    };

    return (
        <div
            ref={dropdownRef}
            className="absolute ltr:end-0 rtl:end-0 top-full mt-2 w-80 md:w-96 bg-card rounded-lg shadow-xl border z-50 overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-foreground">{t("title")}</h3>
                {unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                        className="text-xs h-7"
                    >
                        <CheckCheck className="h-3.5 w-3.5 ms-1" />
                        {t("markAllRead")}
                    </Button>
                )}
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Bell className="h-10 w-10 mb-2 opacity-30" />
                        <p className="text-sm">{t("empty")}</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                onClick={() => handleClick(notification)}
                                className={cn(
                                    "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                                    !notification.is_read && "bg-primary/5"
                                )}
                            >
                                <div className="flex gap-3">
                                    <div className="mt-0.5 shrink-0">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={cn(
                                                "text-sm leading-tight truncate",
                                                !notification.is_read && "font-semibold"
                                            )}>
                                                {notification.title}
                                            </p>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {!notification.is_read && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                        title={t("markRead")}
                                                    >
                                                        <Check className="h-3 w-3" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                    onClick={(e) => handleDelete(notification.id, e)}
                                                    title={t("delete")}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs text-muted-foreground">
                                                {formatTime(notification.created_at)}
                                            </span>
                                            {notification.action_url && (
                                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t">
                <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                        router.push("/notifications");
                        onClose?.();
                    }}
                >
                    {t("viewAll")}
                </Button>
            </div>
        </div>
    );
}
