"use client";

import { useState, useEffect, useCallback } from "react";
import { notificationsApi } from "@/lib/api/notifications";
import { toast } from "sonner";

const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

export function useWebPush() {
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [isLoading, setIsLoading] = useState(false);

    const checkSupport = useCallback(() => {
        const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
        setIsSupported(supported);
        if (supported) {
            setPermission(Notification.permission);
        }
        return supported;
    }, []);

    const syncSubscription = async (sub: PushSubscription) => {
        try {
            await notificationsApi.subscribeWebPush(sub);
        } catch (error: any) {
            console.error("Error syncing push subscription with server:", error);
            const msg = error.response?.data?.detail || error.message || "فشل الاتصال بالخادم";
            toast.error(`لم يتم حفظ الاشتراك في الخادم: ${msg}`);
            // التراجع عن الاشتراك محلياً إذا رفض السيرفر الحفظ
            try { await sub.unsubscribe(); } catch (e) { }
            setSubscription(null);
            throw error;
        }
    };

    const getSubscription = useCallback(async () => {
        if (!checkSupport()) {
            setIsLoading(false);
            return null;
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            let sub = await registration.pushManager.getSubscription();

            // Auto-subscribe if permission is granted but no sub exists (e.g. data cleared)
            if (!sub && Notification.permission === "granted") {
                const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                if (vapidPublicKey) {
                    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
                    sub = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: convertedVapidKey,
                    });
                }
            }

            setSubscription(sub);

            // Sync with backend on load if authenticated
            if (sub && Notification.permission === "granted") {
                await syncSubscription(sub);
            }

            return sub;
        } catch (error) {
            console.error("Error getting push subscription:", error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [checkSupport]);

    useEffect(() => {
        const checkInitialize = async () => {
            setIsLoading(true);
            const supported = checkSupport();

            if (supported) {
                // Only try to get subscription if permission is already granted
                if (Notification.permission === "granted") {
                    await getSubscription();
                } else {
                    // Not granted, so we are not subscribed, stop loading
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };

        checkInitialize();
    }, [checkSupport, getSubscription]);

    const subscribe = async () => {
        if (!isSupported) {
            toast.error("متصفحك لا يدعم إشعارات الويب.");
            return false;
        }

        setIsLoading(true);
        try {
            const permissionResult = await Notification.requestPermission();
            setPermission(permissionResult);

            if (permissionResult !== "granted") {
                toast.warning("لم تقم بمنح صلاحية إرسال الإشعارات. يرجى تفعيلها من إعدادات المتصفح.");
                setIsLoading(false);
                return false;
            }

            const registration = await navigator.serviceWorker.register('/sw.js');
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

            if (!vapidPublicKey) {
                toast.error("عذراً، هناك مشكلة في إعدادات الخادم (مفتاح VAPID مفقود).");
                setIsLoading(false);
                return false;
            }

            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

            const newSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey,
            });

            setSubscription(newSubscription);

            // Save to backend
            await syncSubscription(newSubscription);

            toast.success("تم تفعيل الإشعارات بنجاح 🎉");
            setIsLoading(false);
            return true;
        } catch (error: any) {
            console.error("Error subscribing to push:", error);
            toast.error(`حدث خطأ أثناء الاشتراك: ${error.message || "فشل التفعيل"}`);
            setIsLoading(false);
            return false;
        }
    };

    const unsubscribe = async () => {
        if (!isSupported || !subscription) return false;

        setIsLoading(true);
        try {
            const endpoint = subscription.endpoint;
            const successful = await subscription.unsubscribe();
            if (successful) {
                setSubscription(null);

                // Remove from backend
                try {
                    await notificationsApi.unsubscribeWebPush(endpoint);
                } catch (error) {
                    console.error("Error removing subscription from server", error);
                }
            }
            setIsLoading(false);
            return successful;
        } catch (error) {
            console.error("Error unsubscribing from push:", error);
            setIsLoading(false);
            return false;
        }
    };

    return {
        isSupported,
        subscription,
        permission,
        isLoading,
        subscribe,
        unsubscribe,
        isSubscribed: !!subscription
    };
}
