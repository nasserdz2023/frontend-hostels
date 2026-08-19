"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, FileText, Download, Trash2, Folder } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { arDZ } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
    documentsApi,
    Document,
    DOCUMENT_TYPE_LABELS,
    CATEGORY_LABELS,
    CATEGORY_ICONS
} from "@/lib/api/documents";
import { UploadDocumentDialog } from "./UploadDocumentDialog";

const getFileTypeMeta = (url?: string) => {
  if (!url) return { icon: "📄", bg: "bg-slate-500/10 text-slate-500 border border-slate-500/20" };
  const ext = url.split('.').pop()?.toLowerCase();
  
  if (ext === 'pdf') {
    return { icon: "📕", bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" };
  }
  if (['doc', 'docx'].includes(ext || '')) {
    return { icon: "📘", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" };
  }
  if (['jpg', 'jpeg', 'png', 'svg'].includes(ext || '')) {
    return { icon: "🖼️", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" };
  }
  return { icon: "📄", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" };
};

interface EmployeeDocumentsProps {
    employeeId: string;
    canEdit?: boolean;
}

export function EmployeeDocuments({ employeeId, canEdit = false }: EmployeeDocumentsProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    const fetchDocuments = useCallback(async (category?: string) => {
        try {
            setLoading(true);
            const result = await documentsApi.getByEmployee(
                employeeId,
                category !== "all" ? category : undefined
            );
            setDocuments(result.items);
        } catch {
            toast.error('فشل في تحميل الوثائق');
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    useEffect(() => {
        if (employeeId) {
            fetchDocuments(activeCategory);
        }
    }, [employeeId, activeCategory, fetchDocuments]);

    const isExpiringSoon = (expiresAt?: string) => {
        if (!expiresAt) return false;
        const days = differenceInDays(new Date(expiresAt), new Date());
        return days <= 30 && days > 0;
    };

    const isExpired = (expiresAt?: string) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    const handleDelete = async (docId: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه الوثيقة؟')) return;

        try {
            await documentsApi.delete(docId);
            toast.success('تم حذف الوثيقة');
            fetchDocuments(activeCategory);
        } catch {
            toast.error('فشل في حذف الوثيقة');
        }
    };

    const categories = [
        { value: "all", label: "الكل", icon: "📁" },
        ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
            value: key,
            label,
            icon: CATEGORY_ICONS[key] || "📄"
        }))
    ];

    if (loading && documents.length === 0) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                ))}
            </div>
        );
    }

    return (
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-5">
                <CardTitle className="text-lg flex items-center gap-2.5 font-bold text-slate-900 dark:text-white">
                    <FileText className="h-5 w-5 text-emerald-500" />
                    <span>وثائق الملف الإداري</span>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                        {documents.length}
                    </Badge>
                </CardTitle>
                {canEdit && (
                    <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-sm" onClick={() => setIsUploadOpen(true)}>
                            <Plus className="h-4 w-4 me-1" />
                            رفع وثيقة
                        </Button>
                        <UploadDocumentDialog
                            open={isUploadOpen}
                            onOpenChange={setIsUploadOpen}
                            employeeId={employeeId}
                            onSuccess={() => {
                                fetchDocuments(activeCategory);
                            }}
                        />
                    </>
                )}
            </CardHeader>
            <CardContent className="pt-6">
                {/* Category Tabs */}
                <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6" dir="rtl">
                    <TabsList className="flex flex-wrap h-auto gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-950/80 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl justify-start">
                        {categories.map((cat) => {
                            const count = cat.value === "all" 
                                ? documents.length 
                                : documents.filter(d => d.category === cat.value).length;
                            
                            return (
                                <TabsTrigger 
                                    key={cat.value} 
                                    value={cat.value} 
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-300 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400"
                                >
                                    <span className="text-base">{cat.icon}</span>
                                    <span>{cat.label}</span>
                                    <span className="text-xs bg-slate-200/50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded-md text-muted-foreground font-mono">
                                        {count}
                                    </span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </Tabs>

                {/* Documents List */}
                {documents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <Folder className="h-12 w-12 mx-auto mb-3 opacity-30 text-emerald-500" />
                        <p className="font-medium">لا توجد وثائق في هذه الفئة</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {documents.map((doc) => {
                            const fileMeta = getFileTypeMeta(doc.file_url);
                            const expired = isExpired(doc.expires_at);
                            const expiring = isExpiringSoon(doc.expires_at);

                            return (
                                <div
                                    key={doc.id}
                                    className={cn(
                                        "group flex items-center justify-between p-4 border rounded-2xl transition-all duration-300 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm",
                                        expired ? "border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/[0.01]" : 
                                        expiring ? "border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/[0.01]" : 
                                        "border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/30 dark:hover:border-emerald-400/30 hover:bg-slate-50/20 dark:hover:bg-slate-800/20",
                                        "hover:shadow-sm"
                                    )}
                                >
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        {/* Custom File Icon */}
                                        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center text-xl shrink-0 transition-transform duration-300 group-hover:scale-105", fileMeta.bg)}>
                                            {fileMeta.icon}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[250px] md:max-w-[400px]">
                                                    {doc.title}
                                                </h4>

                                                {/* Status Badges */}
                                                {expired && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20 animate-pulse">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                        منتهية
                                                    </span>
                                                )}
                                                {expiring && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                                        قريبة الانتهاء
                                                    </span>
                                                )}
                                                {!expired && !expiring && doc.expires_at && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        صالحة
                                                    </span>
                                                )}
                                            </div>

                                            {/* Metadata & References */}
                                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                                    {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
                                                </span>
                                                {doc.reference_number && (
                                                    <>
                                                        <span className="opacity-40">•</span>
                                                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">
                                                            {doc.reference_number}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 dark:text-slate-500 mt-2">
                                                <span className="flex items-center gap-1">
                                                    📅 أُضيف: {format(new Date(doc.created_at), 'dd MMMM yyyy', { locale: arDZ })}
                                                </span>
                                                {doc.expires_at && (
                                                    <span className={cn("flex items-center gap-1", expired ? "text-rose-500" : expiring ? "text-amber-500" : "")}>
                                                        ⚠️ ينتهي: {format(new Date(doc.expires_at), 'dd MMMM yyyy', { locale: arDZ })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Premium Action Row */}
                                    <div className="flex items-center gap-1.5 ms-4">
                                        {doc.file_url && (
                                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-9 w-9 rounded-lg border border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                                                    title="تحميل"
                                                >
                                                    <Download className="h-4.5 w-4.5" />
                                                </Button>
                                            </a>
                                        )}
                                        {canEdit && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 rounded-lg border border-rose-500/10 hover:bg-rose-500/10 text-rose-500 transition-all duration-200"
                                                onClick={() => handleDelete(doc.id)}
                                            >
                                                <Trash2 className="h-4.5 w-4.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default EmployeeDocuments;
