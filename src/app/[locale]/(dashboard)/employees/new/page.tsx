"use client";

import { useEffect, useState, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { EmployeeFormSteps } from "@/components/employees/EmployeeFormSteps";
import { useEmployeesStore } from "@/lib/stores/employees";
import { useInstitutionsStore } from "@/lib/stores/institutions";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { PermissionGuard } from "@/hooks/useRequirePermission";

export default function NewEmployeePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = use(params);
    const t = useTranslations("employees");
    const router = useRouter();
    const { createEmployee } = useEmployeesStore();
    const { fetchInstitutions, institutions } = useInstitutionsStore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchInstitutions({ size: 1000 }); // Fetch all for selection
    }, [fetchInstitutions]);

    const handleSubmit = async (data: any) => {
        try {
            setIsSubmitting(true);
            const employee = await createEmployee(data);

            if (employee.email_sent === true) {
                toast.success(t("messages.emailSent"));
            } else if (employee.email_sent === false) {
                toast.warning(t("messages.emailFail"));
            } else {
                toast.success(t("messages.createSuccess"));
            }
            router.push(`/${locale}/employees`);
        } catch (error: any) {
            // Rethrow error to be handled by the form component (409 handling)
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <PermissionGuard module="employees" action="create">
            <div className="container mx-auto py-8 px-4 max-w-5xl">
                <EmployeeFormSteps
                    institutions={institutions}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    onCancel={() => router.back()}
                />
            </div>
        </PermissionGuard>
    );
}
