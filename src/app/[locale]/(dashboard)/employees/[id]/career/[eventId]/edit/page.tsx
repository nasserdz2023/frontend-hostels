"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, Route, Loader2 } from "lucide-react";
import { CareerEventForm } from "@/components/hr/CareerEventForm";
import { careerApi, CareerEvent } from "@/lib/api/career";
import { toast } from "sonner";

export default function EditCareerEventPage({ params }: { params: Promise<{ locale: string; id: string; eventId: string }> }) {
    const { locale, id: employeeId, eventId } = use(params);
    const t = useTranslations("hr.career");
    const router = useRouter();
    const [event, setEvent] = useState<CareerEvent | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadEvent = async () => {
            try {
                const history: CareerEvent[] = await careerApi.getCareerHistory(employeeId);
                const found = history.find(e => e.id === eventId);
                if (!found) {
                    toast.error(t('notFound'));
                    router.push(`/${locale}/employees/${employeeId}/career`);
                    return;
                }
                setEvent(found);
            } catch {
                toast.error(t('loadError'));
                router.push(`/${locale}/employees/${employeeId}/career`);
            } finally {
                setLoading(false);
            }
        };
        loadEvent();
    }, [employeeId, eventId]);

    if (loading) {
        return (
            <div className="container mx-auto py-8 px-4 max-w-4xl">
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    if (!event) return null;

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-2">
                <button
                    onClick={() => router.push(`/${locale}/employees/${employeeId}/career`)}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    {locale === 'ar' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                </button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Route className="h-7 w-7 text-primary" />
                        {t('editEvent')}
                    </h1>
                    <p className="text-muted-foreground">{t('warningMessage')}</p>
                </div>
            </div>

            {/* Edit Form */}
            <CareerEventForm
                employeeId={employeeId}
                initialData={event}
                onSuccess={() => router.push(`/${locale}/employees/${employeeId}/career`)}
                onCancel={() => router.push(`/${locale}/employees/${employeeId}/career`)}
            />
        </div>
    );
}
