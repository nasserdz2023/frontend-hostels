"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
    ArrowRightLeft, ArrowUp, BadgeCheck, Briefcase, Calendar,
    ChevronUp, FileText, GitBranch, LogOut, Route, Scale,
    Sunset, ToggleLeft, Upload, UserPlus, X, User,
    Building2, Stamp, CalendarCheck, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { EmployeeSelector } from "@/components/hr/EmployeeSelector";
import {
    careerApi,
    CreateCareerEventDTO,
    CareerEvent,
    EVENT_TYPE_LABELS,
    EVENT_TYPE_COLORS,
} from "@/lib/api/career";
import { employeesApi, Employee } from "@/lib/api/employees";
import { gradesApi, Grade } from "@/lib/api/grades";
import { positionsApi, Position } from "@/lib/api/positions";
import { institutionsApi, YouthInstitution } from "@/lib/api/institutions";
import { departmentsApi, DepartmentResponse } from "@/lib/api/departments";

// Map icon names to actual Lucide components
const EVENT_LUCIDE_ICONS: Record<string, React.ElementType> = {
    UserPlus, BadgeCheck, ArrowUp, ArrowRightLeft,
    Briefcase, ChevronUp, GitBranch, ToggleLeft,
    Sunset, LogOut,
};

// Short descriptions for each event type (static text, no placeholders)
const EVENT_TYPE_SHORT_DESC: Record<string, string> = {
    HIRE: 'توظيف موظف جديد في المنصب والدرجة',
    CONFIRMATION: 'ترسيم الموظف بعد انتهاء فترة التجربة',
    PROMOTION: 'ترقية الموظف إلى درجة أعلى',
    TRANSFER: 'نقل الموظف من مؤسسة إلى أخرى',
    POSITION_CHANGE: 'تغيير المنصب الوظيفي للموظف',
    GRADE_CHANGE: 'تغيير درجة الموظف',
    DEPARTMENT_CHANGE: 'تغيير مصلحة/قسم الموظف',
    STATUS_CHANGE: 'تغيير الوضعية القانونية للموظف',
    RETIREMENT: 'إحالة الموظف على التقاعد',
    END_OF_SERVICE: 'إنهاء خدمة الموظف',
};



const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface CareerEventFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
    employeeId?: string;
    employeeData?: Employee;
    initialData?: CareerEvent;
}

export function CareerEventForm({ onSuccess, onCancel, employeeId: propsEmployeeId, employeeData: propsEmployeeData, initialData }: CareerEventFormProps) {
    const t = useTranslations("hr.career");
    const router = useRouter();

    // Form state
    const [employeeId, setEmployeeId] = useState(propsEmployeeId || "");
    const [employee, setEmployee] = useState<Employee | null>(propsEmployeeData || null);
    const [eventType, setEventType] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [documentReference, setDocumentReference] = useState("");
    const [notes, setNotes] = useState("");

    // Dynamic fields
    const [oldGradeId, setOldGradeId] = useState("");
    const [newGradeId, setNewGradeId] = useState("");
    const [oldPositionId, setOldPositionId] = useState("");
    const [newPositionId, setNewPositionId] = useState("");
    const [oldInstitutionId, setOldInstitutionId] = useState("");
    const [newInstitutionId, setNewInstitutionId] = useState("");
    const [oldDepartmentId, setOldDepartmentId] = useState("");
    const [newDepartmentId, setNewDepartmentId] = useState("");
    const [oldStatus, setOldStatus] = useState("");
    const [newStatus, setNewStatus] = useState("");

    // Reference data lists
    const [grades, setGrades] = useState<Grade[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [institutions, setInstitutions] = useState<YouthInstitution[]>([]);
    const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
    const [loadingRefs, setLoadingRefs] = useState(false);

    // Legal fields
    const [legalBasis, setLegalBasis] = useState("");
    const [controllerVisa, setControllerVisa] = useState("");
    const [controllerVisaDate, setControllerVisaDate] = useState("");
    const [decisionDate, setDecisionDate] = useState("");
    const [issuingAuthority, setIssuingAuthority] = useState("");

    // File upload
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Submission state
    const [submitting, setSubmitting] = useState(false);
    const isEditing = !!initialData;

    // Fetch employee details when selected
    useEffect(() => {
        if (employeeId) {
            employeesApi.getById(employeeId).then(setEmployee).catch(() => { });
        } else {
            setEmployee(null);
        }
    }, [employeeId]);

    // Load reference data on mount
    useEffect(() => {
        setLoadingRefs(true);
        Promise.all([
            gradesApi.getAll().then(setGrades).catch(() => {}),
            positionsApi.getAll().then(setPositions).catch(() => {}),
            institutionsApi.getAll({ size: 200 }).then(r => setInstitutions(r.items)).catch(() => {}),
            departmentsApi.getAll().then(setDepartments).catch(() => {}),
        ]).finally(() => setLoadingRefs(false));
    }, []);

    // Pre-populate form fields when editing existing event
    useEffect(() => {
        if (initialData) {
            setEventType(initialData.event_type || "");
            setEventDate(initialData.event_date?.split('T')[0] || "");
            setDocumentReference(initialData.document_reference || "");
            setNotes(initialData.notes || "");
            setOldGradeId(initialData.old_grade_id || "");
            setNewGradeId(initialData.new_grade_id || "");
            setOldPositionId(initialData.old_position_id || "");
            setNewPositionId(initialData.new_position_id || "");
            setOldInstitutionId(initialData.old_institution_id || "");
            setNewInstitutionId(initialData.new_institution_id || "");
            setOldDepartmentId(initialData.old_department_id || "");
            setNewDepartmentId(initialData.new_department_id || "");
            setOldStatus(initialData.old_status || "");
            setNewStatus(initialData.new_status || "");
            setControllerVisa(initialData.controller_visa || "");
            setControllerVisaDate(initialData.controller_visa_date || "");
            setDecisionDate(initialData.decision_date || "");
            setIssuingAuthority(initialData.issuing_authority || "");
            setLegalBasis(initialData.legal_basis || "");
        }
    }, [initialData]);

    // Reset dynamic fields when event type changes (but not when editing)
    useEffect(() => {
        if (isEditing) return;
        setOldGradeId("");
        setNewGradeId("");
        setOldPositionId("");
        setNewPositionId("");
        setOldInstitutionId("");
        setNewInstitutionId("");
        setOldDepartmentId("");
        setNewDepartmentId("");
        setOldStatus("");
        setNewStatus("");
    }, [eventType]);

    // Get the icon component for the selected event type
    const EventIcon = eventType ? (EVENT_LUCIDE_ICONS[eventType] || Route) : Route;

    // Get description in the right language (simplified - always shows Arabic for now)
    const getEventDescription = (type: string): string => {
        return EVENT_TYPE_SHORT_DESC[type] || '';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) {
            setFile(null);
            return;
        }
        if (selectedFile.size > MAX_FILE_SIZE) {
            toast.error(t('fileTooLarge'));
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        setFile(selectedFile);
    };

    const handleRemoveFile = () => {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleSubmit = async () => {
        // Validate required fields
        if (!employeeId) {
            toast.error(t('requiredFields'));
            return;
        }
        if (!eventType) {
            toast.error(t('requiredFields'));
            return;
        }
        if (!eventDate) {
            toast.error(t('requiredFields'));
            return;
        }

        setSubmitting(true);
        try {
            // Build the DTO — send all form values explicitly so backend can update them
            const data: CreateCareerEventDTO = {
                event_type: eventType,
                event_date: eventDate,
                document_reference: documentReference !== undefined ? documentReference : undefined,
                notes: notes !== undefined ? notes : undefined,
                legal_basis: legalBasis || null,
                controller_visa: controllerVisa || null,
                controller_visa_date: controllerVisaDate || null,
                decision_date: decisionDate || null,
                issuing_authority: issuingAuthority || null,
            };

            // Dynamic fields based on event type
            data.old_grade_id = oldGradeId || undefined;
            data.new_grade_id = newGradeId || undefined;
            data.old_position_id = oldPositionId || undefined;
            data.new_position_id = newPositionId || undefined;
            data.old_institution_id = oldInstitutionId || undefined;
            data.new_institution_id = newInstitutionId || undefined;
            data.old_department_id = oldDepartmentId || undefined;
            data.new_department_id = newDepartmentId || undefined;
            data.old_status = oldStatus || undefined;
            data.new_status = newStatus || undefined;

            // Create or update the event
            if (isEditing && initialData) {
                await careerApi.updateCareerEvent(employeeId, initialData.id, data);

                // Upload file if present (for edit)
                if (file) {
                    try {
                        await careerApi.uploadDocument(employeeId, initialData.id, file);
                    } catch {
                        toast.error(t('uploadError'));
                    }
                }

                toast.success(t('updateSuccess'));
            } else {
                const event = await careerApi.createCareerEvent(employeeId, data);

                // Upload file if present
                if (file) {
                    try {
                        await careerApi.uploadDocument(employeeId, event.id, file);
                    } catch {
                        toast.error(t('uploadError'));
                    }
                }

                toast.success(t('success'));
            }
            if (onSuccess) {
                onSuccess();
            } else if (propsEmployeeId) {
                router.push(`/employees/${propsEmployeeId}/career`);
            } else {
                router.push('/hr/career');
            }
        } catch (err: any) {
            console.error('Error creating career event:', err);
            toast.error(err?.response?.data?.detail || t('error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else if (propsEmployeeId) {
            router.push(`/employees/${propsEmployeeId}/career`);
        } else {
            router.push('/hr/career');
        }
    };

    // Render dynamic fields for the selected event type
    const renderDynamicFields = () => {
        if (!eventType) return null;

        switch (eventType) {
            case 'PROMOTION':
            case 'GRADE_CHANGE':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="old_grade_id">{t('oldGrade')}</Label>
                            <Select value={oldGradeId} onValueChange={setOldGradeId}>
                                <SelectTrigger id="old_grade_id" dir="rtl">
                                    <SelectValue placeholder={loadingRefs ? '...' : t('selectGrade')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingRefs ? (
                                        <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                                    ) : grades.length === 0 ? (
                                        <SelectItem value="empty" disabled>لا توجد رتب</SelectItem>
                                    ) : (
                                        grades.map(g => (
                                            <SelectItem key={g.id} value={g.id}>{g.name_ar}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new_grade_id">{t('newGrade')}</Label>
                            <Select value={newGradeId} onValueChange={setNewGradeId}>
                                <SelectTrigger id="new_grade_id" dir="rtl">
                                    <SelectValue placeholder={loadingRefs ? '...' : t('selectGrade')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingRefs ? (
                                        <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                                    ) : grades.length === 0 ? (
                                        <SelectItem value="empty" disabled>لا توجد رتب</SelectItem>
                                    ) : (
                                        grades.map(g => (
                                            <SelectItem key={g.id} value={g.id}>{g.name_ar}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );

            case 'POSITION_CHANGE':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="old_position_id">{t('oldPosition')}</Label>
                            <Select value={oldPositionId} onValueChange={setOldPositionId}>
                                <SelectTrigger id="old_position_id" dir="rtl">
                                    <SelectValue placeholder={loadingRefs ? '...' : t('selectPosition')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingRefs ? (
                                        <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                                    ) : positions.length === 0 ? (
                                        <SelectItem value="empty" disabled>لا توجد مناصب</SelectItem>
                                    ) : (
                                        positions.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name_ar}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new_position_id">{t('newPosition')}</Label>
                            <Select value={newPositionId} onValueChange={setNewPositionId}>
                                <SelectTrigger id="new_position_id" dir="rtl">
                                    <SelectValue placeholder={loadingRefs ? '...' : t('selectPosition')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingRefs ? (
                                        <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                                    ) : positions.length === 0 ? (
                                        <SelectItem value="empty" disabled>لا توجد مناصب</SelectItem>
                                    ) : (
                                        positions.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name_ar}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );

            case 'TRANSFER':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="old_institution_id">{t('oldInstitution')}</Label>
                            <SearchableSelect
                                options={institutions.map(inst => ({
                                    value: inst.id,
                                    label: inst.name_ar
                                }))}
                                value={oldInstitutionId}
                                onValueChange={setOldInstitutionId}
                                placeholder={loadingRefs ? '...' : t('selectInstitution')}
                                searchPlaceholder="البحث عن مؤسسة..."
                                emptyMessage="لا توجد مؤسسات"
                                disabled={loadingRefs}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new_institution_id">{t('newInstitution')}</Label>
                            <SearchableSelect
                                options={institutions.map(inst => ({
                                    value: inst.id,
                                    label: inst.name_ar
                                }))}
                                value={newInstitutionId}
                                onValueChange={setNewInstitutionId}
                                placeholder={loadingRefs ? '...' : t('selectInstitution')}
                                searchPlaceholder="البحث عن مؤسسة..."
                                emptyMessage="لا توجد مؤسسات"
                                disabled={loadingRefs}
                            />
                        </div>
                    </div>
                );


            case 'DEPARTMENT_CHANGE':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="old_department_id">{t('oldDepartment')}</Label>
                            <Select value={oldDepartmentId} onValueChange={setOldDepartmentId}>
                                <SelectTrigger id="old_department_id" dir="rtl">
                                    <SelectValue placeholder={loadingRefs ? '...' : t('selectDepartment')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingRefs ? (
                                        <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                                    ) : departments.length === 0 ? (
                                        <SelectItem value="empty" disabled>لا توجد مصالح</SelectItem>
                                    ) : (
                                        departments.map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.name_ar}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new_department_id">{t('newDepartment')}</Label>
                            <Select value={newDepartmentId} onValueChange={setNewDepartmentId}>
                                <SelectTrigger id="new_department_id" dir="rtl">
                                    <SelectValue placeholder={loadingRefs ? '...' : t('selectDepartment')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {loadingRefs ? (
                                        <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                                    ) : departments.length === 0 ? (
                                        <SelectItem value="empty" disabled>لا توجد مصالح</SelectItem>
                                    ) : (
                                        departments.map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.name_ar}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );

            case 'STATUS_CHANGE':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="old_status">{t('oldStatus')}</Label>
                            <Input
                                id="old_status"
                                value={oldStatus}
                                onChange={(e) => setOldStatus(e.target.value)}
                                placeholder={t('placeholder.oldStatus')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new_status">{t('newStatus')}</Label>
                            <Input
                                id="new_status"
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                placeholder={t('placeholder.newStatus')}
                            />
                        </div>
                    </div>
                );

            case 'HIRE':
                return (
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <p className="text-sm text-muted-foreground">
                            {t('hireDescription')}
                        </p>
                    </div>
                );

            case 'CONFIRMATION':
            case 'RETIREMENT':
            case 'END_OF_SERVICE':
                return (
                    <p className="text-sm text-muted-foreground italic">
                        {t('eventDateOnly')}
                    </p>
                );

            default:
                return null;
        }
    };

    return (
        <div className="space-y-6" dir="auto">
            {/* === Employee Selection Card === */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <User className="h-5 w-5 text-primary" />
                        {t('employeeInfo')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {propsEmployeeId ? (
                        /* Pre-selected employee: show info card directly */
                        employee ? (
                            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-base">
                                            {employee.firstname_ar} {employee.lastname_ar}
                                        </p>
                                        {employee.firstname_fr && (
                                            <p className="text-sm text-muted-foreground">
                                                {employee.firstname_fr} {employee.lastname_fr}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    {employee.grade && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">الرتبة / Grade</p>
                                            <p className="font-medium">{employee.grade.name_ar}</p>
                                        </div>
                                    )}
                                    {employee.department && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">القسم / Department</p>
                                            <p className="font-medium">{employee.department.name_ar}</p>
                                        </div>
                                    )}
                                    {employee.institution && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">المؤسسة / Institution</p>
                                            <p className="font-medium">{employee.institution.name_ar}</p>
                                        </div>
                                    )}
                                    {employee.position && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">المنصب / Position</p>
                                            <p className="font-medium">{employee.position.name_ar}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-8 text-muted-foreground">
                                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                جاري تحميل بيانات الموظف...
                            </div>
                        )
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label>{t('selectEmployee')}</Label>
                                <EmployeeSelector
                                    value={employeeId}
                                    onChange={setEmployeeId}
                                    placeholder={t('selectEmployee')}
                                />
                            </div>

                            {/* Employee info card (shown when employee is selected) */}
                            {employee && (
                                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-base">
                                                {employee.firstname_ar} {employee.lastname_ar}
                                            </p>
                                            {employee.firstname_fr && (
                                                <p className="text-sm text-muted-foreground">
                                                    {employee.firstname_fr} {employee.lastname_fr}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                        {employee.grade && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">الرتبة / Grade</p>
                                                <p className="font-medium">{employee.grade.name_ar}</p>
                                            </div>
                                        )}
                                        {employee.department && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">القسم / Department</p>
                                                <p className="font-medium">{employee.department.name_ar}</p>
                                            </div>
                                        )}
                                        {employee.institution && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">المؤسسة / Institution</p>
                                                <p className="font-medium">{employee.institution.name_ar}</p>
                                            </div>
                                        )}
                                        {employee.position && (
                                            <div>
                                                <p className="text-xs text-muted-foreground">المنصب / Position</p>
                                                <p className="font-medium">{employee.position.name_ar}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* === Event Type Card === */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Route className="h-5 w-5 text-primary" />
                        {t('eventType')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('eventType')}</Label>
                        <Select value={eventType} onValueChange={setEventType}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('placeholder.eventType')} />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => {
                                    const IconComponent = EVENT_LUCIDE_ICONS[key] || Route;
                                    const colorClass = EVENT_TYPE_COLORS[key] || 'bg-gray-500';
                                    return (
                                        <SelectItem key={key} value={key} className="py-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full ${colorClass} flex items-center justify-center`}>
                                                    <IconComponent className="h-3.5 w-3.5 text-white" />
                                                </div>
                                                <span>{label}</span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Event type description */}
                    {eventType && (
                        <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/10 p-3">
                            <div className={`mt-0.5 w-8 h-8 rounded-full ${EVENT_TYPE_COLORS[eventType] || 'bg-gray-500'} flex items-center justify-center shrink-0`}>
                                <EventIcon className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">
                                    {EVENT_TYPE_LABELS[eventType]}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {getEventDescription(eventType)}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* === Event Date Card === */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Calendar className="h-5 w-5 text-primary" />
                        {t('eventDate')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 max-w-xs">
                        <Label>{t('eventDate')}</Label>
                        <DateTimePicker
                            value={eventDate}
                            onChange={setEventDate}
                            placeHolder={t('eventDate')}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* === Dynamic Fields Card === */}
            {eventType && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <GitBranch className="h-5 w-5 text-primary" />
                            {EVENT_TYPE_LABELS[eventType]} — {t('from')} / {t('to')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {renderDynamicFields()}
                    </CardContent>
                </Card>
            )}

            {/* === Document Reference & Notes Card === */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5 text-primary" />
                        {t('eventInfo')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="document_reference">{t('decisionNumber')}</Label>
                        <Input
                            id="document_reference"
                            value={documentReference}
                            onChange={(e) => setDocumentReference(e.target.value)}
                            placeholder={t('placeholder.decisionNumber')}
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="notes">{t('notes')}</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t('placeholder.notes')}
                            rows={3}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* === Legal Information Card === */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Scale className="h-5 w-5 text-primary" />
                        {t('legalInfo')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 md:gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="legal_basis">{t('legalBasis')}</Label>
                            <Input
                                id="legal_basis"
                                value={legalBasis}
                                onChange={(e) => setLegalBasis(e.target.value)}
                                placeholder={t('placeholder.legalBasis')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="issuing_authority">{t('issuingAuthority')}</Label>
                            <Input
                                id="issuing_authority"
                                value={issuingAuthority}
                                onChange={(e) => setIssuingAuthority(e.target.value)}
                                placeholder={t('placeholder.issuingAuthority')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="controller_visa">{t('controllerVisa')}</Label>
                            <Input
                                id="controller_visa"
                                value={controllerVisa}
                                onChange={(e) => setControllerVisa(e.target.value)}
                                placeholder={t('placeholder.controllerVisa')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="controller_visa_date">{t('controllerVisaDate')}</Label>
                            <DateTimePicker
                                value={controllerVisaDate}
                                onChange={setControllerVisaDate}
                                placeHolder={t('placeholder.controllerVisaDate')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="decision_date">{t('decisionDate')}</Label>
                            <DateTimePicker
                                value={decisionDate}
                                onChange={setDecisionDate}
                                placeHolder={t('placeholder.decisionDate')}
                            />
                        </div>
                    </div>

                    {/* Decision document upload */}
                    <Separator />
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            {t('uploadDecision')}
                        </Label>
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={submitting}
                            >
                                <Upload className="h-4 w-4 ml-2" />
                                {file ? t('changeFile') : t('chooseFile')}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            {file && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <FileText className="h-4 w-4" />
                                    <span>{file.name}</span>
                                    <span className="text-xs">({formatFileSize(file.size)})</span>
                                    <button
                                        type="button"
                                        onClick={handleRemoveFile}
                                        className="text-destructive hover:text-destructive/80"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('uploadHint')}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* === Form Actions === */}
            <div className="flex items-center justify-end gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={submitting}
                >
                    {t('cancel')}
                </Button>
                <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="min-w-[120px]"
                >
                    {submitting ? t('saving') : (isEditing ? t('update') : t('save'))}
                </Button>
            </div>
        </div>
    );
}
