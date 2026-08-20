"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Play, RefreshCw, Loader2, CheckCircle, XCircle, ScanLine,
  Clock, AlertCircle, Calendar, User, Phone, Mail, Download, Upload,
  Plus, Edit, Trash2, Camera, X, ArrowRightLeft, Square, ChevronDown,
  MapPin, Search, Folder, Info, Eye, ShieldAlert as ShieldAlertIcon, UserCheck,
  CloudDownload, Building2, Send
} from "lucide-react";
import Link from "next/link";
import { campRegistrationApi, RegistrationBatch, CampRegistration } from "@/lib/api/camp-registration";
import { locationsApi, Wilaya, Municipality } from "@/lib/api/locations";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { OdooSearch } from "@/components/odoo/OdooSearch";
import { getApiBaseUrl, getErrorMessage } from "@/lib/api/client";
import { institutionsApi } from "@/lib/api/institutions";
import type { YouthInstitution } from "@/lib/api/institutions";
import { useAuthStore } from "@/lib/stores/auth";

import { PermissionGuard } from "@/hooks/useRequirePermission";

/** تحويل مسار MinIO النسبي أو اسم الملف إلى URL كامل عبر الـ backend proxy */
function getStorageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:")) return path;
  // Use backend /storage/ proxy
  const base = getApiBaseUrl().replace('/api/v1', '');
  return `${base}/storage/${path}`;
}


const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; gradient: string; icon: any }> = {
  pending: { label: "في الانتظار", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", gradient: "from-amber-500 to-orange-500", icon: Clock },
  processing: { label: "قيد المعالجة", color: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500", gradient: "from-sky-500 to-blue-500", icon: Loader2 },
  success: { label: "ناجح", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", gradient: "from-emerald-500 to-green-500", icon: CheckCircle },
  failed: { label: "فشل", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", gradient: "from-red-500 to-rose-500", icon: XCircle },
  error: { label: "خطأ", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", gradient: "from-red-500 to-rose-500", icon: AlertCircle },
  completed: { label: "مكتمل", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", gradient: "from-emerald-500 to-teal-500", icon: CheckCircle },
};

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();
  const batchId = params.id as string;
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [batch, setBatch] = useState<RegistrationBatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChild, setEditingChild] = useState<CampRegistration | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editResidenceCommune, setEditResidenceCommune] = useState('');
  const [editPhotoPath, setEditPhotoPath] = useState('');
  const [editCertPath, setEditCertPath] = useState('');

  const [movingChild, setMovingChild] = useState<CampRegistration | null>(null);
  const [targetBatchId, setTargetBatchId] = useState("");
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [isMoving, setIsMoving] = useState(false);

  // Search, Filter and Grouping state for Children List
  const [childSearch, setChildSearch] = useState("");
  const [childFilters, setChildFilters] = useState<Record<string, any>>({});
  const [childGroup, setChildGroup] = useState<string | null>(null);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());

  // Smart Import state
  const [showSmartImportModal, setShowSmartImportModal] = useState(false);
  const [smartImportDir, setSmartImportDir] = useState('');
  const [isSmartImporting, setIsSmartImporting] = useState(false);

  // Batch edit state
  const [isEditingBatch, setIsEditingBatch] = useState(false);
  const [editBatchName, setEditBatchName] = useState('');
  const [editBatchDescription, setEditBatchDescription] = useState('');
  const [editHeadlessMode, setEditHeadlessMode] = useState(false);
  const [editRegistrationMethod, setEditRegistrationMethod] = useState('api');
  const [editDelay, setEditDelay] = useState(5);

  // Locations state
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loadingWilayas, setLoadingWilayas] = useState(false);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isSyncingFromMinistry, setIsSyncingFromMinistry] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    message: string;
    total_children: number;
    processed: number;
    photos_downloaded: number;
    certificates_downloaded: number;
    receipts_downloaded: number;
    errors: string[];
    skipped: number;
  } | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registeringChildId, setRegisteringChildId] = useState<string | null>(null);
  const [reExtractingChildId, setReExtractingChildId] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = () => {
  stopPolling();
  pollingRef.current = setInterval(() => {
  loadBatch();
  }, 4000);
  setTimeout(() => stopPolling(), 60000);
  };

  const stopPolling = () => {
  if (pollingRef.current) {
  clearInterval(pollingRef.current);
  pollingRef.current = null;
  }
  };


  // تنظيف التحديث الدوري عند مغادرة الصفحة
  useEffect(() => {
    return () => stopPolling();
  }, []);


  const [registerResult, setRegisterResult] = useState<{
    message: string;
    total: number;
    success: number;
    failed: number;
    already_registered: number;
    errors: string[];
    details: Array<{
      child_name: string;
      status: string;
      receipt_token?: string;
      error?: string;
      message?: string;
    }>;
  } | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);

  // Institutions state for batch editing
  const [institutions, setInstitutions] = useState<YouthInstitution[]>([]);
  const [selectedEditInstitutionId, setSelectedEditInstitutionId] = useState<string>("");
  const [editForceCampOnMemberFail, setEditForceCampOnMemberFail] = useState(false);

  // Create batch from selected children state
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDescription, setNewBatchDescription] = useState('');
  const [newBatchInstitutionId, setNewBatchInstitutionId] = useState('');
  const [newBatchForceCamp, setNewBatchForceCamp] = useState(false);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);

  // Scan Upload state
  const [showScanUpload, setShowScanUpload] = useState(false);
  const [scanFolderName, setScanFolderName] = useState('');
  const [scanPhoto, setScanPhoto] = useState<File | null>(null);
  const [scanCert, setScanCert] = useState<File | null>(null);
  const [scanGuardianId, setScanGuardianId] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);

  // Child Files Viewer state
  const [filesChild, setFilesChild] = useState<CampRegistration | null>(null);
  const [childFiles, setChildFiles] = useState<{ name: string; path: string; size: number | null; last_modified: string | null; url: string }[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  
  // File Picker state (اختيار من المجلد)
  const [filePickerMode, setFilePickerMode] = useState<'photo' | 'certificate' | null>(null);
  const [pickerFiles, setPickerFiles] = useState<{ name: string; path: string; size: number | null; last_modified: string | null; url: string }[]>([]);
  const [isLoadingPicker, setIsLoadingPicker] = useState(false);

  useEffect(() => {
    if (editingChild) {
      setEditAddress(editingChild.address || '');
      setEditResidenceCommune(editingChild.residence_commune || '');
      setEditPhotoPath(editingChild.child_photo_path || '');
      setEditCertPath(editingChild.birth_certificate_path || '');

      // Fetch municipalities for the editing child's wilayas if not already loaded
      if (editingChild.birth_wilaya) {
        fetchMunicipalities(editingChild.birth_wilaya);
      }
      if (editingChild.residence_wilaya) {
        fetchMunicipalities(editingChild.residence_wilaya);
      }
    } else {
      setEditAddress('');
      setEditResidenceCommune('');
      setEditPhotoPath('');
      setEditCertPath('');
    }
  }, [editingChild]);

  // Resolve commune names to UUIDs when municipalities are loaded
  useEffect(() => {
    if (editingChild) {
      let updated = false;
      let newEditingChild = { ...editingChild };

      if (newEditingChild.birth_commune && !newEditingChild.birth_commune.includes('-') && newEditingChild.birth_wilaya) {
        const found = municipalities.find(m => m.name_ar === newEditingChild.birth_commune && m.wilaya_code === newEditingChild.birth_wilaya);
        if (found) {
          newEditingChild.birth_commune = found.id;
          updated = true;
        }
      }

      if (newEditingChild.residence_commune && !newEditingChild.residence_commune.includes('-') && newEditingChild.residence_wilaya) {
        const found = municipalities.find(m => m.name_ar === newEditingChild.residence_commune && m.wilaya_code === newEditingChild.residence_wilaya);
        if (found) {
          newEditingChild.residence_commune = found.id;
          updated = true;
        }
      }

      if (updated) {
        setEditingChild(newEditingChild);
      }
    }
  }, [municipalities, editingChild]);

  useEffect(() => {
    const fetchWilayas = async () => {
      try {
        setLoadingWilayas(true);
        const data = await locationsApi.getWilayas();
        setWilayas(data);

        // Pre-load M'sila and Bousaada as they are commonly used
        const [msilaMunicipalities, bousaadaMunicipalities] = await Promise.all([
          locationsApi.getMunicipalities("28"),
          locationsApi.getMunicipalities("68")
        ]);
        setMunicipalities(prev => {
          const existing = new Map(prev.map(m => [m.id, m]));
          [...msilaMunicipalities, ...bousaadaMunicipalities].forEach(m => existing.set(m.id, m));
          return Array.from(existing.values());
        });
      } catch (error) {
        console.error("Failed to fetch wilayas", error);
      } finally {
        setLoadingWilayas(false);
      }
    };

    const fetchInstitutions = async () => {
      try {
        const instRes = await institutionsApi.getAll({ size: 200, sector: 'YOUTH' });
        setInstitutions(instRes.items || []);
      } catch (e) {
        console.error("Failed to fetch institutions", e);
      }
    };

    fetchWilayas();
    fetchInstitutions();
  }, []);

  const fetchMunicipalities = async (wilayaCode: string) => {
    if (!wilayaCode) return;
    const targetCode = parseInt(wilayaCode, 10);
    const currentMunicipalities = municipalities.filter(m => parseInt(m.wilaya_code, 10) === targetCode);

    if (currentMunicipalities.length === 0) {
      try {
        setLoadingMunicipalities(true);
        const data = await locationsApi.getMunicipalities(wilayaCode);
        setMunicipalities(prev => {
          const existing = new Map(prev.map(m => [m.id, m]));
          data.forEach(m => existing.set(m.id, m));
          return Array.from(existing.values());
        });
      } catch (error) {
        console.error("Failed to fetch municipalities", error);
      } finally {
        setLoadingMunicipalities(false);
      }
    }
  };

  const getMunicipalityOptions = (wilayaCode: string) => {
    if (!wilayaCode) return [];
    const targetCode = parseInt(wilayaCode, 10);
    return municipalities
      .filter(m => parseInt(m.wilaya_code, 10) === targetCode)
      .map(m => ({ value: m.id, label: m.name_ar }));
  };

  const wilayaOptions = wilayas.map(w => ({
    value: w.code,
    label: `${w.code} - ${w.name_ar}`
  }));

  useEffect(() => {
    loadBatch();
  }, [batchId]);

  // Read live mode from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('live') === 'true') {
        setIsLiveMode(true);
      }
    }
  }, []);

  // Auto-polling when batch is processing or in Live Mode
  useEffect(() => {
    let interval: any;
    
    const hasPending = batch?.children?.some(c => c.status === "pending" || c.status === "processing");

    if (isLiveMode || hasPending || (batch && batch.status?.toUpperCase() === 'PROCESSING')) {
      interval = setInterval(() => {
        loadBatch();
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [batch?.status, batch?.children, batchId, isLiveMode]);

  const loadBatch = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await campRegistrationApi.getBatch(batchId);
      const newData = res.data;

      setBatch(prev => {
        if (!prev) return newData;

        let childrenChanged = false;
        
        if ((prev.children?.length || 0) !== (newData.children?.length || 0)) {
          childrenChanged = true;
        }

        // دمج ذكي للأطفال للحفاظ على استقرار القائمة
        const updatedChildren = (newData.children || []).map((newChild: any) => {
          const oldChild = (prev.children || []).find((c: any) => c.id === newChild.id);
          // إذا لم يتغير شيء في هذا الطفل، نحتفظ بالمرجع القديم للحفاظ على استقرار React
          if (oldChild && JSON.stringify(oldChild) === JSON.stringify(newChild)) {
            return oldChild;
          }
          childrenChanged = true;
          return newChild;
        });

        // تحديث الإحصائيات والحالة العامة فقط إذا تغيرت
        if (prev.status !== newData.status ||
          prev.name !== newData.name ||
          prev.description !== newData.description ||
          prev.institution_id !== newData.institution_id ||
          prev.registration_method !== newData.registration_method ||
          prev.headless_mode !== newData.headless_mode ||
          prev.delay_between_registrations !== newData.delay_between_registrations ||
          prev.force_camp_on_member_fail !== newData.force_camp_on_member_fail ||
          prev.processed_count !== newData.processed_count ||
          prev.success_count !== newData.success_count ||
          prev.failed_count !== newData.failed_count ||
          prev.total_children !== newData.total_children ||
          childrenChanged) {

          return { ...newData, children: updatedChildren };
        }
        
        return prev;
      });

      // Load municipalities for all wilayas referenced by children (for stats)
      if (res.data.children && res.data.children.length > 0) {
        const wilayaCodes = new Set<string>();
        res.data.children.forEach((c: any) => {
          if (c.residence_wilaya) wilayaCodes.add(c.residence_wilaya.split(' - ')[0].trim());
          if (c.birth_wilaya) wilayaCodes.add(c.birth_wilaya.split(' - ')[0].trim());
        });

        // Only fetch wilayas not already loaded
        const loadedCodes = new Set(municipalities.map(m => m.wilaya_code));
        const missing = [...wilayaCodes].filter(code => !loadedCodes.has(code));

        if (missing.length > 0) {
          const results = await Promise.all(missing.map(code => locationsApi.getMunicipalities(code).catch(() => [])));
          setMunicipalities(prev => [...prev, ...results.flat()]);
        }
      }
    } catch (error) {
      toast.error("فشل في تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEditBatch = () => {
    if (!batch) return;
    setEditBatchName(batch.name);
    setEditBatchDescription(batch.description || '');
    setEditHeadlessMode(batch.headless_mode);
    setEditRegistrationMethod(batch.registration_method || 'api');
    setEditDelay(batch.delay_between_registrations || 5);
    setSelectedEditInstitutionId(batch.institution_id || '');
    setEditForceCampOnMemberFail(batch.force_camp_on_member_fail || false);
    setIsEditingBatch(true);
  };

  const handleSaveBatch = async () => {
    try {
      await campRegistrationApi.updateBatch(batchId, {
        name: editBatchName,
        description: editBatchDescription,
        registration_method: editRegistrationMethod,
        headless_mode: editHeadlessMode,
        delay_between_registrations: editDelay,
        institution_id: selectedEditInstitutionId || undefined,
        force_camp_on_member_fail: editForceCampOnMemberFail,
      });
      toast.success("تم تحديث معلومات الدفعة بنجاح");
      setIsEditingBatch(false);
      loadBatch();
    } catch (error) {
      toast.error("فشل في تحديث معلومات الدفعة");
    }
  };

  const handleStart = async () => {
    setIsProcessing(true);
    try {
      const isApiMethod = batch?.registration_method !== 'bot';
      // If it's API, run internally on the server. If bot, wait for external worker.
      await campRegistrationApi.startBatch(batchId, !isApiMethod);
      toast.success("تم بدء المعالجة");

      if (isApiMethod) {
        toast.info("تم تفعيل التسجيل المباشر (API) على الخادم. جاري المتابعة الحية...");
        setIsLiveMode(true);
      } else {
        // تشغيل البوت المحلي عبر بروتوكول djs-bot:// فقط إذا لم يكن API
        try {
          const headless = batch?.headless_mode ? "true" : "false";
          const workers = batch?.delay_between_registrations || 1;
          const email = localStorage.getItem('default_email') || '';
          window.location.href = `djs-bot://start?headless=${headless}&workers=${workers}&email=${email}`;
          setIsLiveMode(true);
          toast.info("تم طلب تشغيل البوت المحلي. جاري المتابعة الحية...");
        } catch {
          // البوت المحلي غير مثبت - لا مشكلة، المعالجة ستبدأ من الخادم
        }
      }

      loadBatch();
    } catch (error) {
      toast.error("فشل في بدء المعالجة");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestartAll = async () => {
    if (!confirm("هل أنت متأكد من إعادة تشغيل جميع الأطفال في الدفعة؟")) return;

    setIsProcessing(true);
    try {
      const isApiMethod = batch?.registration_method !== 'bot';
      await campRegistrationApi.restartBatch(batchId, undefined, !isApiMethod);
      toast.success("تم إعادة تشغيل الدفعة بالكامل");
      
      if (!isApiMethod) {
        try {
          const headless = batch?.headless_mode ? "true" : "false";
          const workers = batch?.delay_between_registrations || 1;
          const email = localStorage.getItem('default_email') || '';
          window.location.href = `djs-bot://start?headless=${headless}&workers=${workers}&email=${email}`;
        } catch {}
      }
      
      loadBatch();
    } catch (error) {
      toast.error("فشل في إعادة التشغيل");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestartFailed = async () => {
    setIsProcessing(true);
    try {
      const isApiMethod = batch?.registration_method !== 'bot';
      await campRegistrationApi.restartBatch(batchId, ['failed', 'error', 'pending'], !isApiMethod);
      toast.success("تم إعادة محاولة الأطفال الفاشلين");
      
      if (!isApiMethod) {
        try {
          const headless = batch?.headless_mode ? "true" : "false";
          const workers = batch?.delay_between_registrations || 1;
          const email = localStorage.getItem('default_email') || '';
          window.location.href = `djs-bot://start?headless=${headless}&workers=${workers}&email=${email}`;
        } catch {}
      }
      
      loadBatch();
    } catch (error) {
      toast.error("فشل في إعادة المحاولة");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestartByStatus = async (statuses: string[], label: string) => {
    setIsProcessing(true);
    try {
      const isApiMethod = batch?.registration_method !== 'bot';
      await campRegistrationApi.restartBatch(batchId, statuses, !isApiMethod);
      toast.success(`تم بدء معالجة ${label}`);
      
      if (!isApiMethod) {
        try {
          const headless = batch?.headless_mode ? "true" : "false";
          const workers = batch?.delay_between_registrations || 1;
          const email = localStorage.getItem('default_email') || '';
          window.location.href = `djs-bot://start?headless=${headless}&workers=${workers}&email=${email}`;
        } catch {}
      }
      
      loadBatch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل في بدء المعالجة");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopBatch = async () => {
    if (!confirm("هل أنت متأكد من إيقاف المعالجة؟")) return;
    try {
      await campRegistrationApi.stopBatch(batchId);
      toast.success("تم إيقاف المعالجة");
      loadBatch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل في إيقاف المعالجة");
    }
  };

  // Load batches when move modal opens
  useEffect(() => {
    if (movingChild && availableBatches.length === 0) {
      campRegistrationApi.listBatches({ page_size: 100 }).then(res => {
        // Filter out current batch and only keep non-processing batches
        setAvailableBatches(res.data.items.filter((b: any) => b.id !== batchId && b.status !== 'processing'));
      }).catch(() => {
        toast.error("فشل في تحميل الدفعات");
      });
    }
  }, [movingChild, availableBatches.length, batchId]);

  const handleMoveChild = async () => {
    if (!targetBatchId) {
      toast.error("يرجى اختيار دفعة الوجهة");
      return;
    }

    setIsMoving(true);
    try {
      await campRegistrationApi.moveChild(batchId, movingChild!.id, targetBatchId);
      toast.success("تم نقل الطفل بنجاح");
      setMovingChild(null);
      setTargetBatchId("");
      loadBatch(); // Reload the current batch
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "فشل في نقل الطفل");
    } finally {
      setIsMoving(false);
    }
  };

  const handleUpdateStatus = async (childId: string, newStatus: string) => {
    try {
      await campRegistrationApi.updateChildStatus(batchId, childId, newStatus);
      toast.success("تم تحديث الحالة بنجاح");
      loadBatch();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "فشل في تحديث الحالة");
    }
  };

  const handleExport = async (statusFilter?: string) => {
    try {
      const response = await campRegistrationApi.exportBatch(batchId, statusFilter);

      const statusLabel = statusFilter ? `_${statusFilter}` : '';
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `camp_registration_${batchId}${statusLabel}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("تم تصدير الملف بنجاح");
      setShowExportMenu(false);
    } catch (error) {
      toast.error("فشل في تصدير الملف");
    }
  };

  const handleExportSelected = () => {
    if (!batch?.children || selectedForExport.size === 0) {
      toast.error("يرجى تحديد الأطفال أولاً");
      return;
    }

    const selected = batch.children.filter(c => selectedForExport.has(c.id));
    const headers = ['child_first_name', 'child_last_name', 'birth_date', 'gender', 'status', 'parent_first_name', 'parent_last_name', 'parent_phone', 'receipt_token', 'error_message'];
    const rows = selected.map(c => [
      c.child_first_name, c.child_last_name, c.birth_date, c.gender || '', c.status || '',
      c.parent_first_name || '', c.parent_last_name || '', c.parent_phone || '', c.receipt_token || '', c.error_message || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `camp_custom_export_${selectedForExport.size}_children.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success(`تم تصدير ${selectedForExport.size} طفل بنجاح`);
    setShowExportMenu(false);
  };

  const toggleSelectChild = (childId: string) => {
    setSelectedForExport(prev => {
      const next = new Set(prev);
      if (next.has(childId)) next.delete(childId);
      else next.add(childId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!batch?.children) return;
    if (selectedForExport.size === batch.children.length) {
      setSelectedForExport(new Set());
    } else {
      setSelectedForExport(new Set(batch.children.map(c => c.id)));
    }
  };

  const handleCreateBatchFromSelected = async () => {
    if (!batch?.children) return;
    const selected = batch.children.filter(c => selectedForExport.has(c.id));
    if (selected.length === 0) {
      toast.error("لم يتم تحديد أي أطفال");
      return;
    }
    if (!newBatchName.trim()) {
      toast.error("الرجاء إدخال اسم الدفعة");
      return;
    }

    setIsCreatingBatch(true);
    try {
      const response = await campRegistrationApi.createBatchFromChildren({
        child_ids: Array.from(selectedForExport),
        name: newBatchName.trim(),
        description: newBatchDescription.trim() || undefined,
        institution_id: newBatchInstitutionId || undefined,
        force_camp_on_member_fail: newBatchForceCamp,
        registration_method: batch.registration_method,
        headless_mode: batch.headless_mode,
        delay_between_registrations: batch.delay_between_registrations,
        default_directory: batch.default_directory,
        default_wilaya: batch.default_wilaya,
        default_commune: batch.default_commune,
      });
      const newBatch = response.data;
      toast.success(`تم إنشاء الدفعة "${newBatch.name}" بنجاح مع ${selected.length} طفل`);
      setShowCreateBatchModal(false);
      setSelectedForExport(new Set());
      setNewBatchName('');
      setNewBatchDescription('');
      // التوجيه إلى الدفعة الجديدة
      router.push(`/camp-registration/${newBatch.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "فشل إنشاء الدفعة");
    } finally {
      setIsCreatingBatch(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("يجب أن يكون الملف بصيغة CSV");
      return;
    }

    setIsImporting(true);
    try {
      const result = await campRegistrationApi.importBatch(batchId, file, skipDuplicates);
      toast.success(result.data.message);

      if (result.data.errors && result.data.errors.length > 0) {
        console.warn("Import errors:", result.data.errors);
        toast.warning(`تم استيراد ${result.data.successful} مع ${result.data.failed} خطأ`);
      }

      loadBatch();
    } catch (error) {
      toast.error("فشل في استيراد الملف");
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteChild = async (childId: string, childName: string) => {
    if (!confirm(`هل أنت متأكد من حذف "${childName}"؟`)) return;

    try {
      await campRegistrationApi.deleteChild(batchId, childId);
      toast.success("تم حذف الطفل بنجاح");
      loadBatch();
    } catch (error) {
      toast.error("فشل في حذف الطفل");
    }
  };

  const checkDatabaseDuplicate = async (firstName: string, lastName: string, birthDate: string, childId?: string) => {
    try {
      const res = await campRegistrationApi.checkDuplicate(firstName, lastName, birthDate, childId);
      if (res.data.is_duplicate && res.data.child) {
        toast.warning(`تنبيه: الطفل مسجل مسبقاً في الدفعة: "${res.data.child.batch_name}"`, {
          description: `تاريخ الإنشاء: ${new Date(res.data.child.created_at).toLocaleDateString('ar-DZ')}`,
          duration: 10000,
        });
      }
    } catch (error) {
      console.error("Duplicate check failed", error);
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLFormElement>) => {
    if (!editingChild) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const firstName = formData.get('child_first_name') as string;
    const lastName = formData.get('child_last_name') as string;
    const birthDate = formData.get('birth_date') as string;

    if (firstName && lastName && birthDate) {
      checkDatabaseDuplicate(firstName, lastName, birthDate, editingChild.id);
    }
  };

  const openFilePicker = async (mode: 'photo' | 'certificate') => {
    if (!editingChild) return;
    setIsLoadingPicker(true);
    setFilePickerMode(mode);
    try {
      const res = await campRegistrationApi.getChildFiles(batchId, editingChild.id);
      setPickerFiles(res.data.files);
      if (res.data.files.length === 0) {
        toast.info("لا توجد ملفات في مجلد هذا الطفل، قم برفع الملفات أولاً");
        setFilePickerMode(null);
      }
    } catch {
      toast.error("فشل في تحميل ملفات الطفل");
      setFilePickerMode(null);
    } finally {
      setIsLoadingPicker(false);
    }
  };

  const handleChangeBatchStatus = async (newStatus: string) => {
    try {
      await campRegistrationApi.updateBatch(batchId, { status: newStatus } as any);
      toast.success("تم تغيير حالة الدفعة");
      loadBatch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل في تغيير الحالة");
    }
  };

  const handleSyncFromMinistry = async () => {
    if (!confirm("هل أنت متأكد من بدء مزامنة الملفات من المنصة الوزارية؟ سيتم تحميل الصور والشهادات والإيصالات للأطفال الذين لديهم رمز إيصال.")) return;

    setIsSyncingFromMinistry(true);
    setSyncResult(null);
    try {
      const res = await campRegistrationApi.syncBatchFromMinistry(batchId);
      setSyncResult(res.data);
      if (res.data.errors.length > 0) {
        toast.warning(`تمت المزامنة مع ${res.data.errors.length} أخطاء`);
      } else {
        toast.success(res.data.message);
      }
      loadBatch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشلت المزامنة مع المنصة الوزارية");
    } finally {
      setIsSyncingFromMinistry(false);
    }
  };

  const handleRegisterToMinistry = async () => {
    if (!confirm("هل أنت متأكد من تسجيل جميع الأطفال غير المسجلين في منصة الوزارة؟")) return;

    setIsRegistering(true);
    setRegisterResult(null);
    try {
      const res = await campRegistrationApi.registerToMinistry(batchId);
      setRegisterResult(res.data);
      const msg = res.data.message;
      if (res.data.failed > 0) {
        toast.warning(msg || `${res.data.success} نجاح، ${res.data.failed} فشل`);
      } else {
        toast.success(msg || `✅ تم تسجيل ${res.data.success} طفل بنجاح`);
      }
      loadBatch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل التسجيل في منصة الوزارة");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRegisterSingleChild = async (child: CampRegistration) => {
    if (child.receipt_token) {
      toast.info("الطفل مسجل مسبقاً ولديه رقم وزاري.");
      return;
    }
    setRegisteringChildId(child.id);
    try {
      const res = await campRegistrationApi.registerToMinistry(batchId, child.id);
      if (res.data.success > 0) {
        toast.success(res.data.message || `✅ تم تسجيل ${child.child_first_name} بنجاح`);
      } else if (res.data.failed > 0) {
        toast.error(res.data.details?.[0]?.error || res.data.errors?.[0] || "فشل التسجيل في منصة الوزارة");
      } else if (res.data.already_registered > 0) {
        toast.info("الطفل مسجل مسبقاً في المنصة الوزارية");
      }
      loadBatch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل التسجيل في منصة الوزارة");
    } finally {
      setRegisteringChildId(null);
    }
  };

  const handleMigrateToMinio = async () => {
    if (!confirm("هل أنت متأكد من ترحيل كافة الملفات المحلية لهذه الدفعة إلى تخزين MinIO السحابي؟ (قد تستغرق العملية بعض الوقت)")) return;

    setIsMigrating(true);
    try {
      const res = await campRegistrationApi.migrateFilesToMinio(batchId);
      toast.success(res.data.message || "تم ترحيل الملفات بنجاح!");
      if (res.data.errors && res.data.errors.length > 0) {
        console.warn("Migration warnings/errors:", res.data.errors);
        toast.warning(`تم ترحيل بعض الوثائق مع وجود بعض التنبيهات. يرجى مراجعة سجلات المتصفح لمزيد من التفاصيل.`);
      }
      loadBatch();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "فشل ترحيل الملفات السحابية");
    } finally {
      setIsMigrating(false);
    }
  };

  if (isLoading) {

    return (

            <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <p className="text-lg">الدفعة غير موجودة</p>
        <Link href="/camp-registration">
          <Button className="mt-4">العودة للقائمة</Button>
        </Link>
      </div>
    );
  }

  const batchStatusConfig = STATUS_CONFIG[batch.status] || STATUS_CONFIG.pending;
  const BatchStatusIcon = batchStatusConfig.icon;

  const locale = (params?.locale as string) || 'ar';

  const getAge = (birthDate: string) => {
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const month = today.getMonth() - birthDateObj.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  };

  const getAgeGroup = (age: number) => {
    if (age < 6) return 'under_6';
    if (age <= 14) return '6-14';
    if (age <= 17) return '15-17';
    return 'over_17';
  };

  let processedChildren = batch.children || [];

  if (childSearch) {
    const q = childSearch.toLowerCase();
    processedChildren = processedChildren.filter(c =>
      c.child_first_name.toLowerCase().includes(q) ||
      c.child_last_name.toLowerCase().includes(q) ||
      (c.parent_first_name && c.parent_first_name.toLowerCase().includes(q)) ||
      (c.parent_last_name && c.parent_last_name.toLowerCase().includes(q))
    );
  }

  if (childFilters.gender && childFilters.gender.length > 0) {
    processedChildren = processedChildren.filter(c =>
      childFilters.gender.includes(c.gender)
    );
  }

  if (childFilters.age_group && childFilters.age_group.length > 0) {
    processedChildren = processedChildren.filter(c =>
      childFilters.age_group.includes(getAgeGroup(getAge(c.birth_date)))
    );
  }

  if (childFilters.residence_commune && childFilters.residence_commune.length > 0) {
    processedChildren = processedChildren.filter(c =>
      childFilters.residence_commune.includes(c.residence_commune)
    );
  }

  if (childFilters.status && childFilters.status.length > 0) {
    processedChildren = processedChildren.filter(c =>
      childFilters.status.includes(c.status)
    );
  }

  // الترتيب الأبجدي حسب اسم الصورة/المجلد ثم اللقب
  processedChildren = [...processedChildren].sort((a, b) => {
    const folderA = (a.child_photo_path?.replace(/\.[^.]+$/, '') || '').toLowerCase();
    const folderB = (b.child_photo_path?.replace(/\.[^.]+$/, '') || '').toLowerCase();
    if (folderA && folderB) return folderA.localeCompare(folderB);
    if (folderA) return -1;
    if (folderB) return 1;
    return (a.child_last_name || '').localeCompare(b.child_last_name || '', 'ar');
  });

  const childSearchFilters = [
    {
      id: 'gender',
      label: 'الجنس',
      type: 'multiselect' as const,
      options: [
        { label: 'ذكر', value: 'MALE' },
        { label: 'أنثى', value: 'FEMALE' }
      ],
    },
    {
      id: 'age_group',
      label: 'الفئة العمرية',
      type: 'multiselect' as const,
      options: [
        { label: 'أقل من 6 سنوات', value: 'under_6' },
        { label: '6 - 14 سنة', value: '6-14' },
        { label: '15 - 17 سنة', value: '15-17' },
        { label: 'فوق 17 سنة', value: 'over_17' }
      ],
    },
    {
      id: 'residence_commune',
      label: 'بلدية الإقامة',
      type: 'multiselect' as const,
      options: Array.from(new Set((batch.children || []).map(c => c.residence_commune).filter((v): v is string => !!v))).map(communeId => {
        const mun = municipalities.find(m => m.id === communeId);
        return {
          label: mun ? (locale === 'ar' ? mun.name_ar || communeId : mun.name_fr || mun.name_ar || communeId) : communeId,
          value: communeId
        };
      })
    },
    {
      id: 'status',
      label: 'الحالة',
      type: 'multiselect' as const,
      options: [
        { label: 'في الانتظار', value: 'pending' },
        { label: 'قيد المعالجة', value: 'processing' },
        { label: 'ناجح', value: 'success' },
        { label: 'فشل', value: 'failed' },
        { label: 'خطأ', value: 'error' }
      ],
    }
  ];

  const childGroupByOptions = [
    { id: "gender", label: "الجنس" },
    { id: "age_group", label: "الفئة العمرية" },
    { id: "residence_commune", label: "بلدية الإقامة" },
    { id: "status", label: "الحالة" }
  ];

  let groupedChildren: Record<string, CampRegistration[]> | null = null;
  if (childGroup) {
    const grouped: Record<string, CampRegistration[]> = {};
    processedChildren.forEach(child => {
      let groupKey = "غير محدد";
      if (childGroup === "gender") {
        const genderLabels: Record<string, string> = { 'MALE': 'ذكر', 'FEMALE': 'أنثى' };
        groupKey = child.gender ? (genderLabels[child.gender] || child.gender) : "غير محدد";
      }
      else if (childGroup === "age_group") groupKey = getAgeGroup(getAge(child.birth_date));
      else if (childGroup === "residence_commune") {
        const mun = municipalities.find(m => m.id === child.residence_commune);
        groupKey = mun ? (locale === 'ar' ? mun.name_ar : mun.name_fr || mun.name_ar) : (child.residence_commune || "غير محدد");
      }
      else if (childGroup === "status") {
        groupKey = STATUS_CONFIG[child.status]?.label || child.status;
      }

      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(child);
    });
    groupedChildren = grouped;
  }

  const renderChildItem = (child: CampRegistration, index: number, originalIndex?: number) => {
    const statusKey = (child.status || 'pending').toLowerCase();
    const childStatusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.pending;
    const ChildStatusIcon = childStatusConfig.icon;
    const displayIndex = originalIndex !== undefined ? originalIndex : index;

    return (
      <div
        key={child.id}
        className="group relative overflow-hidden rounded-xl border bg-white shadow-sm hover:shadow-md transition-all duration-200"
      >
        {/* Left color accent */}
        <div className={`absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b ${childStatusConfig.gradient} opacity-60`} />

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Top row: checkbox + name + status */}
              <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                <label className="flex items-center justify-center w-5 h-5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedForExport.has(child.id)}
                    onChange={() => toggleSelectChild(child.id)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </label>
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{displayIndex + 1}</span>
                <h3 className="font-bold text-slate-800 truncate">{child.child_last_name} {child.child_first_name}</h3>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${childStatusConfig.color}`}>
                  <ChildStatusIcon className="w-3 h-3" />
                  {childStatusConfig.label}
                </span>
                {hasPermission('camp_registration', 'edit') && child.status !== 'processing' && (
                  <select
                    value={child.status}
                    onChange={(e) => handleUpdateStatus(child.id, e.target.value)}
                    className="text-[10px] border border-slate-200 rounded-md px-1.5 py-1 bg-transparent outline-none cursor-pointer hover:border-slate-300 transition-colors"
                    title="تغيير حالة الطفل"
                  >
                    <option value="pending">إلى: منتظر</option>
                    <option value="success">إلى: ناجح</option>
                    <option value="failed">إلى: فاشل</option>
                    <option value="error">إلى: خطأ</option>
                  </select>
                )}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span dir="ltr" className="text-left">{child.birth_date}</span>
                </div>

                {child.gender && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="text-slate-400">
                      {child.gender === 'MALE' || child.gender === 'ذكر' ? '♂' : '♀'}
                    </span>
                    <span>{child.gender === 'MALE' ? 'ذكر' : child.gender === 'FEMALE' ? 'أنثى' : child.gender}</span>
                  </div>
                )}

                {child.parent_phone && (
                  <div className="flex items-center gap-1.5 text-slate-600" dir="ltr">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-left">{child.parent_phone}</span>
                  </div>
                )}

                {child.parent_first_name && (
                  <div className="flex items-center gap-1.5 text-slate-600 truncate">
                    <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{child.parent_first_name} {child.parent_last_name}</span>
                  </div>
                )}

                {child.parent_email && (
                  <div className="flex items-center gap-1.5 text-slate-600 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate text-xs">{child.parent_email}</span>
                  </div>
                )}

                {child.unified_member_number && (
                  <div className="flex items-center gap-1.5 text-slate-600 truncate" dir="ltr">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate text-xs font-mono text-left" title="رقم الانخراط الموحد">{child.unified_member_number}</span>
                  </div>
                )}

                {child.child_photo_path && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center text-xs">📷</span>
                    <span className="truncate text-xs text-slate-500">{child.child_photo_path.split('/').pop()}</span>
                  </div>
                )}
              </div>

              {/* Error message */}
              {child.error_message && (
                <div className="mt-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{child.error_message}</span>
                </div>
              )}

              {/* Receipt token (رقم وصل التسجيل) */}
              {child.receipt_token && (
                <div className="mt-3 flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-800">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span className="font-semibold">رقم وصل التسجيل:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200" dir="ltr" style={{ unicodeBidi: 'plaintext' }}>
                    {child.receipt_token}
                  </span>
                </div>
              )}

              {/* Force Registration Info */}
              {child.force_registration && (
                <>
                  <div className="col-span-full border-t border-red-200 pt-3 mt-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" /></svg>
                      {t('camp-registration.force_registered')}
                    </span>
                  </div>
                  {child.force_registered_first_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <ShieldAlertIcon className="w-4 h-4 text-red-500" />
                      <span className="text-gray-500">{t('camp-registration.force_registered_first_name')}:</span>
                      <span className="font-mono text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded" dir="ltr">{child.force_registered_first_name}</span>
                      <span className="text-[10px] text-gray-400 italic">(UNICODE: {child.force_registered_first_name.split('').map(c => 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ')})</span>
                    </div>
                  )}
                  {child.force_registered_last_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <ShieldAlertIcon className="w-4 h-4 text-red-500" />
                      <span className="text-gray-500">{t('camp-registration.force_registered_last_name')}:</span>
                      <span className="font-mono text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">{child.force_registered_last_name}</span>
                    </div>
                  )}
                  {child.force_registered_number && !String(child.force_registered_number).startsWith('RCPT-') && (
                    <div className="flex items-center gap-2 text-sm">
                      <ShieldAlertIcon className="w-4 h-4 text-green-500" />
                      <span className="text-gray-500">{t('camp-registration.force_registered_number')}:</span>
                      <span className="font-mono text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">{child.force_registered_number}</span>
                    </div>
                  )}
                  <div className="col-span-full bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700">
                    <p>{t('camp-registration.force_registered_info')}</p>
                  </div>
                </>
              )}

              {/* رابط المنخرط */}
              {child.member_id && (
                <div className="mt-3 flex items-center gap-1 text-xs text-blue-600">
                  <UserCheck className="w-3 h-3" />
                  <Link
                    href={`/${locale}/members/${child.member_id}`}
                    className="hover:underline"
                  >
                    {t('camp-registration.view_member')}
                  </Link>
                </div>
              )}

              {/* Screenshot link & processed time */}
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                {child.screenshot_path && (
                  <a
                    href={getStorageUrl(child.screenshot_path) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-full transition-colors"
                  >
                    <Camera className="w-3 h-3" />
                    النتيجة النهائية
                  </a>
                )}
                {child.processed_at && (
                  <span className="text-[10px] text-slate-400">
                    معالج: {new Date(child.processed_at).toLocaleString('ar-DZ')}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-row gap-1.5 flex-shrink-0">
              {child.status !== 'processing' && (
                <>
                  <Link href={`/camp-registration/child/${child.id}`}>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" title="تفاصيل الطفل">
                      <User className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href={`/camp-registration/${batchId}/screenshots?childId=${child.id}`}>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-sky-600 hover:bg-sky-50" title="لقطات الشاشة">
                      <Camera className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-violet-600 hover:bg-violet-50" onClick={async () => {
                    setFilesChild(child);
                    setIsLoadingFiles(true);
                    try {
                      const res = await campRegistrationApi.getChildFiles(batchId, child.id);
                      setChildFiles(res.data.files);
                    } catch {
                      toast.error('فشل في تحميل ملفات الطفل');
                      setChildFiles([]);
                    } finally {
                      setIsLoadingFiles(false);
                    }
                  }} title="ملفات الطفل">
                    <Folder className="w-4 h-4" />
                  </Button>
                  {(child.child_photo_path || child.birth_certificate_path) && (
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50" onClick={async () => {
                    setReExtractingChildId(child.id);
                    try {
                      const res = await campRegistrationApi.reExtractChild(batchId, child.id);
                      toast.success(res.data.message || `تم بدء إعادة الاستخراج الذكي لـ ${child.child_first_name}`);
                      // تحديث الحالة فوراً في الواجهة
                      setBatch(prev => {
                        if (!prev || !prev.children) return prev;
                        return {
                          ...prev,
                          children: prev.children.map(c =>
                            c.id === child.id ? { ...c, status: 'pending' as const, error_message: undefined } : c
                          )
                        };
                      });
                      // بدء التحديث الدوري لاستلام النتائج الفعلية
                      startPolling();
                    } catch (err) {
                      console.error('Failed to re-extract child:', err);
                      toast.error('فشل في إعادة الاستخراج');
                    } finally {
                      setReExtractingChildId(null);
                    }
                  }} title="إعادة استخراج ذكي" disabled={reExtractingChildId === child.id}>
                    {reExtractingChildId === child.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                  )}
                  {hasPermission('camp_registration', 'edit') && (
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => {
                    let bWilaya = child.birth_wilaya || '';
                    if (bWilaya && !/^\d+$/.test(bWilaya)) {
                      const found = wilayas.find(w => w.name_ar === bWilaya);
                      if (found) bWilaya = found.code;
                    }
                    let rWilaya = child.residence_wilaya || '';
                    if (rWilaya && !/^\d+$/.test(rWilaya)) {
                      const found = wilayas.find(w => w.name_ar === rWilaya);
                      if (found) rWilaya = found.code;
                    }

                    setEditingChild({
                      ...child,
                      gender: child.gender === 'MALE' ? 'ذكر' : child.gender === 'FEMALE' ? 'أنثى' : child.gender || '',
                      birth_wilaya: bWilaya,
                      residence_wilaya: rWilaya
                    });
                  }} title="تعديل">
                    <Edit className="w-4 h-4" />
                  </Button>
                  )}
                  {hasPermission('camp_registration', 'edit') && (
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50" onClick={() => setMovingChild(child)} title="نقل لدفعة أخرى">
                    <ArrowRightLeft className="w-4 h-4" />
                  </Button>
                  )}
                  {hasPermission('camp_registration', 'delete') && (
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteChild(child.id, `${child.child_last_name} ${child.child_first_name}`)} title="حذف">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  )}
                  {hasPermission('camp_registration', 'register_ministry') && !child.receipt_token && (
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => handleRegisterSingleChild(child)} title="تسجيل فردي في المنصة الوزارية" disabled={registeringChildId === child.id}>
                      {registeringChildId === child.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PermissionGuard module="camp_registration" action="view">
      <div className="space-y-6">
      {/* Header Section */}
      <div className="relative rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-900 shadow-xl">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-5 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-amber-300" />
        </div>
        <div className="relative px-6 py-5 sm:px-8 sm:py-6">
          {/* Top row: back + status + actions */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Link href="/camp-registration">
                <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4 ml-1" />
                  رجوع
                </Button>
              </Link>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${batchStatusConfig.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${batchStatusConfig.dot} animate-pulse`} />
                <BatchStatusIcon className="w-3 h-3" />
                {batchStatusConfig.label}
              </span>
              {hasPermission('camp_registration', 'edit') && (
              <select
                value={batch.status}
                onChange={(e) => handleChangeBatchStatus(e.target.value)}
                className="text-xs bg-white/10 text-white/80 border border-white/20 rounded-lg px-2 py-1 outline-none cursor-pointer appearance-none hover:bg-white/20 transition-colors"
                title="تغيير حالة الدفعة"
              >
                <option value="pending" className="text-gray-900">في الانتظار</option>
                <option value="processing" className="text-gray-900">قيد المعالجة</option>
                <option value="completed" className="text-gray-900">مكتمل</option>
                <option value="failed" className="text-gray-900">فشل</option>
                <option value="error" className="text-gray-900">خطأ</option>
              </select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => loadBatch()} variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                <RefreshCw className="w-4 h-4 ml-1" />
                تحديث
              </Button>
            </div>
          </div>

          {/* Batch title & description */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <BatchStatusIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">{batch.name}</h1>
                  {hasPermission('camp_registration', 'edit') && (
                  <button onClick={handleOpenEditBatch} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                    <Edit className="w-4 h-4 text-white/60 hover:text-white" />
                  </button>
                  )}
                </div>
                {batch.description && (
                  <p className="text-white/70 text-sm mt-0.5">{batch.description}</p>
                )}
                {typeof window !== 'undefined' && localStorage.getItem('default_email') && (
                  <div className="flex items-start gap-2 p-3 bg-muted/20 border border-border/50 rounded-xl mt-3">
                    <p className="text-white/60 text-xs">البريد الإلكتروني الحالي: {localStorage.getItem('default_email')}</p>
                  </div>
                )}
                {batch.institution_id && institutions.find(i => i.id === batch.institution_id) && (
                  <div className="flex items-center gap-1 text-white/60 text-xs mt-1">
                    <span>المؤسسة: {institutions.find(i => i.id === batch.institution_id)?.name_ar}</span>
                  </div>
                )}
                {batch.force_camp_on_member_fail && (
                  <div className="flex items-center gap-1 text-amber-300 text-xs mt-1">
                    <span>⚡ تسجيل المخيم حتى لو فشل جلب رقم الانخراط الموحد</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mini stat chips */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="bg-white/10 rounded-xl px-3 py-2 text-center backdrop-blur-sm">
                <div className="text-white/60 text-xs">الإجمالي</div>
                <div className="text-white font-bold text-lg">{batch.total_children}</div>
              </div>
              <div className="bg-emerald-500/20 rounded-xl px-3 py-2 text-center backdrop-blur-sm">
                <div className="text-emerald-200 text-xs">الناجح</div>
                <div className="text-emerald-300 font-bold text-lg">{batch.success_count}</div>
              </div>
              <div className="bg-red-500/20 rounded-xl px-3 py-2 text-center backdrop-blur-sm">
                <div className="text-red-200 text-xs">الفاشل</div>
                <div className="text-red-300 font-bold text-lg">{batch.failed_count}</div>
              </div>
            </div>
          </div>

          {/* Actions bar */}
          {(["pending", "error", "failed"].includes(batch.status?.toLowerCase() ?? "") || batch.status === "processing" || batch.children && batch.children.length > 0) && (
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
              {/* Primary processing actions */}
              {hasPermission('camp_registration', 'process') && ["pending", "error", "failed"].includes(batch.status?.toLowerCase() ?? "") && (
                <>
                  <Button
                    onClick={handleStart}
                    disabled={isProcessing}
                    size="sm"
                    className="bg-white text-emerald-900 hover:bg-emerald-50 font-semibold shadow-lg shadow-emerald-900/20"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-1" />
                    ) : ["error", "failed"].includes(batch.status?.toLowerCase() ?? "") ? (
                      <RefreshCw className="w-4 h-4 ml-1" />
                    ) : (
                      <Play className="w-4 h-4 ml-1" />
                    )}
                    {isProcessing ? "جاري..." : ["error", "failed"].includes(batch.status?.toLowerCase() ?? "") ? "إعادة المحاولة" : "بدء المعالجة"}
                  </Button>
                </>
              )}

              {hasPermission('camp_registration', 'process') && batch.status === "processing" && (
                <Button onClick={handleStopBatch} size="sm" variant="destructive" className="bg-red-500 hover:bg-red-600 text-white shadow-lg">
                  <Square className="w-4 h-4 ml-1" />
                  إيقاف المعالجة
                </Button>
              )}

              {/* Secondary actions */}
              <div className="flex flex-wrap items-center gap-2">
                {hasPermission('camp_registration', 'edit') && (
                <Link href={`/camp-registration/${batchId}/mass-edit`}>
                  <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                    <Edit className="w-4 h-4 ml-1" />
                    تعديل جماعي
                  </Button>
                </Link>
                )}

                {/* Import actions */}
                {["pending", "error", "failed"].includes(batch.status?.toLowerCase() ?? "") && (
                  <>
                  {hasPermission('camp_registration', 'process') && (
                    <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1 text-xs text-white/70">
                      <input type="checkbox" id="skip_duplicates" checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                        className="w-3 h-3 accent-emerald-500 cursor-pointer" />
                      <label htmlFor="skip_duplicates" className="cursor-pointer select-none">تخطي المكرر</label>
                    </div>
                  )}
                    {hasPermission('camp_registration', 'import') && (
                    <Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10" disabled={isImporting}>
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Upload className="w-4 h-4 ml-1" />}
                      استيراد CSV
                    </Button>
                    )}
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
                    {hasPermission('camp_registration', 'import') && (
                    <Button onClick={() => setShowSmartImportModal(true)} variant="ghost" size="sm" className="text-purple-300 hover:text-purple-200 hover:bg-white/10">
                      ✨ الاستيراد السحري
                    </Button>
                    )}
                    {hasPermission('camp_registration', 'scan') && (
                    <Button onClick={() => setShowScanUpload(true)} variant="ghost" size="sm" className="text-emerald-300 hover:text-emerald-200 hover:bg-white/10">
                      <Upload className="w-4 h-4 ml-1" />
                      رفع يدوي
                    </Button>
                    )}
                  </>
                )}

                {/* Live mode & Scanner */}
                {["pending", "error", "failed"].includes(batch.status?.toLowerCase() ?? "") && hasPermission('camp_registration', 'process') && (
                  <>
                    <Button onClick={() => setIsLiveMode(!isLiveMode)}
                      size="sm"
                      variant="ghost"
                      className={`${isLiveMode ? 'bg-red-500/20 text-red-300' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                    >
                      <span className="relative flex h-2.5 w-2.5 ml-1.5">
                        {isLiveMode && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLiveMode ? 'bg-red-400' : 'bg-white/50'}`}></span>
                      </span>
                      {isLiveMode ? "إيقاف الحي" : "متابعة حية"}
                    </Button>
                    {hasPermission('camp_registration', 'process') && (
                    <Button onClick={() => {
                      try {
                        window.location.href = `djs-scanner://${batchId}`;
                        setIsLiveMode(true);
                        toast.info("تم طلب فتح الماسح الضوئي. جاري المتابعة الحية...");
                      } catch (err: any) {
                        toast.error(err?.message || "تعذر فتح البروتوكول المخصص");
                      }
                    }} variant="ghost" size="sm" className="text-emerald-300 hover:text-emerald-200 hover:bg-white/10">
                      <ScanLine className="w-4 h-4 ml-1" />
                      مسح بالبوت
                    </Button>
                    )}
                  </>
                )}

                {/* Export */}
                {hasPermission('camp_registration', 'export') && batch.children && batch.children.length > 0 && (
                  <div className="relative">
                    <Button onClick={() => setShowExportMenu(!showExportMenu)} variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
                      <Download className="w-4 h-4 ml-1" />
                      تصدير
                    </Button>
                    {showExportMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                        <div className="absolute top-full mt-1 right-0 bg-white dark:bg-slate-900 border rounded-xl shadow-2xl z-50 min-w-[200px] py-1 overflow-hidden">
                          <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/30 font-medium">تصدير CSV</div>
                          <button onClick={() => handleExport()} className="w-full text-right px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"><span>📋</span> تصدير الكل</button>
                          <button onClick={() => handleExport('success')} className="w-full text-right px-4 py-2 hover:bg-gray-50 text-sm text-green-700 flex items-center gap-2"><span>✅</span> الناجحين</button>
                          <button onClick={() => handleExport('failed')} className="w-full text-right px-4 py-2 hover:bg-gray-50 text-sm text-red-700 flex items-center gap-2"><span>❌</span> الفاشلين</button>
                          <button onClick={() => handleExport('pending')} className="w-full text-right px-4 py-2 hover:bg-gray-50 text-sm text-amber-700 flex items-center gap-2"><span>⏳</span> في الانتظار</button>
                          <button onClick={() => handleExport('error')} className="w-full text-right px-4 py-2 hover:bg-gray-50 text-sm text-red-500 flex items-center gap-2"><span>⚠️</span> الأخطاء</button>
                          <hr className="my-1" />
                          <button onClick={handleExportSelected} className="w-full text-right px-4 py-2 hover:bg-gray-50 text-sm text-blue-700 flex items-center gap-2" disabled={selectedForExport.size === 0}>
                            <span>🎯</span> المحددين ({selectedForExport.size})
                          </button>
                          <button
                            onClick={() => {
                              setNewBatchName(`نسخة من ${batch?.name || ''}`);
                              setShowCreateBatchModal(true);
                            }}
                            disabled={selectedForExport.size === 0}
                            className="w-full text-right px-4 py-2 hover:bg-gray-50 text-sm text-emerald-700 flex items-center gap-2"
                          >
                            <span>📦</span> إنشاء دفعة بالمحددين ({selectedForExport.size})
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* مزامنة من الوزارة */}
                {hasPermission('camp_registration', 'ministry_sync') && (
                <Button
                  variant="outline"
                  onClick={handleSyncFromMinistry}
                  disabled={isSyncingFromMinistry || batch?.status === 'processing'}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  {isSyncingFromMinistry ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري المزامنة...
                    </>
                  ) : (
                    <>
                      <CloudDownload className="w-4 h-4 ml-2" />
                      مزامنة من الوزارة
                    </>
                  )}
                </Button>
                )}

                {/* انخراط في الوزارة */}
                {hasPermission('camp_registration', 'register_ministry') && (
                <Button
                  variant="outline"
                  onClick={handleRegisterToMinistry}
                  disabled={isRegistering || batch?.status === 'processing'}
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري التسجيل...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4 ml-2" />
                      انخراط في الوزارة
                    </>
                  )}
                </Button>
                )}
              </div>

              {/* Restart menu */}
              {hasPermission('camp_registration', 'process') && batch.status !== "processing" && (
                <div className="relative mr-auto">
                  <Button onClick={() => {
                    const el = document.getElementById('restart-menu');
                    if (el) el.classList.toggle('hidden');
                  }} disabled={isProcessing} size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <RefreshCw className="w-4 h-4 ml-1" />}
                    إعادة معالجة
                    <ChevronDown className="w-3 h-3 mr-1" />
                  </Button>
                  <div id="restart-menu" className="hidden absolute top-full mt-1 right-0 bg-white dark:bg-slate-900 border rounded-xl shadow-2xl z-50 min-w-[220px] py-1 overflow-hidden">
                    <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/30 font-medium">إعادة معالجة حسب الحالة</div>
                    <button onClick={() => { handleRestartByStatus(['failed', 'error'], 'الفاشلين'); document.getElementById('restart-menu')?.classList.add('hidden'); }} className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm text-red-600 flex items-center gap-2">
                      <span>❌</span> الفاشلين فقط ({batch.failed_count})
                    </button>
                    <button onClick={() => { handleRestartByStatus(['error'], 'الأخطاء'); document.getElementById('restart-menu')?.classList.add('hidden'); }} className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm text-orange-600 flex items-center gap-2">
                      <span>⚠️</span> الأخطاء فقط
                    </button>
                    <button onClick={() => { handleRestartByStatus(['pending'], 'في الانتظار'); document.getElementById('restart-menu')?.classList.add('hidden'); }} className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm text-amber-600 flex items-center gap-2">
                      <span>⏳</span> المنتظرين فقط
                    </button>
                    <button onClick={() => { handleRestartByStatus(['ready'], 'الجاهزين'); document.getElementById('restart-menu')?.classList.add('hidden'); }} className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm text-emerald-600 flex items-center gap-2 font-bold bg-emerald-50/50">
                      <span>📁</span> الجاهزين فقط (بصورة وشهادة)
                    </button>
                    <button onClick={() => { handleRestartByStatus(['success'], 'الناجحين'); document.getElementById('restart-menu')?.classList.add('hidden'); }} className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm text-green-600 flex items-center gap-2">
                      <span>✅</span> إعادة الناجحين
                    </button>
                    <hr className="my-1" />
                    <button onClick={() => { handleRestartAll(); document.getElementById('restart-menu')?.classList.add('hidden'); }} className="w-full text-right px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-bold flex items-center gap-2 text-slate-800">
                      <span>🔄</span> إعادة الكل
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className="p-4 rounded-lg border bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <div className="flex items-center gap-2 mb-3">
            <CloudDownload className="w-5 h-5 text-emerald-600" />
            <h4 className="font-semibold text-emerald-800">نتيجة المزامنة</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3 border border-emerald-100">
              <div className="text-emerald-600 font-bold text-lg">{syncResult.processed}</div>
              <div className="text-slate-500 text-xs">تمت المعالجة</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-100">
              <div className="text-emerald-600 font-bold text-lg">{syncResult.photos_downloaded}</div>
              <div className="text-slate-500 text-xs">صور تم تحميلها</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-100">
              <div className="text-emerald-600 font-bold text-lg">{syncResult.certificates_downloaded}</div>
              <div className="text-slate-500 text-xs">شهادات تم تحميلها</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-100">
              <div className="text-emerald-600 font-bold text-lg">{syncResult.receipts_downloaded}</div>
              <div className="text-slate-500 text-xs">إيصالات تم تحميلها</div>
            </div>
          </div>
          {syncResult.skipped > 0 && (
            <div className="mt-2 text-xs text-amber-600">
              {syncResult.skipped} طفل تخطوا (ليس لديهم رمز إيصال)
            </div>
          )}
          {syncResult.errors.length > 0 && (
            <div className="mt-3">
              <details>
                <summary className="text-xs text-red-600 cursor-pointer">
                  {syncResult.errors.length} أخطاء - اضغط للتفاصيل
                </summary>
                <ul className="mt-2 space-y-1">
                  {syncResult.errors.map((err, i) => (
                    <li key={i} className="text-xs text-red-700 bg-red-50 p-2 rounded">
                      {err}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </div>
      )}

      {registerResult && (
        <div className="p-4 bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-indigo-800 text-sm">نتائج التسجيل في منصة الوزارة</h3>
            <button onClick={() => setRegisterResult(null)} className="mr-auto text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-lg text-center">
              <div className="text-indigo-600 font-bold text-lg">{registerResult.total}</div>
              <div className="text-xs text-slate-500">الإجمالي</div>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg text-center">
              <div className="text-emerald-600 font-bold text-lg">{registerResult.success}</div>
              <div className="text-xs text-slate-500">تم التسجيل</div>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-lg text-center">
              <div className="text-amber-600 font-bold text-lg">{registerResult.already_registered}</div>
              <div className="text-xs text-slate-500">مسجل مسبقاً</div>
            </div>
            <div className="p-2.5 bg-red-50 rounded-lg text-center">
              <div className="text-red-600 font-bold text-lg">{registerResult.failed}</div>
              <div className="text-xs text-slate-500">فشل</div>
            </div>
          </div>
          {registerResult.details && registerResult.details.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-indigo-600 cursor-pointer hover:text-indigo-700 font-medium">
                تفاصيل التسجيل ({registerResult.details.length} طفل)
              </summary>
              <div className="mt-2 space-y-1.5 max-h-60 overflow-y-auto">
                {registerResult.details.map((d, i) => (
                  <div key={i} className={"text-xs rounded-lg p-2 " + (
                    d.status === 'registered' ? 'bg-emerald-50 text-emerald-700' :
                    d.status === 'already_registered' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  )}>
                    <span className="font-medium">{d.child_name}</span>
                    {d.status === 'registered' && d.receipt_token && (
                      <span className="mr-2 opacity-70">رقم وصل التسجيل: {d.receipt_token.substring(0, 20)}...</span>
                    )}
                    {d.error && <span className="mr-2">- {d.error}</span>}
                    {d.message && <span className="mr-2">- {d.message}</span>}
                  </div>
                ))}
              </div>
            </details>
          )}
          {registerResult.errors.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer hover:text-red-700">
                {registerResult.errors.length} أخطاء - اضغط للتفاصيل
              </summary>
              <div className="mt-1 space-y-1">
                {registerResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-500 bg-red-50 rounded p-1.5">{err}</p>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {batch.total_children > 0 && (
        <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-slate-700">التقدم العام</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="font-mono font-medium text-slate-700">{batch.processed_count} / {batch.total_children}</span>
              <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-md text-sm">
                {((batch.processed_count / batch.total_children) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="relative w-full bg-slate-200 rounded-full h-4 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400 transition-all duration-1000 ease-out relative"
              style={{ width: `${(batch.processed_count / batch.total_children) * 100}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-slate-400">
            <span>المتبقي: {batch.total_children - (batch.processed_count || 0)}</span>
            <span>تمت المعالجة: {batch.processed_count}</span>
            <div>
              <span className="text-muted-foreground block text-[10px] mb-0.5 uppercase tracking-wider">عدد العمال (التوازي)</span>
              <span className="font-semibold text-sm">{batch.delay_between_registrations} عمال</span>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Statistics */}
      {batch.children && batch.children.length > 0 && (() => {
        // حساب الإحصائيات
        const children = batch.children;

        // إحصائيات الجنس
        const maleCount = children.filter(c => c.gender === 'MALE' || c.gender === 'male' || c.gender === 'ذكر').length;
        const femaleCount = children.filter(c => c.gender === 'FEMALE' || c.gender === 'female' || c.gender === 'أنثى').length;

        // إحصائيات السن
        const now = new Date();
        const getAge = (birthDate: string) => {
          const birth = new Date(birthDate);
          let age = now.getFullYear() - birth.getFullYear();
          const m = now.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
          return age;
        };

        const age6to14 = children.filter(c => { const a = getAge(c.birth_date); return a >= 6 && a <= 14; }).length;
        const age15to17 = children.filter(c => { const a = getAge(c.birth_date); return a >= 15 && a <= 17; }).length;
        const ageUnder6 = children.filter(c => getAge(c.birth_date) < 6).length;
        const ageOver17 = children.filter(c => getAge(c.birth_date) > 17).length;

        // إحصائيات البلديات
        const mergedCommuneMap: Record<string, number> = {};
        children.forEach(c => {
          const communeId = c.residence_commune || 'غير محدد';
          const mun = municipalities.find(m => m.id === communeId);
          const resolvedName = mun ? mun.name_ar : (communeId === 'غير محدد' ? 'غير محدد' : communeId.trim());
          mergedCommuneMap[resolvedName] = (mergedCommuneMap[resolvedName] || 0) + 1;
        });

        const communeStats = Object.entries(mergedCommuneMap)
          .map(([name, count]) => {
            const displayName = name.length > 30 && name.includes('-') ? name.substring(0, 8) + '...' : name;
            return { name: displayName, count };
          })
          .sort((a, b) => b.count - a.count);

        const ageGroups = [
          { label: 'أقل من 6 سنوات', count: ageUnder6, bar: 'bg-cyan-500', text: 'text-cyan-600', light: 'bg-cyan-50' },
          { label: '6 - 14 سنة', count: age6to14, bar: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50' },
          { label: '15 - 17 سنة', count: age15to17, bar: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50' },
          { label: 'فوق 17 سنة', count: ageOver17, bar: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' },
        ];

        const maxCommunes = communeStats.length > 0 ? Math.max(...communeStats.map(s => s.count)) : 1;

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gender Distribution */}
            <div className="rounded-xl bg-white border p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">توزيع حسب الجنس</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-sm text-slate-600">ذكور</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">{maleCount}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-2.5 rounded-full transition-all duration-700" style={{ width: `${children.length > 0 ? (maleCount / children.length * 100) : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                      <span className="text-sm text-slate-600">إناث</span>
                    </div>
                    <span className="text-sm font-bold text-pink-500">{femaleCount}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-pink-400 to-pink-300 h-2.5 rounded-full transition-all duration-700" style={{ width: `${children.length > 0 ? (femaleCount / children.length * 100) : 0}%` }} />
                  </div>
                </div>
                <div className="text-center pt-1">
                  <span className="text-[10px] text-slate-400">{maleCount + femaleCount} طفل ({(maleCount + femaleCount > 0 ? ((maleCount / (maleCount + femaleCount)) * 100).toFixed(0) : 0)}% ذكور)</span>
                </div>
              </div>
            </div>

            {/* Age Distribution */}
            <div className="rounded-xl bg-white border p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">توزيع حسب الفئة العمرية</h3>
              </div>
              <div className="space-y-3">
                {ageGroups.map((g, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-slate-600">{g.label}</span>
                      <span className={`text-sm font-bold ${g.text}`}>{g.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`${g.bar} h-2 rounded-full transition-all duration-700`} style={{ width: `${children.length > 0 ? (g.count / children.length * 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Commune Distribution */}
            <div className="rounded-xl bg-white border p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">توزيع حسب بلدية الإقامة</h3>
              </div>
              <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                {communeStats.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">لا توجد بيانات بلديات</p>
                ) : (
                  communeStats.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 group">
                      <span className="text-xs text-slate-400 w-5 text-left font-mono">{i + 1}</span>
                      <span className="text-sm text-slate-700 truncate flex-1">{s.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-16 sm:w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-violet-500 to-violet-400 h-2 rounded-full transition-all duration-500" style={{ width: `${(s.count / maxCommunes) * 100}%` }} />
                        </div>
                        <span className="text-sm font-bold text-violet-600 min-w-[24px] text-left">{s.count}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Children List */}
      <div className="rounded-xl bg-white border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gradient-to-l from-slate-50 to-white flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">الأطفال</h2>
              <p className="text-xs text-slate-400">{processedChildren.length} من أصل {batch.children?.length || 0}</p>
            </div>
          </div>
          {hasPermission('camp_registration', 'create') && batch.status !== 'processing' && (
            <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-sm" onClick={() => router.push(`/camp-registration/create?batchId=${batchId}`)}>
              <Plus className="w-4 h-4 ml-1.5" />
              إضافة طفل
            </Button>
          )}
        </div>
        <div className="px-5 py-3 border-b bg-slate-50/50">
          <OdooSearch
            placeholder="ابحث بالاسم، اللقب، رقم الهاتف..."
            filters={childSearchFilters}
            groupByOptions={childGroupByOptions}
            onSearch={setChildSearch}
            onFilterChange={setChildFilters}
            onGroupChange={setChildGroup}
            initialSearch={childSearch}
            initialGroupBy={childGroup}
          />
        </div>
        <div className="p-5">
          {!batch.children || batch.children.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">لا يوجد أطفال في هذه الدفعة</p>
              <p className="text-sm text-slate-400 mt-1">قم بإضافة أطفال باستخدام خيارات الاستيراد أعلاه</p>
            </div>
          ) : processedChildren.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
                <Search className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-slate-500 font-medium">لا يوجد نتائج مطابقة للبحث</p>
              <p className="text-sm text-slate-400 mt-1">حاول تغيير معايير البحث أو التصفية</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All bar */}
              <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-l from-slate-50 to-white rounded-xl border">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={processedChildren.length > 0 && selectedForExport.size === processedChildren.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedForExport(new Set(processedChildren.map(c => c.id)));
                      } else {
                        setSelectedForExport(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-sm text-slate-600">
                    {selectedForExport.size > 0
                      ? `تم تحديد ${selectedForExport.size} من ${processedChildren.length}`
                      : 'تحديد الكل'}
                  </span>
                </label>
                {selectedForExport.size > 0 && (
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                    {selectedForExport.size} مُحدد
                  </span>
                )}
              </div>

              {groupedChildren ? (
                Object.entries(groupedChildren).map(([groupName, childrenInGroup]) => (
                  <div key={groupName} className="space-y-3 mb-6">
                    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-l from-slate-50 to-white rounded-xl border shadow-sm">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center">
                        <Folder className="w-3.5 h-3.5 text-white" />
                      </div>
                      <h3 className="font-semibold text-slate-700 text-sm">{groupName}</h3>
                      <Badge variant="secondary" className="bg-slate-200 text-slate-600 text-xs font-medium">{childrenInGroup.length}</Badge>
                    </div>
                    {childrenInGroup.map((child, index) => {
                      const originalIndex = batch.children?.findIndex(c => c.id === child.id) || index;
                      return renderChildItem(child, index, originalIndex);
                    })}
                  </div>
                ))
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {processedChildren.map((child, index) => {
                    const originalIndex = batch.children?.findIndex(c => c.id === child.id) || index;
                    return renderChildItem(child, index, originalIndex);
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Batch Info */}
      <div className="rounded-xl bg-white border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-gradient-to-l from-slate-50 to-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center">
            <Info className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-semibold text-slate-800">معلومات الدفعة</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-400 text-xs mb-0.5">وضع Headless</div>
              <div className="font-medium text-slate-700">{batch.headless_mode ? "نعم (بدون واجهة)" : "لا (مع واجهة)"}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-400 text-xs mb-0.5">التأخير بين التسجيلات</div>
              <div className="font-medium text-slate-700">{batch.delay_between_registrations} ثانية</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-400 text-xs mb-0.5">تاريخ الإنشاء</div>
              <div className="font-medium text-slate-700">{new Date(batch.created_at).toLocaleString('ar-DZ')}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-slate-400 text-xs mb-0.5">تاريخ التعديل</div>
              <div className="font-medium text-slate-700">{new Date(batch.updated_at || batch.created_at).toLocaleString('ar-DZ')}</div>
            </div>
            {batch.started_at && (
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="text-amber-500 text-xs mb-0.5">تاريخ البدء</div>
                <div className="font-medium text-amber-700">{new Date(batch.started_at).toLocaleString('ar-DZ')}</div>
              </div>
            )}
            {batch.completed_at && (
              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="text-emerald-500 text-xs mb-0.5">تاريخ الاكتمال</div>
                <div className="font-medium text-emerald-700">{new Date(batch.completed_at).toLocaleString('ar-DZ')}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Move Child Modal */}
      {movingChild && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setMovingChild(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="relative px-6 pt-6 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">نقل الطفل لدفعة أخرى</h2>
                  <p className="text-sm text-slate-500">اختر الدفعة الوجهة للنقل</p>
                </div>
              </div>
              <button onClick={() => setMovingChild(null)} className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl p-1.5 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gradient-to-l from-amber-50 to-white rounded-xl p-4 border border-amber-100">
                <p className="text-sm text-slate-600">
                  الطفل: <strong className="text-slate-800">{movingChild.child_first_name} {movingChild.child_last_name}</strong>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">اختر الدفعة الوجهة</label>
                {availableBatches.length > 0 ? (
                  <select
                    value={targetBatchId}
                    onChange={(e) => setTargetBatchId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all bg-white"
                  >
                    <option value="">-- اختر دفعة --</option>
                    {availableBatches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.total_children} أطفال)</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3 border border-amber-200">
                    لا توجد دفعات أخرى متاحة للنقل.
                  </p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-left">
              <Button type="button" variant="outline" onClick={() => setMovingChild(null)}>إلغاء</Button>
              <Button onClick={handleMoveChild} disabled={isMoving || !targetBatchId} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-sm">
                {isMoving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
                تأكيد النقل
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Child Modal */}
      {editingChild && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditingChild(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center">

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center">
                  <Edit className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">تعديل بيانات الطفل</h2>
                  <p className="text-sm text-slate-500">{editingChild.child_first_name} {editingChild.child_last_name}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingChild(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Linked Member Banner */}
            {editingChild.member_id && (
              <div className="mx-6 mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    هذا الطفل مرتبط بمنخرط — التعديلات على الاسم وتاريخ الميلاد والجنس ستتم مزامنتها تلقائياً مع ملف المنخرط
                  </span>
                  <Link
                    href={`/${locale}/members/${editingChild.member_id}`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mr-auto whitespace-nowrap"
                  >
                    عرض المنخرط ←
                  </Link>
                </div>
              </div>
            )}
              <form
                onBlur={handleInputBlur}
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const data = {
                    child_first_name: formData.get('child_first_name') as string,
                    child_last_name: formData.get('child_last_name') as string,
                    birth_date: formData.get('birth_date') as string,
                    gender: formData.get('gender') as string,
                    child_country: formData.get('child_country') as string,
                    birth_wilaya: formData.get('birth_wilaya') as string,
                    birth_commune: formData.get('birth_commune') as string,
                    residence_wilaya: formData.get('residence_wilaya') as string,
                    residence_commune: formData.get('residence_commune') as string,
                    address: formData.get('address') as string,
                    parent_first_name: formData.get('parent_first_name') as string,
                    parent_last_name: formData.get('parent_last_name') as string,
                    parent_phone: formData.get('parent_phone') as string,
                    parent_email: formData.get('parent_email') as string,
                    parent_national_id: formData.get('parent_national_id') as string,
                    youth_institution: editingChild.youth_institution || '',
                    unified_member_number: (formData.get('unified_member_number') as string) || '',
                    receipt_token: formData.get('receipt_token') as string || '',
                    child_photo_path: formData.get('child_photo_path') as string || undefined,
                    birth_certificate_path: formData.get('birth_certificate_path') as string || undefined,
                    force_registration: formData.get('force_registration') === 'on',
                  };

                  try {
                    await campRegistrationApi.updateChild(batchId, editingChild.id, data);
                    toast.success("تم تحديث بيانات الطفل بنجاح");
                    setEditingChild(null);
                    loadBatch();
                  } catch (error) {
                    toast.error(getErrorMessage(error));
                  }
                }}>
                <div className="p-6 space-y-6">
                  {/* Child Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-blue-500 to-blue-400" />
                      <h3 className="font-semibold text-slate-700 text-sm">معلومات الطفل</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">اسم الطفل *</label>
                        <input name="child_first_name" value={editingChild.child_first_name || ''} onChange={(e) => setEditingChild({...editingChild, child_first_name: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" required />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">لقب الطفل *</label>
                        <input name="child_last_name" value={editingChild.child_last_name || ''} onChange={(e) => setEditingChild({...editingChild, child_last_name: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" required />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">تاريخ الميلاد *</label>
                        <input name="birth_date" type="date" defaultValue={editingChild.birth_date} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" required />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">الجنس</label>
                        <select name="gender" defaultValue={editingChild.gender || ''} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white">
                          <option value="">اختر</option>
                          <option value="ذكر">ذكر</option>
                          <option value="أنثى">أنثى</option>
                        </select>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="block text-xs font-medium text-slate-600">اسم المؤسسة *</label>
                        <SearchableSelect
                          options={institutions.map(inst => ({ value: inst.name_ar, label: `${inst.name_ar} (${inst.short_name || ''})` }))}
                          value={editingChild.youth_institution || ''}
                          onValueChange={(value) => setEditingChild({...editingChild, youth_institution: value})}
                          placeholder="اختر المؤسسة..."
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="block text-xs font-medium text-slate-600">رقم الانخراط الموحد (YouthConnect) — أساسي</label>
                        <input name="unified_member_number" value={editingChild.unified_member_number || ''} onChange={(e) => setEditingChild({...editingChild, unified_member_number: e.target.value})} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" placeholder="مثال: 280709-26-1-012-0084" dir="ltr" />
                        <p className="text-[10px] text-slate-400">رقم الانخراط الموحد من منصة المنخرطين (اختياري)</p>
                      </div>
                      {/* رقم وصل التسجيل */}
                      <div className="col-span-2 space-y-1.5">
                        <label className="block text-xs font-medium text-slate-600 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          رقم وصل التسجيل
                        </label>
                        <input
                          type="text"
                          name="receipt_token"
                          defaultValue={editingChild?.receipt_token || ''}
                          placeholder="أدخل رقم وصل التسجيل من المنصة الوزارية"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                          dir="ltr"
                        />
                        <p className="text-[10px] text-slate-400">
                          هذا الرمز يمكن الطفل من مزامنة بياناته من المنصة الوزارية
                        </p>
                      </div>
                      <div className="col-span-2 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer bg-red-50 p-2.5 rounded-xl border border-red-100">
                          <input 
                            type="checkbox" 
                            name="force_registration"
                            checked={!!editingChild.force_registration}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setEditingChild({
                                ...editingChild,
                                force_registration: checked,
                              });
                            }}
                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500 border-red-300"
                          />
                          <span className="text-sm font-bold text-red-700">
                            تسجيل قسري (لتجاوز فحص المنصة الوزارية)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-500 to-amber-400" />
                      <h3 className="font-semibold text-slate-700 text-sm">الموقع الجغرافي</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">ولاية الميلاد</label>
                        <input type="hidden" name="birth_wilaya" value={editingChild.birth_wilaya || ''} />
                        <SearchableSelect
                          options={wilayaOptions}
                          value={editingChild.birth_wilaya || ''}
                          onValueChange={(value) => {
                            setEditingChild({ ...editingChild, birth_wilaya: value, birth_commune: '' });
                            fetchMunicipalities(value);
                          }}
                          placeholder="اختر الولاية"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">بلدية الميلاد</label>
                        <input type="hidden" name="birth_commune" value={editingChild.birth_commune || ''} />
                        <SearchableSelect
                          options={getMunicipalityOptions(editingChild.birth_wilaya || '')}
                          value={editingChild.birth_commune || ''}
                          onValueChange={(value) => setEditingChild({ ...editingChild, birth_commune: value })}
                          placeholder={loadingMunicipalities ? "جاري التحميل..." : "اختر البلدية"}
                          disabled={!editingChild.birth_wilaya || loadingMunicipalities}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">ولاية الإقامة</label>
                        <input type="hidden" name="residence_wilaya" value={editingChild.residence_wilaya || ''} />
                        <SearchableSelect
                          options={wilayaOptions}
                          value={editingChild.residence_wilaya || ''}
                          onValueChange={(value) => {
                            setEditingChild({ ...editingChild, residence_wilaya: value, residence_commune: '' });
                            fetchMunicipalities(value);
                          }}
                          placeholder="اختر الولاية"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">بلدية الإقامة</label>
                        <input type="hidden" name="residence_commune" value={editingChild.residence_commune || ''} />
                        <SearchableSelect
                          options={getMunicipalityOptions(editingChild.residence_wilaya || '')}
                          value={editingChild.residence_commune || ''}
                          onValueChange={(value) => {
                            setEditingChild({ ...editingChild, residence_commune: value });
                            const communeObj = municipalities.find(m => m.id === value);
                            if (communeObj) {
                              const wilayaObj = wilayas.find(w => w.code === editingChild.residence_wilaya);
                              const wilayaName = wilayaObj ? wilayaObj.name_ar : '';
                              setEditAddress(`بلدية ${communeObj.name_ar} ولاية بوسعادة`);
                            }
                          }}
                          placeholder={loadingMunicipalities ? "جاري التحميل..." : "اختر البلدية"}
                          disabled={!editingChild.residence_wilaya || loadingMunicipalities}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="block text-xs font-medium text-slate-600">العنوان</label>
                        <div className="relative">
                          <input
                            name="address"
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            placeholder="العنوان الكامل"
                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                          />
                          {editAddress && (
                            <span className="absolute left-3 top-2.5 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">تم الملء تلقائياً</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">سيتم إضافة اسم البلدية وولاية بوسعادة تلقائياً عند اختيار بلدية الإقامة</p>
                      </div>
                    </div>
                  </div>

                  {/* Parent Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-400" />
                      <h3 className="font-semibold text-slate-700 text-sm">معلومات الولي</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">اسم الولي</label>
                        <input name="parent_first_name" defaultValue={editingChild.parent_first_name || ''} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">لقب الولي</label>
                        <input name="parent_last_name" defaultValue={editingChild.parent_last_name || ''} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">رقم الهاتف</label>
                        <input name="parent_phone" type="tel" dir="ltr" defaultValue={editingChild.parent_phone || ''} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">البريد الإلكتروني</label>
                        <input name="parent_email" type="email" dir="ltr" defaultValue={editingChild.parent_email || ''} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-600">رقم بطاقة الولي</label>
                        <input name="parent_national_id" dir="ltr" defaultValue={editingChild.parent_national_id || ''} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-violet-500 to-violet-400" />
                      <h3 className="font-semibold text-slate-700 text-sm">الوثائق المطلوبة</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Photo */}
                      <div className="p-4 border border-slate-200 rounded-xl bg-gradient-to-br from-slate-50 to-white">
                        <label className="block text-sm font-medium text-slate-700 mb-3">📷 صورة الطفل</label>
                        {editingChild.child_photo_path && (
                          <div className="mb-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <a href={getStorageUrl(editingChild.child_photo_path) || "#"} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-xs">{editingChild.child_photo_path.split('/').pop()}</a>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 items-center">
                          <input type="file" accept="image/*" id="photo-upload" className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                toast.loading("جاري رفع الصورة...");
                                await campRegistrationApi.uploadChildFile(batchId, editingChild.id, 'photo', file);
                                toast.dismiss();
                                toast.success("تم رفع الصورة بنجاح");
                                loadBatch();
                                setEditingChild(prev => prev ? { ...prev, child_photo_path: URL.createObjectURL(file) } : null);
                              } catch {
                                toast.dismiss();
                                toast.error("فشل في رفع الصورة");
                              }
                            }} />
                          {hasPermission('camp_registration', 'edit') && (
                          <label htmlFor="photo-upload" className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 hover:bg-blue-100 transition-colors font-medium">
                            <Upload className="w-3.5 h-3.5" /> اختر صورة
                          </label>
                          )}
                          {hasPermission('camp_registration', 'edit') && (
                          <button type="button" onClick={() => openFilePicker('photo')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-700 hover:bg-violet-100 transition-colors font-medium">
                            <Folder className="w-3.5 h-3.5" /> من المجلد
                          </button>
                          )}
                          <span className="text-xs text-slate-400">أو المسار:</span>
                          <input name="child_photo_path" value={editPhotoPath}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.includes('/') || val.includes('\\')) {
                                const lastSlash = val.lastIndexOf('/');
                                const lastBackslash = val.lastIndexOf('\\');
                                const sep = lastSlash > lastBackslash ? '/' : '\\';
                                const parts = val.split(sep);
                                setEditPhotoPath(parts.pop() || '');
                              } else {
                                setEditPhotoPath(val);
                              }
                            }}
                            placeholder="photo.jpg" className="flex-1 min-w-[120px] px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" dir="ltr" />
                        </div>
                      </div>

                      {/* Certificate */}
                      <div className="p-4 border border-slate-200 rounded-xl bg-gradient-to-br from-slate-50 to-white">
                        <label className="block text-sm font-medium text-slate-700 mb-3">📄 شهادة الميلاد</label>
                        {editingChild.birth_certificate_path && (
                          <div className="mb-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            <a href={getStorageUrl(editingChild.birth_certificate_path) || "#"} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-xs">{editingChild.birth_certificate_path.split('/').pop()}</a>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 items-center">
                          <input type="file" accept=".pdf,application/pdf" id="cert-upload" className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                toast.loading("جاري رفع الشهادة...");
                                await campRegistrationApi.uploadChildFile(batchId, editingChild.id, 'certificate', file);
                                toast.dismiss();
                                toast.success("تم رفع الشهادة بنجاح");
                                loadBatch();
                                setEditingChild(prev => prev ? { ...prev, birth_certificate_path: URL.createObjectURL(file) } : null);
                              } catch {
                                toast.dismiss();
                                toast.error("فشل في رفع الشهادة");
                              }
                            }} />
                          {hasPermission('camp_registration', 'edit') && (
                          <label htmlFor="cert-upload" className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 hover:bg-blue-100 transition-colors font-medium">
                            <Upload className="w-3.5 h-3.5" /> اختر ملف
                          </label>
                          )}
                          {hasPermission('camp_registration', 'edit') && (
                          <button type="button" onClick={() => openFilePicker('certificate')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-700 hover:bg-violet-100 transition-colors font-medium">
                            <Folder className="w-3.5 h-3.5" /> من المجلد
                          </button>
                          )}
                          <span className="text-xs text-slate-400">أو المسار:</span>
                          <input name="birth_certificate_path" value={editCertPath}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.includes('/') || val.includes('\\')) {
                                const lastSlash = val.lastIndexOf('/');
                                const lastBackslash = val.lastIndexOf('\\');
                                const sep = lastSlash > lastBackslash ? '/' : '\\';
                                const parts = val.split(sep);
                                setEditCertPath(parts.pop() || '');
                              } else {
                                setEditCertPath(val);
                              }
                            }}
                            placeholder="cert.pdf" className="flex-1 min-w-[120px] px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" dir="ltr" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                  {hasPermission('camp_registration', 'edit') && (
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-sm">حفظ التغييرات</Button>
                  )}
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingChild(null)}>إلغاء</Button>
                </div>
              </form>
            </div>
          </div>
      )}

      {/* Edit Batch Info Modal */}
      {isEditingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={() => setIsEditingBatch(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center">
                  <Edit className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">تعديل معلومات الدفعة</h2>
                  <p className="text-sm text-slate-500">قم بتحديث بيانات الدفعة</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsEditingBatch(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">اسم الدفعة</label>
                <input
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                  value={editBatchName}
                  onChange={(e) => setEditBatchName(e.target.value)}
                  placeholder="مثال: مخيم صيف 2024"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">الوصف</label>
                <textarea
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl min-h-[100px] outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all resize-none"
                  value={editBatchDescription}
                  onChange={(e) => setEditBatchDescription(e.target.value)}
                  placeholder="وصف اختياري للدفعة..."
                />
              </div>

              {/* Institution select */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">المؤسسة الشبابية</label>
                <SearchableSelect
                  options={institutions.map(inst => ({ value: inst.id, label: `${inst.name_ar} (${inst.short_name || ''})` }))}
                  value={selectedEditInstitutionId}
                  onValueChange={setSelectedEditInstitutionId}
                  placeholder="بدون مؤسسة"
                  
                />
              </div>

              {/* Force camp on member fail toggle */}
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <input
                  type="checkbox"
                  id="editForceCampOnMemberFail"
                  checked={editForceCampOnMemberFail}
                  onChange={(e) => setEditForceCampOnMemberFail(e.target.checked)}
                  className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="editForceCampOnMemberFail" className="text-amber-800 cursor-pointer font-medium text-sm">
                  تسجيل المخيم حتى لو فشل جلب رقم الانخراط الموحد
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">طريقة التسجيل</label>
                  <select
                    value={editRegistrationMethod}
                    onChange={(e) => setEditRegistrationMethod(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all bg-white"
                  >
                    <option value="api">API سريع (مباشر)</option>
                    <option value="bot">روبوت (متصفح خفي)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">وضع Headless</label>
                  <select
                    value={editHeadlessMode ? "true" : "false"}
                    onChange={(e) => setEditHeadlessMode(e.target.value === "true")}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all bg-white"
                    disabled={editRegistrationMethod === 'api'}
                  >
                    <option value="false">لا (مع واجهة)</option>
                    <option value="true">نعم (بدون واجهة)</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-sm font-medium text-slate-700">عدد العمال (التوازي)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                    value={editDelay}
                    onChange={(e) => setEditDelay(parseInt(e.target.value))}
                    min={1}
                    max={60}
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              {hasPermission('camp_registration', 'edit') && (
              <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-sm" onClick={handleSaveBatch}>
                حفظ التغييرات
              </Button>
              )}
              <Button variant="outline" className="flex-1" onClick={() => setIsEditingBatch(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Import Modal */}
      {showSmartImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowSmartImportModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center text-xl">
                  ✨
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">الاستيراد السحري</h2>
                  <p className="text-sm text-slate-500">استخراج بيانات الأطفال من مجلدات الوثائق</p>
                </div>
              </div>
              <button onClick={() => setShowSmartImportModal(false)} className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl p-1.5 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 bg-gradient-to-l from-purple-50 to-white rounded-xl p-4 border border-purple-100">
                حدد مسار المجلد الذي يحتوي على مجلدات الأطفال (كل مجلد يحتوي على وثائق PDF وصورة JPG).
                سيتم استخراج البيانات تلقائياً وإضافتها كأطفال في هذه الدفعة.
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">مسار المجلد الأساسي</label>
                <input
                  type="text"
                  value={smartImportDir}
                  onChange={(e) => setSmartImportDir(e.target.value)}
                  placeholder="/home/nasser/CAMP_2026/bousaada2"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              {hasPermission('camp_registration', 'import') && (
              <Button variant="destructive" size="sm" className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700" onClick={async () => {
                  try {
                    await campRegistrationApi.stopSmartImport();
                    toast.success("تم إرسال أمر التوقف");
                  } catch {
                    toast.error("فشل في إرسال أمر التوقف");
                  }
                }}>
                إيقاف العملية
              </Button>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSmartImportModal(false)} disabled={isSmartImporting}>
                  إلغاء
                </Button>
                {hasPermission('camp_registration', 'import') && (
                <Button
                  className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white shadow-sm"
                  disabled={isSmartImporting || !smartImportDir.trim()}
                  onClick={async () => {
                    setIsSmartImporting(true);
                    try {
                      await campRegistrationApi.startSmartImport(batchId, smartImportDir);
                      toast.success("تم بدء الاستيراد السحري في الخلفية! راقب السجلات");
                      setShowSmartImportModal(false);
                    } catch (e: any) {
                      toast.error(e?.response?.data?.detail || "فشل في بدء الاستيراد");
                    } finally {
                      setIsSmartImporting(false);
                    }
                  }}
                >
                  {isSmartImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  بدء الاستخراج
                </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Scan Upload Modal */}
      {showScanUpload && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowScanUpload(false)}>
          <div data-scan-upload className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center">
                  <ScanLine className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">مسح ورفع وثائق طفل</h2>
                  <p className="text-sm text-slate-500">رفع ملفات طفل جديد واستخراج البيانات تلقائياً</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowScanUpload(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {uploadCount > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600">✓</span>
                  تم رفع {uploadCount} طفل بنجاح في هذه الجلسة
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">اسم الطفل / المجلد *</label>
                  <input
                    type="text"
                    value={scanFolderName}
                    onChange={(e) => setScanFolderName(e.target.value)}
                    placeholder="مثال: BENALI_Mohamed"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">صورة الطفل (JPG) *</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={(e) => setScanPhoto(e.target.files?.[0] || null)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-xs file:font-medium hover:file:bg-emerald-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">شهادة الميلاد (PDF) *</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setScanCert(e.target.files?.[0] || null)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-xs file:font-medium hover:file:bg-emerald-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">بطاقة تعريف الولي (PDF) - اختياري</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setScanGuardianId(e.target.files?.[0] || null)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-xs file:font-medium hover:file:bg-emerald-100"
                  />
                </div>
              </div>

              <div className="bg-gradient-to-l from-blue-50 to-white border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                💡 بعد الرفع، سيتم استخراج البيانات تلقائياً من شهادة الميلاد عبر الذكاء الاصطناعي (Gemini) في الخلفية.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-left">
              <Button variant="outline" onClick={() => setShowScanUpload(false)}>إلغاء</Button>
              {hasPermission('camp_registration', 'scan') && (
              <Button
                onClick={async () => {
                  if (!scanFolderName.trim() || !scanPhoto || !scanCert) {
                    toast.error('يرجى ملء جميع الحقول المطلوبة');
                    return;
                  }
                  setIsUploading(true);
                  try {
                    const formData = new FormData();
                    formData.append('folder_name', scanFolderName.trim());
                    formData.append('photo', scanPhoto);
                    formData.append('certificate', scanCert);
                    if (scanGuardianId) {
                      formData.append('guardian_id', scanGuardianId);
                    }
                    const res = await campRegistrationApi.scanUploadExtract(batchId, formData);
                    toast.success(res.data.message);
                    setUploadCount(prev => prev + 1);
                    setScanFolderName('');
                    setScanPhoto(null);
                    setScanCert(null);
                    setScanGuardianId(null);
                    (document.querySelectorAll('[data-scan-upload] input[type="file"]') as NodeListOf<HTMLInputElement>).forEach(input => { input.value = ''; });
                    loadBatch();
                  } catch (error: any) {
                    toast.error(error?.response?.data?.detail || 'فشل في رفع الملفات');
                  } finally {
                    setIsUploading(false);
                  }
                }}
                disabled={isUploading || !scanFolderName.trim() || !scanPhoto || !scanCert}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-sm"
              >
                {isUploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> جاري الرفع...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> رفع واستخراج</>
                )}
              </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== File Picker Modal (اختيار من المجلد) ===== */}
      {filePickerMode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setFilePickerMode(null); setPickerFiles([]); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center">
                  <Folder className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">اختيار {filePickerMode === 'photo' ? 'صورة' : 'شهادة ميلاد'} من المجلد</h2>
                  <p className="text-sm text-slate-500">{pickerFiles.length} ملف متاح</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setFilePickerMode(null); setPickerFiles([]); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingPicker ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  <span className="mr-3 text-slate-500">جاري تحميل الملفات...</span>
                </div>
              ) : pickerFiles.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Folder className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد ملفات في مجلد هذا الطفل</p>
                  <p className="text-xs mt-1">قم برفع الملفات أولاً باستخدام زر "اختر صورة" أو "اختر ملف"</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pickerFiles.map((file, i) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp|jfif)$/i.test(file.name);
                    const isPdf = /\.pdf$/i.test(file.name);
                    return (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/50 transition-all group">
                        <div className={"w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 " + (
                          isImage ? "bg-emerald-100 text-emerald-600" :
                          isPdf ? "bg-red-100 text-red-600" :
                          "bg-slate-100 text-slate-500"
                        )}>
                          {isImage ? <Camera className="w-5 h-5" /> :
                           isPdf ? <Download className="w-5 h-5" /> :
                           <Folder className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            {file.size && <span>{(file.size / 1024).toFixed(1)} KB</span>}
                            {file.last_modified && <span>{new Date(file.last_modified).toLocaleDateString('ar-DZ')}</span>}
                          </div>
                        </div>
                        <a href={getStorageUrl(file.path) || file.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors">
                          <Eye className="w-3.5 h-3.5" /> معاينة
                        </a>
                        <button type="button" onClick={() => {
                          if (filePickerMode === 'photo') {
                            setEditPhotoPath(file.path);
                          } else {
                            setEditCertPath(file.path);
                          }
                          toast.success("تم اختيار " + file.name + " كـ " + (filePickerMode === 'photo' ? "صورة" : "شهادة ميلاد"));
                          setFilePickerMode(null);
                          setPickerFiles([]);
                        }}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 hover:bg-emerald-100 transition-colors font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> اختيار
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Child Files Viewer Modal ===== */}
      {filesChild && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setFilesChild(null); setChildFiles([]); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center">
                  <Folder className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">ملفات {filesChild.child_last_name} {filesChild.child_first_name}</h2>
                  <p className="text-sm text-slate-500">{childFiles.length} ملف في MinIO</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setFilesChild(null); setChildFiles([]); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingFiles ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  <span className="mr-3 text-slate-500">جاري تحميل الملفات...</span>
                </div>
              ) : childFiles.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Folder className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد ملفات مخزنة لهذا الطفل</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {childFiles.map((file, i) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp|jfif)$/i.test(file.name);
                    const isPdf = /\.pdf$/i.test(file.name);
                    return (
                      <a
                        key={i}
                        href={getStorageUrl(file.path) || file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/50 transition-all group"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isImage ? 'bg-emerald-100 text-emerald-600' :
                          isPdf ? 'bg-red-100 text-red-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {isImage ? <Camera className="w-5 h-5" /> :
                           isPdf ? <Download className="w-5 h-5" /> :
                           <Folder className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate group-hover:text-violet-700">{file.name}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            {file.size && <span>{(file.size / 1024).toFixed(1)} KB</span>}
                            {file.last_modified && <span>{new Date(file.last_modified).toLocaleDateString('ar-DZ')}</span>}
                          </div>
                        </div>
                        <Eye className="w-4 h-4 text-slate-300 group-hover:text-violet-500 flex-shrink-0" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal إنشاء دفعة جديدة من الأطفال المحددين */}
      <Dialog open={showCreateBatchModal} onOpenChange={setShowCreateBatchModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إنشاء دفعة جديدة من الأطفال المحددين</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم الدفعة</label>
              <input
                type="text"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="أدخل اسم الدفعة الجديدة"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الوصف (اختياري)</label>
              <textarea
                value={newBatchDescription}
                onChange={(e) => setNewBatchDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="وصف الدفعة"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="new_force_camp"
                checked={newBatchForceCamp}
                onChange={(e) => setNewBatchForceCamp(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="new_force_camp" className="text-sm text-slate-700">
                تجاوز فشل المنخرط والتسجيل قسرياً
              </label>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-sm text-emerald-800">
              <span className="font-semibold">{selectedForExport.size}</span> طفل مُحدد سيتم نسخهم إلى الدفعة الجديدة
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateBatchModal(false)}
                disabled={isCreatingBatch}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleCreateBatchFromSelected}
                disabled={isCreatingBatch || !newBatchName.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isCreatingBatch ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  'إنشاء الدفعة'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGuard>
              );
}