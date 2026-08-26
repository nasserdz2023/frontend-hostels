"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { BadgeTemplate } from "@/lib/types/badges";
import { badgeService } from "@/lib/api/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Printer, Edit, Trash2, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
// import { Spinner } from "@/components/ui/spinner"; // Removed

export default function BadgesPage() {
    const t = useTranslations("Common"); // Using Common for generic words for now
    const [templates, setTemplates] = useState<BadgeTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTemplates = async () => {
        try {
            const data = await badgeService.getTemplates();
            setTemplates(data);
        } catch (error) {
            console.error("Failed to fetch templates", error);
            toast.error("حدث خطأ أثناء تحميل القوالب");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm("هل أنت متأكد من حذف هذا القالب؟")) {
            try {
                await badgeService.deleteTemplate(id);
                toast.success("تم حذف القالب بنجاح");
                fetchTemplates();
            } catch (error) {
                toast.error("فشل حذف القالب");
            }
        }
    };

    const handleDuplicate = async (template: BadgeTemplate) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, created_at, updated_at, ...dataToDuplicate } = template as any;
            await badgeService.createTemplate({
                ...dataToDuplicate,
                name: `${template.name} (نسخة)`
            });
            toast.success("تم تكرار القالب بنجاح");
            fetchTemplates();
        } catch (error) {
            toast.error("فشل تكرار القالب");
        }
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">مولد الشارات</h1>
                <Link href="/badges/templates/create">
                    <Button>
                        <Plus className="ms-2 h-4 w-4" />
                        إنشاء قالب جديد
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template) => (
                        <Card key={template.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row justify-between items-start">
                                <CardTitle className="text-xl">{template.name}</CardTitle>
                                <div className="flex gap-2">
                                    <Link href={`/badges/templates/${template.id}`}>
                                        <Button variant="ghost" size="icon">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Button variant="ghost" size="icon" onClick={() => handleDuplicate(template)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(template.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col gap-2 text-sm text-gray-500">
                                    <div>الأبعاد: {template.width_mm}mm x {template.height_mm}mm</div>
                                    <div>الاتجاه: {template.orientation === 'portrait' ? 'عمودي' : 'أفقي'}</div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <Link href={`/badges/generate?template=${template.id}`} className="w-full">
                                        <Button className="w-full" variant="outline">
                                            <Printer className="ms-2 h-4 w-4" />
                                            طباعة شارات
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {templates.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            لا توجد قوالب حالياً. قم بإنشاء قالب جديد للبدء.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
