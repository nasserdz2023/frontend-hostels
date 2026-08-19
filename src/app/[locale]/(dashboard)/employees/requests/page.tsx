"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import api from "@/lib/api/client";
import RequestDetailsView from "@/components/employees/RequestDetailsView";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import {
    Check,
    X,
    Clock,
    UserPlus,
    Loader2,
    Eye,
    Phone,
    RefreshCw,
    Calendar,
    Trash2,
    Maximize2,
    FileText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface EmployeeRequest {
    id: string;
    firstname_ar: string;
    lastname_ar: string;
    firstname_fr?: string;
    lastname_fr?: string;
    phone: string;
    email?: string;
    birth_date?: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
    updated_at?: string;
    rejection_reason?: string;
    nin?: string;
    appointment_type?: string;
    original_administration_type?: string;
    grade?: { id: string, name_ar: string };
    position?: { id: string, name_ar: string };
    department?: { id: string, name_ar: string };
    institution?: { id: string, name_ar: string };
    hiring_education_level?: { id: string, name_ar: string };
    grade_name?: string;
    position_name?: string;
    gender?: string;
    birth_place?: string;
    family_status?: string;
    children_count?: number;
    address?: string;
    hiring_date?: string;
    original_department?: string;
}

export default function EmployeeRequestsPage() {
    const t = useTranslations("employees");
    const router = useRouter();
    const [requests, setRequests] = useState<EmployeeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");
    const [selectedRequest, setSelectedRequest] = useState<EmployeeRequest | null>(null);
    const [actionType, setActionType] = useState<"approve" | "reject" | "delete" | null>(null);

    const [processing, setProcessing] = useState(false);

    // Details & Comparison
    const [detailRequest, setDetailRequest] = useState<EmployeeRequest | null>(null);
    const [possibleMatches, setPossibleMatches] = useState<any[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const params = filter !== "all" ? { status: filter } : {};
            const response = await api.get("/employees/requests", { params });
            setRequests(response.data || []);
        } catch (error) {
            console.error("Error fetching requests:", error);
            toast.error("فشل في تحميل الطلبات");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [filter]);

    const handleAction = async () => {
        if (!selectedRequest || !actionType) return;

        setProcessing(true);
        try {
            if (actionType === "delete") {
                await api.delete(`/employees/requests/${selectedRequest.id}`);
                toast.success("تم حذف الطلب بنجاح");
            } else {
                await api.patch(`/employees/requests/${selectedRequest.id}`, {
                    status: actionType === "approve" ? "approved" : "rejected"
                });

                toast.success(
                    actionType === "approve"
                        ? "تم قبول الطلب بنجاح"
                        : "تم رفض الطلب"
                );
            }

            fetchRequests();
        } catch (error) {
            console.error("Error updating request:", error);
            toast.error("فشل في تنفيذ الإجراء");
        } finally {
            setProcessing(false);
            setSelectedRequest(null);
            setActionType(null);
            if (actionType === 'delete' && detailRequest?.id === selectedRequest.id) {
                setDetailRequest(null); // Close details if deleted from there
            }
        }
    };

    // Fetch matches when opening details
    useEffect(() => {
        if (detailRequest) {
            const fetchMatches = async () => {
                setLoadingMatches(true);
                try {
                    let matches: any[] = [];

                    // 1. First try to find by National ID (NIN)
                    if (detailRequest.nin) {
                        const response = await api.get('/employees', {
                            params: { search: detailRequest.nin }
                        });
                        matches = response.data.items || [];
                    }

                    // 2. If no matches found by NIN, search by Last Name (as fallback)
                    if (matches.length === 0) {
                        const response = await api.get('/employees', {
                            params: { search: detailRequest.lastname_ar }
                        });
                        // Filter loosely if needed, or trust backend search
                        matches = response.data.items || [];
                    }

                    setPossibleMatches(matches);
                } catch (e) {
                    console.error("Failed to fetch matches", e);
                } finally {
                    setLoadingMatches(false);
                }
            };
            fetchMatches();
        } else {
            setPossibleMatches([]);
        }
    }, [detailRequest]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/50">
                        <Clock className="w-3 h-3 ms-1" />
                        معلق
                    </Badge>
                );
            case "approved":
                return (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/50">
                        <Check className="w-3 h-3 ms-1" />
                        مقبول
                    </Badge>
                );
            case "rejected":
                return (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/50">
                        <X className="w-3 h-3 ms-1" />
                        مرفوض
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const MONTHS_DZ = [
        'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
        'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const day = date.getDate();
            const month = MONTHS_DZ[date.getMonth()];
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <UserPlus className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">طلبات التسجيل</h1>
                        <p className="text-muted-foreground text-sm">
                            إدارة طلبات انضمام الموظفين الجدد
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchRequests}
                    disabled={loading}
                >
                    <RefreshCw className={`w-4 h-4 ms-2 ${loading ? "animate-spin" : ""}`} />
                    تحديث
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">تصفية حسب الحالة:</span>
                        <Select value={filter} onValueChange={setFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">الكل</SelectItem>
                                <SelectItem value="pending">معلق</SelectItem>
                                <SelectItem value="approved">مقبول</SelectItem>
                                <SelectItem value="rejected">مرفوض</SelectItem>
                            </SelectContent>
                        </Select>
                        <Badge variant="secondary" className="me-auto">
                            {requests.length} طلب
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">قائمة الطلبات</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>لا توجد طلبات {filter !== "all" && `بحالة "${filter}"`}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>الاسم الكامل</TableHead>
                                    <TableHead>رقم الهاتف</TableHead>
                                    <TableHead>تاريخ الميلاد</TableHead>
                                    <TableHead>تاريخ الطلب</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead className="text-center">الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((request) => (
                                    <TableRow
                                        key={request.id}
                                        onDoubleClick={() => router.push(`/ar/employees/requests/${request.id}`)}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    >
                                        <TableCell>
                                            <div>
                                                <span className="font-medium">
                                                    {request.lastname_ar} {request.firstname_ar}
                                                </span>
                                                {request.firstname_fr && (
                                                    <span className="text-xs text-muted-foreground block">
                                                        {request.lastname_fr} {request.firstname_fr}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm">
                                                <Phone className="w-3 h-3" />
                                                {request.phone}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {request.birth_date ? (
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(request.birth_date)}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(request.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(request.status)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center gap-2">
                                                {request.status === "pending" && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-green-600 hover:bg-green-50 hover:text-green-700"
                                                            onClick={() => {
                                                                setSelectedRequest(request);
                                                                setActionType("approve");
                                                            }}
                                                        >
                                                            <Check className="w-4 h-4 ms-1" />
                                                            قبول
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                            onClick={() => {
                                                                setSelectedRequest(request);
                                                                setActionType("reject");
                                                            }}
                                                        >
                                                            <X className="w-4 h-4 ms-1" />
                                                            رفض
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="w-8 h-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedRequest(request);
                                                        setActionType("delete");
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="w-8 h-8 p-0 text-blue-600 hover:bg-blue-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/ar/employees/requests/${request.id}`);
                                                    }}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Confirmation Dialog */}
            <AlertDialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
                setSelectedRequest(null);
                setActionType(null);
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {actionType === "approve" ? "تأكيد قبول الطلب" : "تأكيد رفض الطلب"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {actionType === "approve"
                                ? `هل أنت متأكد من قبول طلب ${selectedRequest?.firstname_ar} ${selectedRequest?.lastname_ar}؟`
                                : `هل أنت متأكد من رفض طلب ${selectedRequest?.firstname_ar} ${selectedRequest?.lastname_ar}؟`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAction}
                            disabled={processing}
                            className={actionType === "approve"
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-red-600 hover:bg-red-700"
                            }
                        >
                            {processing && <Loader2 className="w-4 h-4 ms-2 animate-spin" />}
                            {actionType === "approve" ? "قبول" : "رفض"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Details Dialog */}
            <Dialog open={!!detailRequest} onOpenChange={(open) => !open && setDetailRequest(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>تفاصل الطلب</DialogTitle>
                        <DialogDescription>
                            مراجعة ومقارنة بيانات الموظف
                        </DialogDescription>
                    </DialogHeader>

                    {detailRequest && (
                        <div className="flex-1 overflow-hidden">
                            <Tabs defaultValue="details" className="h-full flex flex-col">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="details">بيانات الطلب</TabsTrigger>
                                    <TabsTrigger value="compare">مقارنة مع الموظفين ({possibleMatches.length})</TabsTrigger>
                                </TabsList>

                                {/* Details Tab */}
                                <TabsContent value="details" className="flex-1 overflow-auto mt-2">
                                    <ScrollArea className="h-[60vh] pe-4">
                                        <RequestDetailsView request={detailRequest} />

                                        <Separator className="my-4" />

                                        <div className="flex gap-2 justify-end sticky bottom-0 bg-background py-2">
                                            <Button
                                                variant="destructive"
                                                onClick={() => {
                                                    setSelectedRequest(detailRequest);
                                                    setActionType("delete");
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4 ms-2" />
                                                حذف الطلب
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={() => {
                                                    setSelectedRequest(detailRequest);
                                                    setActionType("reject");
                                                }}
                                                className="bg-orange-100 text-orange-700 hover:bg-orange-200"
                                            >
                                                <X className="w-4 h-4 ms-2" />
                                                رفض
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    setSelectedRequest(detailRequest);
                                                    setActionType("approve");
                                                }}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <Check className="w-4 h-4 ms-2" />
                                                قبول
                                            </Button>
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                {/* Compare Tab */}
                                <TabsContent value="compare" className="flex-1 overflow-auto p-4 border rounded-md mt-2">
                                    {loadingMatches ? (
                                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                                    ) : possibleMatches.length === 0 ? (
                                        <div className="text-center p-8 text-muted-foreground">لا توجد تطابقات محتملة</div>
                                    ) : (
                                        <div className="space-y-4">
                                            {possibleMatches.map((match: any) => (
                                                <div key={match.id} className="p-3 border rounded hover:bg-muted/50 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold">{match.firstname_ar} {match.lastname_ar}</p>
                                                        <p className="text-xs text-muted-foreground">{match.phone} | {match.email}</p>
                                                    </div>
                                                    <Badge variant={match.phone === detailRequest.phone ? "destructive" : "outline"}>
                                                        {match.phone === detailRequest.phone ? "تطابق الهاتف" : "تشابه الاسم"}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    );
}
