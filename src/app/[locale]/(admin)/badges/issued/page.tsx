"use client";

import { useEffect, useState, useCallback } from "react";
import { 
    FileText, 
    Search, 
    Filter, 
    ShieldAlert, 
    ShieldCheck,
    CheckCircle2, 
    XCircle, 
    Calendar,
    Ban,
    Loader2,
    Eye
} from "lucide-react";
import { format } from "date-fns";
import { arDZ } from "date-fns/locale";
import { toast } from "sonner";
import { 
    issuedDocumentsService, 
    IssuedDocumentResponse, 
    IssuedDocumentStats 
} from "@/lib/api/issued-documents";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function IssuedDocumentsPage() {
    const [documents, setDocuments] = useState<IssuedDocumentResponse[]>([]);
    const [stats, setStats] = useState<IssuedDocumentStats | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [docTypeFilter, setDocTypeFilter] = useState("all");
    
    // Revoke Dialog
    const [revokeObj, setRevokeObj] = useState<IssuedDocumentResponse | null>(null);
    const [revokeReason, setRevokeReason] = useState("");
    const [revoking, setRevoking] = useState(false);

    const loadStats = async () => {
        try {
            const data = await issuedDocumentsService.getDocumentStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to load stats", error);
        }
    };

    const loadDocuments = useCallback(async () => {
        setLoading(true);
        try {
            const skip = (page - 1) * pageSize;
            const typeParam = docTypeFilter !== "all" ? docTypeFilter : undefined;
            const data = await issuedDocumentsService.getDocuments(skip, pageSize, typeParam, searchTerm);
            setDocuments(data.items);
            setTotalCount(data.total);
        } catch (error) {
            console.error("Failed to load documents", error);
            toast.error("فشل في تحميل السجل");
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, docTypeFilter, searchTerm]);

    useEffect(() => {
        loadStats();
    }, []);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    const handleRevoke = async () => {
        if (!revokeObj) return;
        if (!revokeReason.trim()) {
            toast.error("يرجى إدخال سبب الإلغاء");
            return;
        }

        setRevoking(true);
        try {
            await issuedDocumentsService.revokeDocument(revokeObj.id, revokeReason);
            toast.success("تم إلغاء الوثيقة بنجاح وإدراجها في القائمة السوداء");
            setRevokeObj(null);
            setRevokeReason("");
            loadDocuments();
            loadStats(); // Update stats since revoked count increased
        } catch (error) {
            console.error("Error revoking document", error);
            toast.error("حدث خطأ أثناء إجراء الإلغاء");
        } finally {
            setRevoking(false);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="container mx-auto py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-1">سجل التوثيق والأرقام التسلسلية</h1>
                    <p className="text-gray-500 text-sm">إدارة، تحقق، وإلغاء لجميع الشهادات والشارات الصادرة رسمياً.</p>
                </div>
            </div>

            {/* Statistics */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 text-gray-500 pb-2">
                            <CardTitle className="text-sm font-medium">إجمالي التوثيق</CardTitle>
                            <ShieldCheck className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground mt-1">تراكمي لجميع الوثائق</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 text-blue-600 pb-2">
                            <CardTitle className="text-sm font-medium">الشهادات</CardTitle>
                            <FileText className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.certificates}</div>
                            <p className="text-xs text-muted-foreground mt-1">شهادة صادرة رسمياً</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 text-green-600 pb-2">
                            <CardTitle className="text-sm font-medium">الشارات (البادجات)</CardTitle>
                            <ShieldCheck className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.badges}</div>
                            <p className="text-xs text-muted-foreground mt-1">بطاقة تعريفية / عبور</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 text-red-500 pb-2">
                            <CardTitle className="text-sm font-medium">الوثائق الملغاة</CardTitle>
                            <Ban className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{stats.revoked}</div>
                            <p className="text-xs text-muted-foreground mt-1">تم إبطال فعاليتها</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                            placeholder="بحث بالرقم التسلسلي (DJS-CERT-...) أو اسم الموظف..." 
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                            className="ps-9"
                        />
                    </div>
                    <div className="w-full md:w-64">
                        <Select value={docTypeFilter} onValueChange={(v) => { setDocTypeFilter(v); setPage(1); }}>
                            <SelectTrigger>
                                <Filter className="me-2 h-4 w-4" />
                                <SelectValue placeholder="نوع الوثيقة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">جميع الوثائق</SelectItem>
                                <SelectItem value="certificate">الشهادات فقط</SelectItem>
                                <SelectItem value="badge">الشارات فقط</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-gray-50 text-gray-600 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-medium">الرقم التسلسلي</th>
                                    <th className="px-4 py-3 font-medium">المعنيّ & النوع</th>
                                    <th className="px-4 py-3 font-medium">التظاهرة / المناسبة</th>
                                    <th className="px-4 py-3 font-medium">تاريخ الإصدار</th>
                                    <th className="px-4 py-3 font-medium text-center">الحالة</th>
                                    <th className="px-4 py-3 font-medium">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading && documents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                                            جاري التحميل...
                                        </td>
                                    </tr>
                                ) : documents.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                            <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                                            لا توجد سجلات مطابقة للبحث
                                        </td>
                                    </tr>
                                ) : (
                                    documents.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3 font-mono text-gray-900" dir="ltr">
                                                {doc.serial_number}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{doc.recipient_name}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Badge variant="outline" className="text-[10px] h-4 py-0 pl-1 pr-1 bg-gray-50">
                                                        {doc.document_type === 'certificate' ? 'شهادة' : 'شارة'}
                                                    </Badge>
                                                    {doc.recipient_role && <span className="ms-1 truncate w-24" title={doc.recipient_role}>{doc.recipient_role}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                <div className="truncate max-w-[200px]" title={doc.occasion || "غير محدد"}>
                                                    {doc.occasion || <span className="text-gray-400">بدون تظاهرة</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center text-gray-600 gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {format(new Date(doc.issued_at), "dd MMM yyyy", { locale: arDZ })}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {doc.is_revoked ? (
                                                    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                                                        <XCircle className="h-3 w-3 me-1" />
                                                        ملغاة
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                                                        <CheckCircle2 className="h-3 w-3 me-1" />
                                                        صالحة
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-8 shadow-sm"
                                                        onClick={() => window.open(`/verify/${doc.serial_number}`, '_blank')}
                                                    >
                                                        <Eye className="h-4 w-4 me-1" />
                                                        تتبع
                                                    </Button>
                                                    {!doc.is_revoked && (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                                            onClick={() => setRevokeObj(doc)}
                                                        >
                                                            <Ban className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        السابق
                    </Button>
                    <span className="text-sm font-medium px-4">
                        {page} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        التالي
                    </Button>
                </div>
            )}

            {/* Revoke Dialog */}
            <Dialog open={!!revokeObj} onOpenChange={(open) => !open && setRevokeObj(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <ShieldAlert className="h-5 w-5" />
                            إلغاء وإبطال وثيقة رسمية
                        </DialogTitle>
                        <DialogDescription className="pt-3 leading-relaxed">
                            أنت على وشك إلغاء {revokeObj?.document_type === 'certificate' ? 'الشهادة' : 'الشارة'} المسجلة باسم <strong>{revokeObj?.recipient_name}</strong> ذات الرقم التسلسلي <strong dir="ltr" className="bg-gray-100 px-1 rounded">{revokeObj?.serial_number}</strong>.
                            <br/><br/>
                            بمجرد الإلغاء، سيظهر هذا المستند كـ "غير صالح ومُلغى" عند مسح رمز الـ QR الخاص به أو فحصه في البوابة العامة.<br/>
                            هذا الإجراء <strong>لا يمكن التراجع عنه</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-3 py-4">
                        <label className="text-sm font-bold text-gray-700">سبب الإلغاء (يظهر للمتحقق)</label>
                        <Input 
                            placeholder="مثال: فقدان الشارة، انتهاء المهام، خطأ في البيانات..." 
                            value={revokeReason}
                            onChange={(e) => setRevokeReason(e.target.value)}
                            autoFocus
                        />
                    </div>
                    
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setRevokeObj(null)}>تراجع</Button>
                        <Button variant="destructive" onClick={handleRevoke} disabled={revoking || !revokeReason.trim()}>
                            {revoking ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : <Ban className="h-4 w-4 ms-2" />}
                            تأكيد الإلغاء
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
