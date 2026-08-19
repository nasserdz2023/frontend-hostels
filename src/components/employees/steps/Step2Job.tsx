"use client";

import { useTranslations } from "next-intl";
import { useSettingsStore } from "@/lib/stores/settings";
import { useFormContext } from "react-hook-form";
import { useEffect, useState } from "react";
import { Wand2, Info, AlertTriangle, Briefcase, ArrowRightLeft, ExternalLink, Clock, Ban, UserX, FileText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { employeesApi } from "@/lib/api/employees";
import { locationsApi, District, Municipality } from "@/lib/api/locations";
import { institutionsApi } from "@/lib/api/institutions";
import { useEmployeesStore } from "@/lib/stores/employees";
import { toast } from "sonner";

interface Step2Props {
    institutions: any[]; // Still pass institutions or use store
    employeeId?: string; // For edit mode - exclude from duplicate checks
}

export function Step2Job({ institutions, employeeId }: Step2Props) {
    const t = useTranslations("employees.fields");
    const tCommon = useTranslations("common");
    const tOptions = useTranslations("employees.options");
    const { control, watch, setValue } = useFormContext();
    const { grades, positions, departments, offices, fetchOffices } = useEmployeesStore();

    // Geographic data state
    const [districts, setDistricts] = useState<District[]>([]);
    const [municipalities, setMunicipalities] = useState<Municipality[]>([]);

    // Watch department_id for loading offices
    const selectedDepartmentId = watch("department_id");

    // Watch original admin type
    const originalAdminType = watch("original_administration_type");

    // Watch position for conditional rendering
    const selectedPositionId = watch("position_id");
    const legalPosition = watch("legal_position");

    // Legal position descriptions with legal references (الأمر 06-03)
    const LEGAL_POSITION_INFO: Record<string, { title: string; description: string; reference: string; icon: string }> = {
        ACTIVE: {
            title: "القيام بالعمل",
            description: "الوضعية الأساسية للموظف. يمارس مهامه الوظيفية في مؤسسته الأصلية ويتمتع بجميع الحقوق والامتيازات القانونية (الراتب، الترقية، الأقدمية، التغطية الاجتماعية).",
            reference: "الأمر 06-03، المادة 127",
            icon: "briefcase",
        },
        SECONDMENT: {
            title: "انتداب (Détachement)",
            description: "يُوضع الموظف خارج سلكه الأصلي مع استمرار حقوقه في الأقدمية والترقية والتقاعد في إدارته الأم. يُدفع الراتب من الإدارة المستقبِلة. العودة للإدارة الأصلية تلقائية بقوة القانون عند انتهاء مدة الانتداب.",
            reference: "الأمر 06-03، المواد 133-136",
            icon: "external-link",
        },
        AVAILABILITY: {
            title: "استيداع (Disponibilité)",
            description: "وضعية يطلبها الموظف للتوقف مؤقتاً عن العمل لأسباب شخصية (مرض، دراسة، رعاية عائلية...). لا يتقاضى راتباً خلال هذه الفترة، وقد تُحتسب الأقدمية حسب الحالة.",
            reference: "الأمر 06-03، المادة 137",
            icon: "clock",
        },
        MISE_A_DISPOSITION: {
            title: "تحت التصرف (Mise à disposition)",
            description: "وضعية استثنائية يُوضع فيها الموظف تحت تصرف إدارة أخرى أو هيئة ذات منفعة عامة لمهمة مؤقتة. يبقى تابعاً تماماً لإدارته الأصلية التي تدفع راتبه بالكامل، وتستمر حقوقه في الترقية والأقدمية بشكل طبيعي.",
            reference: "الأمر 06-03، المواد 138-140",
            icon: "arrow-right-left",
        },
        DETACHMENT: {
            title: "خارج الإطار (Hors cadre)",
            description: "وضعية خاصة جداً لشاغلي الوظائف العليا فقط. يُطلبها الموظف للخدمة في مؤسسات لا تخضع للوظيفة العمومية (هيئات دولية، شركات اقتصادية كبرى). يشترط 15 سنة خدمة فعلية على الأقل. يتوقف حساب الأقدمية والترقية في السلك الأصلي.",
            reference: "الأمر 06-03، المادة 141",
            icon: "alert-triangle",
        },
        MILITARY_SERVICE: {
            title: "الخدمة الوطنية",
            description: "وضعية يؤدي فيها الموظف واجب الخدمة الوطنية. تُحتفظ له بمنصبه ويعود إليه بعد انتهاء الخدمة. تُحتسب مدة الخدمة الوطنية ضمن الأقدمية.",
            reference: "قانون الخدمة الوطنية",
            icon: "ban",
        },
        RETIRED: {
            title: "متقاعد (Retraité)",
            description: "حالة إنهاء الخدمة بعد استيفاء شروط التقاعد. ملاحظة: لا تُعتبر وضعية قانونية حسب المادة 127 من الأمر 06-03، بل هي مرحلة إنهاء الخدمة.",
            reference: "الأمر 06-03، المادة 127 (ملاحظة)",
            icon: "user-x",
        },
        SUSPENDED: {
            title: "موقوف (Suspendu)",
            description: "توقيف مؤقت عن العمل بناءً على قرار تأديبي في انتظار التحقيق. ملاحظة: لا تُعتبر وضعية قانونية بل جزاء تأديبي مؤقت حسب المادة 127.",
            reference: "الأمر 06-03، المادة 127 (ملاحظة)",
            icon: "ban",
        },
    };

    const selectLegalIcon = (iconName: string) => {
        switch (iconName) {
            case "briefcase": return <Briefcase className="h-4 w-4" />;
            case "external-link": return <ExternalLink className="h-4 w-4" />;
            case "clock": return <Clock className="h-4 w-4" />;
            case "arrow-right-left": return <ArrowRightLeft className="h-4 w-4" />;
            case "alert-triangle": return <AlertTriangle className="h-4 w-4" />;
            case "ban": return <Ban className="h-4 w-4" />;
            case "user-x": return <UserX className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    // Watch secondary positions and dual designation constraints
    const secondaryPositionId = watch("secondary_position_id");
    const primaryAppointmentType = watch("appointment_type");
    const secondaryAppointmentType = watch("secondary_appointment_type");
    const [showSecondaryPosition, setShowSecondaryPosition] = useState(false);

    // Show secondary position if field already has value from initial data
    useEffect(() => {
        if (secondaryPositionId && !showSecondaryPosition) {
            setShowSecondaryPosition(true);
        }
    }, [secondaryPositionId]);

    // Secondary position options
    const [availableSecondaryInstitutions, setAvailableSecondaryInstitutions] = useState<any[]>([]);

    // Position codes that require specific location types
    // LYD = مندوب محلي للشباب (Local Youth Delegate) → Municipality
    // MSA = ملحق بلدي للرياضة (Municipal Sports Attaché) → Municipality
    // District Advisor positions → District
    const MUNICIPALITY_POSITION_CODES = ['LYD', 'MSA'];
    const DISTRICT_POSITION_CODES = ['DA', 'DIST_ADV'];

    const selectedPositionObj = positions.find(p => p.id === selectedPositionId);
    const secPositionObj = positions.find(p => p.id === secondaryPositionId);

    const isPrimaryDirector = selectedPositionObj && (
        selectedPositionObj.name_ar?.includes('مدير') ||
        selectedPositionObj.is_senior ||
        ['DIR', 'DIRECTOR', 'MNG'].includes(selectedPositionObj.code)
    );

    const isSecondaryDirector = secPositionObj && (
        secPositionObj.name_ar?.includes('مدير') ||
        secPositionObj.is_senior ||
        ['DIR', 'DIRECTOR', 'MNG'].includes(secPositionObj.code)
    );

    // We fetch available secondary institutions if ANY of the positions is a director
    const fetchWithoutDirector = isPrimaryDirector || isSecondaryDirector;

    useEffect(() => {
        if (!fetchWithoutDirector) return;
        const fetchAvailableInstitutions = async () => {
            try {
                // Fetch up to 200 institutions that don't have directors
                // @ts-ignore - The API accepts these extra backend params if we pass them in a raw GET or we'll just use the regular API
                const resp = await institutionsApi.getAll({ size: 200, status: 'active', without_director: true } as any);
                setAvailableSecondaryInstitutions(resp.items);
            } catch (error) {
                toast.error("فشل في جلب المؤسسات المتاحة");
            }
        };
        fetchAvailableInstitutions();
    }, [fetchWithoutDirector]);

    // Handle municipalities fetching with position exclusion logic
    const requiresMunicipality = selectedPositionObj && (
        MUNICIPALITY_POSITION_CODES.includes(selectedPositionObj.code) ||
        selectedPositionObj.name_ar?.includes('مندوب') ||
        selectedPositionObj.name_ar?.includes('ملحق بلدي') ||
        selectedPositionObj.name_ar?.includes('ملحق رياضة')
    );

    useEffect(() => {
        const defaultWilayaCode = useSettingsStore.getState().getDefaultWilayaCode();

        // Find which keyword to exclude based on the selected positions
        let excludeKeyword = undefined;
        const allPositionsNameArr = [
            selectedPositionObj?.name_ar || "",
            secPositionObj?.name_ar || ""
        ];

        if (allPositionsNameArr.some(name => name.includes('مندوب'))) {
            excludeKeyword = 'مندوب';
        } else if (allPositionsNameArr.some(name => name.includes('ملحق'))) {
            excludeKeyword = 'ملحق';
        }

        institutionsApi.getMunicipalities(defaultWilayaCode, excludeKeyword, employeeId)
            .then(setMunicipalities)
            .catch(() => toast.error("فشل في جلب البلديات"));
    }, [selectedPositionObj?.id, secPositionObj?.id, employeeId]);

    // Derive position properties for conditional logic
    const selectedPosition = positions.find(p => p.id === selectedPositionId);
    const isSeniorPosition = selectedPosition?.is_senior || false;

    // Check by code OR by name pattern for better detection
    const requiresDistrict = selectedPositionObj && (
        DISTRICT_POSITION_CODES.includes(selectedPositionObj.code) ||
        selectedPositionObj.name_ar?.includes('مستشار مقاطعة') ||
        selectedPositionObj.name_ar?.includes('مستشار دائرة')
    );
    const requiresInstitution = !requiresMunicipality && !requiresDistrict;

    const requiresSecondaryMunicipality = secPositionObj && (
        MUNICIPALITY_POSITION_CODES.includes(secPositionObj.code) ||
        secPositionObj.name_ar?.includes('مندوب') ||
        secPositionObj.name_ar?.includes('ملحق بلدي') ||
        secPositionObj.name_ar?.includes('ملحق رياضة')
    );

    const requiresSecondaryDistrict = secPositionObj && (
        DISTRICT_POSITION_CODES.includes(secPositionObj.code) ||
        secPositionObj.name_ar?.includes('مستشار مقاطعة') ||
        secPositionObj.name_ar?.includes('مستشار دائرة')
    );

    const requiresSecondaryInstitution = !requiresSecondaryMunicipality && !requiresSecondaryDistrict;

    // Fetch districts data on mount
    useEffect(() => {
        locationsApi.getDistricts().then(setDistricts).catch(() => toast.error("فشل في جلب المقاطعات"));
    }, []);

    // Watch grade for position suggestion
    const selectedGradeId = watch("grade_id");

    // Fetch offices when department changes + Auto-select DJS institution
    useEffect(() => {
        if (selectedDepartmentId) {
            fetchOffices(selectedDepartmentId);
            // Reset office when department changes
            // Office is reset manually in onValueChange of department field

            // Auto-select DJS institution when department/office is selected
            // DJS = مديرية الشباب والرياضة (find by code or name)
            const djsInstitution = institutions.find(
                i => i.code === 'DJS' || i.name_ar?.includes('مديرية الشباب')
            );
            if (djsInstitution) {
                setValue("institution_id", djsInstitution.id);
            }
        } else {
            // Clear offices if no department selected
            useEmployeesStore.setState({ offices: [] });
        }
    }, [selectedDepartmentId, fetchOffices, setValue, institutions]);

    // Auto-suggest position based on grade (same name pattern)
    useEffect(() => {
        if (selectedGradeId && positions.length > 0) {
            const selectedGrade = grades.find(g => g.id === selectedGradeId);
            if (selectedGrade) {
                // Try to find a position with similar name
                const matchingPosition = positions.find(
                    p => p.name_ar === selectedGrade.name_ar || p.code === selectedGrade.code
                );
                if (matchingPosition) {
                    setValue("position_id", matchingPosition.id);
                }
            }
        }
    }, [selectedGradeId, grades, positions, setValue]);

    // Clear institution when position requires municipality/district
    // (Municipal Delegate, Sports Attaché, District Advisor are linked to municipality/district only)
    useEffect(() => {
        if (requiresMunicipality || requiresDistrict) {
            // Clear institution_id since this position is linked to municipality/district
            setValue("institution_id", "");
        }
    }, [requiresMunicipality, requiresDistrict, setValue]);

    // Clear secondary fields when secondary position requirements change
    useEffect(() => {
        if (requiresSecondaryMunicipality || requiresSecondaryDistrict) {
            setValue("secondary_institution_id", "");
        }
        if (requiresSecondaryInstitution || requiresSecondaryDistrict) {
            setValue("secondary_municipality_id", "");
        }
        if (requiresSecondaryInstitution || requiresSecondaryMunicipality) {
            setValue("secondary_district_id", "");
        }
    }, [requiresSecondaryMunicipality, requiresSecondaryDistrict, requiresSecondaryInstitution, setValue]);

    // Determine if secondary position requires department/office selection
    const secondaryPositionRequiresDepartment = secPositionObj && (
        secPositionObj.code === 'BM' || // رئيس المصلحة
        secPositionObj.code === 'OH' || // رئيس مكتب
        (secPositionObj.name_ar && (
            secPositionObj.name_ar.includes('رئيس المصلحة') ||
            secPositionObj.name_ar.includes('رئيس مكتب') ||
            secPositionObj.name_ar.includes('رئيس قسم')
        ))
    );
    const secondaryPositionRequiresOffice = secPositionObj && (
        secPositionObj.code === 'OH' || // رئيس مكتب
        (secPositionObj.name_ar && secPositionObj.name_ar.includes('رئيس مكتب'))
    );

    // Fetch offices for secondary department
    const [secondaryOffices, setSecondaryOffices] = useState<any[]>([]);
    const watchSecondaryDepartmentId = watch("secondary_department_id");

    useEffect(() => {
        if (watchSecondaryDepartmentId) {
            employeesApi.getOffices(watchSecondaryDepartmentId).then(setSecondaryOffices).catch(() => {
                setSecondaryOffices([]);
            });
        } else {
            setSecondaryOffices([]);
        }
    }, [watchSecondaryDepartmentId]);

    // Auto-update work_location_type based on position requirements
    useEffect(() => {
        if (requiresDistrict) {
            setValue("work_location_type", "district");
        } else if (requiresMunicipality) {
            setValue("work_location_type", "municipality");
        } else if (selectedPosition) {
            // Default to institution for regular positions
            setValue("work_location_type", "institution");
        }
    }, [requiresDistrict, requiresMunicipality, selectedPosition, setValue]);

    // Rank options: 01 to 12
    const rankOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

    // Administration types
    const adminTypes = ['DJS', 'ODEJ', 'OPOW', 'OTHER'];

    // Prepare options for SearchableSelect
    const gradeOptions = grades.map(g => ({ value: g.id, label: g.name_ar }));
    const positionOptions = positions.map(p => ({ value: p.id, label: `${p.name_ar}${p.is_senior ? ' ⭐' : ''}` }));

    // Generate institution options depending on whether the position is a director role
    // NOTE: This includes the currently assigned institution if editing, since the backend `without_director` check
    // DOES NOT exclude the employee's current institution yet, but wait, the backend actually drops the institution!
    // So if editing, we might miss the current institution. To fix this, we ALWAYS add the currently selected institution to the options.
    const rawInstitutionOptions = institutions.map(i => ({ value: i.id, label: i.name_ar }));
    const availableInstitutions = availableSecondaryInstitutions || [];

    // Convert isPrimaryDirector to boolean with fallback to false
    const primaryDirectorFlag = !!isPrimaryDirector;

    const primaryInstitutionOptions = primaryDirectorFlag && availableInstitutions.length > 0
        ? availableInstitutions.map(i => ({ value: i.id, label: i.name_ar }))
        : rawInstitutionOptions;

    // Always ensure the currently selected institution is an option, even if it has a director (e.g. editing their own profile)
    const currentInstId = control._defaultValues?.institution_id;
    if (currentInstId && !primaryInstitutionOptions.find(o => o.value === currentInstId)) {
        const found = rawInstitutionOptions.find(o => o.value === currentInstId);
        if (found) primaryInstitutionOptions.push(found);
    }

    const secondaryInstitutionOptions = isSecondaryDirector && availableInstitutions.length > 0
        ? availableInstitutions.map(i => ({ value: i.id, label: i.name_ar }))
        : rawInstitutionOptions;

    const currentSecInstId = control._defaultValues?.secondary_institution_id;
    if (currentSecInstId && !secondaryInstitutionOptions.find(o => o.value === currentSecInstId)) {
        const found = rawInstitutionOptions.find(o => o.value === currentSecInstId);
        if (found) secondaryInstitutionOptions.push(found);
    }

    const officeOptions = offices.map(o => ({ value: o.id, label: o.name_ar }));

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Employee Number */}
                <FormField
                    control={control}
                    name="employee_number"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("employeeNumber")} <span className="text-destructive">*</span></FormLabel>
                            <div className="flex gap-2">
                                <FormControl>
                                    <Input
                                        name={field.name}
                                        ref={field.ref}
                                        onBlur={async (e) => {
                                            field.onBlur(); // Validate Zod schema first
                                            if (e.target.value) {
                                                try {
                                                    // Pass employeeId to exclude current employee from check
                                                    const result = await employeesApi.checkExistence('employee_number', e.target.value, employeeId);
                                                    if (result.exists) {
                                                        control.setError("employee_number", {
                                                            type: "manual",
                                                            message: result.message || "الرقم الوظيفي مستخدم بالفعل"
                                                        });
                                                    } else {
                                                        control._options.shouldFocusError = true; // Force re-validation
                                                    }
                                                } catch (err) {
                                                    // Silently handle uniqueness check failure
                                                }
                                            }
                                        }}
                                        onChange={field.onChange}
                                        value={field.value ?? ""}
                                        placeholder={t("employeeNumber")}
                                    />
                                </FormControl>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0"
                                    onClick={async () => {
                                        try {
                                            const newNumber = await employeesApi.generateNumber();
                                            field.onChange(newNumber);
                                            toast.success("تم توليد الرقم الوظيفي");
                                        } catch (error) {
                                            toast.error("فشل توليد الرقم الوظيفي");
                                        }
                                    }}
                                    title={tCommon("generateAutomatic")}
                                >
                                    <Wand2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Grade - SearchableSelect */}
                <FormField
                    control={control}
                    name="grade_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("grade")} <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                                <SearchableSelect
                                    options={gradeOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder={t("grade")}
                                    searchPlaceholder={tCommon("search")}
                                    emptyMessage={tCommon("noResults")}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Position - SearchableSelect */}
                <FormField
                    control={control}
                    name="position_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("position")} <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                                <SearchableSelect
                                    options={positionOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder={t("position")}
                                    searchPlaceholder={tCommon("search")}
                                    emptyMessage={tCommon("noResults")}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Department */}
                <FormField
                    control={control}
                    name="department_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("department")}</FormLabel>
                            <FormControl>
                                <SearchableSelect
                                    options={departments.map(d => ({ value: d.id, label: d.name_ar }))}
                                    value={field.value}
                                    onValueChange={(val) => {
                                        field.onChange(val);
                                        // Reset office when department changes
                                        if (val !== field.value) {
                                            setValue("office_id", "");
                                        }
                                    }}
                                    placeholder={t("department")}
                                    searchPlaceholder={tCommon("search")}
                                    emptyMessage={tCommon("noResults")}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Office - Dependent on Department */}
                <FormField
                    control={control}
                    name="office_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("office") || "المكتب"}</FormLabel>
                            <FormControl>
                                <SearchableSelect
                                    options={officeOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder={t("office") || "اختر المكتب"}
                                    searchPlaceholder={tCommon("search")}
                                    emptyMessage={selectedDepartmentId ? tCommon("noResults") : "اختر المصلحة أولاً"}
                                    disabled={!selectedDepartmentId}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Employment Type */}
                <FormField
                    control={control}
                    name="employment_type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("employmentType")} <span className="text-destructive">*</span></FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("employmentType")} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="FULL_TIME">{tOptions("employmentType.FULL_TIME")}</SelectItem>
                                    <SelectItem value="PART_TIME">{tOptions("employmentType.PART_TIME")}</SelectItem>
                                    <SelectItem value="CONTRACT">{tOptions("employmentType.CONTRACT")}</SelectItem>
                                    <SelectItem value="INTERN">{tOptions("employmentType.INTERN")}</SelectItem>
                                    <SelectItem value="TEMPORARY">{tOptions("employmentType.TEMPORARY")}</SelectItem>
                                    <SelectItem value="FREELANCE">{tOptions("employmentType.FREELANCE")}</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Hire Date */}
                <FormField
                    control={control}
                    name="hire_date"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("hireDate")} <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                                <DateTimePicker
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    placeHolder={t("hireDate")}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="confirmation_date"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("confirmationDate") || "تاريخ الترسيم"}</FormLabel>
                            <FormControl>
                                <DateTimePicker
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    placeHolder={t("confirmationDate") || "تاريخ الترسيم"}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="last_promotion_date"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("lastPromotionDate") || "تاريخ آخر ترقية"}</FormLabel>
                            <FormControl>
                                <DateTimePicker
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    placeHolder={t("lastPromotionDate") || "تاريخ آخر ترقية"}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Rank */}
                <FormField
                    control={control}
                    name="rank"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("rank")}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("rank")} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {rankOptions.map((rank) => (
                                        <SelectItem key={rank} value={rank}>
                                            {rank}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Original Administration Type */}
                <FormField
                    control={control}
                    name="original_administration_type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("originalAdministration")} <span className="text-destructive">*</span></FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("originalAdministration")} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {adminTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {tOptions(`orgAdminType.${type}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Original Department (Custom text if type is OTHER) */}
                {originalAdminType === 'OTHER' && (
                    <FormField
                        control={control}
                        name="original_department"
                        render={({ field }) => (
                            <FormItem className="animate-in fade-in slide-in-from-top-2">
                                <FormLabel>{t("originalDepartment")}</FormLabel>
                                <FormControl>
                                    <Input {...field} value={field.value || ""} placeholder={t("originalDepartment")} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>

            {/* Geographic Assignment Section - Position-Based */}
            <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                    مكان العمل {isSeniorPosition && <span className="text-amber-500">(منصب عالي ⭐)</span>}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Legal Position */}
                    <FormField
                        control={control}
                        name="legal_position"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>الوضعية القانونية</FormLabel>
                                <Select
                                    onValueChange={(value) => {
                                        field.onChange(value);
                                        // Clear institution for positions outside active work (keep for AVAILABILITY)
                                        if (value === 'DETACHMENT' || value === 'RETIRED' || value === 'MILITARY_SERVICE' || value === 'SECONDMENT' || value === 'MISE_A_DISPOSITION') {
                                            setValue("institution_id", null);
                                        }
                                    }}
                                    value={field.value || "ACTIVE"}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="اختر الوضعية" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">القيام بالعمل</SelectItem>
                                        <SelectItem value="SECONDMENT">انتداب</SelectItem>
                                        <SelectItem value="MISE_A_DISPOSITION">تحت التصرف</SelectItem>
                                        <SelectItem value="AVAILABILITY">استيداع</SelectItem>
                                        <SelectItem value="DETACHMENT">خارج الإطار</SelectItem>
                                        <SelectItem value="MILITARY_SERVICE">الخدمة الوطنية</SelectItem>
                                        <SelectItem value="RETIRED">متقاعد</SelectItem>
                                        <SelectItem value="SUSPENDED">موقوف</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {/* Legal Position Info Alert */}
                    {legalPosition && (
                        <div className="mt-2">
                            <Alert variant={legalPosition === 'DETACHMENT' ? 'warning' : 'default'}>
                                {selectLegalIcon(LEGAL_POSITION_INFO[legalPosition]?.icon || 'info')}
                                <AlertTitle className="text-xs font-bold flex items-center gap-1">
                                    {LEGAL_POSITION_INFO[legalPosition]?.title || legalPosition}
                                </AlertTitle>
                                <AlertDescription className="text-xs mt-1 leading-relaxed">
                                    {LEGAL_POSITION_INFO[legalPosition]?.description}
                                    <div className="mt-1.5 text-[10px] text-muted-foreground flex items-center gap-1">
                                        <BookOpen className="h-3 w-3 inline" />
                                        المرجع: {LEGAL_POSITION_INFO[legalPosition]?.reference}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    {/* Conditional: Legal Position Details */}
                    {legalPosition && legalPosition !== 'ACTIVE' && (
                        <>
                            <FormField
                                control={control}
                                name="legal_position_start"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>تاريخ بداية الوضعية</FormLabel>
                                        <FormControl>
                                            <DateTimePicker
                                                value={field.value || ""}
                                                onChange={field.onChange}
                                                placeHolder="تاريخ بداية الوضعية"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {(legalPosition === 'SECONDMENT' || legalPosition === 'DETACHMENT' || legalPosition === 'MISE_A_DISPOSITION') && (
                                <FormField
                                    control={control}
                                    name="legal_position_destination"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>الجهة المستقبلة</FormLabel>
                                            <FormControl>
                                                <Input {...field} value={field.value || ""} placeholder="الجهة المستقبلة" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <FormField
                                control={control}
                                name="legal_position_notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>ملاحظات</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value || ""} placeholder="ملاحظات" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </>
                    )}
                    {/* Show Institution for regular positions */}
                    {requiresInstitution && legalPosition === 'ACTIVE' && (
                        <FormField
                            control={control}
                            name="institution_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>المؤسسة <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <SearchableSelect
                                            options={primaryInstitutionOptions}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="اختر المؤسسة"
                                            searchPlaceholder={tCommon("search")}
                                            emptyMessage={tCommon("noResults")}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {/* Show District for District Advisor positions */}
                    {requiresDistrict && (
                        <FormField
                            control={control}
                            name="work_district_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>المقاطعة <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <SearchableSelect
                                            options={districts.map(d => ({ value: d.id, label: d.name_ar }))}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="اختر المقاطعة"
                                            searchPlaceholder={tCommon("search")}
                                            emptyMessage={tCommon("noResults")}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {/* Show Municipality for Municipal Delegate/Attaché positions */}
                    {requiresMunicipality && (
                        <FormField
                            control={control}
                            name="work_municipality_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>البلدية <span className="text-destructive">*</span></FormLabel>
                                    <FormControl>
                                        <SearchableSelect
                                            options={municipalities.map(m => ({ value: m.id, label: m.name_ar }))}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="اختر البلدية"
                                            searchPlaceholder={tCommon("search")}
                                            emptyMessage={tCommon("noResults")}
                                        />
                                    </FormControl>
                                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                        <span>⚠️</span>
                                        <span>تظهر فقط البلديات التي ليس لديها {selectedPositionObj?.name_ar?.includes('مندوب') ? 'مندوب' : 'ملحق'}  حالياً</span>
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {/* Appointment Type - Only for Senior Positions */}
                    {isSeniorPosition && (
                        <FormField
                            control={control}
                            name="appointment_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>طبيعة التعيين <span className="text-destructive">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="اختر طبيعة التعيين" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="APPOINTED">معين (بقرار)</SelectItem>
                                            <SelectItem value="ASSIGNED">مكلف (مؤقت)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {/* Dual Appointment constraint warning */}
                    {primaryAppointmentType === "APPOINTED" && secondaryAppointmentType === "APPOINTED" && (
                        <div className="col-span-1 md:col-span-2 mt-2">
                            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-200">
                                ⚠️ لا يُمكِن أَن يَكون المُوظَف مُعَيناً فِي مَنصَبين. يَجِب أَن يَكون أَحدَهُما عَلى الأقَل بِصِفَةِ مُكَلّف (مُؤقَت).
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Secondary Position Section */}
            <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span>تكليف بمنصب ثانٍ (اختياري)</span>
                        {secondaryPositionId && (
                            <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full font-bold">
                                منصبين
                            </span>
                        )}
                    </h4>
                    {!showSecondaryPosition ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => setShowSecondaryPosition(true)}
                        >
                            + إضافة منصب ثانٍ
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                                setShowSecondaryPosition(false);
                                setValue("secondary_position_id", "");
                                setValue("secondary_appointment_type", "");
                                setValue("secondary_institution_id", "");
                                setValue("secondary_district_id", "");
                                setValue("secondary_municipality_id", "");
                                setValue("secondary_department_id", null);
                                setValue("secondary_office_id", null);
                            }}
                        >
                            إلغاء المنصب الثاني
                        </Button>
                    )}
                </div>

                {showSecondaryPosition && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
                        {/* Secondary Position */}
                        <FormField
                            control={control}
                            name="secondary_position_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>المنصب الثاني</FormLabel>
                                    <FormControl>
                                        <SearchableSelect
                                            options={positionOptions}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="اختر المنصب الثاني"
                                            searchPlaceholder={tCommon("search")}
                                            emptyMessage={tCommon("noResults")}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Secondary Appointment Type */}
                        <FormField
                            control={control}
                            name="secondary_appointment_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>طبيعة التعيين</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                        <FormControl>
                                            <SelectTrigger className={primaryAppointmentType === "APPOINTED" && field.value === "APPOINTED" ? "border-red-500" : ""}>
                                                <SelectValue placeholder="اختر طبيعة التعيين" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="APPOINTED">معين (بقرار)</SelectItem>
                                            <SelectItem value="ASSIGNED">مكلف (مؤقت)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Secondary Location */}
                        <div className="md:col-span-2">
                            {requiresSecondaryInstitution && (
                                <FormField
                                    control={control}
                                    name="secondary_institution_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>مؤسسة المنصب الثاني (اختياري)</FormLabel>
                                            <FormControl>
                                                <SearchableSelect
                                                    options={secondaryInstitutionOptions}
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    placeholder="اختر المؤسسة (إذا كان في مؤسسة أخرى)"
                                                    searchPlaceholder={tCommon("search")}
                                                    emptyMessage={tCommon("noResults")}
                                                />
                                            </FormControl>
                                            <p className="text-xs text-slate-500 mt-1">اتركه فارغاً إذا كان المنصب الثاني في نفس المؤسسة</p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* Secondary Department (for رئيسي المصلحة/القسم positions) */}
                            {secondaryPositionId && secondaryPositionRequiresDepartment && (
                                <FormField
                                    control={control}
                                    name="secondary_department_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>المصلحة (منصب ثاني)</FormLabel>
                                            <FormControl>
                                                <SearchableSelect
                                                    options={departments.map((d) => ({ value: d.id, label: d.name_ar }))}
                                                    value={field.value}
                                                    onValueChange={(val) => {
                                                        field.onChange(val);
                                                        // Reset office when department changes
                                                        setValue("secondary_office_id", null);
                                                    }}
                                                    placeholder="اختر المصلحة..."
                                                    searchPlaceholder={tCommon("search")}
                                                    emptyMessage={tCommon("noResults")}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* Secondary Office (for رئيس مكتب position) */}
                            {secondaryPositionId && secondaryPositionRequiresOffice && watchSecondaryDepartmentId && (
                                <FormField
                                    control={control}
                                    name="secondary_office_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>المكتب (منصب ثاني)</FormLabel>
                                            <FormControl>
                                                <SearchableSelect
                                                    options={secondaryOffices.map((o) => ({ value: o.id, label: o.name_ar }))}
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    placeholder="اختر المكتب..."
                                                    searchPlaceholder={tCommon("search")}
                                                    emptyMessage={!watchSecondaryDepartmentId ? "اختر المصلحة أولاً" : tCommon("noResults")}
                                                    disabled={!watchSecondaryDepartmentId}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {requiresSecondaryDistrict && (
                                <FormField
                                    control={control}
                                    name="secondary_district_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>مقاطعة المنصب الثاني (اختياري)</FormLabel>
                                            <FormControl>
                                                <SearchableSelect
                                                    options={districts.map(d => ({ value: d.id, label: d.name_ar }))}
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    placeholder="اختر المقاطعة"
                                                    searchPlaceholder={tCommon("search")}
                                                    emptyMessage={tCommon("noResults")}
                                                />
                                            </FormControl>
                                            <p className="text-xs text-slate-500 mt-1">اتركه فارغاً إذا كان التعيين في نفس مكان العمل</p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {requiresSecondaryMunicipality && (
                                <FormField
                                    control={control}
                                    name="secondary_municipality_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>بلدية المنصب الثاني (اختياري)</FormLabel>
                                            <FormControl>
                                                <SearchableSelect
                                                    options={municipalities.map(d => ({ value: d.id, label: d.name_ar }))}
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    placeholder="اختر البلدية"
                                                    searchPlaceholder={tCommon("search")}
                                                    emptyMessage={tCommon("noResults")}
                                                />
                                            </FormControl>
                                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                                <span>⚠️</span>
                                                <span>تظهر فقط البلديات التي ليس لديها {secPositionObj?.name_ar?.includes('مندوب') ? 'مندوب' : 'ملحق'}  حالياً</span>
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">اتركه فارغاً إذا كان التعيين في نفس مكان العمل</p>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
