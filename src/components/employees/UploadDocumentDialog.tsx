"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    documentsApi,
    DOCUMENT_TYPE_LABELS,
    DocumentCategory,
    CATEGORY_LABELS,
    CATEGORY_DOCUMENT_TYPES
} from "@/lib/api/documents";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const formSchema = z.object({
    title: z.string().min(3, "العنوان يجب أن يكون 3 أحرف على الأقل"),
    type: z.string().min(1, "يرجى اختيار نوع الوثيقة"),
    category: z.string().min(1, "يرجى اختيار الفئة"),
    reference_number: z.string().optional(),
    description: z.string().optional(),
    expires_at: z.string().optional(),
});

interface UploadDocumentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employeeId: string;
    onSuccess: () => void;
}

export function UploadDocumentDialog({
    open,
    onOpenChange,
    employeeId,
    onSuccess
}: UploadDocumentDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            title: "",
            reference_number: "",
            description: "",
            expires_at: "",
        },
    });

    const handleFile = (file: File) => {
        if (file.size > MAX_FILE_SIZE) {
            toast.error("حجم الملف يجب أن لا يتجاوز 10 ميجابايت");
            return;
        }
        if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
            toast.error("نوع الملف غير مدعوم. يرجى اختيار ملف PDF, Word أو صور");
            return;
        }
        setSelectedFile(file);
        if (!form.getValues("title")) {
            form.setValue("title", file.name.split('.')[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!selectedFile) {
            toast.error("يرجى اختيار ملف للرفع");
            return;
        }

        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("title", values.title);
            formData.append("type", values.type);
            formData.append("category", values.category);

            if (values.description) formData.append("description", values.description);
            if (values.reference_number) formData.append("reference_number", values.reference_number);
            if (values.expires_at) formData.append("expires_at", values.expires_at);

            await documentsApi.uploadForEmployee(employeeId, formData);

            toast.success("تم رفع الوثيقة بنجاح");
            form.reset();
            setSelectedFile(null);
            onSuccess();
            onOpenChange(false);
        } catch {
            toast.error("فشل في رفع الوثيقة");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>رفع وثيقة جديدة</DialogTitle>
                    <DialogDescription>
                        إضافة وثيقة جديدة للملف الإداري للموظف. الملفات المدعومة: PDF, Word, Images.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>عنوان الوثيقة</FormLabel>
                                    <FormControl>
                                        <Input placeholder="مثال: شهادة ميلاد" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>الفئة</FormLabel>
                                        <Select
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                form.setValue("type", ""); // Reset type when category changes
                                            }}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="اختر الفئة" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                                    <SelectItem key={key} value={key}>
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => {
                                    const selectedCategory = form.watch("category") as DocumentCategory;
                                    const availableTypes = selectedCategory
                                        ? CATEGORY_DOCUMENT_TYPES[selectedCategory] || []
                                        : Object.keys(DOCUMENT_TYPE_LABELS);

                                    return (
                                        <FormItem>
                                            <FormLabel>النوع</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                disabled={!selectedCategory}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={selectedCategory ? "اختر النوع" : "اختر الفئة أولاً"} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {availableTypes.map((type) => (
                                                        <SelectItem key={type} value={type}>
                                                            {DOCUMENT_TYPE_LABELS[type as string] || type}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    );
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="reference_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>رقم المرجع (اختياري)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="رقم القرار/الشهادة" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="expires_at"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>تاريخ الانتهاء (اختياري)</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-2">
                            <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                وثيقة الملف
                            </FormLabel>
                            
                            {!selectedFile ? (
                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        const file = e.dataTransfer.files?.[0];
                                        if (file) handleFile(file);
                                    }}
                                    onClick={() => document.getElementById("file-upload-input")?.click()}
                                    className={cn(
                                        "relative group border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer",
                                        isDragging 
                                            ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 scale-[1.01]" 
                                            : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-emerald-500/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
                                    )}
                                >
                                    <input
                                        id="file-upload-input"
                                        type="file"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    
                                    {/* Styled bouncing upload icon */}
                                    <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-all duration-300 mb-3 group-hover:scale-110">
                                        <Upload className="h-6 w-6 animate-pulse" />
                                    </div>

                                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                        اسحب وأفلت الملف هنا أو انقر للتصفح
                                    </span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">
                                        PDF, Word, or Images (الحد الأقصى: 10MB)
                                    </span>
                                </div>
                            ) : (
                                /* Selected File Card Details */
                                <div className="relative flex items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.05]">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFile(null)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                        aria-label="Remove File"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                إلغاء
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                                        جاري الرفع...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4 me-2" />
                                        رفع الوثيقة
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
