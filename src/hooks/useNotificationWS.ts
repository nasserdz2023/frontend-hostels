"use client";

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/stores/auth';
import { notificationsApi } from '@/lib/api/notifications';

interface NotificationWSOptions {
    onNewNotification?: (notification: any) => void;
    onUnreadCount?: (count: number) => void;
    enabled?: boolean;
}

/**
 * Notification WebSocket Hook
 * 
 * Establishes a persistent WebSocket connection for real-time notifications.
 * Falls back to polling if WebSocket is not available or fails.
 * 
 * Usage:
 *   useNotificationWS({
 *       onNewNotification: (notif) => console.log('New notification:', notif),
 *       onUnreadCount: (count) => setUnreadCount(count),
 *   });
 */
export function useNotificationWS(options: NotificationWSOptions = {}) {
    const { onNewNotification, onUnreadCount, enabled = true } = options;
    const { user, accessToken } = useAuthStore();
    const wsRef = useRef<WebSocket | null>(null);
    const mountedRef = useRef(true);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const getWsUrl = useCallback(() => {
        if (typeof window === 'undefined') return null;

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const currentHostname = window.location.hostname;

        // For production domains (api.djs-bousaada.com pattern)
        if (currentHostname !== 'localhost' &&
            currentHostname !== '127.0.0.1' &&
            !currentHostname.startsWith('192.168.') &&
            !currentHostname.startsWith('10.')) {
            const apiHostname = currentHostname.startsWith('api.')
                ? currentHostname
                : `api.${currentHostname}`;
            return `${wsProtocol}//${apiHostname}/api/v1/notifications/ws?token=${accessToken}`;
        }

        // Development / local network
        const apiPort = process.env.NEXT_PUBLIC_API_PORT || '8000';
        const host = `${currentHostname}:${apiPort}`;
        return `${wsProtocol}//${host}/api/v1/notifications/ws?token=${accessToken}`;
    }, [accessToken]);

    const connect = useCallback(() => {
        if (!user || !accessToken || !enabled || !mountedRef.current) return;

        const wsUrl = getWsUrl();
        if (!wsUrl) return;

        // Clean up any existing connection
        if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.onmessage = null;
            wsRef.current.onerror = null;
            wsRef.current.close();
            wsRef.current = null;
        }

        try {
            const socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log('[NotificationWS] Connected');
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'new_notification' && onNewNotification) {
                        onNewNotification(data.notification);
                    }

                    if (data.type === 'unread_count' && onUnreadCount) {
                        onUnreadCount(data.count);
                    }

                    if (data.type === 'connected') {
                        console.log('[NotificationWS] Handshake complete:', data.user_id);
                        if (onUnreadCount && typeof data.unread_count === 'number') {
                            onUnreadCount(data.unread_count);
                        }
                    }
                } catch (e) {
                    console.warn('[NotificationWS] Failed to parse message', event.data);
                }
            };

            socket.onclose = (e) => {
                console.log('[NotificationWS] Disconnected', e.reason);
                // Reconnect after 5 seconds
                if (mountedRef.current && enabled) {
                    reconnectTimeoutRef.current = setTimeout(connect, 5000);
                }
            };

            socket.onerror = (event) => {
                console.error('[NotificationWS] Error', event);
            };

            wsRef.current = socket;
        } catch (e) {
            console.error('[NotificationWS] Connection failed', e);
        }
    }, [user, accessToken, enabled, getWsUrl, onNewNotification, onUnreadCount]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.onopen = null;
            wsRef.current.onclose = null;
            wsRef.current.onerror = null;
            wsRef.current.onmessage = null;

            if (wsRef.current.readyState === WebSocket.OPEN ||
                wsRef.current.readyState === WebSocket.CONNECTING) {
                wsRef.current.close();
            }
            wsRef.current = null;
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        if (enabled && user && accessToken) {
            // Small delay to avoid connection burst on page load
            const initTimeout = setTimeout(connect, 1000);
            return () => {
                clearTimeout(initTimeout);
                mountedRef.current = false;
                disconnect();
            };
        }

        return () => {
            mountedRef.current = false;
        };
    }, [connect, disconnect, enabled, user, accessToken]);

    // Send periodic pings to keep connection alive
    useEffect(() => {
        if (!enabled) return;

        pingIntervalRef.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send('ping');
            }
        }, 30000); // Every 30 seconds

        return () => {
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
        };
    }, [enabled]);

    return { disconnect, reconnect: connect };
}

export default useNotificationWS;
