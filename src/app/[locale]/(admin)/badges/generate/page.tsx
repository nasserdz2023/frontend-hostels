"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { badgeService } from "@/lib/api/badges";
import { employeesApi, DepartmentType, Grade, Position, OfficeType } from "@/lib/api/employees";
import api from "@/lib/api/client";
import { BadgeTemplate } from "@/lib/types/badges";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Printer, Search, Plus, Trash2, User, ChevronLeft, ChevronRight, Users, UserPlus, Upload, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { MultiSelect } from "@/components/ui/multi-select";
import { issuedDocumentsService } from "@/lib/api/issued-documents";

interface Institution {
    id: string;
    name_ar: string;
    name_fr?: string;
}

interface CustomPerson {
    id: string;
    firstname_ar: string;
    lastname_ar: string;
    role: string;
    hire_date?: string;
    isCustom: true;
}

interface EmployeePerson {
    id: string;
    firstname_ar: string;
    lastname_ar: string;
    role: string;
    department?: string;
    hire_date?: string;
    isCustom?: false;
}

type Person = CustomPerson | EmployeePerson;

export default function BadgeGeneratorPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialTemplateId = searchParams.get("template");

    const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId || "");

    const [sourceType, setSourceType] = useState<"employees" | "activity_participants" | "activity_organizers">("employees");
    const [sourceId, setSourceId] = useState<string>("");

    // Tracking configuration
    const [enableTracking, setEnableTracking] = useState(false);
    const [documentType, setDocumentType] = useState<"certificate" | "badge">("badge");
    const [occasion, setOccasion] = useState("");

    // Reference Data
    const [departments, setDepartments] = useState<DepartmentType[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [offices, setOffices] = useState<OfficeType[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);

    // Multi-Select Filters
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
    const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
    const [selectedOffices, setSelectedOffices] = useState<string[]>([]);
    const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);

    // Data List (from API)
    const [people, setPeople] = useState<EmployeePerson[]>([]);
    const [loadingPeople, setLoadingPeople] = useState(false);

    // Custom List (manually added)
    const [customList, setCustomList] = useState<Person[]>([]);
    const [addPersonDialogOpen, setAddPersonDialogOpen] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importText, setImportText] = useState("");
    const [newPersonName, setNewPersonName] = useState("");
    const [newPersonLastname, setNewPersonLastname] = useState("");
    const [newPersonRole, setNewPersonRole] = useState("");

    // Selection
    const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<"filter" | "custom">("filter");

    const [storedOccasions, setStoredOccasions] = useState<string[]>([]);

    // Load reference data
    useEffect(() => {
        badgeService.getTemplates().then(setTemplates).catch(console.error);
        employeesApi.getDepartments().then(setDepartments).catch(console.error);
        employeesApi.getGrades().then(setGrades).catch(console.error);
        employeesApi.getPositions().then(setPositions).catch(console.error);
        // Fetch institutions
        api.get<Institution[]>('/institutions').then(res => setInstitutions(res.data)).catch(console.error);

        // Fetch stored occasions for auto-completion
        import('@/lib/api/issued-documents').then(m => {
            m.issuedDocumentsService.getOccasions().then(setStoredOccasions).catch(console.error);
        });
    }, []);

    // Load offices when departments change
    useEffect(() => {
        if (selectedDepartments.length === 1) {
            employeesApi.getOffices(selectedDepartments[0]).then(setOffices).catch(console.error);
        } else if (selectedDepartments.length === 0) {
            // Load all offices
            employeesApi.getOffices().then(setOffices).catch(console.error);
        } else {
            setOffices([]);
        }
    }, [selectedDepartments]);

    // Fetch employees with current filters
    const fetchPeople = useCallback(async () => {
        if (sourceType !== "employees") {
            // Mock for activity participants/organizers
            setPeople([
                { id: "uuid-3", firstname_ar: "علي", lastname_ar: "مشارك", role: "مشارك" },
                { id: "uuid-4", firstname_ar: "سعاد", lastname_ar: "مشاركة", role: "مشارك" },
            ]);
            setTotalCount(2);
            return;
        }

        setLoadingPeople(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('size', pageSize.toString());
            params.append('is_active', 'true');

            if (searchTerm) params.append('search', searchTerm);
            if (selectedDepartments.length > 0) params.append('department', selectedDepartments.join(','));
            if (selectedGrades.length > 0) params.append('grade_id', selectedGrades.join(','));
            if (selectedPositions.length > 0) params.append('position_id', selectedPositions.join(','));
            if (selectedOffices.length > 0) params.append('office_id', selectedOffices.join(','));
            if (selectedInstitutions.length > 0) params.append('institution_id', selectedInstitutions.join(','));

            const response = await api.get<any>(`/employees?${params.toString()}`);
            const emps = response.data.items || response.data || [];

            const data = emps.map((emp: any) => ({
                id: emp.id,
                firstname_ar: emp.firstname_ar,
                lastname_ar: emp.lastname_ar,
                role: emp.position?.name_ar || emp.grade?.name_ar || "موظف",
                grade: emp.grade?.name_ar || "",
                position: emp.position?.name_ar || "",
                department: emp.department?.name_ar || "",
                institution: emp.institution?.name_ar || "",
                photo_url: emp.profile_photo || "",
                employee_number: emp.employee_number || "",
                hire_date: emp.hire_date || ""
            }));

            setPeople(data);
            setTotalCount(response.data.total || emps.length);
        } catch (error) {
            console.error(error);
            toast.error("فشل تحميل القائمة");
        } finally {
            setLoadingPeople(false);
        }
    }, [page, pageSize, searchTerm, selectedDepartments, selectedGrades, selectedPositions, selectedOffices, selectedInstitutions, sourceType]);

    // Auto-fetch when filters change
    useEffect(() => {
        fetchPeople();
    }, [fetchPeople]);

    // Reset page when filters change
    const resetPage = () => setPage(1);

    // Add custom person
    const handleAddCustomPerson = () => {
        if (!newPersonName.trim() || !newPersonLastname.trim()) {
            toast.error("يرجى إدخال الاسم واللقب");
            return;
        }

        const newPerson: CustomPerson = {
            id: `custom-${Date.now()}`,
            firstname_ar: newPersonName.trim(),
            lastname_ar: newPersonLastname.trim(),
            role: newPersonRole.trim() || "ضيف",
            isCustom: true
        };

        setCustomList(prev => [...prev, newPerson]);
        setNewPersonName("");
        setNewPersonLastname("");
        setNewPersonRole("");
        setAddPersonDialogOpen(false);
        toast.success("تمت إضافة الشخص للقائمة");
    };

    const handleImportList = () => {
        if (!importText.trim()) return;

        const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
        const newPeople: CustomPerson[] = [];

        lines.forEach((line, index) => {
            // Assume format: Tab or comma separated: Name [tab/comma] Role. Or just Name
            const parts = line.split(/[\t,]/).map(p => p.trim());
            const fullName = parts[0];
            const role = parts.length > 1 ? parts[1] : "مكرم";

            // Split fullName to first and last name as best effort
            const nameParts = fullName.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : " ";

            newPeople.push({
                id: `custom-${Date.now()}-${index}`,
                firstname_ar: firstName,
                lastname_ar: lastName,
                role: role,
                isCustom: true
            });
        });

        setCustomList(prev => [...prev, ...newPeople]);
        setImportText("");
        setImportDialogOpen(false);
        toast.success(`تم استيراد ${newPeople.length} شخص بنجاح`);
    };

    // Add employee to custom list
    const addEmployeeToCustomList = (person: EmployeePerson) => {
        if (customList.some(p => p.id === person.id)) {
            toast.error("الشخص موجود مسبقاً في القائمة");
            return;
        }
        setCustomList(prev => [...prev, { ...person, isCustom: false }]);
        toast.success("تمت إضافة الموظف للقائمة الخاصة");
    };

    // Remove from custom list
    const removeFromCustomList = (id: string) => {
        setCustomList(prev => prev.filter(p => p.id !== id));
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    const handleLoadAll = () => {
        setPageSize(totalCount > 0 ? totalCount : 2000);
        setPage(1);
    };

    const handleRestorePagination = () => {
        setPageSize(20);
        setPage(1);
    };

    // Get people for current tab
    const displayPeople = activeTab === "filter" ? people : customList;

    const handleSelectAll = () => {
        if (selectedPeopleIds.length === displayPeople.length) {
            setSelectedPeopleIds([]);
        } else {
            setSelectedPeopleIds(displayPeople.map(p => p.id));
        }
    };

    const handleGenerate = async () => {
        if (!selectedTemplateId || selectedPeopleIds.length === 0) return;

        try {
            const selectedPeople = displayPeople.filter(p => selectedPeopleIds.includes(p.id));
            const template = templates.find(t => t.id === selectedTemplateId);

            let badgeData: any[] = selectedPeople.map(p => ({
                id: p.id,
                firstname_ar: p.firstname_ar,
                lastname_ar: p.lastname_ar,
                role: p.role,
                grade: 'grade' in p ? p.grade : "",
                position: 'position' in p ? p.position : "",
                department: 'department' in p ? p.department : "",
                institution: 'institution' in p ? p.institution : "",
                photo_url: 'photo_url' in p ? p.photo_url : "",
                employee_number: 'employee_number' in p ? p.employee_number : "",
                hire_date: 'hire_date' in p ? p.hire_date : ""
            }));

            if (enableTracking && template) {
                const apiDocs = selectedPeople.map(p => ({
                    person_id: p.id.startsWith("custom-") ? undefined : p.id,
                    employee_id: !p.isCustom ? p.id : undefined,
                    recipient_name: `${p.firstname_ar} ${p.lastname_ar}`,
                    recipient_role: p.role,
                    extra_fields: {
                        grade: 'grade' in p ? p.grade : "",
                        position: 'position' in p ? p.position : "",
                        department: 'department' in p ? p.department : ""
                    }
                }));

                const reqData = {
                    template_id: template.id,
                    template_name: template.name,
                    document_type: documentType,
                    occasion: occasion,
                    people: apiDocs
                };

                const res = await issuedDocumentsService.batchIssue(reqData);

                // Inject serial numbers into badgeData
                badgeData = badgeData.map((b, index) => {
                    const issuedDoc = res.issued[index];
                    return {
                        ...b,
                        serial_number: issuedDoc ? issuedDoc.serial_number : undefined
                    };
                });

                toast.success(`تم توثيق وإصدار ${res.count} وثيقة برقم تسلسلي.`);
            }

            localStorage.setItem("print_badges_data", JSON.stringify(badgeData));
            localStorage.setItem("print_badges_template", JSON.stringify(template));

            window.open("/badges/print-view", "_blank");

        } catch (error: any) {
            console.error("Badge generation error:", error);
            toast.error("فشل توليد الشارات");
        }
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold">توليد الشارات</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls */}
                <Card className="col-span-1 h-fit">
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <Label>القالب</Label>
                            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر القالب" />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>المصدر</Label>
                            <Select value={sourceType} onValueChange={(v: any) => setSourceType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="employees">الموظفين</SelectItem>
                                    <SelectItem value="activity_participants">المشاركين</SelectItem>
                                    <SelectItem value="activity_organizers">المنظمين</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {sourceType === "employees" && (
                            <>
                                <div className="space-y-2">
                                    <Label>المؤسسات</Label>
                                    <MultiSelect
                                        options={institutions.map(i => ({ value: i.id, label: i.name_ar }))}
                                        selected={selectedInstitutions}
                                        onChange={(v) => { setSelectedInstitutions(v); resetPage(); }}
                                        placeholder="الكل"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>المصالح</Label>
                                    <MultiSelect
                                        options={departments.map(d => ({ value: d.id, label: d.name_ar }))}
                                        selected={selectedDepartments}
                                        onChange={(v) => { setSelectedDepartments(v); resetPage(); }}
                                        placeholder="الكل"
                                    />
                                </div>

                                {offices.length > 0 && (
                                    <div className="space-y-2">
                                        <Label>المكاتب</Label>
                                        <MultiSelect
                                            options={offices.map(o => ({ value: o.id, label: o.name_ar }))}
                                            selected={selectedOffices}
                                            onChange={(v) => { setSelectedOffices(v); resetPage(); }}
                                            placeholder="الكل"
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>الرتب</Label>
                                    <MultiSelect
                                        options={grades.map(g => ({ value: g.id, label: g.name_ar }))}
                                        selected={selectedGrades}
                                        onChange={(v) => { setSelectedGrades(v); resetPage(); }}
                                        placeholder="الكل"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>المناصب</Label>
                                    <MultiSelect
                                        options={positions.map(p => ({ value: p.id, label: p.name_ar }))}
                                        selected={selectedPositions}
                                        onChange={(v) => { setSelectedPositions(v); resetPage(); }}
                                        placeholder="الكل"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>بحث</Label>
                                    <div className="relative">
                                        <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="بحث بالاسم أو الرقم..."
                                            value={searchTerm}
                                            onChange={e => { setSearchTerm(e.target.value); resetPage(); }}
                                            className="pe-10"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {sourceType !== "employees" && (
                            <div className="space-y-2">
                                <Label>رقم النشاط (ID)</Label>
                                <Input
                                    value={sourceId}
                                    onChange={e => setSourceId(e.target.value)}
                                    placeholder="نسخ ID النشاط هنا"
                                />
                            </div>
                        )}

                        <div className="border-t pt-4 mt-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="space-y-0.5">
                                    <Label className="flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4 text-green-600" />
                                        توثيق وإصدار رسمي
                                    </Label>
                                    <p className="text-xs text-gray-500">حفظ الوثائق في السجل مع أرقام تسلسلية</p>
                                </div>
                                <Switch checked={enableTracking} onCheckedChange={setEnableTracking} />
                            </div>

                            {enableTracking && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <Label>نوع الوثيقة</Label>
                                        <Select value={documentType} onValueChange={(v: any) => setDocumentType(v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="badge">شارة الدخول (Badge)</SelectItem>
                                                <SelectItem value="certificate">شهادة (Certificate)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>المناسبة / التظاهرة</Label>
                                        <Input
                                            value={occasion}
                                            onChange={e => setOccasion(e.target.value)}
                                            placeholder="مثال: البطولة الولائية للسباحة 2026..."
                                            list="occasions-list"
                                        />
                                        <datalist id="occasions-list">
                                            {storedOccasions.map((occ, idx) => (
                                                <option key={idx} value={occ} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* List */}
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader className="pb-2">
                        <Tabs value={activeTab} onValueChange={(v: any) => { setActiveTab(v); setSelectedPeopleIds([]); }}>
                            <TabsList className="w-full">
                                <TabsTrigger value="filter" className="flex-1">
                                    <Users className="ms-2 h-4 w-4" />
                                    فلترة ({totalCount})
                                </TabsTrigger>
                                <TabsTrigger value="custom" className="flex-1">
                                    <UserPlus className="ms-2 h-4 w-4" />
                                    قائمة خاصة ({customList.length})
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </CardHeader>

                    <CardContent>
                        {activeTab === "filter" && (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-sm text-gray-500">
                                        صفحة {page} من {totalPages || 1} ({totalCount} موظف)
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={handleSelectAll}>
                                            {selectedPeopleIds.length === people.length && people.length > 0 ? "إلغاء التحديد" : "تحديد الكل"}
                                        </Button>
                                    </div>
                                </div>

                                <div className="h-[350px] overflow-y-auto border rounded-md p-2 space-y-2">
                                    {loadingPeople ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
                                        </div>
                                    ) : people.length === 0 ? (
                                        <div className="text-center text-gray-500 py-12">
                                            لا توجد نتائج
                                        </div>
                                    ) : people.map(person => (
                                        <div key={person.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md border-b last:border-0">
                                            <Checkbox
                                                checked={selectedPeopleIds.includes(person.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedPeopleIds([...selectedPeopleIds, person.id]);
                                                    else setSelectedPeopleIds(selectedPeopleIds.filter(id => id !== person.id));
                                                }}
                                            />
                                            <div className="flex-1 cursor-pointer" onClick={() => {
                                                if (selectedPeopleIds.includes(person.id)) setSelectedPeopleIds(selectedPeopleIds.filter(id => id !== person.id));
                                                else setSelectedPeopleIds([...selectedPeopleIds, person.id]);
                                            }}>
                                                <div className="font-medium">{person.firstname_ar} {person.lastname_ar}</div>
                                                <div className="text-xs text-gray-500">{person.role} - {person.department || "بدون مصلحة"}</div>
                                            </div>
                                            <Button size="sm" variant="ghost" onClick={() => addEmployeeToCustomList(person)}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                <div className="flex items-center justify-center gap-2 mt-4">
                                    {totalCount > 20 && pageSize < totalCount && (
                                        <Button variant="outline" size="sm" onClick={handleLoadAll} className="ms-2">
                                            عرض الكل ({totalCount})
                                        </Button>
                                    )}
                                    {pageSize >= totalCount && totalCount > 20 && (
                                        <Button variant="outline" size="sm" onClick={handleRestorePagination} className="ms-2">
                                            عرض مقسم (20)
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page <= 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                        السابق
                                    </Button>
                                    <span className="text-sm px-4">{page} / {totalPages || 1}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                    >
                                        التالي
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                </div>
                            </>
                        )}

                        {activeTab === "custom" && (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-sm text-gray-500">
                                        {customList.length} شخص في القائمة
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Dialog open={addPersonDialogOpen} onOpenChange={setAddPersonDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button size="sm">
                                                    <Plus className="ms-2 h-4 w-4" />
                                                    إضافة شخص
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>إضافة شخص للقائمة</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>الاسم</Label>
                                                        <Input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} placeholder="الاسم" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>اللقب</Label>
                                                        <Input value={newPersonLastname} onChange={e => setNewPersonLastname(e.target.value)} placeholder="اللقب" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>الوظيفة / الدور</Label>
                                                        <Input value={newPersonRole} onChange={e => setNewPersonRole(e.target.value)} placeholder="مثال: ضيف، متحدث، مدرب" />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={handleAddCustomPerson}>إضافة</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>

                                        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                                    <Upload className="ms-2 h-4 w-4" />
                                                    استيراد قائمة مكرمين
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>استيراد قائمة جماعية</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <p className="text-xs text-gray-500">
                                                        قم بنسخ ولصق الأسماء هنا (اسم واحد في كل سطر). يمكنك أيضاً لصق جدول من Excel بحيث يكون العمود الأول للاسم واللقب، والعمود الثاني للمنصب/الدور (يتم الفصل بينهما بمسافة الجدولة أو الفاصلة).
                                                    </p>
                                                    <Textarea
                                                        className="h-48"
                                                        value={importText}
                                                        onChange={e => setImportText(e.target.value)}
                                                        placeholder="مثال:
علي بن محمد, الفائز الأول
أحمد بن صالح, مكرم
خالد الجزائري"
                                                    />
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={handleImportList}>استيراد وتوليد</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>

                                        <Button variant="outline" size="sm" onClick={handleSelectAll}>
                                            {selectedPeopleIds.length === customList.length && customList.length > 0 ? "إلغاء التحديد" : "تحديد الكل"}
                                        </Button>
                                    </div>
                                </div>

                                <div className="h-[350px] overflow-y-auto border rounded-md p-2 space-y-2">
                                    {customList.length === 0 ? (
                                        <div className="text-center text-gray-500 py-12">
                                            <User className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                                            <p>القائمة فارغة</p>
                                            <p className="text-xs mt-1">أضف موظفين من تبويب "فلترة" أو أضف أشخاص يدوياً</p>
                                        </div>
                                    ) : customList.map(person => (
                                        <div key={person.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md border-b last:border-0">
                                            <Checkbox
                                                checked={selectedPeopleIds.includes(person.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedPeopleIds([...selectedPeopleIds, person.id]);
                                                    else setSelectedPeopleIds(selectedPeopleIds.filter(id => id !== person.id));
                                                }}
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium flex items-center gap-2">
                                                    {person.firstname_ar} {person.lastname_ar}
                                                    {person.isCustom && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">يدوي</span>}
                                                </div>
                                                <div className="text-xs text-gray-500">{person.role}</div>
                                            </div>
                                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => removeFromCustomList(person.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        <div className="mt-4 flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                            <div className="text-sm font-medium">
                                تم تحديد {selectedPeopleIds.length} شخص
                            </div>
                            <Button onClick={handleGenerate} disabled={selectedPeopleIds.length === 0 || !selectedTemplateId}>
                                <Printer className="ms-2 h-4 w-4" />
                                معاينة وطباعة
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
