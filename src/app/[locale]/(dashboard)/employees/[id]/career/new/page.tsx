"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { use } from "react";
import { ArrowRight, ArrowLeft, Route } from "lucide-react";
import { CareerEventForm } from "@/components/hr/CareerEventForm";

export default function NewEmployeeCareerEventPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = use(params);
    const t = useTranslations("hr.career");
    const router = useRouter();

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-2">
                <button
                    onClick={() => router.push(`/${locale}/employees/${id}/career`)}
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    {locale === 'ar' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                </button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Route className="h-7 w-7 text-primary" />
                        {t('newEvent')}
                    </h1>
                    <p className="text-muted-foreground">{t('warningMessage')}</p>
                </div>
            </div>

            {/* Form */}
            <CareerEventForm
                employeeId={id}
                onSuccess={() => router.push(`/${locale}/employees/${id}/career`)}
                onCancel={() => router.push(`/${locale}/employees/${id}/career`)}
            />
        </div>
    );
}
