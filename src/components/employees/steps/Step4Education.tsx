"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { employeesApi, EducationLevel } from "@/lib/api/employees";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

// Certificate interface
interface Certificate {
    name: string;
    institution: string;
    year: string;
    specialty?: string;
}

// Experience interface
interface Experience {
    company: string;
    position: string;
    start_year: string;
    end_year?: string;
    description?: string;
}

// Language interface
interface Language {
    name: string;
    level: string;
}

export function Step4Education() {
    const t = useTranslations("employees");
    const { control, watch, setValue } = useFormContext();

    const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
    const [loading, setLoading] = useState(false);

    // Watch arrays
    const certificates = watch("certificates") || [];
    const experiences = watch("experiences") || [];
    const languages = watch("languages") || [];

    // Fetch education levels
    useEffect(() => {
        async function fetchEducationLevels() {
            try {
                setLoading(true);
                const data = await employeesApi.getEducationLevels();
                setEducationLevels(data);
            } catch (error) {
                toast.error("فشل في تحميل المستويات التعليمية");
            } finally {
                setLoading(false);
            }
        }
        fetchEducationLevels();
    }, []);

    const educationLevelOptions = educationLevels.map(l => ({
        value: l.id,
        label: l.name_ar
    }));

    const languageLevelOptions = [
        { value: "beginner", label: "مبتدئ" },
        { value: "intermediate", label: "متوسط" },
        { value: "advanced", label: "متقدم" },
        { value: "native", label: "اللغة الأم" },
    ];

    // Certificate handlers
    const addCertificate = () => {
        setValue("certificates", [...certificates, { name: "", institution: "", year: "", specialty: "" }]);
    };

    const removeCertificate = (index: number) => {
        const updated = certificates.filter((_: Certificate, i: number) => i !== index);
        setValue("certificates", updated);
    };

    const updateCertificate = (index: number, field: keyof Certificate, value: string) => {
        const updated = [...certificates];
        updated[index] = { ...updated[index], [field]: value };
        setValue("certificates", updated);
    };

    // Experience handlers
    const addExperience = () => {
        setValue("experiences", [...experiences, { company: "", position: "", start_year: "", end_year: "", description: "" }]);
    };

    const removeExperience = (index: number) => {
        const updated = experiences.filter((_: Experience, i: number) => i !== index);
        setValue("experiences", updated);
    };

    const updateExperience = (index: number, field: keyof Experience, value: string) => {
        const updated = [...experiences];
        updated[index] = { ...updated[index], [field]: value };
        setValue("experiences", updated);
    };

    // Language handlers
    const addLanguage = () => {
        setValue("languages", [...languages, { name: "", level: "" }]);
    };

    const removeLanguage = (index: number) => {
        const updated = languages.filter((_: Language, i: number) => i !== index);
        setValue("languages", updated);
    };

    const updateLanguage = (index: number, field: keyof Language, value: string) => {
        const updated = [...languages];
        updated[index] = { ...updated[index], [field]: value };
        setValue("languages", updated);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold">{t("steps.education") || "المستوى الدراسي"}</h2>

            {/* Education Level at Hiring */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name="hiring_education_level_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("fields.hiringEducationLevel") || "المستوى الدراسي عند التوظيف"}</FormLabel>
                            <FormControl>
                                <SearchableSelect
                                    options={educationLevelOptions}
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    placeholder="اختر المستوى"
                                    searchPlaceholder="بحث..."
                                    emptyMessage="لا توجد نتائج"
                                    disabled={loading}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Certificates Section */}
            <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">{t("sections.certificates") || "الشهادات"}</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addCertificate}>
                        <Plus className="h-4 w-4 me-1" />
                        إضافة شهادة
                    </Button>
                </div>

                {certificates.map((cert: Certificate, index: number) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-muted/50 rounded-lg relative">
                        <div>
                            <FormLabel>اسم الشهادة</FormLabel>
                            <Input
                                value={cert.name}
                                onChange={(e) => updateCertificate(index, "name", e.target.value)}
                                placeholder="ليسانس، ماستر..."
                            />
                        </div>
                        <div>
                            <FormLabel>المؤسسة</FormLabel>
                            <Input
                                value={cert.institution}
                                onChange={(e) => updateCertificate(index, "institution", e.target.value)}
                                placeholder="الجامعة أو المعهد"
                            />
                        </div>
                        <div>
                            <FormLabel>التخصص</FormLabel>
                            <Input
                                value={cert.specialty || ""}
                                onChange={(e) => updateCertificate(index, "specialty", e.target.value)}
                                placeholder="التخصص"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <FormLabel>السنة</FormLabel>
                                <Input
                                    value={cert.year}
                                    onChange={(e) => updateCertificate(index, "year", e.target.value)}
                                    placeholder="2020"
                                />
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeCertificate(index)} className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
                {certificates.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">لا توجد شهادات. اضغط على "إضافة شهادة" لإضافة واحدة.</p>
                )}
            </div>

            {/* Experience Section */}
            <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">{t("sections.experiences") || "الخبرات المهنية"}</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addExperience}>
                        <Plus className="h-4 w-4 me-1" />
                        إضافة خبرة
                    </Button>
                </div>

                {experiences.map((exp: Experience, index: number) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-4 bg-muted/50 rounded-lg relative">
                        <div>
                            <FormLabel>الجهة</FormLabel>
                            <Input
                                value={exp.company}
                                onChange={(e) => updateExperience(index, "company", e.target.value)}
                                placeholder="اسم الجهة"
                            />
                        </div>
                        <div>
                            <FormLabel>المنصب</FormLabel>
                            <Input
                                value={exp.position}
                                onChange={(e) => updateExperience(index, "position", e.target.value)}
                                placeholder="المنصب"
                            />
                        </div>
                        <div>
                            <FormLabel>من سنة</FormLabel>
                            <Input
                                value={exp.start_year}
                                onChange={(e) => updateExperience(index, "start_year", e.target.value)}
                                placeholder="2015"
                            />
                        </div>
                        <div>
                            <FormLabel>إلى سنة</FormLabel>
                            <Input
                                value={exp.end_year || ""}
                                onChange={(e) => updateExperience(index, "end_year", e.target.value)}
                                placeholder="2020 أو حالياً"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeExperience(index)} className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
                {experiences.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">لا توجد خبرات. اضغط على "إضافة خبرة" لإضافة واحدة.</p>
                )}
            </div>

            {/* Languages Section */}
            <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">{t("sections.languages") || "اللغات"}</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addLanguage}>
                        <Plus className="h-4 w-4 me-1" />
                        إضافة لغة
                    </Button>
                </div>

                {languages.map((lang: Language, index: number) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-muted/50 rounded-lg relative">
                        <div>
                            <FormLabel>اللغة</FormLabel>
                            <Input
                                value={lang.name}
                                onChange={(e) => updateLanguage(index, "name", e.target.value)}
                                placeholder="العربية، الفرنسية، الإنجليزية..."
                            />
                        </div>
                        <div>
                            <FormLabel>المستوى</FormLabel>
                            <SearchableSelect
                                options={languageLevelOptions}
                                value={lang.level}
                                onValueChange={(v) => updateLanguage(index, "level", v)}
                                placeholder="اختر المستوى"
                                searchPlaceholder="بحث..."
                                emptyMessage="لا توجد نتائج"
                            />
                        </div>
                        <div className="flex items-end">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLanguage(index)} className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
                {languages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">لا توجد لغات. اضغط على "إضافة لغة" لإضافة واحدة.</p>
                )}
            </div>
        </div>
    );
}
