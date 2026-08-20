"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { institutionsApi } from "@/lib/api/institutions";
import { associationsApi } from "@/lib/api/associations";
import { campTripsApi, CampTrip, VerifyMinistryResponse } from "@/lib/api/camp-trips";
import { membersApi } from "@/lib/api/members";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Printer, Download, Users, Tent, Edit2, Check, X, UserPlus, MapPin, Search, Trash2, Upload, FileCheck, Loader2, ScanLine, ScanSearch, Settings2, CloudUpload, Crop, Lock, RefreshCw, MoreHorizontal, Building, Eye, ExternalLink, AlertTriangle, CloudDownload, FileText, Hash, Link2, Navigation, Receipt } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { OdooSearch } from "@/components/odoo";
import { AddMembersModal } from "./AddMembersModal";
import { formatAgePrecise } from "@/lib/camp-allocation-utils";
import { Link } from "@/i18n/routing";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/auth";

import { PermissionGuard } from "@/hooks/useRequirePermission";

const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || 'https://api.djs-bousaada.com/storage';

const memberReceiptUrl = (member: { receipt_path?: string | null; screenshot_path?: string | null }) => {
  const p = member.receipt_path || member.screenshot_path;
  if (!p) return null;
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  // مسار محلي للبوت (tmp_downloads/…) أو مسار مطلق — لا يمكن فتحه عبر التخزين
  if (p.startsWith('/') || p.startsWith('file:') || p.includes('tmp_downloads') || p.includes('\\')) return null;
  return `${STORAGE_URL}/${p}`;
};

// ── رأس قابل للفرز (اضغط: تصاعدي ← تنازلي ← إعادة الافتراضي)
function SortableHeader({ sortKey, sortDir, colKey, onSort, className, children }: {
  sortKey: string | null;
  sortDir: 'asc' | 'desc';
  colKey: string;
  onSort: (k: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const active = sortKey === colKey;
  return (
    <TableHead className={className ?? ''}>
      <button
        type="button"
        onClick={() => onSort(colKey)}
        className={`inline-flex items-center gap-1 font-bold transition-colors ${active ? 'text-emerald-700' : 'hover:text-emerald-600'}`}
        title="اضغط للترتيب (تصاعدي/تنازلي)"
      >
        {children}
        <span className="text-[10px] leading-none">{active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
      </button>
    </TableHead>
  );
}

export default function CampTripDetailsPage() {
  const t = useTranslations("camp-trips");
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const [trip, setTrip] = useState<CampTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [sortKey, setSortKey] = useState<string | null>(null); // null = الترتيب الافتراضي (نفس الإكسل)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showCopyStandby, setShowCopyStandby] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetTripId, setMoveTargetTripId] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  const [availableTrips, setAvailableTrips] = useState<CampTrip[]>([]);
  const [selectedSourceTrip, setSelectedSourceTrip] = useState("");
  const [addToStandby, setAddToStandby] = useState(true);
  const [isCopyingStandby, setIsCopyingStandby] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [instMinisterialMap, setInstMinisterialMap] = useState<Record<string, string>>({});
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncLimit, setSyncLimit] = useState(100);
  const [syncTaskId, setSyncTaskId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState({ processed: 0, total: 0, message: '', status: '' });
  const [showBulkSeatDialog, setShowBulkSeatDialog] = useState(false);
  const [bulkSeatType, setBulkSeatType] = useState<'main' | 'standby'>('main');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [verifyingMemberId, setVerifyingMemberId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyMinistryResponse | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showBulkVerifyDialog, setShowBulkVerifyDialog] = useState(false);
  const [bulkVerifyTaskId, setBulkVerifyTaskId] = useState<string | null>(null);
  const [bulkVerifyProgress, setBulkVerifyProgress] = useState({ processed: 0, total: 0, message: '', status: '' });
  const [bulkVerifyResults, setBulkVerifyResults] = useState<any[] | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    capacity: 0,
    scouts_quota: 0,
    associations_quota: 0,
    institutions_quota: 0,
    start_date: '',
    end_date: '',
    ministry_session_id: '' as string | null,
    ministry_session_name: '' as string | null,
  });

  const fetchTrip = async () => {
    try {
      const response = await campTripsApi.getTrip(tripId);
      setTrip(response.data);
      setNewName(response.data.name);
    } catch (error) {
      console.error("Failed to load trip details", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tripId) return;
    fetchTrip();
  }, [tripId]);

  const resolveInstName = (inst?: string | null) => {
    if (!inst) return undefined;
    const trimmed = inst.trim();
    if (Object.values(instMinisterialMap).includes(trimmed)) return trimmed;
    const first6 = trimmed.split('-')[0].trim();
    if (first6.length === 6 && instMinisterialMap[first6]) {
      return instMinisterialMap[first6];
    }
    return trimmed;
  };

  const getAdherenceStatus = (unifiedAdherenceNumber?: string | null, youthInstitution?: string | null): { color: string; tooltip: string | null } => {
    if (!unifiedAdherenceNumber) return { color: '', tooltip: null };
    const first6 = unifiedAdherenceNumber.split('-')[0].trim();
    if (!first6 || first6.length !== 6) return { color: '', tooltip: null };

    const expectedInstName = instMinisterialMap[first6];
    if (!expectedInstName) {
      return { 
        color: 'text-blue-600', 
        tooltip: `الكود ${first6} غير مسجل في قائمة المؤسسات بقاعدة البيانات ولا يمكن التحقق منه` 
      };
    }

    const resolvedYouthInst = resolveInstName(youthInstitution);
    if (expectedInstName.trim() === (resolvedYouthInst?.trim() || '')) {
      return { color: 'text-emerald-600', tooltip: null }; // match - green
    }

    return {
      color: 'text-rose-600',
      tooltip: `الكود ${first6} يعود لمؤسسة "${expectedInstName}" وليس "${resolvedYouthInst || 'غير محددة'}"`
    }; // mismatch - red with tooltip
  };

  useEffect(() => {
    if (showCopyStandby || showMoveModal) {
      campTripsApi.listTrips({ page_size: 100 })
        .then(res => setAvailableTrips(res.data.items.filter((t: CampTrip) => t.id !== tripId)))
        .catch(console.error);
    }
  }, [showCopyStandby, showMoveModal, tripId]);

  const exportToExcel = async () => {
    if (!trip || !trip.id) return;
    try {
      const res = await campTripsApi.exportToExcel(trip.id, trip.name);
      toast.success(res.message || "جاري إنشاء الملف في الخلفية...");
    } catch (error: any) {
      console.error("Failed to export Excel file:", error);
      toast.error(error?.response?.data?.detail || t("failed_export"));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUpdateName = async () => {
    if (!newName.trim() || newName === trip?.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await campTripsApi.updateTrip(tripId, { name: newName });
      setTrip(prev => prev ? { ...prev, name: newName } : prev);
      setIsEditingName(false);
    } catch (error: any) {
      console.error("Failed to update trip name:", error);
      toast.error(error?.response?.data?.detail || t("failed_update"));
    }
  };

  const handleOpenEditDialog = () => {
    if (!trip) return;
    setEditForm({
      name: trip.name || '',
      description: trip.description || '',
      capacity: trip.capacity || 0,
      scouts_quota: trip.scouts_quota || 0,
      associations_quota: trip.associations_quota || 0,
      institutions_quota: trip.institutions_quota || 0,
      start_date: trip.start_date || '',
      end_date: trip.end_date || '',
      ministry_session_id: (trip as any).ministry_session_id || null,
      ministry_session_name: (trip as any).ministry_session_name || null,
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      toast.error("يرجى إدخال اسم الفوج");
      return;
    }
    setIsSavingEdit(true);
    try {
      await campTripsApi.updateTrip(tripId, {
        name: editForm.name,
        description: editForm.description || undefined,
        capacity: editForm.capacity,
        scouts_quota: editForm.scouts_quota,
        associations_quota: editForm.associations_quota,
        institutions_quota: editForm.institutions_quota,
        start_date: editForm.start_date || undefined,
        end_date: editForm.end_date || undefined,
        ministry_session_id: editForm.ministry_session_id || null,
        ministry_session_name: editForm.ministry_session_name || null,
      } as any);
      setTrip(prev => prev ? { ...prev, ...editForm } : prev);
      setShowEditDialog(false);
      toast.success("تم تحديث بيانات الفوج بنجاح");
    } catch (error: any) {
      console.error("Failed to update trip:", error);
      toast.error(error?.response?.data?.detail || "فشل تحديث بيانات الفوج");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBulkAction = async (actionType: 'delete' | 'enroll' | 'renew') => {
    if (selectedMembers.size === 0) return;
    
    if (actionType === 'delete') {
      const reason = window.prompt("الرجاء إدخال سبب الحذف الجماعي:");
      if (!reason) return;
      
      setIsBulkProcessing(true);
      const loadingToastId = toast.loading(`جاري حذف ${selectedMembers.size} عضو...`);
      let successCount = 0;
      
      try {
        await campTripsApi.removeMembers(tripId, Array.from(selectedMembers), reason);
        toast.success(`تم حذف ${selectedMembers.size} عضو بنجاح`, { id: loadingToastId });
      } catch (e) {
        toast.error("فشل الحذف الجماعي", { id: loadingToastId });
      }
      setSelectedMembers(new Set());
      fetchTrip();
      setIsBulkProcessing(false);
      return;
    }

    if (actionType === 'enroll' || actionType === 'renew') {
      setIsBulkProcessing(true);
      const actionName = actionType === 'enroll' ? 'إنشاء' : 'تجديد';
      const loadingToastId = toast.loading(`جاري ${actionName} انخراط لـ ${selectedMembers.size} عضو...`);
      let successCount = 0;
      
      for (const id of selectedMembers) {
        try {
          await campTripsApi.enrollMinisterial(tripId, id);
          successCount++;
        } catch (e) {}
      }
      toast.success(`تم إرسال ${successCount} طلب بنجاح`, { id: loadingToastId });
      setSelectedMembers(new Set());
      fetchTrip();
      setIsBulkProcessing(false);
      return;
    }
  };

  const handleBulkMove = async () => {
    if (!moveTargetTripId) return;
    
    setIsMoving(true);
    const loadingToastId = toast.loading(`جاري نقل ${selectedMembers.size} عضو...`);
    
    try {
      const allMembers = [...mainMembers, ...standbyMembers];
      const membersData = allMembers.filter(m => m.id && selectedMembers.has(m.id));
      
      // 1. Add members to new trip
      await campTripsApi.addMembers(moveTargetTripId, membersData);
      
      // 2. Remove from current trip
      for (const m of membersData) {
        try {
          await campTripsApi.removeMember(tripId, m.id!, "نقل إلى فوج آخر");
        } catch (e) {}
      }
      
      toast.success(`تم نقل ${selectedMembers.size} عضو بنجاح`, { id: loadingToastId });
      setSelectedMembers(new Set());
      setShowMoveModal(false);
      setMoveTargetTripId('');
      fetchTrip();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "حدث خطأ أثناء النقل", { id: loadingToastId });
    } finally {
      setIsMoving(false);
    }
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete || !deleteReason) return;
    setIsDeleting(true);
    try {
      await campTripsApi.removeMember(tripId, memberToDelete, deleteReason);
      setMemberToDelete(null);
      setDeleteReason('');
      fetchTrip();
    } catch (error: any) {
      console.error("Failed to remove member:", error);
      toast.error(error?.response?.data?.detail || t("failed_remove_member") || "حدث خطأ أثناء إزالة العضو");
    } finally {
      setIsDeleting(false);
    }
  };
    const [institutions, setInstitutions] = useState<any[]>([]);
  const [associations, setAssociations] = useState<any[]>([]);

  useEffect(() => {
    institutionsApi.getAll({ size: 200, sector: 'YOUTH' }).then(res => setInstitutions(res.items || []));
    associationsApi.getAll({ limit: 1000 }).then(res => setAssociations(res.items || [])).catch(err => console.error('Failed to fetch associations:', err));
    institutionsApi.getAll({ size: 500 })
      .then(res => {
        const map: Record<string, string> = {};
        (res.items).forEach((inst: any) => {
          if (inst.ministerial_code) {
            map[inst.ministerial_code.trim()] = inst.name_ar;
          }
        });
        setInstMinisterialMap(map);
      })
      .catch(err => console.error("Failed to fetch institutions for code comparison", err));
  }, []);
  const [memberToEditType, setMemberToEditType] = useState<any>(null);
  const [syncingMemberId, setSyncingMemberId] = useState<string | null>(null);
  const [enrollingMemberId, setEnrollingMemberId] = useState<string | null>(null);
  const [importingMemberId, setImportingMemberId] = useState<string | null>(null);
  const [renewingMemberId, setRenewingMemberId] = useState<string | null>(null);

  const [editMemberType, setEditMemberType] = useState<string>("main");
  const [editYouthInstitution, setEditYouthInstitution] = useState<string>("");
  const [editIsStandby, setEditIsStandby] = useState<boolean>(false);
  const [editMinistryNumber, setEditMinistryNumber] = useState<string>("");
  const [editUnifiedNumber, setEditUnifiedNumber] = useState<string>("");
  const [editEnrollInstitution, setEditEnrollInstitution] = useState<string>("");
  const [editForceRegistration, setEditForceRegistration] = useState<boolean>(false);
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [assigningMemberId, setAssigningMemberId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const handleSyncMinisterial = async (memberId: string) => {
    if (!tripId) return;
    setSyncingMemberId(memberId);
    try {
      const res = await campTripsApi.syncMinisterial(tripId, memberId);
      toast.success(res.data.message || "تم المزامنة بنجاح");
      fetchTrip();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "حدث خطأ أثناء المزامنة");
    } finally {
      setSyncingMemberId(null);
    }
  };

  const handleEnrollMinisterial = async (memberId: string) => {
    if (!tripId) return;
    setEnrollingMemberId(memberId);
    try {
      const res = await campTripsApi.enrollMinisterial(tripId, memberId);
      toast.success(res.data?.message || "تم إنشاء الانخراط المحلي بنجاح");
      fetchTrip();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "حدث خطأ أثناء الانخراط");
    } finally {
      setEnrollingMemberId(null);
    }
  };

  const handleFetchFromMinisterial = async (memberId: string) => {
    if (!tripId) return;
    setImportingMemberId(memberId);
    try {
      const res = await campTripsApi.fetchFromMinisterial(tripId, memberId);
      toast.success(res.data?.message || "تم استيراد البيانات من المنصة الوزارية بنجاح");
      fetchTrip();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "فشل الاستيراد من المنصة الوزارية");
    } finally {
      setImportingMemberId(null);
    }
  };

  const handleRenewYouthConnect = async (memberId: string, institutionOverride?: string) => {
    if (!tripId) return;
    setRenewingMemberId(memberId);
    try {
      const res = await membersApi.renewYouthconnect(memberId, institutionOverride);
      toast.success(res.data?.message || "تم تجديد الرقم بنجاح");
      fetchTrip();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "فشل تجديد رقم الانخراط الموحد");
    } finally {
      setRenewingMemberId(null);
    }
  };

  const handleVerifyMinistry = async (memberId: string) => {
    setVerifyingMemberId(memberId);
    try {
      const response = await campTripsApi.verifyMinistryData(tripId, memberId);
      setVerifyResult(response.data);
      setShowVerifyDialog(true);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'فشل التحقق من بيانات المنصة الوزارية');
    } finally {
      setVerifyingMemberId(null);
    }
  };

  const [isEditingType, setIsEditingType] = useState(false);

  const handleUpdateMemberType = async () => {
    if (!memberToEditType?.id) return;
    setIsEditingType(true);
    try {
        await campTripsApi.updateMemberType(tripId, memberToEditType.id, {
            member_type: editMemberType,
            youth_institution: editYouthInstitution,
            is_standby: editIsStandby,
            ministry_number: editMinistryNumber,
            unified_adherence_number: editUnifiedNumber,
            enrollment_institution: editEnrollInstitution,
            force_registration: editForceRegistration
        });
        toast.success("تم تحديث معلومات المقعد بنجاح");
        setMemberToEditType(null);
        fetchTrip();
    } catch (error) {
        console.error("Failed to update member type:", error);
        toast.error("فشل في تحديث معلومات المقعد");
    } finally {
        setIsEditingType(false);
    }
  };

  const handleDragAndDropMove = async (memberId: string, toStandby: boolean) => {
    if (!tripId) return;
    const member = trip?.members?.find(m => m.id === memberId);
    if (!member || !member.id) return;

    try {
        await campTripsApi.updateMemberType(tripId, member.id, {
            member_type: member.member_type,
            youth_institution: member.youth_institution,
            is_standby: toStandby,
            ministry_number: member.ministry_number
        });
        toast.success(toStandby ? "تم النقل إلى الاحتياط" : "تمت الترقية إلى القائمة الأساسية");
        fetchTrip();
    } catch (error: any) {
        toast.error(error.response?.data?.detail || "فشل النقل");
    }
  };

  const [memberToUpload, setMemberToUpload] = useState<string | null>(null);
  const [memberToUploadDocType, setMemberToUploadDocType] = useState<'declaration' | 'medical'>('declaration');
  const [isUploading, setIsUploading] = useState(false);
  const [separateUpload, setSeparateUpload] = useState(false);

  const handleUploadDeclaration = async (file: File, docType: 'declaration' | 'medical' = 'declaration') => {
      if (!memberToUpload) return;
      setIsUploading(true);
      try {
          if (docType === 'medical') {
              await campTripsApi.uploadMedicalCertificate(tripId, memberToUpload, file);
              toast.success("تم رفع الشهادة الطبية بنجاح");
          } else {
              await campTripsApi.uploadDeclaration(tripId, memberToUpload, file);
              toast.success("تم رفع التصريح بنجاح");
          }
          setMemberToUpload(null);
          fetchTrip();
      } catch (error) {
          console.error("Failed to upload document:", error);
          toast.error(docType === 'medical' ? "فشل في رفع الشهادة الطبية" : "فشل في رفع التصريح");
      } finally {
          setIsUploading(false);
      }
  };

  const handleOpenSyncDialog = () => {
    setSyncLimit(100);
    setSyncTaskId(null);
    setSyncProgress({ processed: 0, total: 0, message: '', status: '' });
    setShowSyncDialog(true);
  };

  // Load available sessions when edit dialog opens
  useEffect(() => {
    if (showEditDialog && availableSessions.length === 0) {
      setLoadingSessions(true);
      campTripsApi.getSessions()
        .then(res => setAvailableSessions(res.data.data || []))
        .catch(() => setAvailableSessions([]))
        .finally(() => setLoadingSessions(false));
    }
  }, [showEditDialog]);

  const handleStartSync = async () => {
    if (!tripId) return;
    setSyncTaskId('starting');
    setSyncProgress({ processed: 0, total: 0, message: 'جاري بدء المزامنة...', status: 'processing' });
    try {
      const res = await campTripsApi.syncMinistryNumbers(tripId, syncLimit);
      const taskId = res.data?.task_id;
      if (!taskId) throw new Error('No task_id returned');
      
      setSyncTaskId(taskId);
      
      // بدء الـ polling
      const poll = setInterval(async () => {
        try {
          const progressRes = await campTripsApi.getTaskProgress(taskId);
          const p = progressRes.data;
          setSyncProgress({
            processed: p.processed || 0,
            total: p.total || 0,
            message: p.message || '',
            status: p.status || 'processing'
          });
          
          if (p.status === 'completed') {
            clearInterval(poll);
            toast.success(p.message || `تم تحديث ${p.updated_count || 0} رقماً وزارياً`);
            setSyncTaskId(null);
            setShowSyncDialog(false);
            fetchTrip();
          } else if (p.status === 'failed') {
            clearInterval(poll);
            toast.error(p.message || 'فشلت المزامنة');
            setSyncTaskId(null);
            setShowSyncDialog(false);
          }
        } catch (e) {
          // ignore polling errors, keep trying
        }
      }, 2000);
      
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'فشل بدء المزامنة');
      setSyncTaskId(null);
    }
  };

  const handleStartBulkVerify = async () => {
    if (!tripId) return;
    setShowBulkVerifyDialog(true);
    setBulkVerifyTaskId('starting');
    setBulkVerifyResults(null);
    setBulkVerifyProgress({ processed: 0, total: 0, message: 'جاري بدء التحقق الجماعي...', status: 'processing' });
    try {
      const res = await campTripsApi.verifyMinistryBulk(tripId);
      const taskId = res.data?.task_id;
      if (!taskId) throw new Error('No task_id returned');
      
      setBulkVerifyTaskId(taskId);
      
      // بدء الـ polling
      const poll = setInterval(async () => {
        try {
          const progressRes = await campTripsApi.getTaskProgress(taskId);
          const p = progressRes.data;
          setBulkVerifyProgress({
            processed: p.processed || 0,
            total: p.total || 0,
            message: p.message || '',
            status: p.status || 'processing'
          });
          
          if (p.status === 'completed') {
            clearInterval(poll);
            // Store results
            const results = (p as any).results || [];
            setBulkVerifyResults(results);
            setBulkVerifyTaskId(null);
            
            const withDiff = results.filter((r: any) => r.has_differences).length;
            const notFound = results.filter((r: any) => !r.ministry_data_exists).length;
            let msg = `تم التحقق من ${results.length} طفلاً`;
            if (withDiff > 0) msg += `، ${withDiff} لديهم اختلافات`;
            if (notFound > 0) msg += `، ${notFound} غير موجودين`;
            toast.success(msg);
          } else if (p.status === 'failed') {
            clearInterval(poll);
            toast.error(p.message || 'فشل التحقق الجماعي');
            setBulkVerifyTaskId(null);
          }
        } catch (e) {
          // ignore polling errors
        }
      }, 2000);
      
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'فشل بدء التحقق الجماعي');
      setBulkVerifyTaskId(null);
    }
  };

  const handleCopyStandby = async () => {
    if (!selectedSourceTrip) return;
    setIsCopyingStandby(true);
    try {
      await campTripsApi.copyStandbyFromTrip(tripId, selectedSourceTrip, addToStandby);
      toast.success("تم جلب القائمة الاحتياطية بنجاح");
      setShowCopyStandby(false);
      setSelectedSourceTrip("");
      fetchTrip();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "فشل في جلب القائمة الاحتياطية");
    } finally {
      setIsCopyingStandby(false);
    }
  };

  const handleAssignSession = async (memberId: string) => {
    if (!(trip as any)?.ministry_session_id) {
      toast.error('يجب تحديد الدورة أولاً من تعديل الفوج');
      return;
    }

    setIsAssigning(true);
    try {
      const res = await campTripsApi.assignSession(tripId, memberId);
      toast.success(res.data.message || 'تم توجيه الطفل إلى الدورة بنجاح');
      setAssigningMemberId(null);
      // Refresh trip data
      fetchTrip();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'فشل في توجيه الطفل إلى الدورة';
      toast.error(msg);
    } finally {
      setIsAssigning(false);
    }
  };

  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const handleStatusChange = async (newStatus: string) => {
    if (!trip || newStatus === trip.status) return;
    setIsUpdatingStatus(true);
    try {
      await campTripsApi.updateStatus(tripId, newStatus);
      toast.success("تم تحديث الحالة بنجاح");
      await fetchTrip();
    } catch (error: any) {
      console.error("Failed to update status:", error);
      toast.error(error?.response?.data?.detail || "حدث خطأ أثناء تحديث الحالة");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {

    return <div className="p-8 text-center animate-pulse text-slate-500">{t("loading")}</div>;
  }

  if (!trip) {
    return <div className="p-8 text-center text-red-500">{t("failed_load")}</div>;
  }

  // ── الفرز: افتراضياً = ترتيب ملف الإكسل حرفياً (المؤسسة ← البلدية ← لقب الولي ← لقب الطفل) — لا يتغير ملف الإكسل
  const DEFAULT_SORT_ORDER = ['youth_institution', 'municipality', 'parent_last', 'last_name', 'first_name'];

  const getSortValue = (m: any, key: string): string | number => {
    switch (key) {
      case 'photo':
        return m.photo_path ? 1 : 0;
      case 'birth_date': {
        if (!m.birth_date) return 0;
        const t = new Date(m.birth_date).getTime();
        return Number.isNaN(t) ? 0 : t;
      }
      case 'parent_name':
        return (m.parent_full_name || '').toString();
      case 'parent_last': {
        const full = (m.parent_full_name || '').trim();
        if (!full) return '';
        const parts = full.split(/\s+/);
        return parts.length > 1 ? parts[1] : parts[0];
      }
      case 'member_type': {
        const rank: Record<string, number> = { main: 1, institution: 2, scout: 3, association: 4, municipality: 5, authority: 6 };
        return rank[m.member_type] ?? 99;
      }
      default:
        return (m[key] ?? '').toString();
    }
  };

  // فرز طبيعي: يقارن الأجزاء الرقمية رقماً (10 < 100 < 2) بدل المقارنة النصية (10 ثم 100 ثم 2)
  const naturalCompare = (a: string, b: string): number => {
    const partA = a.split(/(\d+)/);
    const partB = b.split(/(\d+)/);
    const len = Math.min(partA.length, partB.length);
    for (let i = 0; i < len; i++) {
      const pa = partA[i];
      const pb = partB[i];
      if (pa === pb) continue;
      const na = /^\d+$/.test(pa) ? parseInt(pa, 10) : NaN;
      const nb = /^\d+$/.test(pb) ? parseInt(pb, 10) : NaN;
      if (!Number.isNaN(na) && !Number.isNaN(nb)) {
        if (na !== nb) return na - nb;
      } else {
        return pa.localeCompare(pb, 'ar');
      }
    }
    return partA.length - partB.length;
  };

  const sortMembers = (members: any[], key: string | null, dir: 'asc' | 'desc') => {
    // افتراضياً: ترتيب الإكسل؛ مع احترام اختيار التجميع (البلدية أولاً إن اختارها المستخدم)
    const defaultKeys = groupBy === 'municipality'
      ? ['municipality', 'youth_institution', 'parent_last', 'last_name', 'first_name']
      : DEFAULT_SORT_ORDER;
    const keys = key ? [key, ...defaultKeys.filter(k => k !== key)] : defaultKeys;
    return [...members].sort((a, b) => {
      for (const k of keys) {
        const va = getSortValue(a, k);
        const vb = getSortValue(b, k);
        let cmp: number;
        if (typeof va === 'number' && typeof vb === 'number') {
          cmp = va - vb;
        } else if (k === 'unified_adherence_number') {
          cmp = naturalCompare(String(va), String(vb));
        } else {
          cmp = String(va).localeCompare(String(vb), 'ar');
        }
        if (cmp !== 0) {
          // العمود المختار فقط يخضع للاتجاه؛ مفاتيح كسر التعادل تبقى تصاعدية دائماً (استقرار)
          return k === key && dir === 'desc' ? -cmp : cmp;
        }
      }
      return 0;
    });
  };

  const handleSort = (k: string) => {
    if (sortKey === k) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortDir('asc');
        setSortKey(null); // دورة ثالثة: إعادة الترتيب الافتراضي
      }
    } else {
      setSortKey(k);
      setSortDir('asc');
    }
  };

  const mapMemberInst = (m: any) => ({
    ...m,
    youth_institution: resolveInstName(m.youth_institution) || m.youth_institution
  });

  const mainMembers = sortMembers((trip.members?.filter(m => !m.is_standby) || []).map(mapMemberInst), sortKey, sortDir);
  const standbyMembers = sortMembers((trip.members?.filter(m => m.is_standby) || []).map(mapMemberInst), sortKey, sortDir);

  // ===== حساب التكرارات للرقم الوزاري ورقم الانخراط الموحد =====
  const allMembers = [...mainMembers, ...standbyMembers];
  const duplicateMinistryNumbers = (() => {
    const groups: Record<string, typeof mainMembers> = {};
    for (const m of allMembers) {
      if (!m.ministry_number) continue;
      if (!groups[m.ministry_number]) groups[m.ministry_number] = [];
      groups[m.ministry_number].push(m);
    }
    const result = new Set<string>();
    for (const [num, members] of Object.entries(groups)) {
      if (members.length > 1) result.add(num);
    }
    return result;
  })();
  const duplicateUnifiedNumbers = (() => {
    const groups: Record<string, typeof mainMembers> = {};
    for (const m of allMembers) {
      if (!m.unified_adherence_number) continue;
      if (!groups[m.unified_adherence_number]) groups[m.unified_adherence_number] = [];
      groups[m.unified_adherence_number].push(m);
    }
    const result = new Set<string>();
    for (const [num, members] of Object.entries(groups)) {
      if (members.length > 1) result.add(num);
    }
    return result;
  })();

  const genderStats = mainMembers.reduce((acc, curr) => {
    if (curr.gender === 'MALE' || curr.gender === 'ذكر') acc.male++;
    else if (curr.gender === 'FEMALE' || curr.gender === 'أنثى') acc.female++;
    return acc;
  }, { male: 0, female: 0 });

  const getMunicipalityStats = (members: any[]) => members.reduce((acc, curr) => {
    const rawMun = curr.municipality || t("not_specified");
    // Normalize arabic to group identical municipalities with different spellings (e.g., إ vs ا)
    const normalizedMun = rawMun.replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").trim();
    
    // Find if we already have this normalized name in our accumulator
    const existingKey = Object.keys(acc).find(k => k.replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").trim() === normalizedMun);
    
    if (existingKey) {
        // If the new raw name has more formatting (like hamza), use it instead of the existing key
        const newHamzas = (rawMun.match(/[إأآة]/g) || []).length;
        const oldHamzas = (existingKey.match(/[إأآة]/g) || []).length;
        
        if (newHamzas > oldHamzas && rawMun !== existingKey) {
            acc[rawMun] = acc[existingKey] + 1;
            delete acc[existingKey];
        } else {
            acc[existingKey] = (acc[existingKey] || 0) + 1;
        }
    } else {
        acc[rawMun] = 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const municipalityStats = getMunicipalityStats(mainMembers);
  const standbyMunicipalityStats = getMunicipalityStats(standbyMembers);

  const getInstitutionStats = (members: any[]) => members.reduce((acc, curr) => {
    const rawInst = curr.youth_institution || "بدون مؤسسة";
    acc[rawInst] = (acc[rawInst] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const institutionStats = getInstitutionStats(mainMembers);
  const standbyInstitutionStats = getInstitutionStats(standbyMembers);

  const institutionBgColors = [
    "bg-blue-100/60 text-blue-900 border-blue-200",
    "bg-emerald-100/60 text-emerald-900 border-emerald-200",
    "bg-amber-100/60 text-amber-900 border-amber-200",
    "bg-purple-100/60 text-purple-900 border-purple-200",
    "bg-pink-100/60 text-pink-900 border-pink-200",
    "bg-rose-100/60 text-rose-900 border-rose-200",
    "bg-cyan-100/60 text-cyan-900 border-cyan-200",
    "bg-fuchsia-100/60 text-fuchsia-900 border-fuchsia-200",
    "bg-teal-100/60 text-teal-900 border-teal-200",
    "bg-lime-100/60 text-lime-900 border-lime-200",
    "bg-indigo-100/60 text-indigo-900 border-indigo-200",
    "bg-orange-100/60 text-orange-900 border-orange-200",
  ];

  let instColorIndex = 0;
  const institutionColorMap: Record<string, string> = {};
  
  [...Object.keys(institutionStats), ...Object.keys(standbyInstitutionStats)].forEach(inst => {
    if (!institutionColorMap[inst] && inst !== "بدون مؤسسة") {
      institutionColorMap[inst] = institutionBgColors[instColorIndex % institutionBgColors.length];
      instColorIndex++;
    }
  });

  let munColorIndex = 0;
  const municipalityColorMap: Record<string, string> = {};
  
  [...Object.keys(municipalityStats), ...Object.keys(standbyMunicipalityStats)].forEach(mun => {
    if (!municipalityColorMap[mun] && mun !== "بدون بلدية" && mun) {
      municipalityColorMap[mun] = institutionBgColors[munColorIndex % institutionBgColors.length];
      munColorIndex++;
    }
  });

  // Compute siblings by parent_phone + last_name
  const siblingKey = (c: any) => c.parent_phone ? `${c.parent_phone}_${c.last_name}` : c.last_name;

  const lastNameCounts = mainMembers.reduce((acc, curr) => {
    const k = siblingKey(curr);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const siblingColors = [
    "bg-indigo-50/70 hover:bg-indigo-100/70 border-r-4 border-r-indigo-400",
    "bg-emerald-50/70 hover:bg-emerald-100/70 border-r-4 border-r-emerald-400",
    "bg-amber-50/70 hover:bg-amber-100/70 border-r-4 border-r-amber-400",
    "bg-rose-50/70 hover:bg-rose-100/70 border-r-4 border-r-rose-400",
    "bg-cyan-50/70 hover:bg-cyan-100/70 border-r-4 border-r-cyan-400",
  ];

  const assignedColors: Record<string, string> = {};
  let colorIndex = 0;

  mainMembers.forEach(m => {
    const k = siblingKey(m);
    if (lastNameCounts[k] > 1 && !assignedColors[k]) {
      assignedColors[k] = siblingColors[colorIndex % siblingColors.length];
      colorIndex++;
    }
  });

  // Compute siblings for standby members
  const standbyLastNameCounts = standbyMembers.reduce((acc, curr) => {
    const k = siblingKey(curr);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const standbyAssignedColors: Record<string, string> = {};
  let standbyColorIndex = 0;

  standbyMembers.forEach(m => {
    const k = siblingKey(m);
    if (standbyLastNameCounts[k] > 1 && !standbyAssignedColors[k]) {
      standbyAssignedColors[k] = siblingColors[standbyColorIndex % siblingColors.length];
      standbyColorIndex++;
    }
  });

  const filterMember = (m: any) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        m.first_name?.toLowerCase().includes(query) ||
        m.last_name?.toLowerCase().includes(query) ||
        m.parent_full_name?.toLowerCase().includes(query) ||
        m.parent_phone?.includes(query) ||
        m.municipality?.toLowerCase().includes(query) ||
        m.youth_institution?.toLowerCase().includes(query) ||
        m.unified_adherence_number?.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }

    if (activeFilters.has_insurance && !m.insurance_policy) return false;
    if (activeFilters.no_insurance && m.insurance_policy) return false;
    if (activeFilters.gender_m && m.gender !== "ذكر" && m.gender !== "MALE") return false;
    if (activeFilters.gender_f && m.gender !== "أنثى" && m.gender !== "FEMALE") return false;
    if (activeFilters.missing_medical && m.medical_certificate_path) return false;
    if (activeFilters.missing_declaration && m.parental_declaration_path) return false;
    if (activeFilters.sent_declaration && !m.parental_declaration_sent_at) return false;
    if (activeFilters.unsent_declaration && m.parental_declaration_sent_at) return false;
    if (activeFilters.missing_unified_number && m.unified_adherence_number) return false;
    if (activeFilters.missing_ministry_number && m.ministry_number && /^[0-9a-f]{24}$/i.test(m.ministry_number)) return false;
    if (activeFilters.missing_member_link && m.member_id) return false;
    
    // Member Types
    if (activeFilters.type_scout && m.member_type !== "scout") return false;
    if (activeFilters.type_association && m.member_type !== "association") return false;
    if (activeFilters.type_institution && m.member_type !== "institution") return false;
    if (activeFilters.type_free && m.member_type !== "main") return false;
    if (activeFilters.type_municipality && m.member_type !== "municipality") return false;
    if (activeFilters.type_authority && m.member_type !== "authority") return false;

    // Dynamic select filters
    if (activeFilters.institution && (m.youth_institution || "بدون مؤسسة") !== activeFilters.institution) return false;
    if (activeFilters.municipality && (m.municipality || "بدون بلدية") !== activeFilters.municipality) return false;

    return true;
  };

  const filteredMainMembers = sortMembers(mainMembers.filter(filterMember), sortKey, sortDir);
  const filteredStandbyMembers = sortMembers(standbyMembers.filter(filterMember), sortKey, sortDir);

  // عدّادات شاملة: أساسي + احتياط لكل نوع مقعد
  const typeTotal = (type: string) => mainMembers.filter(m => m.member_type === type).length + standbyMembers.filter(m => m.member_type === type).length;
  const typeStandbyCount = (type: string) => standbyMembers.filter(m => m.member_type === type).length;

  const hasMergedInstitutionMain = filteredMainMembers.some((m, i, arr) => i > 0 && m.youth_institution === arr[i-1].youth_institution);
  const hasMergedInstitutionStandby = filteredStandbyMembers.some((m, i, arr) => i > 0 && m.youth_institution === arr[i-1].youth_institution);

  const hasMergedMunicipalityMain = filteredMainMembers.some((m, i, arr) => i > 0 && m.municipality === arr[i-1].municipality);
  const hasMergedMunicipalityStandby = filteredStandbyMembers.some((m, i, arr) => i > 0 && m.municipality === arr[i-1].municipality);


  return (
    <PermissionGuard module="camp_trips" action="view">
        <div className="space-y-6 max-w-[1600px] mx-auto pb-20 print:p-0 print:bg-white print:space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-white rounded-2xl border shadow-sm print:shadow-none print:border-none print:p-0">
        <div className="flex items-center gap-4">
          <Link href="/camp-trips" className="print:hidden">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100">
              <ArrowRight className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <div className="p-3 bg-emerald-100/50 rounded-xl print:hidden">
            <Tent className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    className="h-9 w-64 font-bold text-lg"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={handleUpdateName}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:bg-slate-50" onClick={() => { setIsEditingName(false); setNewName(trip.name); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    {trip.name}
                    {trip.status !== 'COMPLETED' && hasPermission('camp_trips', 'edit') && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100" onClick={() => setIsEditingName(true)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </h1>
                  <div className="flex items-center gap-3 print:hidden">
                    {hasPermission('camp_trips', 'edit') ? (
                      <Select
                        value={trip.status}
                        onValueChange={handleStatusChange}
                        disabled={isUpdatingStatus}
                      >
                        <SelectTrigger
                          className={`h-8 w-[180px] text-xs font-bold border-2 ${
                            trip.status === 'DRAFT'
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : trip.status === 'IN_CAMP'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : trip.status === 'COMPLETED'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : trip.status === 'CANCELLED'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                              {t("status_draft")}
                            </span>
                          </SelectItem>
                          <SelectItem value="IN_CAMP">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              {t("status_in_camp")}
                            </span>
                          </SelectItem>
                          <SelectItem value="COMPLETED">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-400" />
                              {t("status_completed")}
                            </span>
                          </SelectItem>
                          <SelectItem value="CANCELLED">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-red-400" />
                              {t("status_cancelled")}
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className={`h-8 px-3 flex items-center text-xs font-bold border-2 rounded-md ${
                        trip.status === 'DRAFT'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : trip.status === 'IN_CAMP'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : trip.status === 'COMPLETED'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : trip.status === 'CANCELLED'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {trip.status === 'DRAFT' ? t("status_draft") : trip.status === 'IN_CAMP' ? t("status_in_camp") : trip.status === 'COMPLETED' ? t("status_completed") : trip.status === 'CANCELLED' ? t("status_cancelled") : trip.status}
                      </div>
                    )}
                    {isUpdatingStatus && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                    {trip.status === 'COMPLETED' && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                        <Lock className="h-3.5 w-3.5" />
                        أرشيف - فوج منتهي / Archived - Completed Trip
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <p className="text-slate-500 font-medium mt-1">{trip.description}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0 justify-end print:hidden">
          {hasPermission('camp_trips', 'edit') && (
            <Button onClick={handleOpenEditDialog} variant="outline" className="gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200">
              <Edit2 className="h-4 w-4 text-slate-600" /> تعديل
            </Button>
          )}
          {trip.status !== 'COMPLETED' && hasPermission('camp_trips', 'edit') && <AddMembersModal tripId={tripId} onAdded={fetchTrip} instMinisterialMap={instMinisterialMap} canEditSeat={hasPermission('camp_trips', 'edit_seat')} />}
          
          {hasPermission('camp_trips', 'export') && (
            <Button onClick={exportToExcel} variant="outline" className="gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200">
              <Download className="h-4 w-4 text-emerald-600" /> {t("export_excel")}
            </Button>
          )}
          <Button onClick={handlePrint} variant="outline" className="gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200">
            <Printer className="h-4 w-4 text-blue-600" /> {t("print")}
          </Button>

          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200">
                <MoreHorizontal className="h-4 w-4 text-slate-600" />
                خيارات إضافية
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 font-medium text-sm">
              {trip.status !== 'COMPLETED' && (
                <>
                  {hasPermission('camp_trips', 'sync_ministry') && (
                    <DropdownMenuItem onClick={handleOpenSyncDialog} className="cursor-pointer py-2">
                      <CloudUpload className="h-4 w-4 ml-2 text-blue-600" />
                      مزامنة أرقام الدفعة
                    </DropdownMenuItem>
                  )}

                  {hasPermission('camp_trips', 'sync_ministry') && (
                    <DropdownMenuItem onClick={() => { handleStartBulkVerify(); }} className="cursor-pointer py-2" disabled={bulkVerifyTaskId !== null}>
                      <ScanSearch className="h-4 w-4 ml-2 text-indigo-600" />
                      {bulkVerifyTaskId === 'starting' ? 'جارٍ التحقق...' : 'فحص جماعي للمنصة الوزارية'}
                    </DropdownMenuItem>
                  )}

                  {hasPermission('camp_trips', 'edit') && (
                    <DropdownMenuItem onClick={() => setShowCopyStandby(true)} className="cursor-pointer py-2">
                      <RefreshCw className="h-4 w-4 ml-2 text-amber-600" />
                      جلب الاحتياط من فوج
                    </DropdownMenuItem>
                  )}
                  
                  {hasPermission('camp_trips', 'separate_upload') && (
                  <DropdownMenuItem onClick={() => setSeparateUpload(!separateUpload)} className="cursor-pointer py-2">
                    <FileCheck className={`h-4 w-4 ml-2 ${separateUpload ? 'text-purple-600' : 'text-slate-600'}`} />
                    <span className={separateUpload ? 'text-purple-700 font-bold' : ''}>
                      {separateUpload ? t('separate_upload_active') : t('separate_upload')}
                    </span>
                  </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                </>
              )}

              {hasPermission('camp_trips', 'crop_settings') && (
              <Link href="/camp-trips/settings" className="w-full">
                <DropdownMenuItem className="cursor-pointer py-2">
                  <Crop className="h-4 w-4 ml-2 text-slate-600" />
                  {t("crop_settings")}
                </DropdownMenuItem>
              </Link>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        <Card className="bg-white border-slate-200 shadow-sm col-span-2 md:col-span-1">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500 font-bold">{t("total_count")} / الاستيعاب</p>
              <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <div>
              <div className="flex items-end gap-2 mb-2">
                <h3 className="text-2xl font-black text-slate-900">{mainMembers.length}</h3>
                <span className="text-sm text-slate-500 font-medium mb-1">/ {trip.capacity || 0}</span>
              </div>
              {standbyMembers.length > 0 && (
                <p className="text-xs text-slate-500 font-bold mb-1">+ {standbyMembers.length} احتياط (الإجمالي {mainMembers.length + standbyMembers.length})</p>
              )}
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${mainMembers.length >= (trip.capacity || 0) ? 'bg-rose-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, (mainMembers.length / (trip.capacity || 1)) * 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-bold mb-1">{t("scouts")}</p>
              <h3 className="text-2xl font-black text-orange-600">{typeTotal('scout')}</h3>
              {typeStandbyCount('scout') > 0 && <p className="text-xs text-slate-400 mt-0.5">أساسي {typeTotal('scout') - typeStandbyCount('scout')} · احتياط {typeStandbyCount('scout')}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-bold mb-1">{t("associations")}</p>
              <h3 className="text-2xl font-black text-purple-600">{typeTotal('association')}</h3>
              {typeStandbyCount('association') > 0 && <p className="text-xs text-slate-400 mt-0.5">أساسي {typeTotal('association') - typeStandbyCount('association')} · احتياط {typeStandbyCount('association')}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-bold mb-1">{t("institutions")}</p>
              <h3 className="text-2xl font-black text-sky-600">{typeTotal('institution')}</h3>
              {typeStandbyCount('institution') > 0 && <p className="text-xs text-slate-400 mt-0.5">أساسي {typeTotal('institution') - typeStandbyCount('institution')} · احتياط {typeStandbyCount('institution')}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-bold mb-1">البلدية</p>
              <h3 className="text-2xl font-black text-teal-600">{typeTotal('municipality')}</h3>
              {typeStandbyCount('municipality') > 0 && <p className="text-xs text-slate-400 mt-0.5">أساسي {typeTotal('municipality') - typeStandbyCount('municipality')} · احتياط {typeStandbyCount('municipality')}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-bold mb-1">هيئة</p>
              <h3 className="text-2xl font-black text-indigo-600">{typeTotal('authority')}</h3>
              {typeStandbyCount('authority') > 0 && <p className="text-xs text-slate-400 mt-0.5">أساسي {typeTotal('authority') - typeStandbyCount('authority')} · احتياط {typeStandbyCount('authority')}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-bold mb-1">التصريح الأبوي</p>
              <h3 className="text-2xl font-black text-emerald-600">{mainMembers.filter(m => m.parental_declaration_path).length} / {mainMembers.length}</h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
              <FileText className="h-4 w-4 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-bold mb-1">التصاريح المرسلة للمنصة</p>
              <h3 className="text-2xl font-black text-sky-600">{mainMembers.filter(m => m.parental_declaration_sent_at).length} / {mainMembers.length}</h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-sky-50 flex items-center justify-center">
              <Upload className="h-4 w-4 text-sky-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-bold mb-1">رقم الانخراط الموحد</p>
              <h3 className="text-2xl font-black text-violet-600">{mainMembers.filter(m => m.unified_adherence_number).length} / {mainMembers.length}</h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-violet-50 flex items-center justify-center">
              <Hash className="h-4 w-4 text-violet-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-bold mb-1">مرتبط بمنخرط</p>
              <h3 className="text-2xl font-black text-cyan-600" title={`${mainMembers.filter(m => m.member_id).length} مرتبط ، ${mainMembers.filter(m => !m.member_id).length} غير مرتبط`}>
                {mainMembers.filter(m => m.member_id).length} / {mainMembers.length}
              </h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-cyan-50 flex items-center justify-center">
              <Link2 className="h-4 w-4 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        {/* Session Assignment Stats */}
        {trip.ministry_session_id && (
          <Card className="bg-white border-slate-200 shadow-sm col-span-2 md:col-span-1">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-bold mb-1">تم التوجيه للدورة</p>
                <h3 className="text-2xl font-black text-indigo-600">
                  {allMembers.filter(m => (m as any).assigned_to_session_at).length} / {allMembers.length}
                </h3>
                {trip.ministry_session_name && (
                  <p className="text-xs text-slate-400 mt-1">{trip.ministry_session_name}</p>
                )}
              </div>
              <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
                <Navigation className="h-4 w-4 text-indigo-500" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden col-span-2 md:col-span-4">
          <Card className="bg-white border-slate-200 shadow-sm col-span-1">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3.5">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" /> {t("gender_distribution")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex gap-3">
              <div className="flex-1 bg-gradient-to-b from-blue-50 to-blue-50/30 p-3 rounded-xl border border-blue-100 flex flex-col items-center justify-center">
                <span className="text-xs text-blue-600 font-bold mb-1">{t("male")}</span>
                <span className="text-2xl font-black text-blue-900">{genderStats.male}</span>
              </div>
              <div className="flex-1 bg-gradient-to-b from-pink-50 to-pink-50/30 p-3 rounded-xl border border-pink-100 flex flex-col items-center justify-center">
                <span className="text-xs text-pink-600 font-bold mb-1">{t("female")}</span>
                <span className="text-2xl font-black text-pink-900">{genderStats.female}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm col-span-1 md:col-span-2">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3.5">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-500" /> {t("municipality_distribution")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {(Object.entries(municipalityStats) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([mun, count]) => (
                  <div key={mun} className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden group hover:border-emerald-200 transition-colors">
                    <div className="px-3 py-1.5 text-xs font-bold text-slate-600 group-hover:text-emerald-700 bg-slate-50/50 transition-colors">{mun}</div>
                    <div className="px-2.5 py-1.5 bg-slate-100/80 border-r border-slate-200 text-xs font-black text-slate-900 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">{count}</div>
                  </div>
                ))}
                {Object.keys(municipalityStats).length === 0 && (
                  <div className="text-slate-400 text-sm py-2">{t("no_data")}</div>
                )}
              </div>
              
              {Object.keys(standbyMunicipalityStats).length > 0 && (
                <>
                  <div className="h-px w-full bg-slate-100" />
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      توزيع بلديات القائمة الاحتياطية
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(standbyMunicipalityStats) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([mun, count]) => (
                        <div key={mun} className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden group hover:border-amber-200 transition-colors">
                          <div className="px-3 py-1.5 text-xs font-bold text-slate-600 group-hover:text-amber-700 bg-amber-50/30 transition-colors">{mun}</div>
                          <div className="px-2.5 py-1.5 bg-amber-100/50 border-r border-slate-200 text-xs font-black text-amber-900 group-hover:bg-amber-100 group-hover:border-amber-200 transition-colors">{count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm col-span-1 md:col-span-3">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3.5">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Building className="h-4 w-4 text-purple-500" /> توزيع المؤسسات للأطفال
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {(Object.entries(institutionStats) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([inst, count]) => (
                  <div
                    key={inst}
                    className={`flex items-center bg-white border rounded-lg shadow-sm overflow-hidden group transition-colors cursor-pointer ${activeFilters.institution === inst ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' : 'border-slate-200 hover:border-purple-200'}`}
                    onClick={() => setActiveFilters((prev: Record<string, any>) => ({
                      ...prev,
                      institution: prev.institution === inst ? undefined : inst
                    }))}
                  >
                    <div className={`px-3 py-1.5 text-xs font-bold transition-colors ${activeFilters.institution === inst ? 'text-purple-700 bg-purple-100/50' : 'text-slate-600 group-hover:text-purple-700 bg-slate-50/50'}`}>
                      {inst}
                    </div>
                    <div className={`px-2.5 py-1.5 border-r text-xs font-black transition-colors ${activeFilters.institution === inst ? 'text-purple-900 bg-purple-100 border-purple-200' : 'text-slate-900 bg-slate-100/80 border-slate-200 group-hover:bg-purple-50 group-hover:border-purple-100'}`}>
                      {count}
                    </div>
                  </div>
                ))}
                {Object.keys(institutionStats).length === 0 && (
                  <div className="text-slate-400 text-sm py-2">{t("no_data")}</div>
                )}
              </div>
              
              {Object.keys(standbyInstitutionStats).length > 0 && (
                <>
                  <div className="h-px w-full bg-slate-100" />
                  <div>
                    <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      توزيع المؤسسات للقائمة الاحتياطية
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(standbyInstitutionStats) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([inst, count]) => (
                        <div
                          key={inst}
                          className={`flex items-center bg-white border rounded-lg shadow-sm overflow-hidden group transition-colors cursor-pointer ${activeFilters.institution === inst ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200' : 'border-slate-200 hover:border-amber-200'}`}
                          onClick={() => setActiveFilters((prev: Record<string, any>) => ({
                            ...prev,
                            institution: prev.institution === inst ? undefined : inst
                          }))}
                        >
                          <div className={`px-3 py-1.5 text-xs font-bold transition-colors ${activeFilters.institution === inst ? 'text-amber-700 bg-amber-100/50' : 'text-slate-600 group-hover:text-amber-700 bg-amber-50/30'}`}>
                            {inst}
                          </div>
                          <div className={`px-2.5 py-1.5 border-r text-xs font-black transition-colors ${activeFilters.institution === inst ? 'text-amber-900 bg-amber-100 border-amber-200' : 'text-amber-900 bg-amber-100/50 border-slate-200'}`}>
                            {count}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative print:hidden mb-6 max-w-3xl mx-auto">
        {(() => {
          const uniqueInstitutions = Array.from(new Set([...mainMembers, ...standbyMembers].map(m => m.youth_institution || "بدون مؤسسة")));
          const uniqueMunicipalities = Array.from(new Set([...mainMembers, ...standbyMembers].map(m => m.municipality || "بدون بلدية")));
          
          return (
            <OdooSearch 
              initialSearch={searchQuery}
              onSearch={setSearchQuery}
              placeholder="ابحث بالاسم، اللقب، المؤسسة، رقم الانخراط، البلدية..."
              filters={[
                { id: 'has_insurance', label: 'مؤمن عليه', type: 'boolean', icon: <Check className="w-4 h-4 text-emerald-500" /> },
                { id: 'no_insurance', label: 'بدون تأمين', type: 'boolean', icon: <AlertTriangle className="w-4 h-4 text-rose-500" /> },
                { id: 'gender_m', label: 'الذكور فقط', type: 'boolean', icon: <Users className="w-4 h-4 text-blue-500" /> },
                { id: 'gender_f', label: 'الإناث فقط', type: 'boolean', icon: <Users className="w-4 h-4 text-pink-500" /> },
                { id: 'missing_medical', label: 'ينقصه ملف طبي', type: 'boolean', icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
                { id: 'missing_declaration', label: 'ينقصه تصريح أبوي', type: 'boolean', icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
                { id: 'sent_declaration', label: 'تصريح مرسل للمنصة', type: 'boolean', icon: <Upload className="w-4 h-4 text-sky-500" /> },
                { id: 'unsent_declaration', label: 'تصريح غير مرسل للمنصة', type: 'boolean', icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
                { id: 'missing_unified_number', label: 'بدون رقم انخراط', type: 'boolean', icon: <AlertTriangle className="w-4 h-4 text-rose-500" /> },
                { id: 'missing_ministry_number', label: 'بدون رقم وزاري', type: 'boolean', icon: <AlertTriangle className="w-4 h-4 text-rose-500" /> },
                { id: 'missing_member_link', label: 'غير مرتبط بمنخرط', type: 'boolean', icon: <Link2 className="w-4 h-4 text-cyan-500" /> },
                { id: 'type_scout', label: 'كشافة', type: 'boolean' },
                { id: 'type_association', label: 'جمعية', type: 'boolean' },
                { id: 'type_institution', label: 'مؤسسة شبانية', type: 'boolean' },
                { id: 'type_free', label: 'المديرية', type: 'boolean' },
                { id: 'type_municipality', label: 'البلدية', type: 'boolean' },
                { id: 'type_authority', label: 'هيئة', type: 'boolean' },
                { id: 'institution', label: 'حسب المؤسسة', type: 'select', options: uniqueInstitutions.map(i => ({ label: i, value: i })) },
                { id: 'municipality', label: 'حسب البلدية', type: 'select', options: uniqueMunicipalities.map(m => ({ label: m, value: m })) },
              ]}
              groupByOptions={[
                { id: 'institution', label: 'المؤسسة الشبانية' },
                { id: 'municipality', label: 'البلدية' }
              ]}
              onFilterChange={(filters) => setActiveFilters(filters)}
              onGroupChange={(group) => setGroupBy(group)}
            />
          );
        })()}
      </div>

      {/* Main List Table */}
      <Card className="bg-white shadow-sm border-slate-200 overflow-hidden print:shadow-none print:border-none">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 print:bg-transparent print:border-b-2 print:border-slate-900">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg font-bold text-slate-800">{t("main_list")} ({mainMembers.length})</CardTitle>
              {sortKey && (
                <button type="button" onClick={() => { setSortKey(null); setSortDir('asc'); }} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-emerald-700 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> ترتيب افتراضي
                </button>
              )}
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="[&_th]:whitespace-normal [&_td]:whitespace-normal">
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-12 text-center">
                  <Checkbox 
                    checked={filteredMainMembers.length > 0 && selectedMembers.size === filteredMainMembers.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedMembers(new Set([...selectedMembers, ...filteredMainMembers.map(m => m.id)]));
                      } else {
                        const newSet = new Set(selectedMembers);
                        filteredMainMembers.forEach(m => newSet.delete(m.id));
                        setSelectedMembers(newSet);
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="w-16 text-center font-bold">{t("table_number")}</TableHead>
                <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="municipality" onSort={handleSort} className="font-bold text-center">{t("table_municipality")}</SortableHeader>
                <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="youth_institution" onSort={handleSort} className="font-bold text-center">المؤسسة</SortableHeader>
                <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="photo" onSort={handleSort} className="w-16 text-center font-bold">الصورة</SortableHeader>
                <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="first_name" onSort={handleSort} className="font-bold">{t("table_first_name")}</SortableHeader>
                <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="last_name" onSort={handleSort} className="font-bold">{t("table_last_name")}</SortableHeader>
                <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="birth_date" onSort={handleSort} className="font-bold text-center">{t("table_birth_date")}</SortableHeader>
                <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="parent_name" onSort={handleSort} className="font-bold text-center">{t("table_parent_name", { defaultValue: "اسم الولي" })}</SortableHeader>
                <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="parent_phone" onSort={handleSort} className="font-bold text-center">{t("table_parent_phone", { defaultValue: "هاتف الولي" })}</SortableHeader>
                <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="unified_adherence_number" onSort={handleSort} className="font-bold text-center">رقم الانخراط الموحد</SortableHeader>
                <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="member_type" onSort={handleSort} className="font-bold text-center">نوع المقعد</SortableHeader>
                <TableHead className="font-bold text-center print:hidden">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
              onDrop={hasPermission('camp_trips', 'edit') ? (e) => {
                e.preventDefault();
                try {
                  const data = JSON.parse(e.dataTransfer.getData('application/json'));
                  if (data.currentStandby && data.memberId) {
                    handleDragAndDropMove(data.memberId, false);
                  }
                } catch (err) {}
              } : undefined}
              className="relative"
            >
              {mainMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-slate-500">{t("no_children")}</TableCell>
                </TableRow>
              ) : filteredMainMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-slate-500 py-8">{t("no_search_results")}</TableCell>
                </TableRow>
              ) : (
                  filteredMainMembers.map((member, index) => {
                  const k = siblingKey(member);
                  const rowClassName = assignedColors[k] || "hover:bg-slate-50/50";
                  
                  let renderInstitution = false;
                  let institutionRowSpan = 1;
                  
                  if (index === 0 || member.youth_institution !== filteredMainMembers[index - 1].youth_institution) {
                    renderInstitution = true;
                    let j = index + 1;
                    while (j < filteredMainMembers.length && filteredMainMembers[j].youth_institution === member.youth_institution) {
                      institutionRowSpan++;
                      j++;
                    }
                  }

                  let renderMunicipality = false;
                  let municipalityRowSpan = 1;
                  
                  if (index === 0 || member.municipality !== filteredMainMembers[index - 1].municipality) {
                    renderMunicipality = true;
                    let j = index + 1;
                    while (j < filteredMainMembers.length && filteredMainMembers[j].municipality === member.municipality) {
                      municipalityRowSpan++;
                      j++;
                    }
                  }

                  return (
                    <TableRow 
                      key={member.id} 
                      className={`${rowClassName} ${trip.status !== 'COMPLETED' && hasPermission('camp_trips', 'edit') ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      draggable={trip.status !== 'COMPLETED' && hasPermission('camp_trips', 'edit')}
                      onDragStart={(e) => {
                        if (trip.status !== 'COMPLETED' && hasPermission('camp_trips', 'edit')) {
                            e.dataTransfer.setData('application/json', JSON.stringify({ memberId: member.id, currentStandby: false }));
                        }
                      }}
                    >
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={selectedMembers.has(member.id)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedMembers);
                            if (checked) newSet.add(member.id);
                            else newSet.delete(member.id);
                            setSelectedMembers(newSet);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                      {renderMunicipality && (() => {
                        const munColorClass = member.municipality ? (municipalityColorMap[member.municipality] || 'bg-slate-100/50 border-slate-200 text-slate-700') : 'bg-slate-100/50 border-slate-200 text-slate-700';
                        return (
                          <TableCell 
                            rowSpan={municipalityRowSpan} 
                            className={`text-center text-xs font-bold align-middle border-x ${munColorClass}`}
                          >
                            <div 
                              className="inline-flex items-center justify-center text-center m-auto whitespace-normal"
                              style={{ 
                                writingMode: hasMergedMunicipalityMain ? 'vertical-rl' : 'horizontal-tb',
                                transform: hasMergedMunicipalityMain ? 'rotate(180deg)' : 'none',
                                maxHeight: hasMergedMunicipalityMain ? `${Math.max(municipalityRowSpan * 55, 80)}px` : 'auto',
                              }}
                            >
                              {member.municipality || '-'}
                            </div>
                          </TableCell>
                        );
                      })()}
                      {renderInstitution && (() => {
                        const instColorClass = member.youth_institution ? (institutionColorMap[member.youth_institution] || 'bg-slate-100/50 border-slate-200 text-slate-700') : 'bg-slate-100/50 border-slate-200 text-slate-700';
                        return (
                          <TableCell 
                            rowSpan={institutionRowSpan} 
                            className={`text-center text-xs font-bold align-middle border-x ${instColorClass}`}
                          >
                            <div 
                              className="inline-flex items-center justify-center text-center m-auto whitespace-normal"
                              style={{ 
                                writingMode: hasMergedInstitutionMain ? 'vertical-rl' : 'horizontal-tb',
                                transform: hasMergedInstitutionMain ? 'rotate(180deg)' : 'none',
                                maxHeight: hasMergedInstitutionMain ? `${Math.max(institutionRowSpan * 55, 80)}px` : 'auto',
                              }}
                            >
                              {member.member_type === 'directorate' ? 'مديرية الشباب والرياضة' : (member.member_type === 'main' ? (member.youth_institution || 'مديرية الشباب والرياضة') : (member.youth_institution || '-'))}
                            </div>
                          </TableCell>
                        );
                      })()}
                      <TableCell className="text-center">
                        {member.photo_path ? (
                          <>
                            <img 
                              src={member.photo_path.startsWith('http') ? member.photo_path : `${STORAGE_URL}/${member.photo_path}`} 
                              alt={member.first_name}
                              className="w-10 h-10 rounded-full object-cover border mx-auto"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement?.querySelector('.photo-fallback');
                                if (fallback) fallback.classList.remove('hidden', 'photo-fallback');
                              }}
                            />
                            <div className="photo-fallback hidden w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border mx-auto text-slate-400 text-xs font-bold">
                              {member.first_name?.[0]}{member.last_name?.[0]}
                            </div>
                          </>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border mx-auto text-slate-400 text-xs font-bold">
                            {member.first_name?.[0]}{member.last_name?.[0]}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={`font-bold ${member.has_hidden_spaces ? 'text-rose-600' : 'text-slate-800'}`} title={member.has_hidden_spaces ? 'يحتوي على مسافات مخفية في المنصة الوزارية' : ''}>
                        <div className="flex items-center gap-1.5">
                          <span>{member.first_name}</span>
                          {member.duplicate_info && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-600 cursor-help" title={member.duplicate_info}>
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {member.is_deleted_alert && !member.duplicate_info?.includes('تم حذفه') && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-600 cursor-help" title="تم حذفه سابقاً من نظام التخييم">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={`font-bold ${member.has_hidden_spaces ? 'text-rose-600' : 'text-slate-800'}`} title={member.has_hidden_spaces ? 'يحتوي على مسافات مخفية في المنصة الوزارية' : ''}>{member.last_name}</TableCell>
                      {(() => {
                        const tripDate = trip?.start_date ? new Date(trip.start_date) : new Date();
                        const isOver14 = member.birth_date && (tripDate.getTime() - new Date(member.birth_date).getTime()) > 14 * 365.25 * 24 * 60 * 60 * 1000;
                        const isUnder8 = member.birth_date && (tripDate.getTime() - new Date(member.birth_date).getTime()) < 8 * 365.25 * 24 * 60 * 60 * 1000;
                        const isOutOfRange = isOver14 || isUnder8;
                        return (
                          <TableCell className={`text-center ${isOutOfRange ? 'text-rose-600 font-bold bg-rose-50/50' : 'text-slate-600'}`}>
                            {member.birth_date} <span className={`text-xs mr-1 ${isOutOfRange ? 'text-rose-500' : 'text-slate-400'}`}>{formatAgePrecise(member.birth_date)}</span>
                          </TableCell>
                        );
                      })()}
                      <TableCell className={`text-center text-xs font-medium ${member.parent_full_name && member.last_name && member.parent_full_name !== '-' && !member.parent_full_name.includes(member.last_name) ? 'text-rose-600 font-bold bg-rose-50/50' : 'text-slate-600'}`}>
                        {member.parent_full_name || '-'}
                      </TableCell>
                      <TableCell className="text-center text-slate-600 text-xs font-mono" dir="ltr">{member.parent_phone || '-'}</TableCell>
                      <TableCell className="text-center text-xs font-mono font-bold" dir="ltr">
                        {(() => {
                          const status = getAdherenceStatus(member.unified_adherence_number, member.youth_institution);
                          const isDuplicate = member.unified_adherence_number && duplicateUnifiedNumbers.has(member.unified_adherence_number);
                          return (
                            <div className="flex items-center justify-center gap-1">
                              <span className={status.color || (isDuplicate ? 'text-amber-600' : 'text-blue-600')} title={status.tooltip || ''}>
                                {member.unified_adherence_number || '-'}
                              </span>
                              {isDuplicate && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-600 cursor-help flex-shrink-0" title={`رقم الانخراط الموحد "${member.unified_adherence_number}" مكرر!`}>
                                  <AlertTriangle className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          {member.member_type === 'scout' && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">{t("seat_scout")}</Badge>}
                          {member.member_type === 'association' && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{t("seat_association")}</Badge>}
                          {member.member_type === 'institution' && <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">{t("seat_institution")}</Badge>}
                          {member.member_type === 'municipality' && <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">البلدية</Badge>}
                          {member.member_type === 'authority' && <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">هيئة</Badge>}
                          {member.member_type === 'main' && <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">{t("seat_main")}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center print:hidden relative">
                        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center gap-1">

                          {member.ministry_number && duplicateMinistryNumbers.has(member.ministry_number) ? (
                            <div className="h-8 w-8 flex items-center justify-center text-amber-500 rounded-full bg-amber-50 cursor-help" title={`الرقم الوزاري "${member.ministry_number}" مكرر!`}>
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                          ) : !member.ministry_number ? (
                            <div className="h-8 w-8 flex items-center justify-center text-amber-500 rounded-full bg-amber-50 cursor-help" title={"لا يملك الرقم الوزاري"}>
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                          ) : null}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50 rounded-full" title="معاينة بيانات المسجل" onClick={(e) => { e.stopPropagation(); member.member_id && router.push(`/members/${member.member_id}`); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {member.ministry_number && /^[0-9a-f]{24}$/i.test(member.ministry_number) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-500 hover:bg-purple-50 rounded-full" title="فتح في المنصة الوزارية" onClick={(e) => { e.stopPropagation(); window.open(`https://youthcamp.mjeunesse.gov.dz/children/dashboard/registrations/${member.ministry_number}`, '_blank'); }}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('camp_trips', 'view_declaration') && member.parental_declaration_path && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:bg-emerald-50 rounded-full" title="عرض التصريح الأبوي" onClick={(e) => { e.stopPropagation(); window.open(member.parental_declaration_path!.startsWith('http') ? member.parental_declaration_path : `${STORAGE_URL}/${member.parental_declaration_path}`, '_blank'); }}>
                              <FileCheck className="h-4 w-4" />
                            </Button>
                          )}
                          {/* {member.medical_certificate_path && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-full" title="عرض الشهادة الطبية" onClick={(e) => { e.stopPropagation(); window.open(member.medical_certificate_path!.startsWith('http') ? member.medical_certificate_path : `${STORAGE_URL}/${member.medical_certificate_path}`, '_blank'); }}>
                              <Heart className="h-4 w-4" />
                            </Button>
                          )} */}
                          {trip.status !== 'COMPLETED' ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all text-slate-600">
                                  <Settings2 className="w-4 h-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent side="right" align="center" className="w-auto p-1 rounded-full flex items-center gap-1 shadow-lg border-slate-200">
                                {hasPermission('camp_trips', 'upload_declaration') && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-50 rounded-full" title={member.parental_declaration_path ? "إعادة مسح التصريح الأبوي" : "رفع التصريح الأبوي"} onClick={(e) => { e.stopPropagation(); setMemberToUploadDocType('declaration'); member.id && setMemberToUpload(member.id); }}>
                                    <Upload className="h-4 w-4" />
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'sync_ministry') && member.parental_declaration_path && (
                                  <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-full ${member.parental_declaration_sent_at ? 'text-slate-400 hover:bg-slate-50' : 'text-blue-600 hover:bg-blue-50'}`} title={member.parental_declaration_sent_at ? "تم الإرسال للمنصة الوزارية" : "إرسال للمنصة الوزارية"} disabled={syncingMemberId === member.id} onClick={(e) => { e.stopPropagation(); member.id && handleSyncMinisterial(member.id); }}>
                                    {syncingMemberId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'enroll') && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-full" title="إنشاء انخراط في المؤسسة" disabled={enrollingMemberId === member.id} onClick={(e) => { e.stopPropagation(); member.id && handleEnrollMinisterial(member.id); }}>
                                    {enrollingMemberId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'sync_ministry') && member.ministry_number && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600 hover:bg-purple-50 rounded-full" title="استيراد من المنصة الوزارية" disabled={importingMemberId === member.id} onClick={(e) => { e.stopPropagation(); member.id && handleFetchFromMinisterial(member.id); }}>
                                    {importingMemberId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'sync_ministry') && member.ministry_number && /^[0-9a-f]{24}$/i.test(member.ministry_number.split(',')[0].trim()) && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500 hover:bg-indigo-50 rounded-full" title="التحقق من بيانات المنصة الوزارية" disabled={verifyingMemberId === member.id} onClick={(e) => { e.stopPropagation(); member.id && handleVerifyMinistry(member.id); }}>
                                    {verifyingMemberId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'renew_enrollment') && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:bg-amber-50 rounded-full" title="تجديد رقم الانخراط الموحد في YouthConnect" disabled={renewingMemberId === member.member_id || !member.member_id} onClick={(e) => { e.stopPropagation(); member.member_id && handleRenewYouthConnect(member.member_id, member.enrollment_institution || member.youth_institution || undefined); }}>
                                    {renewingMemberId === member.member_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                  </Button>
                                )}
                                {/* Assign to Session */}
                                {hasPermission('camp_trips', 'assign_session') && 
                                 member.ministry_number && 
                                 trip.status !== 'COMPLETED' && 
                                 (trip as any).ministry_session_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-8 rounded-full px-2 gap-1 ${member.assigned_to_session_at ? 'text-slate-300 hover:text-slate-300 hover:bg-transparent cursor-default' : 'text-teal-600 hover:text-teal-700 hover:bg-teal-50'}`}
                                    title="توجيه الطفل إلى الدورة"
                                    onClick={() => setAssigningMemberId(member.id)}
                                    disabled={isAssigning}
                                  >
                                    <Navigation className="h-4 w-4" />
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'edit_seat') && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50 rounded-full" title="إدخال / تعديل رقم الانخراط الموحد والرقم الوزاري ونوع المقعد" onClick={(e) => { e.stopPropagation(); setMemberToEditType(member); setEditMemberType(member.member_type || 'main'); setEditYouthInstitution(member.youth_institution || ''); setEditIsStandby(member.is_standby || false); setEditMinistryNumber(member.ministry_number || ''); setEditUnifiedNumber(member.unified_adherence_number || ''); setEditEnrollInstitution(member.enrollment_institution || ''); setEditForceRegistration(member.first_name?.endsWith('\u200B') || false); }}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'view_declaration') && memberReceiptUrl(member) && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50 rounded-full" title="عرض وصل التسجيل" onClick={(e) => { e.stopPropagation(); window.open(memberReceiptUrl(member)!, '_blank'); }}>
                                    <Receipt className="h-4 w-4" />
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'delete') && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-full" onClick={(e) => { e.stopPropagation(); member.id && setMemberToDelete(member.id); }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Standby List Table */}
      {standbyMembers.length > 0 && (
        <Card className="bg-white shadow-sm border-slate-200 overflow-hidden mt-8 print:mt-8 print:break-before-page print:shadow-none print:border-none">
          <CardHeader className="bg-red-50/50 border-b border-red-100 py-4 print:bg-transparent print:border-b-2 print:border-slate-900">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg font-bold text-red-800">{t("standby_list")} ({standbyMembers.length})</CardTitle>
              {sortKey && (
                <button type="button" onClick={() => { setSortKey(null); setSortDir('asc'); }} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-emerald-700 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> ترتيب افتراضي
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="[&_th]:whitespace-normal [&_td]:whitespace-normal">
              <TableHeader className="bg-red-50/30">
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox 
                      checked={filteredStandbyMembers.length > 0 && filteredStandbyMembers.every(m => selectedMembers.has(m.id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMembers(new Set([...selectedMembers, ...filteredStandbyMembers.map(m => m.id)]));
                        } else {
                          const newSet = new Set(selectedMembers);
                          filteredStandbyMembers.forEach(m => newSet.delete(m.id));
                          setSelectedMembers(newSet);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-16 text-center font-bold">{t("table_number")}</TableHead>
                  <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="municipality" onSort={handleSort} className="font-bold text-center">{t("table_municipality")}</SortableHeader>
                  <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="youth_institution" onSort={handleSort} className="font-bold text-center">المؤسسة</SortableHeader>
                  <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="photo" onSort={handleSort} className="w-16 text-center font-bold">الصورة</SortableHeader>
                  <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="first_name" onSort={handleSort} className="font-bold">{t("table_first_name")}</SortableHeader>
                  <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="last_name" onSort={handleSort} className="font-bold">{t("table_last_name")}</SortableHeader>
                  <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="birth_date" onSort={handleSort} className="font-bold text-center">{t("table_birth_date")}</SortableHeader>
                  <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="parent_name" onSort={handleSort} className="font-bold text-center">{t("table_parent_name", { defaultValue: "اسم الولي" })}</SortableHeader>
                  <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="parent_phone" onSort={handleSort} className="font-bold text-center">{t("table_parent_phone", { defaultValue: "هاتف الولي" })}</SortableHeader>
                  <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="unified_adherence_number" onSort={handleSort} className="font-bold text-center">رقم الانخراط الموحد</SortableHeader>
                  <SortableHeader sortKey={sortKey} sortDir={sortDir} colKey="member_type" onSort={handleSort} className="font-bold text-center">نوع المقعد</SortableHeader>
                  <TableHead className="font-bold text-center print:hidden">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={hasPermission('camp_trips', 'edit') ? (e) => {
                  e.preventDefault();
                  try {
                    const data = JSON.parse(e.dataTransfer.getData('application/json'));
                    if (!data.currentStandby && data.memberId) {
                      handleDragAndDropMove(data.memberId, true);
                    }
                  } catch (err) {}
                } : undefined}
                className="relative"
              >
                {filteredStandbyMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-slate-500 py-8">{t("no_search_results")}</TableCell>
                  </TableRow>
                ) : (
                  filteredStandbyMembers.map((member, index) => {
                    const k = siblingKey(member);
                  const rowClassName = standbyAssignedColors[k] || "hover:bg-red-50/20";

                  let renderInstitution = false;
                  let institutionRowSpan = 1;
                  
                  if (index === 0 || member.youth_institution !== filteredStandbyMembers[index - 1].youth_institution) {
                    renderInstitution = true;
                    let j = index + 1;
                    while (j < filteredStandbyMembers.length && filteredStandbyMembers[j].youth_institution === member.youth_institution) {
                      institutionRowSpan++;
                      j++;
                    }
                  }

                  let renderMunicipality = false;
                  let municipalityRowSpan = 1;
                  
                  if (index === 0 || member.municipality !== filteredStandbyMembers[index - 1].municipality) {
                    renderMunicipality = true;
                    let j = index + 1;
                    while (j < filteredStandbyMembers.length && filteredStandbyMembers[j].municipality === member.municipality) {
                      municipalityRowSpan++;
                      j++;
                    }
                  }

                  return (
                    <TableRow 
                      key={member.id} 
                      className={`${rowClassName} ${trip.status !== 'COMPLETED' && hasPermission('camp_trips', 'edit') ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      draggable={trip.status !== 'COMPLETED' && hasPermission('camp_trips', 'edit')}
                      onDragStart={(e) => {
                        if (trip.status !== 'COMPLETED' && hasPermission('camp_trips', 'edit')) {
                            e.dataTransfer.setData('application/json', JSON.stringify({ memberId: member.id, currentStandby: true }));
                        }
                      }}
                    >
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={selectedMembers.has(member.id)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(selectedMembers);
                            if (checked) newSet.add(member.id);
                            else newSet.delete(member.id);
                            setSelectedMembers(newSet);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
                      {renderMunicipality && (() => {
                        const munColorClass = member.municipality ? (municipalityColorMap[member.municipality] || 'bg-slate-100/50 border-slate-200 text-slate-700') : 'bg-slate-100/50 border-slate-200 text-slate-700';
                        return (
                          <TableCell 
                            rowSpan={municipalityRowSpan} 
                            className={`text-center text-xs font-bold align-middle border-x ${munColorClass}`}
                          >
                            <div 
                              className="inline-flex items-center justify-center text-center m-auto whitespace-normal"
                              style={{ 
                                writingMode: hasMergedMunicipalityStandby ? 'vertical-rl' : 'horizontal-tb',
                                transform: hasMergedMunicipalityStandby ? 'rotate(180deg)' : 'none',
                                maxHeight: hasMergedMunicipalityStandby ? `${Math.max(municipalityRowSpan * 55, 80)}px` : 'auto',
                              }}
                            >
                              {member.municipality || '-'}
                            </div>
                          </TableCell>
                        );
                      })()}
                      {renderInstitution && (() => {
                        const instColorClass = member.youth_institution ? (institutionColorMap[member.youth_institution] || 'bg-slate-100/50 border-slate-200 text-slate-700') : 'bg-slate-100/50 border-slate-200 text-slate-700';
                        return (
                          <TableCell 
                            rowSpan={institutionRowSpan} 
                            className={`text-center text-xs font-bold align-middle border-x ${instColorClass}`}
                          >
                            <div 
                              className="inline-flex items-center justify-center text-center m-auto whitespace-normal"
                              style={{ 
                                writingMode: hasMergedInstitutionStandby ? 'vertical-rl' : 'horizontal-tb',
                                transform: hasMergedInstitutionStandby ? 'rotate(180deg)' : 'none',
                                maxHeight: hasMergedInstitutionStandby ? `${Math.max(institutionRowSpan * 55, 80)}px` : 'auto',
                              }}
                            >
                              {member.member_type === 'directorate' ? 'مديرية الشباب والرياضة' : (member.member_type === 'main' ? (member.youth_institution || 'مديرية الشباب والرياضة') : (member.youth_institution || '-'))}
                            </div>
                          </TableCell>
                        );
                      })()}
                      <TableCell className="text-center">
                        {member.photo_path ? (
                          <>
                            <img 
                              src={member.photo_path.startsWith('http') ? member.photo_path : `${STORAGE_URL}/${member.photo_path}`} 
                              alt={member.first_name}
                              className="w-10 h-10 rounded-full object-cover border mx-auto"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.parentElement?.querySelector('.photo-fallback');
                                if (fallback) fallback.classList.remove('hidden', 'photo-fallback');
                              }}
                            />
                            <div className="photo-fallback hidden w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border mx-auto text-slate-400 text-xs font-bold">
                              {member.first_name?.[0]}{member.last_name?.[0]}
                            </div>
                          </>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border mx-auto text-slate-400 text-xs font-bold">
                            {member.first_name?.[0]}{member.last_name?.[0]}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={`font-bold ${member.has_hidden_spaces ? 'text-rose-600' : 'text-slate-800'}`} title={member.has_hidden_spaces ? 'يحتوي على مسافات مخفية في المنصة الوزارية' : ''}>
                        <div className="flex items-center gap-1.5">
                          <span>{member.first_name}</span>
                          {member.duplicate_info && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-600 cursor-help" title={member.duplicate_info}>
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {member.is_deleted_alert && !member.duplicate_info?.includes('تم حذفه') && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-600 cursor-help" title="تم حذفه سابقاً من نظام التخييم">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={`font-bold ${member.has_hidden_spaces ? 'text-rose-600' : 'text-slate-800'}`} title={member.has_hidden_spaces ? 'يحتوي على مسافات مخفية في المنصة الوزارية' : ''}>{member.last_name}</TableCell>
                      {(() => {
                        const tripDate = trip?.start_date ? new Date(trip.start_date) : new Date();
                        const isOver14 = member.birth_date && (tripDate.getTime() - new Date(member.birth_date).getTime()) > 14 * 365.25 * 24 * 60 * 60 * 1000;
                        const isUnder8 = member.birth_date && (tripDate.getTime() - new Date(member.birth_date).getTime()) < 8 * 365.25 * 24 * 60 * 60 * 1000;
                        const isOutOfRange = isOver14 || isUnder8;
                        return (
                          <TableCell className={`text-center ${isOutOfRange ? 'text-rose-600 font-bold bg-rose-50/50' : 'text-slate-600'}`}>
                            {member.birth_date} <span className={`text-xs mr-1 ${isOutOfRange ? 'text-rose-500' : 'text-slate-400'}`}>{formatAgePrecise(member.birth_date)}</span>
                          </TableCell>
                        );
                      })()}
                      <TableCell className="text-center text-slate-600 text-xs font-medium">{member.parent_full_name || '-'}</TableCell>
                      <TableCell className="text-center text-slate-600 text-xs font-mono" dir="ltr">{member.parent_phone || '-'}</TableCell>
                      <TableCell className="text-center text-xs font-mono font-bold" dir="ltr">
                        {(() => {
                          const status = getAdherenceStatus(member.unified_adherence_number, member.youth_institution);
                          const isDuplicate = member.unified_adherence_number && duplicateUnifiedNumbers.has(member.unified_adherence_number);
                          return (
                            <div className="flex items-center justify-center gap-1">
                              <span className={status.color || (isDuplicate ? 'text-amber-600' : 'text-blue-600')} title={status.tooltip || ''}>
                                {member.unified_adherence_number || '-'}
                              </span>
                              {isDuplicate && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-600 cursor-help flex-shrink-0" title={`رقم الانخراط الموحد "${member.unified_adherence_number}" مكرر!`}>
                                  <AlertTriangle className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          {member.member_type === 'scout' && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">{t("seat_scout")}</Badge>}
                          {member.member_type === 'association' && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{t("seat_association")}</Badge>}
                          {member.member_type === 'institution' && <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">{t("seat_institution")}</Badge>}
                          {member.member_type === 'municipality' && <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">البلدية</Badge>}
                          {member.member_type === 'authority' && <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">هيئة</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center print:hidden relative">
                        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center gap-1">

                          {member.ministry_number && duplicateMinistryNumbers.has(member.ministry_number) ? (
                            <div className="h-8 w-8 flex items-center justify-center text-amber-500 rounded-full bg-amber-50 cursor-help" title={`الرقم الوزاري "${member.ministry_number}" مكرر!`}>
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                          ) : !member.ministry_number ? (
                            <div className="h-8 w-8 flex items-center justify-center text-amber-500 rounded-full bg-amber-50 cursor-help" title={"لا يملك الرقم الوزاري"}>
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                          ) : null}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50 rounded-full" title="معاينة بيانات المسجل" onClick={(e) => { e.stopPropagation(); member.member_id && router.push(`/members/${member.member_id}`); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {member.ministry_number && /^[0-9a-f]{24}$/i.test(member.ministry_number) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-500 hover:bg-purple-50 rounded-full" title="فتح في المنصة الوزارية" onClick={(e) => { e.stopPropagation(); window.open(`https://youthcamp.mjeunesse.gov.dz/children/dashboard/registrations/${member.ministry_number}`, '_blank'); }}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('camp_trips', 'view_declaration') && member.parental_declaration_path && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:bg-emerald-50 rounded-full" title="عرض التصريح الأبوي" onClick={(e) => { e.stopPropagation(); window.open(member.parental_declaration_path!.startsWith('http') ? member.parental_declaration_path : `${STORAGE_URL}/${member.parental_declaration_path}`, '_blank'); }}>
                              <FileCheck className="h-4 w-4" />
                            </Button>
                          )}
                          {/* {member.medical_certificate_path && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-full" title="عرض الشهادة الطبية" onClick={(e) => { e.stopPropagation(); window.open(member.medical_certificate_path!.startsWith('http') ? member.medical_certificate_path : `${STORAGE_URL}/${member.medical_certificate_path}`, '_blank'); }}>
                              <Heart className="h-4 w-4" />
                            </Button>
                          )} */}
                          {trip.status !== 'COMPLETED' ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" className="w-8 h-8 rounded-full border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all text-slate-600">
                                  <Settings2 className="w-4 h-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent side="right" align="center" className="w-auto p-1 rounded-full flex items-center gap-1 shadow-lg border-slate-200">
                                {hasPermission('camp_trips', 'upload_declaration') && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-50 rounded-full" title={member.parental_declaration_path ? "إعادة مسح التصريح الأبوي" : "رفع التصريح الأبوي"} onClick={(e) => { e.stopPropagation(); setMemberToUploadDocType('declaration'); member.id && setMemberToUpload(member.id); }}>
                                    <Upload className="h-4 w-4" />
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'sync_ministry') && member.parental_declaration_path && (
                                  <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-full ${member.parental_declaration_sent_at ? 'text-slate-400 hover:bg-slate-50' : 'text-blue-600 hover:bg-blue-50'}`} title={member.parental_declaration_sent_at ? "تم الإرسال للمنصة الوزارية" : "إرسال للمنصة الوزارية"} disabled={syncingMemberId === member.id} onClick={(e) => { e.stopPropagation(); member.id && handleSyncMinisterial(member.id); }}>
                                    {syncingMemberId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'enroll') && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-full" title="إنشاء انخراط في المؤسسة" disabled={enrollingMemberId === member.id} onClick={(e) => { e.stopPropagation(); member.id && handleEnrollMinisterial(member.id); }}>
                                    {enrollingMemberId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'sync_ministry') && member.ministry_number && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600 hover:bg-purple-50 rounded-full" title="استيراد من المنصة الوزارية" disabled={importingMemberId === member.id} onClick={(e) => { e.stopPropagation(); member.id && handleFetchFromMinisterial(member.id); }}>
                                    {importingMemberId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudDownload className="h-4 w-4" />}
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'sync_ministry') && member.ministry_number && /^[0-9a-f]{24}$/i.test(member.ministry_number.split(',')[0].trim()) && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-500 hover:bg-indigo-50 rounded-full" title="التحقق من بيانات المنصة الوزارية" disabled={verifyingMemberId === member.id} onClick={(e) => { e.stopPropagation(); member.id && handleVerifyMinistry(member.id); }}>
                                    {verifyingMemberId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'renew_enrollment') && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:bg-amber-50 rounded-full" title="تجديد رقم الانخراط الموحد في YouthConnect" disabled={renewingMemberId === member.member_id || !member.member_id} onClick={(e) => { e.stopPropagation(); member.member_id && handleRenewYouthConnect(member.member_id, member.enrollment_institution || member.youth_institution || undefined); }}>
                                    {renewingMemberId === member.member_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                  </Button>
                                )}
                                {/* Assign to Session */}
                                {hasPermission('camp_trips', 'assign_session') && 
                                 member.ministry_number && 
                                 trip.status !== 'COMPLETED' && 
                                 (trip as any).ministry_session_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-8 rounded-full px-2 gap-1 ${member.assigned_to_session_at ? 'text-slate-300 hover:text-slate-300 hover:bg-transparent cursor-default' : 'text-teal-600 hover:text-teal-700 hover:bg-teal-50'}`}
                                    title="توجيه الطفل إلى الدورة"
                                    onClick={() => setAssigningMemberId(member.id)}
                                    disabled={isAssigning}
                                  >
                                    <Navigation className="h-4 w-4" />
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'edit_seat') && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50 rounded-full" title="إدخال / تعديل رقم الانخراط الموحد والرقم الوزاري ونوع المقعد" onClick={(e) => { e.stopPropagation(); setMemberToEditType(member); setEditMemberType(member.member_type || 'main'); setEditYouthInstitution(member.youth_institution || ''); setEditIsStandby(member.is_standby || false); setEditMinistryNumber(member.ministry_number || ''); setEditUnifiedNumber(member.unified_adherence_number || ''); setEditEnrollInstitution(member.enrollment_institution || ''); setEditForceRegistration(member.first_name?.endsWith('\u200B') || false); }}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'view_declaration') && memberReceiptUrl(member) && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50 rounded-full" title="عرض وصل التسجيل" onClick={(e) => { e.stopPropagation(); window.open(memberReceiptUrl(member)!, '_blank'); }}>
                                    <Receipt className="h-4 w-4" />
                                  </Button>
                                )}
                                {hasPermission('camp_trips', 'delete') && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-full" onClick={(e) => { e.stopPropagation(); member.id && setMemberToDelete(member.id); }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Print styles block */}
      <style
        id="camp-trip-print-styles"
        dangerouslySetInnerHTML={{
          __html: `@media print{body{background-color:#fff!important;color:#000!important}@page{margin:1cm;size:A4 portrait}}`
        }}
      />

      <Dialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-red-600">إزالة طفل من الدفعة</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-slate-600 text-sm">
              الرجاء تحديد سبب إزالة الطفل من هذه الدفعة. سيتم حفظ هذا السبب في ملفه للاستفادة منه في الدفعات القادمة.
            </p>
            <Select value={deleteReason} onValueChange={setDeleteReason}>
              <SelectTrigger>
                <SelectValue placeholder="اختر سبب الحذف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={`عدم الرد عن الاتصال (${new Date().getFullYear()})`}>عدم الرد عن الاتصال</SelectItem>
                <SelectItem value={`عدم موافقة الأب (${new Date().getFullYear()})`}>عدم موافقة الأب</SelectItem>
                <SelectItem value={`عدم احضار الوثائق (${new Date().getFullYear()})`}>عدم احضار الوثائق</SelectItem>
                <SelectItem value={`الغياب في اخر لحظة (${new Date().getFullYear()})`}>الغياب في اخر لحظة</SelectItem>
                <SelectItem value={`انسحاب اختياري (${new Date().getFullYear()})`}>انسحاب اختياري</SelectItem>
                <SelectItem value={`سبب آخر (${new Date().getFullYear()})`}>سبب آخر</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex-row sm:justify-start gap-2">
            <Button
              variant="destructive"
              onClick={confirmDeleteMember}
              disabled={!deleteReason || isDeleting}
              className="gap-2"
            >
              {isDeleting ? "جاري الإزالة..." : "تأكيد الإزالة"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setMemberToDelete(null)}
              disabled={isDeleting}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog الوضع الافتراضي (رفع ملف واحد للوثيقة كاملة) ===== */}
      <Dialog open={!!memberToUpload && !separateUpload} onOpenChange={(open) => !open && setMemberToUpload(null)}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>رفع التصريح الأبوي</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <p className="text-sm text-slate-500">
              يمكنك رفع التصريح الأبوي مباشرة من الحاسوب (PDF أو صورة) أو سحبه باستخدام بوت الماسح الضوئي.
            </p>
            
            <div className="flex gap-4 items-center justify-center pt-4">
              <div className="relative">
                <Button disabled={isUploading} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  رفع من الحاسوب
                </Button>
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await handleUploadDeclaration(file, 'declaration');
                    }
                  }}
                  disabled={isUploading}
                />
              </div>
              <div className="text-sm text-slate-400">أو</div>
              <Button 
                disabled={isUploading} 
                variant="outline"
                className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => {
                  try {
                    window.open(`djs-scanner://declaration/${tripId}/${memberToUpload}`, '_blank');
                    toast.info("تم طلب فتح الماسح الضوئي، يرجى مسح التصريح وسيتم تحديث الصفحة تلقائياً...");
                    setMemberToUpload(null);
                    
                    // Polling for 60 seconds (every 3s)
                    let attempts = 0;
                    const pollInterval = setInterval(async () => {
                      attempts++;
                      if (attempts > 20) {
                        clearInterval(pollInterval);
                        return;
                      }
                      await fetchTrip();
                    }, 3000);
                  } catch (err: any) {
                    toast.error(err?.message || "تعذر فتح بروتوكول الماسح الضوئي");
                  }
                }}
              >
                <ScanLine className="h-4 w-4" />
                مسح ضوئي مباشر
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog الوضع المنفصل (رفع التصريح الأبوي فقط) ===== */}
      <Dialog open={!!memberToUpload && separateUpload} onOpenChange={(open) => !open && setMemberToUpload(null)}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>رفع وثائق الطفل</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 py-4">
            {/* ===== التصريح الأبوي ===== */}
            <div className="border border-emerald-300 rounded-lg p-4 bg-emerald-50/30">
              <h3 className="font-bold text-emerald-700 flex items-center gap-2 mb-3">
                <FileCheck className="h-5 w-5" />
                التصريح الأبوي
              </h3>
              <p className="text-xs text-slate-500 mb-3">رفع التصريح الأبوي (PDF أو صورة)</p>
              <div className="flex gap-3 items-center justify-center">
                <div className="relative">
                  <Button disabled={isUploading} size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    رفع
                  </Button>
                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/jpeg,image/png,image/jpg,application/pdf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setMemberToUploadDocType('declaration');
                        await handleUploadDeclaration(file, 'declaration');
                      }
                    }}
                    disabled={isUploading}
                  />
                </div>
                <div className="text-xs text-slate-400">أو</div>
                <Button disabled={isUploading} size="sm" variant="outline" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => {
                    setMemberToUploadDocType('declaration');
                    try {
                      window.open(`djs-scanner://declaration/${tripId}/${memberToUpload}`, '_blank');
                      toast.info("تم طلب فتح الماسح الضوئي للتصريح الأبوي...");
                      setMemberToUpload(null);
                      let attempts = 0;
                      const pollInterval = setInterval(async () => {
                        attempts++;
                        if (attempts > 20) { clearInterval(pollInterval); return; }
                        await fetchTrip();
                      }, 3000);
                    } catch (err: any) { toast.error(err?.message || "تعذر فتح بروتوكول الماسح الضوئي"); }
                  }}
                >
                  <ScanLine className="h-4 w-4" />
                  مسح ضوئي
                </Button>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!memberToEditType} onOpenChange={(open) => !open && setMemberToEditType(null)}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المقعد، رقم الانخراط الموحد، والرقم الوزاري</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع المقعد</label>
              <Select value={editMemberType} onValueChange={(val) => {
  setEditMemberType(val);
  if (val !== 'institution') {
    setEditYouthInstitution('');
  }
}}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع المقعد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">المديرية</SelectItem>
                  <SelectItem value="institution">مؤسسة شبابية</SelectItem>
                  <SelectItem value="scout">كشافة</SelectItem>
                  <SelectItem value="association">جمعية</SelectItem>
                  <SelectItem value="municipality">البلدية</SelectItem>
                  <SelectItem value="authority">هيئة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">القائمة</label>
              <Select value={editIsStandby ? "standby" : "main"} onValueChange={(val) => setEditIsStandby(val === "standby")}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر القائمة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">القائمة الأساسية</SelectItem>
                  <SelectItem value="standby">القائمة الاحتياطية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800">رقم الانخراط الموحد</label>
              <Input 
                  value={editUnifiedNumber} 
                  onChange={(e) => setEditUnifiedNumber(e.target.value)} 
                  placeholder="مثال: 280709-26-1-012-0047" 
                  className="font-mono text-left bg-slate-50 border-slate-200 font-semibold text-emerald-700" 
                  dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800">الرقم الوزاري</label>
              <Input 
                  value={editMinistryNumber} 
                  onChange={(e) => setEditMinistryNumber(e.target.value)} 
                  placeholder="أدخل الرقم الوزاري" 
                  className="font-mono text-left bg-slate-50 border-slate-200 font-semibold text-blue-700" 
                  dir="ltr"
              />
            </div>
            
            {/* Universal enrollment institution for ALL types */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">مؤسسة الانخراط التابع لها</label>
              <SearchableSelect
                options={institutions.map(i => ({ value: i.name_ar, label: i.name_ar }))}
                value={editEnrollInstitution}
                onValueChange={setEditEnrollInstitution}
                onSearch={async (query) => {
                    const res = await institutionsApi.getAll({ search: query, size: 50, sector: 'YOUTH' });
                    return res.items.map((i: any) => ({ value: i.name_ar, label: i.name_ar }));
                }}
                placeholder="اختر مؤسسة الانخراط"
                searchPlaceholder="ابحث عن مؤسسة..."
                emptyMessage="لا توجد مؤسسات مطابقة"
              />
            </div>
            
            {/* Type-specific field */}
            {editMemberType === 'institution' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">المؤسسة الشبابية</label>
                <SearchableSelect
                  options={institutions.map(i => ({ value: i.name_ar, label: i.name_ar }))}
                  value={editYouthInstitution}
                  onValueChange={setEditYouthInstitution}
                  onSearch={async (query) => {
                      const res = await institutionsApi.getAll({ search: query, size: 50, sector: 'YOUTH' });
                      return res.items.map((i: any) => ({ value: i.name_ar, label: i.name_ar }));
                  }}
                  placeholder="اختر المؤسسة الشبابية"
                  searchPlaceholder="ابحث عن المؤسسة..."
                  emptyMessage="لا توجد مؤسسات مطابقة"
                />
              </div>
            )}
            {editMemberType === 'association' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">الجمعية</label>
                <SearchableSelect
                  options={associations.map(a => ({ value: a.name_ar, label: a.name_ar }))}
                  value={editYouthInstitution}
                  onValueChange={setEditYouthInstitution}
                  onSearch={async (query) => {
                      const res = await associationsApi.getAll({ search: query, limit: 50 });
                      return res.items.map((a: any) => ({ value: a.name_ar, label: a.name_ar }));
                  }}
                  placeholder="اختر الجمعية"
                  searchPlaceholder="ابحث عن الجمعية..."
                  emptyMessage="لا توجد جمعيات مطابقة"
                />
              </div>
            )}
            {editMemberType === 'scout' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم الفوج الكشفي</label>
                <Input 
                  value={editYouthInstitution}
                  onChange={(e) => setEditYouthInstitution(e.target.value)}
                  placeholder="اكتب الفوج الكشفي"
                />
              </div>
            )}
            {editMemberType === 'municipality' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم البلدية</label>
                <Input 
                  value={editYouthInstitution}
                  onChange={(e) => setEditYouthInstitution(e.target.value)}
                  placeholder="اكتب اسم البلدية"
                />
              </div>
            )}
            {editMemberType === 'authority' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم الهيئة</label>
                <Input 
                  value={editYouthInstitution}
                  onChange={(e) => setEditYouthInstitution(e.target.value)}
                  placeholder="اكتب اسم الهيئة"
                />
              </div>
            )}
            {hasPermission('camp_trips', 'force_registration') && (
            <div className="space-y-2 mt-2">
              <label className="flex items-center gap-2 cursor-pointer bg-red-50 p-2.5 rounded-xl border border-red-100">
                <input 
                  type="checkbox" 
                  checked={editForceRegistration}
                  onChange={(e) => setEditForceRegistration(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500 border-red-300"
                />
                <span className="text-sm font-bold text-red-700">
                  تسجيل قسري (إضافة الفراغ المخفي للاسم)
                </span>
              </label>
            </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToEditType(null)}>إلغاء</Button>
            <Button disabled={isEditingType} onClick={handleUpdateMemberType}>
              {isEditingType ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Copy Standby Dialog */}
      <Dialog open={showCopyStandby} onOpenChange={(open) => !open && setShowCopyStandby(false)}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>جلب القائمة الاحتياطية</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-slate-500">
              اختر الفوج الذي تريد جلب الأطفال منه:
            </p>
            <Select value={selectedSourceTrip} onValueChange={setSelectedSourceTrip}>
              <SelectTrigger>
                <SelectValue placeholder="اختر فوجاً..." />
              </SelectTrigger>
              <SelectContent>
                {availableTrips.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.status === 'DRAFT' ? 'مسودة' : t.status === 'IN_CAMP' ? 'في المخيم' : t.status === 'COMPLETED' ? 'منتهي' : t.status})
                  </SelectItem>
                ))}
                {availableTrips.length === 0 && (
                  <div className="px-2 py-4 text-sm text-slate-400 text-center">
                    لا توجد أفواج أخرى
                  </div>
                )}
              </SelectContent>
            </Select>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-slate-700 mb-3">إضافة إلى:</p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={addToStandby ? "outline" : "default"}
                  className={`flex-1 gap-2 ${!addToStandby ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-200 text-emerald-700'}`}
                  onClick={() => setAddToStandby(false)}
                >
                  القائمة الرئيسية
                </Button>
                <Button
                  type="button"
                  variant={addToStandby ? "default" : "outline"}
                  className={`flex-1 gap-2 ${addToStandby ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'border-amber-200 text-amber-700'}`}
                  onClick={() => setAddToStandby(true)}
                >
                  القائمة الاحتياطية
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyStandby(false)}>إلغاء</Button>
            <Button 
              onClick={handleCopyStandby} 
              disabled={!selectedSourceTrip || isCopyingStandby}
              className={addToStandby ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}
            >
              {isCopyingStandby ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              جلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Members Modal */}
      <Dialog open={showMoveModal} onOpenChange={(open) => !open && setShowMoveModal(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>نقل أعضاء لفوج آخر</DialogTitle>
            <DialogDescription>
              سيتم نقل {selectedMembers.size} عضو إلى الفوج المختار. سيتم إزالتهم من الفوج الحالي.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">اختر الفوج الوجهة</label>
              <Select value={moveTargetTripId} onValueChange={setMoveTargetTripId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفوج" />
                </SelectTrigger>
                <SelectContent>
                  {availableTrips.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                  {availableTrips.length === 0 && (
                    <div className="px-2 py-4 text-sm text-slate-400 text-center">
                      لا توجد أفواج أخرى
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveModal(false)}>إلغاء</Button>
            <Button 
              onClick={handleBulkMove} 
              disabled={!moveTargetTripId || isMoving}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isMoving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              نقل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 📊 Dialog مزامنة أرقام الدفعة */}
      <Dialog open={showSyncDialog} onOpenChange={(open) => { if (!syncTaskId || syncTaskId === 'starting') setShowSyncDialog(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CloudUpload className="h-5 w-5 text-blue-600" />
              مزامنة أرقام الدفعة
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              اختر عدد السجلات المراد جلبها من المنصة الوزارية
            </DialogDescription>
          </DialogHeader>
          
          {!syncTaskId ? (
            <div className="space-y-4 py-2">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">عدد السجلات</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    value={syncLimit}
                    onChange={(e) => setSyncLimit(parseInt(e.target.value) || 100)}
                    className="flex-1"
                    placeholder="مثال: 100"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setSyncLimit(0)}
                    className={`whitespace-nowrap ${syncLimit === 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
                  >
                    الكل
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  {syncLimit === 0 ? 'سيتم جلب جميع السجلات من المنصة الوزارية' : `سيتم جلب آخر ${syncLimit} سجلاً فقط`}
                </p>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowSyncDialog(false)}>إلغاء</Button>
                {hasPermission('camp_trips', 'sync_ministry') && (
                  <Button onClick={handleStartSync} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <CloudUpload className="h-4 w-4 ml-1.5" />
                    بدء المزامنة
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                {syncProgress.status === 'processing' && syncProgress.total === 0 ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span>{syncProgress.message || 'جاري سحب البيانات...'}</span>
                  </>
                ) : (
                  <>
                    <span>{syncProgress.message}</span>
                  </>
                )}
              </div>
              
              {syncProgress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{syncProgress.processed} / {syncProgress.total}</span>
                    <span>{Math.round((syncProgress.processed / syncProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.min(100, (syncProgress.processed / Math.max(1, syncProgress.total)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Verify Dialog */}
      <Dialog open={showBulkVerifyDialog} onOpenChange={(open) => { if (!bulkVerifyTaskId) setShowBulkVerifyDialog(open); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ScanSearch className="h-5 w-5 text-indigo-600" />
              الفحص الجماعي للمنصة الوزارية
            </DialogTitle>
            <DialogDescription>
              التحقق من بيانات جميع أعضاء الفوج مع المنصة الوزارية
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {bulkVerifyTaskId ? (
              /* Progress section */
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                  {bulkVerifyProgress.status === 'processing' && bulkVerifyProgress.total === 0 ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                      <span>{bulkVerifyProgress.message || 'جاري سحب البيانات...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{bulkVerifyProgress.message}</span>
                    </>
                  )}
                </div>
                
                {bulkVerifyProgress.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{bulkVerifyProgress.processed} / {bulkVerifyProgress.total}</span>
                      <span>{Math.round((bulkVerifyProgress.processed / bulkVerifyProgress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(100, (bulkVerifyProgress.processed / Math.max(1, bulkVerifyProgress.total)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : bulkVerifyResults ? (
              /* Results section */
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-slate-700">{bulkVerifyResults.length}</div>
                    <div className="text-xs text-slate-500">إجمالي الفحص</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-amber-600">{bulkVerifyResults.filter(r => r.has_differences).length}</div>
                    <div className="text-xs text-amber-500">بها اختلافات</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">{bulkVerifyResults.filter(r => !r.ministry_data_exists).length}</div>
                    <div className="text-xs text-red-500">غير موجودين</div>
                  </div>
                </div>
                
                {/* Results table */}
                <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-right font-medium text-slate-600">الطفل</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600">المنصة</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600">النتيجة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bulkVerifyResults.map((r, idx) => (
                        <tr key={idx} className={r.has_differences ? 'bg-amber-50/50' : ''}>
                          <td className="px-3 py-2 text-slate-900 font-medium">{r.member_name || 'بدون اسم'}</td>
                          <td className="px-3 py-2 text-center">
                            {r.ministry_data_exists
                              ? <span className="text-green-600 text-sm">موجود</span>
                              : <span className="text-red-600 text-sm">غير موجود</span>
                            }
                          </td>
                          <td className="px-3 py-2 text-center">
                            {r.has_differences
                              ? <span className="text-amber-600 text-xs bg-amber-50 px-2 py-0.5 rounded-full font-medium">يوجد اختلاف</span>
                              : <span className="text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded-full font-medium">متطابق</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Detailed results */}
                {bulkVerifyResults.some(r => r.alerts?.length > 0) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700">تفاصيل التنبيهات</h4>
                    {bulkVerifyResults.filter(r => r.alerts?.length > 0).map((r, idx) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="font-medium text-sm text-slate-800 mb-1">{r.member_name}</div>
                        <div className="space-y-0.5">
                          {r.alerts.map((alert: string, aidx: number) => (
                            <div key={aidx} className={`text-xs px-2 py-1 rounded ${
                              alert.startsWith('❌') ? 'bg-red-50 text-red-700' :
                              alert.startsWith('⚠️') ? 'bg-amber-50 text-amber-700' :
                              alert.startsWith('✅') ? 'bg-green-50 text-green-700' :
                              'bg-slate-50 text-slate-500'
                            }`}>
                              {alert}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowBulkVerifyDialog(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkSeatDialog} onOpenChange={setShowBulkSeatDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">تغيير نوع المقعد</DialogTitle>
            <DialogDescription className="text-center text-slate-500">
              {selectedMembers.size} عضو محدد
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant={bulkSeatType === 'main' ? 'default' : 'outline'}
              size="lg"
              className={`w-full h-14 text-lg font-bold rounded-xl transition-all ${
                bulkSeatType === 'main' 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200' 
                  : 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
              }`}
              onClick={() => setBulkSeatType('main')}
            >
              <Users className="h-5 w-5 ml-2" />
              أساسي
            </Button>
            <Button
              variant={bulkSeatType === 'standby' ? 'default' : 'outline'}
              size="lg"
              className={`w-full h-14 text-lg font-bold rounded-xl transition-all ${
                bulkSeatType === 'standby' 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-200' 
                  : 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
              }`}
              onClick={() => setBulkSeatType('standby')}
            >
              <Users className="h-5 w-5 ml-2" />
              احتياط
            </Button>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowBulkSeatDialog(false)} className="flex-1 rounded-xl">
              إلغاء
            </Button>
            <Button 
              onClick={async () => {
                try {
                  setIsBulkProcessing(true);
                  const loadingToast = toast.loading(`جاري تغيير مقعد ${selectedMembers.size} عضو...`);
                  await campTripsApi.bulkUpdateMemberType(tripId, {
                    member_ids: Array.from(selectedMembers),
                    member_type: bulkSeatType,
                    is_standby: bulkSeatType === 'standby'
                  });
                  toast.success(`تم تغيير مقعد ${selectedMembers.size} عضو بنجاح`, { id: loadingToast });
                  setShowBulkSeatDialog(false);
                  setSelectedMembers(new Set());
                  fetchTrip();
                } catch (e: any) {
                  toast.error(e?.response?.data?.detail || 'فشل تغيير المقعد');
                } finally {
                  setIsBulkProcessing(false);
                }
              }}
              disabled={isBulkProcessing}
              className={`flex-1 rounded-xl font-bold ${
                bulkSeatType === 'main'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {isBulkProcessing ? (
                <><Loader2 className="h-4 w-4 animate-spin ml-2" /> جاري التغيير...</>
              ) : (
                <>تأكيد التغيير إلى {bulkSeatType === 'main' ? 'أساسي' : 'احتياط'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedMembers.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-2xl border border-slate-200 p-2 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-full text-sm flex items-center gap-2">
            <span className="flex h-6 w-6 rounded-full bg-blue-100 items-center justify-center text-blue-800">{selectedMembers.size}</span>
            أعضاء محددين
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <Button 
            variant="outline" 
            className="rounded-full gap-2 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
            onClick={() => {
              // Placeholder for Exporting Medical Forms
              toast.info("تصدير الاستمارات الطبية الجماعية قيد التطوير");
            }}
          >
            <Printer className="h-4 w-4" />
            طباعة الاستمارات الطبية
          </Button>
          {hasPermission('camp_trips', 'edit') && (
            <Button 
              variant="outline" 
              className="rounded-full gap-2 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-colors"
              onClick={() => setShowMoveModal(true)}
              disabled={isBulkProcessing || isMoving}
            >
              <ArrowRight className="h-4 w-4" />
              نقل لفوج آخر
            </Button>
          )}
          <div className="h-8 w-px bg-slate-200" />
          {hasPermission('camp_trips', 'edit') && (
            <Button 
              variant="outline" 
              className="rounded-full gap-2 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors"
              onClick={() => { setBulkSeatType('main'); setShowBulkSeatDialog(true); }}
              disabled={isBulkProcessing}
            >
              <Users className="h-4 w-4" />
              تغيير المقعد
            </Button>
          )}
          {hasPermission('camp_trips', 'enroll') && (
            <Button 
              variant="outline" 
              className="rounded-full gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
              onClick={() => handleBulkAction('enroll')}
              disabled={isBulkProcessing}
            >
              {isBulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              إنشاء انخراط
            </Button>
          )}
          {hasPermission('camp_trips', 'enroll') && (
            <Button 
              variant="outline" 
              className="rounded-full gap-2 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors"
              onClick={() => handleBulkAction('renew')}
              disabled={isBulkProcessing}
            >
              {isBulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              تجديد الانخراط
            </Button>
          )}
          {hasPermission('camp_trips', 'delete') && (
            <Button 
              variant="outline" 
              className="rounded-full gap-2 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors"
              onClick={() => handleBulkAction('delete')}
              disabled={isBulkProcessing}
            >
              {isBulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              حذف
            </Button>
          )}
          <div className="h-8 w-px bg-slate-200" />
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full hover:bg-rose-50 hover:text-rose-600 text-slate-400"
            onClick={() => setSelectedMembers(new Set())}
            disabled={isBulkProcessing}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Edit Trip Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">تعديل بيانات الفوج</DialogTitle>
            <DialogDescription className="text-slate-500">
              قم بتعديل بيانات الفوج أدناه
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name" className="text-slate-700 font-medium">الاسم</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="اسم الفوج"
                className="border-slate-200"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description" className="text-slate-700 font-medium">الوصف</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="وصف الفوج (اختياري)"
                className="border-slate-200"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-capacity" className="text-slate-700 font-medium">السعة الإجمالية</Label>
              <Input
                id="edit-capacity"
                type="number"
                min={0}
                value={editForm.capacity}
                onChange={(e) => setEditForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                className="border-slate-200"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-scouts-quota" className="text-slate-700 font-medium">حصّة الكشافة</Label>
                <Input
                  id="edit-scouts-quota"
                  type="number"
                  min={0}
                  value={editForm.scouts_quota}
                  onChange={(e) => setEditForm(prev => ({ ...prev, scouts_quota: parseInt(e.target.value) || 0 }))}
                  className="border-slate-200"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-associations-quota" className="text-slate-700 font-medium">حصّة الجمعيات</Label>
                <Input
                  id="edit-associations-quota"
                  type="number"
                  min={0}
                  value={editForm.associations_quota}
                  onChange={(e) => setEditForm(prev => ({ ...prev, associations_quota: parseInt(e.target.value) || 0 }))}
                  className="border-slate-200"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-institutions-quota" className="text-slate-700 font-medium">حصّة المؤسسات</Label>
                <Input
                  id="edit-institutions-quota"
                  type="number"
                  min={0}
                  value={editForm.institutions_quota}
                  onChange={(e) => setEditForm(prev => ({ ...prev, institutions_quota: parseInt(e.target.value) || 0 }))}
                  className="border-slate-200"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-start-date" className="text-slate-700 font-medium">تاريخ البداية</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editForm.start_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                  className="border-slate-200"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-end-date" className="text-slate-700 font-medium">تاريخ النهاية</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editForm.end_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, end_date: e.target.value }))}
                  className="border-slate-200"
                />
              </div>
            </div>
            {/* Session Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">الدورة والمخيم على المنصة الوزارية</Label>
              <SearchableSelect
                value={editForm.ministry_session_id || ''}
                onValueChange={(value) => {
                  const session = availableSessions.find((s: any) => s._id === value || s.id === value);
                  setEditForm(prev => ({
                    ...prev,
                    ministry_session_id: value || null,
                    ministry_session_name: session?.name || null,
                  }));
                }}
                options={availableSessions.map((session: any) => ({
                  value: session._id || session.id,
                  label: `${session.vacationCenter?.name ? session.vacationCenter.name + ' — ' : ''}${session.name} (${session.startDate ? new Date(session.startDate).toLocaleDateString('fr-FR') : ''} - ${session.endDate ? new Date(session.endDate).toLocaleDateString('fr-FR') : ''})`,
                }))}
                placeholder={loadingSessions ? "جاري تحميل الدورات..." : "اختر الدورة..."}
                disabled={loadingSessions}
                searchPlaceholder="بحث في الدورات..."
                emptyMessage="لا توجد دورات متاحة"
              />
              {editForm.ministry_session_name && (
                <p className="text-xs text-emerald-600 mt-1">
                  ✓ الدورة المحددة: {(() => { const s = availableSessions.find((s: any) => s._id === editForm.ministry_session_id); return s?.vacationCenter?.name ? `${s.vacationCenter.name} — ` : ''; })()}{editForm.ministry_session_name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isSavingEdit}
              className="border-slate-200"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
              className="bg-slate-800 hover:bg-slate-700 text-white gap-2"
            >
              {isSavingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSavingEdit ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Ministry Data Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>نتيجة التحقق من بيانات المنصة الوزارية</DialogTitle>
            <DialogDescription>
              مقارنة البيانات المحلية مع بيانات المنصة الوزارية
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Overall status badge */}
            {verifyResult && (
              <div className={`p-3 rounded-lg text-sm font-medium ${verifyResult.ministry_data_exists
                ? verifyResult.has_differences
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {!verifyResult.ministry_data_exists
                  ? '⚠️ بيانات الطفل غير موجودة في المنصة الوزارية'
                  : verifyResult.has_differences
                    ? '⚠️ توجد اختلافات بين البيانات المحلية والمنصة الوزارية'
                    : '✅ جميع البيانات متطابقة مع المنصة الوزارية'}
              </div>
            )}

            {/* Field comparisons table */}
            {verifyResult && verifyResult.comparisons.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">مقارنة الحقول</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-right font-medium text-slate-600">الحقل</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-600">محلياً</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-600">المنصة</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {verifyResult.comparisons.map((comp, idx) => (
                        <tr key={idx} className={comp.match ? '' : 'bg-amber-50'}>
                          <td className="px-3 py-2 text-slate-700 font-medium">{comp.label}</td>
                          <td className={`px-3 py-2 ${comp.local_value ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                            {comp.local_value || '—'}
                          </td>
                          <td className={`px-3 py-2 ${comp.ministry_value ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                            {comp.ministry_value || '—'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {comp.match
                              ? <span className="text-green-600 text-lg">✓</span>
                              : <span className="text-amber-600 text-lg">⚠</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Alerts */}
            {verifyResult && verifyResult.alerts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">التنبيهات</h4>
                <div className="space-y-1">
                  {verifyResult.alerts.map((alert, idx) => (
                    <div key={idx} className={`px-3 py-2 rounded-lg text-sm ${
                      alert.startsWith('❌') ? 'bg-red-50 text-red-700' :
                      alert.startsWith('⚠️') ? 'bg-amber-50 text-amber-700' :
                      alert.startsWith('✅') ? 'bg-green-50 text-green-700' :
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {alert}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowVerifyDialog(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Session Confirmation Dialog */}
      <AlertDialog open={!!assigningMemberId} onOpenChange={(open) => !open && setAssigningMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-teal-600" />
              توجيه الطفل إلى الدورة
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من توجيه هذا الطفل إلى الدورة <strong>{(trip as any)?.ministry_session_name}</strong>؟
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                سيتم إرسال الطلب إلى المنصة الوزارية مباشرة.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAssigning}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => assigningMemberId && handleAssignSession(assigningMemberId)}
              disabled={isAssigning}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري التوجيه...
                </>
              ) : (
                'تأكيد التوجيه'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </PermissionGuard>
                );
}