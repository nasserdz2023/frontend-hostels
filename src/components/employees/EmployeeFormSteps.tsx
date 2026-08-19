"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";
import { Check, ChevronLeft, ChevronRight, Loader2, Undo2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { employeeSchema, EmployeeFormValues } from "@/lib/schemas/employees";
import { Step1Personal } from "./steps/Step1Personal";
import { Step2Job } from "./steps/Step2Job";
import { Step3Contact } from "./steps/Step3Contact";
import { Step4Education } from "./steps/Step4Education";
import { Step4Bank } from "./steps/Step4Bank";
import { Step5Account } from "./steps/Step5Account";
import { useEmployeesStore } from "@/lib/stores/employees";
import { Form } from "@/components/ui/form";
import { DraftService } from "@/lib/drafts";
import { employeesApi } from "@/lib/api/employees";
import { useSettingsStore } from "@/lib/stores/settings";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface EmployeeFormStepsProps {
    initialData?: Partial<EmployeeFormValues>;
    institutions: any[];
    onSubmit: (data: EmployeeFormValues) => Promise<void>;
    isSubmitting: boolean;
    onCancel: () => void;
}

export function EmployeeFormSteps({ initialData, institutions, onSubmit, isSubmitting, onCancel }: EmployeeFormStepsProps) {
    const t = useTranslations("employees");
    const tCommon = useTranslations("common");
    const [currentStep, setCurrentStep] = useState(0);
    const [draftFound, setDraftFound] = useState(false);
    const [duplicateWarning, setDuplicateWarning] = useState<{ show: boolean; employees: { id: string; firstname_ar: string; lastname_ar: string; name: string; employee_number: string; birth_date: string; birth_place: string; institution_name: string }[] }>({ show: false, employees: [] });

    const { getDefaultWilayaCode } = useSettingsStore();

    // Draft Key
    const DRAFT_KEY = "employee_create";

    // Fetch references
    const { fetchReferences } = useEmployeesStore();
    useEffect(() => {
        fetchReferences();
    }, [fetchReferences]);

    const methods = useForm<EmployeeFormValues>({
        resolver: zodResolver(employeeSchema) as any as any,
        defaultValues: {
            ...initialData,
            // Handle objects in initialData by extracting IDs
            grade_id: typeof initialData?.grade === 'object' ? (initialData.grade as any)?.id : initialData?.grade_id || "",
            position_id: typeof initialData?.position === 'object' ? (initialData.position as any)?.id : initialData?.position_id || "",
            department_id: typeof initialData?.department === 'object' ? (initialData.department as any)?.id : initialData?.department_id || "",
            // Provide defaults for other fields to avoid uncontrolled input warnings
            firstname_ar: initialData?.firstname_ar || "",
            lastname_ar: initialData?.lastname_ar || "",
            firstname_fr: initialData?.firstname_fr || "",
            lastname_fr: initialData?.lastname_fr || "",
            national_id: initialData?.national_id || "",
            birth_date: initialData?.birth_date || "",
            is_birth_date_estimated: initialData?.is_birth_date_estimated || false,
            birth_place: initialData?.birth_place || "",
            birth_wilaya_code: initialData?.birth_wilaya_code || getDefaultWilayaCode(),
            birth_municipality_id: initialData?.birth_municipality_id || "",
            gender: initialData?.gender || "male",
            marital_status: initialData?.marital_status || "single",
            children_count: initialData?.children_count || 0,
            employee_number: initialData?.employee_number || "",
            department: typeof initialData?.department === 'string' ? initialData.department : typeof initialData?.department === 'object' ? (initialData.department as any)?.id : "",
            position: typeof initialData?.position === 'string' ? initialData.position : typeof initialData?.position === 'object' ? (initialData.position as any)?.id : "",
            grade: typeof initialData?.grade === 'string' ? initialData.grade : typeof initialData?.grade === 'object' ? (initialData.grade as any)?.id : "",
            institution_id: typeof (initialData as any)?.institution === 'object' ? (initialData as any).institution?.id : initialData?.institution_id || null,
            rank: initialData?.rank || "01",
            employment_type: initialData?.employment_type || "full_time",
            hire_date: initialData?.hire_date || "",
            confirmation_date: initialData?.confirmation_date || "",
            last_promotion_date: initialData?.last_promotion_date || "",

            // Geographic Assignment
            work_location_type: (initialData as any)?.work_location_type || "institution",
            work_district_id: (initialData as any)?.work_district_id || "",
            work_municipality_id: (initialData as any)?.work_municipality_id || "",

            // Legal Position
            legal_position: (initialData as any)?.legal_position || "ACTIVE",
            legal_position_start: (initialData as any)?.legal_position_start || "",
            legal_position_destination: (initialData as any)?.legal_position_destination || "",
            legal_position_notes: (initialData as any)?.legal_position_notes || "",
            appointment_type: (initialData as any)?.appointment_type || "",

            // Secondary Position
            secondary_position_id: typeof (initialData as any)?.secondary_position === 'object' ? ((initialData as any).secondary_position as any)?.id : (initialData as any)?.secondary_position_id || "",
            secondary_appointment_type: (initialData as any)?.secondary_appointment_type || "",
            secondary_institution_id: typeof (initialData as any)?.secondary_institution === 'object' ? ((initialData as any).secondary_institution as any)?.id : (initialData as any)?.secondary_institution_id || "",
            secondary_district_id: typeof (initialData as any)?.secondary_district === 'object' ? ((initialData as any).secondary_district as any)?.id : (initialData as any)?.secondary_district_id || "",
            secondary_municipality_id: typeof (initialData as any)?.secondary_municipality === 'object' ? ((initialData as any).secondary_municipality as any)?.id : (initialData as any)?.secondary_municipality_id || "",
            secondary_department_id: typeof (initialData as any)?.secondary_department === 'object' ? ((initialData as any).secondary_department as any)?.id : (initialData as any)?.secondary_department_id || null,
            secondary_office_id: typeof (initialData as any)?.secondary_office === 'object' ? ((initialData as any).secondary_office as any)?.id : (initialData as any)?.secondary_office_id || null,

            phone: initialData?.phone || "",
            mobile: initialData?.mobile || "",
            email: initialData?.email || "",
            address: initialData?.address || "",
            city: initialData?.city || "",
            bank_name: initialData?.bank_name || "",
            bank_account: initialData?.bank_account || "",
            nif: initialData?.nif || "",
            social_security_number: initialData?.social_security_number || "",
            hiring_education_level_id: initialData?.hiring_education_level_id || "",
            certificates: initialData?.certificates || [],
            experiences: initialData?.experiences || [],
            languages: initialData?.languages || [],
            create_user_account: initialData?.create_user_account !== undefined ? initialData.create_user_account : true,
        },
        mode: "onChange"
    });

    const { trigger, handleSubmit, watch, reset, formState: { errors } } = methods;

    // Map fields to steps for error detection
    const getStepForField = (field: string): number => {
        const step0 = ['firstname_ar', 'lastname_ar', 'firstname_fr', 'lastname_fr', 'national_id', 'birth_date', 'birth_place', 'birth_wilaya_code', 'birth_municipality_id', 'gender', 'marital_status', 'children_count', 'profile_photo'];
        const step1 = ['employee_number', 'department', 'department_id', 'office_id', 'position', 'position_id', 'grade', 'grade_id', 'institution_id', 'hire_date', 'employment_type', 'rank', 'original_administration_type', 'original_department', 'secondary_position_id', 'secondary_appointment_type', 'secondary_institution_id', 'secondary_district_id', 'secondary_municipality_id', 'secondary_department_id', 'secondary_office_id'];
        const step2 = ['email', 'phone', 'mobile', 'address', 'city', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'];
        const step3 = ['hiring_education_level_id', 'certificates', 'experiences', 'languages'];
        const step4 = ['bank_name', 'bank_account', 'social_security_number', 'nif'];
        const step5 = ['create_user_account'];

        if (step0.includes(field)) return 0;
        if (step1.includes(field)) return 1;
        if (step2.includes(field)) return 2;
        if (step3.includes(field)) return 3;
        if (step4.includes(field)) return 4;
        if (step5.includes(field)) return 5;
        return 0; // Default or handled elsewhere
    };

    // Calculate error steps
    const errorSteps = Object.keys(errors).reduce((acc: number[], field) => {
        const step = getStepForField(field);
        if (!acc.includes(step)) acc.push(step);
        return acc;
    }, []);

    // Check for Draft on mount
    useEffect(() => {
        if (!initialData) {
            const draft = DraftService.load<EmployeeFormValues>(DRAFT_KEY);
            if (draft) {
                setDraftFound(true);
            }
        }
    }, [initialData, DRAFT_KEY]);

    // Restore draft
    const restoreDraft = () => {
        const draft = DraftService.load<EmployeeFormValues>(DRAFT_KEY);
        if (draft) {
            reset(draft.data);
            setCurrentStep(draft.step);
            setDraftFound(false);
            toast.success(t("messages.draftRestored"));
        }
    };

    // Discard draft
    const discardDraft = () => {
        DraftService.clear(DRAFT_KEY);
        setDraftFound(false);
        toast.info(t("messages.draftDiscarded"));
    };

    // Auto-save Draft
    useEffect(() => {
        if (initialData) return;
        const subscription = watch((value) => {
            DraftService.save(DRAFT_KEY, value, currentStep);
        });
        return () => subscription.unsubscribe();
    }, [watch, initialData, currentStep, DRAFT_KEY]);

    const steps = [
        { id: 0, label: t("steps.personal"), description: t("steps.personalDesc") },
        { id: 1, label: t("steps.job"), description: t("steps.jobDesc") },
        { id: 2, label: t("steps.contact"), description: t("steps.contactDesc") },
        { id: 3, label: t("steps.education") || "المستوى الدراسي", description: t("steps.educationDesc") || "الشهادات والخبرات" },
        { id: 4, label: t("steps.bank"), description: t("steps.bankDesc") },
        { id: 5, label: t("steps.account"), description: t("steps.accountDesc") },
    ];

    const handleNext = async () => {
        // Validate fields for current step
        let fieldsToValidate: any[] = [];
        if (currentStep === 0) fieldsToValidate = ['firstname_ar', 'lastname_ar', 'gender', 'marital_status'];
        else if (currentStep === 1) fieldsToValidate = ['employee_number', 'position_id', 'institution_id'];
        else if (currentStep === 2) fieldsToValidate = ['email', 'mobile'];
        // Steps 3 and 4 are fully optional, skip validation
        else if (currentStep === 3) fieldsToValidate = [];
        else if (currentStep === 4) fieldsToValidate = [];

        // Only validate if there are fields to validate, otherwise just proceed
        if (fieldsToValidate.length === 0) {
            setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
            return;
        }

        const isStepValid = await trigger(fieldsToValidate);

        if (isStepValid) {
            // Check for duplicate names when leaving step 1 (Personal Info)
            if (currentStep === 0 && !initialData) {
                const firstname = watch('firstname_ar');
                const lastname = watch('lastname_ar');
                try {
                    const result = await employeesApi.checkNameDuplicate(firstname, lastname);
                    if (result.exists && result.employees) {
                        setDuplicateWarning({ show: true, employees: result.employees });
                        return; // Don't proceed automatically, show warning first
                    }
                } catch (err) {
                    console.warn('Failed to check duplicate names:', err);
                }
            }
            setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
        } else {
            // Validation errors will be shown in the form UI
        }
    };

    const handleProceedAnyway = () => {
        setDuplicateWarning({ show: false, employees: [] });
        setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    };

    const handleBack = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
    };

    const onSubmitForm = async (data: EmployeeFormValues) => {
        localStorage.removeItem("employee_form_draft_v2");

        // Clean data before submission
        const cleanData: any = { ...data };

        // Handle empty strings for optional fields (UUIDs, etc)
        const optionalFields = [
            'firstname_fr', 'lastname_fr', 'national_id', 'birth_place', 'gender',
            'marital_status', 'profile_photo', 'employee_number', 'position_id',
            'position', 'grade_id', 'grade', 'institution_id', 'department_id', 'office_id', 'rank',
            'original_department', 'employment_type', 'phone', 'mobile',
            'email', 'address', 'city', 'emergency_contact_name',
            'emergency_contact_phone', 'emergency_contact_relationship',
            'bank_name', 'bank_account', 'social_security_number', 'nif',
            'hiring_education_level_id', 'wilaya_code', 'birth_wilaya_code', 'birth_municipality_id',
            // Geographic assignment & Status fields
            'work_location_type', 'work_district_id', 'work_municipality_id',
            'work_status', 'work_status_date', 'work_status_reason', 'appointment_type',
            'secondary_position_id', 'secondary_appointment_type', 'secondary_institution_id',
            'secondary_district_id', 'secondary_municipality_id', 'secondary_department_id', 'secondary_office_id'
        ];

        optionalFields.forEach(field => {
            if (cleanData[field] === "") {
                cleanData[field] = null;
            }
        });

        // Handle date fields
        // Assumes date inputs return YYYY-MM-DD strings directly if type="date"
        // If empty string, convert to null
        if (cleanData.birth_date === "") cleanData.birth_date = null;
        if (cleanData.hire_date === "") cleanData.hire_date = null;
        if (cleanData.confirmation_date === "") cleanData.confirmation_date = null;
        if (cleanData.last_promotion_date === "") cleanData.last_promotion_date = null;

        try {
            await onSubmit(cleanData);
        } catch (error: any) {
            // Handle 409 Conflict (Duplicate data)
            if (error?.response?.status === 409) {
                const errorMessage = error.response?.data?.detail || "بيانات مكررة";

                // Determine which field caused the error
                if (errorMessage.includes("البريد الإلكتروني") || errorMessage.includes("email")) {
                    methods.setError("email", {
                        type: "manual",
                        message: errorMessage
                    });
                    // Move to Contact step (Step 2)
                    setCurrentStep(2);
                } else if (errorMessage.includes("الرقم الوظيفي") || errorMessage.includes("employee_number")) {
                    methods.setError("employee_number", {
                        type: "manual",
                        message: errorMessage
                    });
                    // Move to Job step (Step 1)
                    setCurrentStep(1);
                } else {
                    toast.error(errorMessage);
                }
            } else {
                // Let the parent handle generic errors or show toast
                toast.error(t("messages.createError")); // Ensure messages.createError exists locally or use generic
            }
        }
    };

    return (
        <FormProvider {...methods}>
            <Form {...methods}>
                <div className="space-y-4">
                    {/* Draft Banner */}
                    {draftFound && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Undo2 className="h-4 w-4" />
                                <span>{t("messages.draftFound")}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={discardDraft} className="text-blue-700 hover:bg-blue-100">{t("messages.draftDiscard")}</Button>
                                <Button variant="outline" size="sm" onClick={restoreDraft} className="bg-white text-blue-700 border-blue-200 hover:bg-blue-50">{t("messages.draftRestore")}</Button>
                            </div>
                        </div>
                    )}

                    {/* Duplicate Name Warning */}
                    {duplicateWarning.show && (
                        <Alert className="bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-600">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            <AlertTitle className="text-amber-800 dark:text-amber-200 me-2">
                                تحذير: يوجد موظف/موظفين بنفس الاسم واللقب
                            </AlertTitle>
                            <AlertDescription className="text-amber-700 dark:text-amber-300">
                                <div className="mt-3 space-y-3">
                                    {duplicateWarning.employees.map((emp) => (
                                        <div key={emp.id} className="p-3 bg-amber-100/50 dark:bg-amber-800/30 rounded-lg border border-amber-200 dark:border-amber-700">
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div><span className="font-medium">الاسم:</span> {emp.firstname_ar}</div>
                                                <div><span className="font-medium">اللقب:</span> {emp.lastname_ar}</div>
                                                <div><span className="font-medium">تاريخ الازدياد:</span> {emp.birth_date}</div>
                                                <div><span className="font-medium">مكان الازدياد:</span> {emp.birth_place}</div>
                                                <div><span className="font-medium">المؤسسة:</span> {emp.institution_name}</div>
                                                <div><span className="font-medium">رقم التسجيل:</span> {emp.employee_number}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setDuplicateWarning({ show: false, employees: [] })}
                                        className="border-amber-400 text-amber-700 hover:bg-amber-100"
                                    >
                                        إلغاء / تعديل البيانات
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleProceedAnyway}
                                        className="bg-amber-600 hover:bg-amber-700 text-white"
                                    >
                                        ✓ الموافقة على إضافة موظف جديد
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Debug: Show validation errors */}
                    {Object.keys(errors).length > 0 && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                            <strong>أخطاء التحقق:</strong>
                            <ul className="list-disc list-inside mt-2">
                                {Object.entries(errors).map(([field, error]: [string, any]) => (
                                    <li key={field}>
                                        <strong>{field}:</strong> {error?.message || 'خطأ غير محدد'}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Card className="w-full max-w-5xl mx-auto shadow-lg border-0 dark:bg-slate-900 flex flex-col h-full md:h-auto min-h-[600px]">
                        <CardHeader className="pb-2">
                            <div className="mb-6">
                                <Stepper
                                    steps={steps}
                                    currentStep={currentStep}
                                    errorSteps={errorSteps}
                                    onStepClick={setCurrentStep}
                                    allowJumpToAnyStep={true}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 py-6">
                            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
                                {currentStep === 0 && <Step1Personal />}
                                {currentStep === 1 && <Step2Job institutions={institutions} employeeId={(initialData as any)?.id} />}
                                {currentStep === 2 && <Step3Contact />}
                                {currentStep === 3 && <Step4Education />}
                                {currentStep === 4 && <Step4Bank />}
                                {currentStep === 5 && <Step5Account />}
                            </form>
                        </CardContent>
                        <CardFooter className="flex justify-between border-t p-6 bg-muted/50 rounded-b-xl mt-auto">
                            <Button variant="outline" onClick={currentStep === 0 ? onCancel : handleBack} disabled={isSubmitting}>
                                {currentStep === 0 ? tCommon("cancel") : tCommon("back")}
                            </Button>

                            {currentStep < steps.length - 1 ? (
                                <Button onClick={handleNext} type="button">
                                    {tCommon("next")} <ChevronRight className="ms-2 h-4 w-4 rtl:rotate-180" />
                                </Button>
                            ) : (
                                <Button onClick={handleSubmit(onSubmitForm)} disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                                            {tCommon("saving")}
                                        </>
                                    ) : (
                                        <>
                                            <Check className="me-2 h-4 w-4" />
                                            {tCommon("save")}
                                        </>
                                    )}
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>
            </Form>
        </FormProvider>
    );
}
