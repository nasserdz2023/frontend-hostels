"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import api from "@/lib/api/client";

/**
 * تنبيه انقطاع الاتصال بالخادم — ConnectionStatusBanner
 * ------------------------------------------------------
 * يراقب حالتين:
 *   1. حدث offline للمتصفح → إظهار البانرا فوراً.
 *   2. فشل متتالٍ لطلبات الـ API (عتبة FAILURE_THRESHOLD) → إظهار البانرا.
 *
 * قواعد سلوكية:
 *   - لا يُحتسب إلا الفشل الشبكي (لا استجابة HTTP إطلاقاً: ERR_NETWORK،
 *     ECONNABORTED، ETIMEDOUT، ERR_CONNECTION_REFUSED). أخطاء 4xx/5xx
 *     تعني أن الخادم حي فلا تُحتسب ولا تُظهر البانرا.
 *   - أي استجابة ناجحة تُصفّر العدّاد المتتالي.
 *   - زر إعادة المحاولة يفحص GET /health بفترة مهلة قصيرة؛ إن نجح
 *     يختفي البانرا، وإن فشل يبقى ظاهراً دون إزعاج.
 *   - عودة المتصفح للاتصال (online) تطلق فحصاً تلقائياً.
 */

const FAILURE_THRESHOLD = 3;
const PROBE_TIMEOUT_MS = 10_000;

export function ConnectionStatusBanner() {
    const t = useTranslations("common");
    const [isOffline, setIsOffline] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const failureCount = useRef(0);
    const interceptorId = useRef<number | null>(null);

    const reset = useCallback(() => {
        failureCount.current = 0;
        setIsOffline(false);
    }, []);

    const markOffline = useCallback(() => {
        setIsOffline(true);
    }, []);

    // فحص خفيف للتأكد من وصول الخادم
    const probe = useCallback(async (): Promise<boolean> => {
        try {
            await api.get("/health", { timeout: PROBE_TIMEOUT_MS });
            reset();
            return true;
        } catch {
            return false;
        }
    }, [reset]);

    useEffect(() => {
        const handleOffline = () => markOffline();
        const handleOnline = () => {
            // عاد الاتصال → تحقق من الخادم قبل إخفاء البانرا
            void probe();
        };

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);

        // مراقبة فشل طلبات الـ API عبر التفاف الاستجابة المشترك
        interceptorId.current = api.interceptors.response.use(
            (response) => {
                // أي نجاح يصفّر العدّاد المتتالي
                failureCount.current = 0;
                return response;
            },
            (error) => {
                const isNetworkFailure =
                    !error.response ||
                    error.code === "ERR_NETWORK" ||
                    error.code === "ECONNABORTED" ||
                    error.code === "ETIMEDOUT" ||
                    error.code === "ERR_CONNECTION_REFUSED";

                if (isNetworkFailure) {
                    failureCount.current += 1;
                    if (failureCount.current >= FAILURE_THRESHOLD) {
                        markOffline();
                    }
                }
                return Promise.reject(error);
            }
        );

        return () => {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
            if (interceptorId.current !== null) {
                api.interceptors.response.eject(interceptorId.current);
            }
        };
    }, [markOffline, probe]);

    const handleRetry = useCallback(async () => {
        setIsRetrying(true);
        const ok = await probe();
        setIsRetrying(false);
        if (!ok) markOffline();
    }, [probe, markOffline]);

    if (!isOffline) return null;

    return (
        <div
            role="alert"
            aria-live="assertive"
            className="fixed inset-x-0 top-0 z-[95] border-b border-amber-500/40 bg-amber-50/95 text-amber-900 shadow-sm backdrop-blur dark:bg-amber-950/90 dark:text-amber-100"
        >
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-sm">
                <span className="flex items-center gap-2 font-medium">
                    <WifiOff className="h-4 w-4 shrink-0" />
                    {t("connection.message")}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="border-amber-500/50 bg-white/70 text-amber-900 hover:bg-white dark:bg-amber-900/60 dark:text-amber-100 dark:hover:bg-amber-900"
                >
                    <RefreshCw
                        className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")}
                    />
                    {isRetrying ? t("loading") : t("connection.retry")}
                </Button>
            </div>
        </div>
    );
}