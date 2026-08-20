"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { Plus, Trash2, Save, Loader2, ArrowLeft, Upload, Download, ChevronDown, ChevronUp, Users, Layers, Settings2, Mail, Info, X, Eye, AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { campRegistrationApi, CreateBatchRequest } from "@/lib/api/camp-registration";
import { locationsApi, Wilaya, Municipality } from "@/lib/api/locations";
import { getApiBaseUrl, getErrorMessage } from "@/lib/api/client";

import { PermissionGuard } from "@/hooks/useRequirePermission";

function getStorageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:")) return path;
  const base = getApiBaseUrl().replace('/api/v1', '');
  return `${base}/storage/${path}`;
}

interface ChildData {
  child_first_name: string;
  child_last_name: string;
  birth_date: string;
  gender: string;
  birth_wilaya: string;
  birth_commune: string;
  residence_wilaya: string;
  residence_commune: string;
  address: string;
  parent_first_name: string;
  parent_last_name: string;
  parent_phone: string;
  parent_email: string;
  parent_national_id: string;
  youth_institution: string;
  unified_member_number?: string;
  child_photo_path: string;
  birth_certificate_path: string;
  id: string;
  isNew?: boolean;
  folder_name?: string;
  force_registration?: boolean;
}

const emptyChild: ChildData = {
  child_first_name: "",
  child_last_name: "",
  birth_date: "",
  gender: "MALE",
  birth_wilaya: "68",
  birth_commune: "",
  residence_wilaya: "68",
  residence_commune: "",
  address: "",
  parent_first_name: "",
  parent_last_name: "",
  parent_phone: "",
  parent_email: "",
  parent_national_id: "",
  youth_institution: "",
  unified_member_number: "",
  child_photo_path: "",
  birth_certificate_path: "",
  id: "",
};

export default function MassEditBatchPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.id as string;
  const [batchName, setBatchName] = useState("");
  const [batchDescription, setBatchDescription] = useState("");
  const [registrationMethod, setRegistrationMethod] = useState("api");
  const [headlessMode, setHeadlessMode] = useState(false);
  const [delay, setDelay] = useState(5);
  const [baseEmail, setBaseEmail] = useState("");
  const [emailStartIndex, setEmailStartIndex] = useState(0);
  const [defaultWilaya, setDefaultWilaya] = useState("68");
  const [defaultCommune, setDefaultCommune] = useState("");
  const [children, setChildren] = useState<ChildData[]>([{ ...emptyChild }]);
  const [collapsedChildren, setCollapsedChildren] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Advanced Import & Extract states
  const [isImporting, setIsImporting] = useState(false);
  const [isSmartImporting, setIsSmartImporting] = useState(false);
  const [showSmartImportModal, setShowSmartImportModal] = useState(false);
  const [smartImportDir, setSmartImportDir] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [aiProvider, setAiProvider] = useState<"gemini" | "groq">("gemini");
  const [retryFailedOnly, setRetryFailedOnly] = useState(false);
  const [extractJobId, setExtractJobId] = useState<string | null>(null);
  const [extractProgress, setExtractProgress] = useState<any>(null);
  const [pendingNewChildren, setPendingNewChildren] = useState<ChildData[] | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showDuplicateUpdateDialog, setShowDuplicateUpdateDialog] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [duplicateChildren, setDuplicateChildren] = useState<ChildData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // دوال مساعدة لتحويل أسماء الولايات والبلديات العربية إلى أكواد/معرفات
  function resolveWilayaCode(name: string, wilayasList: Wilaya[]): string {
    if (!name) return "";
    // إذا كان بالفعل كود (رقم)
    if (/^\d{2}$/.test(name)) return name;
    // ابحث عن الاسم العربي في قائمة الولايات
    const found = wilayasList.find(w => w.name_ar === name);
    return found ? found.code : name;
  }

  function resolveCommuneId(name: string, wilayaCode: string, municipalitiesList: Municipality[]): string {
    if (!name) return "";
    // إذا كان بالفعل UUID
    if (/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(name)) return name;
    // ابحث عن الاسم العربي + كود الولاية
    const found = municipalitiesList.find(m => m.name_ar === name && m.wilaya_code === wilayaCode);
    return found ? found.id : name;
  }

  // دالة مساعدة للاستخراج الذكي: تحويل اسم البلدية إلى UUID وتحديد ولايتها
  function resolveCommuneData(communeName: string, defaultWilaya: string = "68"): { communeId: string; wilayaCode: string } {
    if (!communeName) return { communeId: "", wilayaCode: defaultWilaya };
    
    // إذا كان بالفعل UUID
    if (/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(communeName)) {
      const found = municipalities.find(m => m.id === communeName);
      return { communeId: communeName, wilayaCode: found?.wilaya_code || defaultWilaya };
    }
    
    // ابحث باسم البلدية العربي في قائمة البلديات المحملة
    const found = municipalities.find(m => m.name_ar === communeName);
    if (found) {
      return { communeId: found.id, wilayaCode: found.wilaya_code };
    }
    
    // لم نجد البلدية → احتفظ بالاسم كما هو واستخدم القيمة الافتراضية
    return { communeId: communeName, wilayaCode: defaultWilaya };
  }

  // دالة لإنشاء مفتاح فريد للطفل للتحقق من التكرار
  const getChildKey = (child: ChildData): string => {
    const photoPath = child.child_photo_path || '';
    const fileName = photoPath.split(/[/\\]/).pop() || '';
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
    return nameWithoutExt ? `photo:${nameWithoutExt}` : '';
  };

  // دالة لترتيب الأطفال أبجدياً حسب اسم المجلد أو الصورة
  const sortChildren = (childrenList: ChildData[]) => {
    return [...childrenList].sort((a, b) => {
      const folderA = (a.folder_name || a.child_photo_path?.replace(/\.[^.]+$/, '') || '').toLowerCase();
      const folderB = (b.folder_name || b.child_photo_path?.replace(/\.[^.]+$/, '') || '').toLowerCase();
      if (folderA && folderB) return folderA.localeCompare(folderB);
      if (folderA) return -1;
      if (folderB) return 1;
      // fallback: اللقب ثم الاسم
      const nameA = `${a.child_last_name || ''} ${a.child_first_name || ''}`.trim();
      const nameB = `${b.child_last_name || ''} ${b.child_first_name || ''}`.trim();
      return nameA.localeCompare(nameB, 'ar');
    });
  };

  const DRAFT_KEY = 'camp_batch_draft';

  // Load existing batch data on mount
  useEffect(() => {
    if (!batchId) return;
    
    async function fetchBatch() {
      try {
        const res = await campRegistrationApi.getBatch(batchId);
        const batch = res.data;
        setBatchName(batch.name);
        setBatchDescription(batch.description || "");
        setRegistrationMethod(batch.registration_method || "api");
        setHeadlessMode(batch.headless_mode);
        setDelay(batch.delay_between_registrations || 5);
        setSmartImportDir(batch.default_directory || "");
        
        // Also check if there's a base email in localStorage if not in batch
        const storedEmail = localStorage.getItem('camp_base_email');
        setBaseEmail(batch.default_email || storedEmail || "");
        if (batch.default_wilaya) setDefaultWilaya(batch.default_wilaya);
        if (batch.default_commune) setDefaultCommune(batch.default_commune);
        
        if (batch.children && batch.children.length > 0) {
          const loadedChildren = batch.children.map(c => {
            // المشكلة 1: قاعدة البيانات تخزن "MALE"/"FEMALE" - نحولها إلى "ذكر"/"أنثى"
            const genderValue = c.gender === "MALE" ? "ذكر" : c.gender === "FEMALE" ? "أنثى" : c.gender || "ذكر";

            // تحويل أسماء الولايات العربية إلى أكواد رقمية
            const birthWilaya = resolveWilayaCode(c.birth_wilaya || "", wilayas);
            const residenceWilaya = resolveWilayaCode(c.residence_wilaya || "", wilayas);

            // تحويل residence_commune من اسم بلدية عربي إلى UUID
            let residenceCommune = c.residence_commune || "";
            if (residenceCommune && !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(residenceCommune)) {
              const found = municipalities.find(m => m.name_ar === residenceCommune && m.wilaya_code === residenceWilaya);
              if (found) residenceCommune = found.id;
            }

            // تحويل birth_commune من اسم بلدية عربي إلى UUID
            let birthCommune = c.birth_commune || "";
            if (birthCommune && !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(birthCommune)) {
              const found = municipalities.find(m => m.name_ar === birthCommune && m.wilaya_code === birthWilaya);
              if (found) birthCommune = found.id;
            }

            return {
            child_first_name: c.child_first_name || "",
            child_last_name: c.child_last_name || "",
            birth_date: c.birth_date || "",
            gender: genderValue,
            birth_wilaya: birthWilaya || "",
            birth_commune: birthCommune || "",
            residence_wilaya: residenceWilaya || "68",
            residence_commune: residenceCommune,
            address: c.address || "",
            parent_first_name: c.parent_first_name || "",
            parent_last_name: c.parent_last_name || "",
            parent_phone: c.parent_phone || "",
            parent_email: c.parent_email || "",
            parent_national_id: c.parent_national_id || "",
            youth_institution: c.youth_institution || "",
            unified_member_number: c.unified_member_number || "",
            child_photo_path: c.child_photo_path || "",
            birth_certificate_path: c.birth_certificate_path || "",
            id: c.id,
            folder_name: c.child_photo_path ? c.child_photo_path.replace(/\.[^.]+$/, '') : "",
          };
          });
          setChildren(sortChildren(loadedChildren));
        }
      } catch (error) {
        toast.error("فشل في تحميل بيانات الدفعة");
      }
    }
    fetchBatch();
  }, [batchId]);


  useEffect(() => {
    localStorage.setItem('camp_default_wilaya', defaultWilaya);
  }, [defaultWilaya]);

  useEffect(() => {
    localStorage.setItem('camp_default_commune', defaultCommune);
  }, [defaultCommune]);

  // Clear draft
  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setLastSaved(null);
    setDraftLoaded(false);
  }, []);

  // Gmail Dot Trick: generate unique email variants by placing dots in the username
  const generateGmailDotVariants = (email: string, count: number, startFrom: number = 0): string[] => {
    if (!email || !email.includes('@')) return [];
    const [username, domain] = email.split('@');
    // Remove existing dots from username for a clean base
    const cleanUsername = username.replace(/\./g, '');
    if (cleanUsername.length < 2) return [];

    const variants: string[] = [];
    const positions = cleanUsername.length - 1; // possible dot positions

    // Generate combinations starting from startFrom index
    for (let i = startFrom; i < Math.pow(2, positions) && variants.length < count; i++) {
      let variant = cleanUsername[0];
      for (let j = 0; j < positions; j++) {
        if (i & (1 << j)) {
          variant += '.';
        }
        variant += cleanUsername[j + 1];
      }
      variants.push(`${variant}@${domain}`);
    }
    return variants;
  };

  // Apply dot emails to all children (using startIndex)
  const applyDotEmails = (email: string, childrenList: ChildData[], startFrom: number = emailStartIndex): ChildData[] => {
    if (!email || !email.includes('@')) return childrenList;
    
    // استخراج الإيميلات الموجودة مسبقاً لتجنب التكرار
    const usedEmails = new Set(
      childrenList
        .map(c => c.parent_email)
        .filter(e => e && e.trim() !== '')
    );
    
    // توليد عدد كبير من المتغيرات
    const allVariants = generateGmailDotVariants(email, 1024, startFrom);
    
    // تصفية المتغيرات لاستخدام غير الموجودة فقط
    const availableVariants = allVariants.filter(v => !usedEmails.has(v));
    let variantIndex = 0;
    
    return childrenList.map(child => {
      // تخطي من لديهم إيميل بالفعل
      if (child.parent_email && child.parent_email.trim() !== '') {
        return child;
      }
      
      // تعيين الإيميل المتاح
      const newEmail = availableVariants[variantIndex] || availableVariants[availableVariants.length - 1];
      if (newEmail) {
        variantIndex++;
      }
      
      return {
        ...child,
        parent_email: newEmail || child.parent_email,
      };
    });
  };

  // Get a single next email variant for one child
  const getNextDotEmail = (email: string, index: number): string => {
    if (!email || !email.includes('@')) return '';
    const variants = generateGmailDotVariants(email, 1, index);
    return variants[0] || '';
  };

  // Polling effect for smart extract progress
  useEffect(() => {
    let interval: any;
    if (extractJobId) {
      interval = setInterval(async () => {
        try {
          const res = await campRegistrationApi.getSmartExtractProgress(extractJobId);
          setExtractProgress(res.data);
          
          // Process results dynamically on every tick
          const results = res.data.results || [];
          
          if (results.length > 0) {
            const newChildren: ChildData[] = [];
            
            results.forEach((r: any) => {
              const status = (r.status || "").toLowerCase();
              if (status === "success" || status === "cached") {
                const data = r.mapped_data || {};
                
                // 🔍 حل اسم البلدية إلى UUID وتحديد الولاية الصحيحة
                const birthCommuneRaw = data.birth_commune || "";
                const birthResolved = resolveCommuneData(birthCommuneRaw, data.birth_wilaya || "68");
                
                const residenceCommuneRaw = defaultCommune || data.residence_commune || "";
                const residenceResolved = resolveCommuneData(residenceCommuneRaw, "68");
                
                newChildren.push({
                  id: crypto.randomUUID(),
                  isNew: true,
                  child_first_name: data.child_first_name || data.first_name || r.folder_name || "طفل جديد",
                  child_last_name: data.child_last_name || data.last_name || "",
                  birth_date: data.birth_date || "",
                  gender: data.gender || "MALE",
                  birth_wilaya: birthResolved.wilayaCode,
                  birth_commune: birthResolved.communeId,
                  residence_wilaya: residenceResolved.wilayaCode,
                  residence_commune: residenceResolved.communeId,
                  address: data.address || "",
                  parent_first_name: data.parent_first_name || data.guardian_first_name || "",
                  parent_last_name: data.parent_last_name || data.child_last_name || data.guardian_last_name || data.last_name || "",
                  parent_phone: data.parent_phone || data.guardian_phone || "",
                  parent_email: data.parent_email || "",
                  parent_national_id: data.parent_national_id || data.guardian_national_id || data.national_id || "",
                  youth_institution: "",
                  unified_member_number: data.unified_member_number || "",
                  child_photo_path: data.child_photo_path || (r.folder_name ? `${r.folder_name}.jpg` : ""),
                  birth_certificate_path: data.birth_certificate_path || (r.folder_name ? `${r.folder_name}.pdf` : ""),
                  folder_name: r.folder_name || "",
                });
              }
            });
            
            // تنسيق العناوين بعد إضافة الأطفال
            newChildren.forEach(child => {
              const communeForAddress = child.residence_commune || child.birth_commune || "";
              if (communeForAddress) {
                // البحث باسم البلدية أو المعرف
                const communeObj = municipalities.find(m => 
                  m.id.toString() === communeForAddress.toString() || m.name_ar === communeForAddress
                );
                if (communeObj) {
                  const wilayaName = wilayas.find(w => w.code === "68")?.name_ar || "بوسعادة";
                  child.address = child.address || `بلدية ${communeObj.name_ar} - ولاية ${wilayaName}`;
                }
              }
            });

            if (newChildren.length > 0) {
              setChildren(prev => {
                const updated = [...prev];
                const reallyNew: ChildData[] = [];
                let hasChanges = false;
                
                newChildren.forEach(nc => {
                  let dupIndex = -1;
                  if (nc.folder_name) {
                    dupIndex = updated.findIndex(existingChild => {
                      if (!existingChild.child_photo_path && !existingChild.folder_name) return false;
                      const existingFileName = (existingChild.child_photo_path || existingChild.folder_name || '').split(/[/\\]/).pop() || '';
                      const existingNameWithoutExt = existingFileName.replace(/\.[^.]+$/, '');
                      return existingNameWithoutExt === nc.folder_name;
                    });
                  }

                  if (dupIndex === -1) {
                    reallyNew.push(nc);
                    hasChanges = true;
                  } else {
                    const existing = updated[dupIndex];
                    // Clean merge extracted AI details into existing placeholder child record
                    updated[dupIndex] = {
                      ...existing,
                      // Preserve manual edits if they are valid names, otherwise fill from AI
                      child_first_name: existing.child_first_name && existing.child_first_name !== "scanner_import" && !existing.child_first_name.includes("_") ? existing.child_first_name : nc.child_first_name,
                      child_last_name: existing.child_last_name && existing.child_last_name !== "scanner_import" && !existing.child_last_name.includes("_") ? existing.child_last_name : nc.child_last_name,
                      birth_date: existing.birth_date && existing.birth_date !== "2015-01-01" ? existing.birth_date : nc.birth_date,
                      gender: existing.gender || nc.gender,
                      birth_wilaya: existing.birth_wilaya || nc.birth_wilaya,
                      birth_commune: existing.birth_commune || nc.birth_commune,
                      residence_wilaya: existing.residence_wilaya || nc.residence_wilaya,
                      residence_commune: existing.residence_commune || nc.residence_commune,
                      address: existing.address || nc.address,
                      parent_first_name: existing.parent_first_name || nc.parent_first_name,
                      parent_last_name: existing.parent_last_name || nc.parent_last_name,
                      parent_phone: existing.parent_phone || nc.parent_phone,
                      parent_email: existing.parent_email || nc.parent_email,
                      parent_national_id: existing.parent_national_id || nc.parent_national_id,
                      child_photo_path: existing.child_photo_path || nc.child_photo_path,
                      birth_certificate_path: existing.birth_certificate_path || nc.birth_certificate_path,
                    };
                    hasChanges = true;
                  }
                });
                
                return hasChanges ? sortChildren(reallyNew.length > 0 ? [...updated, ...reallyNew] : updated) : prev;
              });
            }
          }
          
          if (res.data.status === "completed" || res.data.status === "stopped") {
            clearInterval(interval);
            setIsSmartImporting(false);
            setExtractJobId(null);
            
            toast.success(`اكتمل الدمج الذكي للدفعة`);
          }
        } catch (e) { console.error("Polling error:", e); }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [extractJobId, defaultCommune]);

  // Import Handlers
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error("يجب أن يكون الملف بصيغة CSV");
      return;
    }
    setIsImporting(true);
    try {
      await campRegistrationApi.importBatch(batchId, file, skipDuplicates);
      toast.success("تم استيراد الملف بنجاح");
      window.location.reload(); 
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "فشل في استيراد الملف");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartSmartExtract = async () => {
    if (!smartImportDir.trim()) return;
    setIsSmartImporting(true);
    try {
      const res = await campRegistrationApi.startSmartExtract(smartImportDir, aiProvider, retryFailedOnly);
      setExtractJobId(res.data.job_id);
      toast.success("بدأ الاستخراج الذكي... يرجى الانتظار");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "فشل في بدء الاستخراج الذكي");
      setIsSmartImporting(false);
    }
  };

  const handleMerge = (mode: 'append' | 'replace' | 'update') => {
    if (!pendingNewChildren) return;
    
    if (mode === 'replace') {
      setChildren(sortChildren(pendingNewChildren));
    } else if (mode === 'append') {
      // استبعاد المكررين حسب الصورة
      const existingKeys = new Set(children.map(getChildKey).filter(k => k !== ''));
      const newItems = pendingNewChildren.filter(c => !existingKeys.has(getChildKey(c)));
      setChildren(sortChildren([...children, ...newItems]));
      const dups = pendingNewChildren.length - newItems.length;
      if (dups > 0) toast.info(`تم تخطي ${dups} طفل مكرر`);
    } else if (mode === 'update') {
      const updated = [...children];
      const newItems: ChildData[] = [];
      
      pendingNewChildren.forEach(newChild => {
        const key = getChildKey(newChild);
        const idx = key ? updated.findIndex(c => getChildKey(c) === key) : -1;
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], ...newChild, id: updated[idx].id };
        } else {
          newItems.push(newChild);
        }
      });
      setChildren(sortChildren([...updated, ...newItems]));
      toast.success(`تم تحديث ${pendingNewChildren.length - newItems.length} طفل وإضافة ${newItems.length} جدد`);
    }
    
    setShowMergeDialog(false);
    setPendingNewChildren(null);
  };

  // Locations state
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loadingWilayas, setLoadingWilayas] = useState(false);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);

  // Fetch Wilayas
  useEffect(() => {
    async function fetchWilayasData() {
      try {
        setLoadingWilayas(true);
        const data = await locationsApi.getWilayas();
        setWilayas(data);
        
        // Fetch municipalities for both wilayas (28 - M'sila & 68 - Bou Saâda)
        const [msilaMunicipalities, bousaadaMunicipalities] = await Promise.all([
          locationsApi.getMunicipalities("28"),
          locationsApi.getMunicipalities("68")
        ]);
        
        // Check if there is a saved default wilaya that is neither 28 nor 68
        const savedWilaya = localStorage.getItem('camp_default_wilaya') || "68";
        let defaultMunicipalities: Municipality[] = [];
        if (savedWilaya !== "28" && savedWilaya !== "68") {
          defaultMunicipalities = await locationsApi.getMunicipalities(savedWilaya);
        }
        
        // Merge both lists
        const allMunicipalities = [...msilaMunicipalities, ...bousaadaMunicipalities, ...defaultMunicipalities];
        setMunicipalities(allMunicipalities);
        
        // Set default birth and residence commune
        const savedCommune = localStorage.getItem('camp_default_commune');
        
        const targetCommuneObj = savedCommune 
          ? allMunicipalities.find(m => m.id === savedCommune) 
          : bousaadaMunicipalities.find(m => m.name_ar === 'بوسعادة');
          
        const targetWilayaObj = data.find(w => w.code === savedWilaya);
        const wilayaName = targetWilayaObj ? targetWilayaObj.name_ar : 'بوسعادة';

        setChildren(prevChildren => {
          if (prevChildren.length !== 1) return prevChildren;
          const updatedChildren = [...prevChildren];
          let updated = false;
          
          if (!updatedChildren[0].birth_commune && targetCommuneObj) {
            updatedChildren[0].birth_wilaya = savedWilaya;
            updatedChildren[0].birth_commune = targetCommuneObj.id;
            updated = true;
          }
          if (!updatedChildren[0].residence_commune && targetCommuneObj) {
            updatedChildren[0].residence_wilaya = savedWilaya;
            updatedChildren[0].residence_commune = targetCommuneObj.id;
            updatedChildren[0].address = `بلدية ${targetCommuneObj.name_ar} ولاية ${wilayaName}`;
            updated = true;
          }
          return updated ? updatedChildren : prevChildren;
        });
      } catch (error) {
        console.error("Failed to fetch locations", error);
      } finally {
        setLoadingWilayas(false);
      }
    }
    fetchWilayasData();
  }, []);

  // تحميل بلديات الولايات المذكورة في بيانات الأطفال (غير 28 و 68)
  // مع تحويل أسماء الولايات العربية إلى أكواد أولاً
  useEffect(() => {
    const wilayaCodes = new Set<string>();
    children.forEach(c => {
      // حاول تحويل اسم الولاية العربي إلى كود قبل إضافته للمجموعة
      let bw = c.birth_wilaya;
      if (bw && !/^\d{2}$/.test(bw)) {
        const found = wilayas.find(w => w.name_ar === bw);
        if (found) bw = found.code;
      }
      if (bw && /^\d{2}$/.test(bw)) wilayaCodes.add(bw);

      let rw = c.residence_wilaya;
      if (rw && !/^\d{2}$/.test(rw)) {
        const found = wilayas.find(w => w.name_ar === rw);
        if (found) rw = found.code;
      }
      if (rw && /^\d{2}$/.test(rw)) wilayaCodes.add(rw);
    });
    const loadedCodes = new Set(municipalities.map(m => m.wilaya_code));
    const missing = [...wilayaCodes].filter(code => !loadedCodes.has(code));
    if (missing.length > 0) {
      Promise.all(missing.map(code => locationsApi.getMunicipalities(code).catch(() => [] as Municipality[])))
        .then(results => {
          setMunicipalities(prev => [...prev, ...results.flat()]);
        });
    }
  }, [children, wilayas]);

  const wilayaOptions = wilayas.map(w => ({ 
    value: w.code, 
    label: `${w.code} - ${w.name_ar}` 
  }));

  const getMunicipalityOptions = (wilayaCode: string, isResidence = false) => {
    if (!wilayaCode) return [];
    const targetCode = parseInt(wilayaCode, 10);
    const filteredMunicipalities = municipalities.filter(m => parseInt(m.wilaya_code, 10) === targetCode);
    return filteredMunicipalities.map(m => ({ value: m.id, label: m.name_ar }));
  };


  // بعد تحميل البلديات، تأكد من تحويل أي أسماء بلديات عربية في residence_commune إلى UUID
  useEffect(() => {
    if (municipalities.length === 0) return;
    setChildren(prev => {
      let changed = false;
      const updated = prev.map(child => {
        let newChild = { ...child };
        const rc = newChild.residence_commune || "";
        if (rc && !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(rc)) {
          const wilayaCode = newChild.residence_wilaya;
          const found = municipalities.find(m => m.name_ar === rc && (!wilayaCode || parseInt(m.wilaya_code, 10) === parseInt(wilayaCode, 10)));
          if (found) {
            changed = true;
            newChild.residence_commune = found.id;
          }
        }
        
        const bc = newChild.birth_commune || "";
        if (bc && !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(bc)) {
          const wilayaCode = newChild.birth_wilaya;
          const found = municipalities.find(m => m.name_ar === bc && (!wilayaCode || parseInt(m.wilaya_code, 10) === parseInt(wilayaCode, 10)));
          if (found) {
            changed = true;
            newChild.birth_commune = found.id;
          }
        }
        return newChild;
      });
      return changed ? updated : prev;
    });
  }, [municipalities]);

  // تحويل أسماء الولايات والبلديات إلى أكواد/معرفات بعد تحميل المواقع (safety net)
  useEffect(() => {
    if (wilayas.length === 0 || children.length === 0) return;

    let needsUpdate = false;
    const updated = children.map(child => {
      const newChild = { ...child };

      // تحويل birth_wilaya من اسم عربي إلى كود
      if (newChild.birth_wilaya && !/^\d{2}$/.test(newChild.birth_wilaya)) {
        const found = wilayas.find(w => w.name_ar === newChild.birth_wilaya);
        if (found) {
          newChild.birth_wilaya = found.code;
          needsUpdate = true;
        }
      }

      // تحويل residence_wilaya من اسم عربي إلى كود
      if (newChild.residence_wilaya && !/^\d{2}$/.test(newChild.residence_wilaya)) {
        const found = wilayas.find(w => w.name_ar === newChild.residence_wilaya);
        if (found) {
          newChild.residence_wilaya = found.code;
          needsUpdate = true;
        }
      }

      // تحويل birth_commune من اسم عربي إلى UUID
      if (newChild.birth_commune && !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(newChild.birth_commune) && municipalities.length > 0) {
        const found = municipalities.find(m => m.name_ar === newChild.birth_commune && m.wilaya_code === newChild.birth_wilaya);
        if (found) {
          newChild.birth_commune = found.id;
          needsUpdate = true;
        }
      }

      // تحويل residence_commune من اسم عربي إلى UUID
      if (newChild.residence_commune && !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(newChild.residence_commune) && municipalities.length > 0) {
        const found = municipalities.find(m => m.name_ar === newChild.residence_commune && m.wilaya_code === newChild.residence_wilaya);
        if (found) {
          newChild.residence_commune = found.id;
          needsUpdate = true;
        }
      }

      return newChild;
    });

    if (needsUpdate) {
      setChildren(updated);
    }
  }, [wilayas, municipalities, children.length]);
  const handleDefaultWilayaChange = async (wilayaCode: string) => {
    setDefaultWilaya(wilayaCode);
    setDefaultCommune('');
    
    if (wilayaCode) {
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
    }
  };

  const handleWilayaChange = async (wilayaCode: string, index: number, prefix: 'birth' | 'residence') => {
    // Update child's wilaya and reset commune
    updateChild(index, `${prefix}_wilaya` as any, wilayaCode);
    updateChild(index, `${prefix}_commune` as any, '');
    
    // Fetch municipalities if not already loaded for this wilaya
    if (wilayaCode) {
      const targetCode = parseInt(wilayaCode, 10);
      const currentMunicipalities = municipalities.filter(m => parseInt(m.wilaya_code, 10) === targetCode);
      if (currentMunicipalities.length === 0) {
        try {
          setLoadingMunicipalities(true);
          const data = await locationsApi.getMunicipalities(wilayaCode);
          toast.info(`تم جلب ${data.length} بلدية للولاية ${wilayaCode} من السيرفر`);
          // Merge with existing municipalities
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
    }
  };

  const toggleChildCollapse = (index: number) => {
    setCollapsedChildren(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const collapseAll = () => {
    setCollapsedChildren(new Set(Array.from({ length: children.length }, (_, i) => i)));
  };

  const expandAll = () => {
    setCollapsedChildren(new Set());
  };



  const checkDatabaseDuplicate = async (index: number, firstName: string, lastName: string, birthDate: string, childId?: string) => {
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

  const updateChild = (index: number, field: keyof ChildData, value: any) => {
    let val = value;
    
    // Handle Date objects from pickers
    if (val instanceof Date) {
      val = val.toISOString().split('T')[0];
    }

    // Strip paths from photo and certificate fields
    if ((field === 'child_photo_path' || field === 'birth_certificate_path') && typeof val === 'string') {
      if (val.includes('/') || val.includes('\\')) {
        val = val.split(/[/\\]/).pop() || '';
      }
    }
    
    // Check child age on date selection
    if (field === 'birth_date' && val) {
      const age = getAgeYears(val as string);
      if (age > 17) {
        toast.warning(`عمر الطفل سيكون ${calculateAge(val as string)} (أكبر من 17 سنة)`);
      } else if (age < 6) {
        toast.warning(`عمر الطفل سيكون ${calculateAge(val as string)} (أقل من 6 سنوات)`);
      }
    }
    
    // Validate parent national ID (must be exactly 18 digits)
    if (field === 'parent_national_id') {
      // Only allow digits
      const digitsOnly = val.replace(/\D/g, '');
      // Limit to 18 digits
      if (digitsOnly.length > 18) {
        val = digitsOnly.slice(0, 18);
      } else {
        val = digitsOnly;
      }
      
      // Check parent age if 18 digits are entered
      if (val.length === 18) {
        const yearStr = val.substring(2, 5);
        let yearOfBirth = parseInt(yearStr, 10);
        if (!isNaN(yearOfBirth)) {
          yearOfBirth += (yearOfBirth > 800 ? 1000 : 2000);
          const currentYear = new Date().getFullYear();
          if (currentYear - yearOfBirth < 18) {
            toast.error('لا يمكن أن يكون الولي أقل من 18 سنة (حسب رقم التعريف الوطني)');
          }
        }
      }
    }
    
    // Validate parent phone number (must be 10 digits starting with 05, 06, or 07)
    if (field === 'parent_phone') {
      // Only allow digits
      const digitsOnly = val.replace(/\D/g, '');
      // Limit to 10 digits
      if (digitsOnly.length > 10) {
        val = digitsOnly.slice(0, 10);
      } else {
        val = digitsOnly;
      }
      // Show warning if starts with invalid prefix (only if length >= 2)
      if (val.length >= 2 && !['05', '06', '07'].some(prefix => val.startsWith(prefix))) {
        toast.error('رقم الهاتف يجب أن يبدأ بـ 05 أو 06 أو 07');
      }
    }
    
    setChildren(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      
      // Check for duplicates within the current form
      if (['child_first_name', 'child_last_name', 'birth_date'].includes(field)) {
        const child = updated[index];
        if (child.child_first_name && child.child_last_name && child.birth_date) {
          // Check other children in the same form
          const internalDuplicateIndex = updated.findIndex((c, i) => 
            i !== index && 
            c.child_first_name === child.child_first_name && 
            c.child_last_name === child.child_last_name && 
            c.birth_date === child.birth_date
          );
          
          if (internalDuplicateIndex !== -1) {
            toast.error(`الطفل مكرر في هذه القائمة (الطفل رقم ${internalDuplicateIndex + 1})`, {
              duration: 5000,
            });
          } else {
            // Check in database (Async)
            checkDatabaseDuplicate(index, child.child_first_name, child.child_last_name, child.birth_date, child.id);
          }
        }
      }
      
      // Auto-update address when residence_commune changes
      if (field === 'residence_commune' && val) {
        const commune = municipalities.find(m => m.id === val || m.name_ar === val);
        if (commune) {
          const fullAddress = `بلدية ${commune.name_ar} ولاية بوسعادة`;
          updated[index].address = fullAddress;
        }
      }
      
      // Auto-fill parent details from cache if name matches
      if (field === 'parent_first_name' || field === 'parent_last_name') {
        const pFirst = updated[index].parent_first_name?.trim();
        const pLast = updated[index].parent_last_name?.trim();
        if (pFirst && pLast) {
          const fullName = `${pFirst} ${pLast}`;
          try {
            const cache = JSON.parse(localStorage.getItem('camp_parents_cache') || '{}');
            if (cache[fullName]) {
              let autoFilled = false;
              if (!updated[index].parent_national_id && cache[fullName].national_id) {
                updated[index].parent_national_id = cache[fullName].national_id;
                autoFilled = true;
              }
              if (!updated[index].parent_phone && cache[fullName].phone) {
                updated[index].parent_phone = cache[fullName].phone;
                autoFilled = true;
              }
              if (!updated[index].parent_email && cache[fullName].email) {
                updated[index].parent_email = cache[fullName].email;
                autoFilled = true;
              }
              if (autoFilled) {
                toast.success('تم جلب بيانات الولي تلقائياً');
              }
            }
          } catch {}
        }
      }
      
      // Update cache immediately if parent fields are modified
      if (['parent_first_name', 'parent_last_name', 'parent_national_id', 'parent_phone', 'parent_email'].includes(field)) {
        const pFirst = updated[index].parent_first_name?.trim();
        const pLast = updated[index].parent_last_name?.trim();
        if (pFirst && pLast) {
          const fullName = `${pFirst} ${pLast}`;
          try {
            const cache = JSON.parse(localStorage.getItem('camp_parents_cache') || '{}');
            let cacheUpdated = false;
            
            if (!cache[fullName]) cache[fullName] = {};
            
            const natId = updated[index].parent_national_id;
            if (natId && natId.length === 18 && cache[fullName].national_id !== natId) {
              cache[fullName].national_id = natId;
              cacheUpdated = true;
            }
            
            const phone = updated[index].parent_phone;
            if (phone && phone.length === 10 && cache[fullName].phone !== phone) {
              cache[fullName].phone = phone;
              cacheUpdated = true;
            }
            
            const email = updated[index].parent_email;
            if (email && email.includes('@') && cache[fullName].email !== email) {
              cache[fullName].email = email;
              cacheUpdated = true;
            }
            
            if (cacheUpdated) {
              localStorage.setItem('camp_parents_cache', JSON.stringify(cache));
            }
          } catch {}
        }
      }
      
      return updated;
    });
  };

  // Calculate child age from birth date (precise: years + months)
  const calculateAge = (birthDate: string): string => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return '';
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (today.getDate() < birth.getDate()) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    if (years < 0) return '';
    if (months === 0) return `${years} سنة`;
    return `${years} سنة و ${months} شهر`;
  };

  // Get numeric age for validation
  const getAgeYears = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Handle email blur to auto-append @gmail.com
  const handleEmailBlur = (index: number) => {
    const email = children[index].parent_email;
    if (email && !email.includes('@')) {
      const updated = [...children];
      updated[index].parent_email = email + '@gmail.com';
      setChildren(updated);
    }
  };

  const handleSubmit = async () => {
    if (!batchName.trim()) {
      toast.error("يرجى إدخال اسم الدفعة");
      return;
    }

    // Validate children
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child.child_first_name.trim()) {
        toast.error(`اسم الطفل مطلوب للطفل رقم ${i + 1}`);
        return;
      }
      if (!child.child_last_name.trim()) {
        toast.error(`لقب الطفل مطلوب للطفل رقم ${i + 1}`);
        return;
      }
      if (!child.birth_date.trim()) {
        toast.error(`تاريخ الميلاد مطلوب للطفل رقم ${i + 1}`);
        return;
      }
      
      // Check child age warning
      const age = getAgeYears(child.birth_date);
      if (age > 17) {
        toast.warning(`الطفل رقم ${i + 1} عمره ${calculateAge(child.birth_date)} (أكبر من 17 سنة) - يرجى التأكد من صحة البيانات`);
      } else if (age < 6) {
        toast.warning(`الطفل رقم ${i + 1} عمره ${calculateAge(child.birth_date)} (أقل من 6 سنوات) - يرجى التأكد من صحة البيانات`);
      }
      
      // Validate parent national ID if provided
      if (child.parent_national_id) {
        if (child.parent_national_id.length !== 18) {
          toast.error(`رقم بطاقة التعريف للطفل رقم ${i + 1} يجب أن يكون 18 رقماً (حالياً ${child.parent_national_id.length})`);
          return;
        }

        // Validate parent age based on national ID
        const yearStr = child.parent_national_id.substring(2, 5);
        let yearOfBirth = parseInt(yearStr, 10);
        if (!isNaN(yearOfBirth)) {
          yearOfBirth += (yearOfBirth > 800 ? 1000 : 2000);
          const currentYear = new Date().getFullYear();
          const parentAge = currentYear - yearOfBirth;
          
          if (parentAge < 18) {
            toast.error(`عمر الولي للطفل رقم ${i + 1} يجب أن يكون أكبر من 18 سنة (حسب رقم التعريف: العمر التقريبي ${parentAge} سنة)`);
            return;
          }
        }
      }
      // Validate parent phone if provided
      if (child.parent_phone) {
        if (child.parent_phone.length !== 10) {
          toast.error(`رقم هاتف الولي للطفل رقم ${i + 1} يجب أن يكون 10 أرقام (حالياً ${child.parent_phone.length})`);
          return;
        }
        if (!['05', '06', '07'].some(prefix => child.parent_phone.startsWith(prefix))) {
          toast.error(`رقم هاتف الولي للطفل رقم ${i + 1} يجب أن يبدأ بـ 05 أو 06 أو 07`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      // Update batch information
      await campRegistrationApi.updateBatch(batchId, {
        name: batchName,
        description: batchDescription,
        registration_method: registrationMethod,
        headless_mode: headlessMode,
        delay_between_registrations: delay,
        default_email: baseEmail,
        default_wilaya: defaultWilaya,
        default_commune: defaultCommune
      });

      const sanitizeDate = (d: string | undefined | null) => {
        if (!d) return "2015-01-01";
        const str = d.replace(/x/gi, '01').replace(/_/g, '-');
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
        // Try to extract year if available
        const yearMatch = str.match(/\d{4}/);
        if (yearMatch) return `${yearMatch[0]}-01-01`;
        return "2015-01-01";
      };

      const sanitizeName = (n: string | undefined | null, defaultVal: string) => {
        if (!n || n.trim().length < 2) return defaultVal;
        return n.trim();
      };

      // Separate into new and existing children
      const existingChildren = children.filter(c => !c.isNew);
      const newChildren = children.filter(c => c.isNew);

      // Update existing children in bulk
      if (existingChildren.length > 0) {
        await campRegistrationApi.bulkUpdateChildren(batchId, existingChildren.map(child => ({
          id: child.id,
          child_first_name: sanitizeName(child.child_first_name, "طفل جديد"),
          child_last_name: sanitizeName(child.child_last_name, "بدون لقب"),
          birth_date: sanitizeDate(child.birth_date),
          gender: child.gender || undefined,
          child_country: "الجزائر",
          birth_wilaya: child.birth_wilaya || undefined,
          birth_commune: child.birth_commune || undefined,
          residence_wilaya: child.residence_wilaya || "68",
          residence_commune: child.residence_commune || undefined,
          address: child.address || undefined,
          parent_first_name: child.parent_first_name || undefined,
          parent_last_name: child.parent_last_name || undefined,
          parent_phone: child.parent_phone || undefined,
          parent_email: child.parent_email || undefined,
          parent_national_id: child.parent_national_id || undefined,
          youth_institution: child.youth_institution || undefined,
          unified_member_number: child.unified_member_number || undefined,
          child_photo_path: child.child_photo_path || undefined,
          birth_certificate_path: child.birth_certificate_path || undefined,
          force_registration: child.force_registration || false
        })));
      }

      // Add new children
      if (newChildren.length > 0) {
        await campRegistrationApi.addChildrenToBatch(batchId, {
          name: batchName,
          headless_mode: false,
          delay_between_registrations: 5,
          children: newChildren.map(child => ({
            child_first_name: sanitizeName(child.child_first_name, "طفل جديد"),
            child_last_name: sanitizeName(child.child_last_name, "بدون لقب"),
            birth_date: sanitizeDate(child.birth_date),
            gender: child.gender || undefined,
            child_country: "الجزائر",
            birth_wilaya: child.birth_wilaya || undefined,
            birth_commune: child.birth_commune || undefined,
            residence_wilaya: child.residence_wilaya || "68",
            residence_commune: child.residence_commune || undefined,
            address: child.address || undefined,
            parent_first_name: child.parent_first_name || undefined,
            parent_last_name: child.parent_last_name || undefined,
            parent_phone: child.parent_phone || undefined,
            parent_email: child.parent_email || undefined,
            parent_national_id: child.parent_national_id || undefined,
            youth_institution: child.youth_institution || undefined,
            unified_member_number: child.unified_member_number || undefined,
            child_photo_path: child.child_photo_path || undefined,
            birth_certificate_path: child.birth_certificate_path || undefined,
            force_registration: child.force_registration || false
          })) as any
        });
      }
      toast.success("تم تحديث بيانات جميع الأطفال بنجاح");
      router.push(`/camp-registration/${batchId}`);
    } catch (error) {
      const errMsg = getErrorMessage(error);
      console.error("❌ Mass edit save failed:", error);
      toast.error(`فشل في تحديث بيانات الدفعة: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <PermissionGuard module="camp_registration" action="view">
        <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href={`/camp-registration/${batchId}`}>
          <Button variant="outline" size="icon" className="mt-1 shrink-0 h-9 w-9 rounded-xl">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">تعديل الدفعة: {batchName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">تحديث بيانات أطفال الدفعة بشكل جماعي</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 border border-border/50 rounded-xl">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 ml-2">
            <input type="checkbox" id="skip_duplicates" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary/30 h-3.5 w-3.5" />
            <label htmlFor="skip_duplicates" className="cursor-pointer select-none text-xs text-muted-foreground">تخطي المكرر</label>
          </div>
          <div className="w-px h-5 bg-border/60" />
          <Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="sm" disabled={isImporting} className="h-8 text-muted-foreground">
            {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" /> : <Upload className="w-3.5 h-3.5 ml-1.5" />}
            استيراد CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
        </div>
        <div className="flex-1" />
        <Button onClick={handleStartSmartExtract} variant="ghost" size="sm" disabled={isSmartImporting}
          className="h-8 text-primary hover:bg-primary/5">
          {isSmartImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" /> : null}
          {isSmartImporting ? "جاري الاستخراج..." : "الاستخراج الذكي"}
        </Button>
      </div>

      {/* Auto-save indicator */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-l from-primary/[0.04] to-transparent border border-primary/10 rounded-xl">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">الحفظ التلقائي</span>
            {lastSaved ? <> — آخر حفظ: <span dir="ltr" className="tabular-nums">{lastSaved.toLocaleTimeString('ar-DZ')}</span></> : <> — مفعّل</>}
          </span>
        </div>
        {draftLoaded && (
          <Button type="button" variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
            onClick={() => { clearDraft(); setBatchName(''); setBatchDescription(''); setChildren([{ ...emptyChild }]); toast.success('تم مسح المسودة'); }}>
            مسح المسودة
          </Button>
        )}
      </div>

      {/* Inline Extraction Progress */}
      {isSmartImporting && extractProgress && (
        <div className="bg-gradient-to-l from-primary/[0.06] to-transparent border border-primary/10 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              جاري الاستخراج الذكي من الخلفية...
            </div>
            <div className="text-xs font-medium text-muted-foreground tabular-nums">
              {extractProgress.processed} / {extractProgress.total} مجلد
            </div>
          </div>
          <div className="w-full bg-primary/10 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-l from-primary to-primary/70 h-full rounded-full transition-all duration-500"
              style={{ width: `${(extractProgress.processed / (extractProgress.total || 1)) * 100}%` }} />
          </div>
          {extractProgress.current_folder && (
            <div className="mt-1.5 text-[11px] text-muted-foreground/60 truncate font-mono" dir="ltr">
              📁 {extractProgress.current_folder}
            </div>
          )}
        </div>
      )}

      {/* Batch Info */}
      <div className="bg-white dark:bg-slate-900 border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Layers className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">معلومات الدفعة</h2>
              <p className="text-xs text-muted-foreground">البيانات الأساسية للدفعة والإعدادات الافتراضية</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">اسم الدفعة</Label>
              <Input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="مثال: دفعة أفريل 2025"
                className="rounded-xl border-border/70 focus:border-primary/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الوصف</Label>
              <Textarea value={batchDescription} onChange={(e) => setBatchDescription(e.target.value)} placeholder="وصف اختياري للدفعة..."
                className="rounded-xl border-border/70 focus:border-primary/50 min-h-[40px]" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الولاية الافتراضية</Label>
              <SearchableSelect options={wilayaOptions} value={defaultWilaya} onValueChange={handleDefaultWilayaChange}
                placeholder="اختر الولاية الافتراضية" disabled={loadingWilayas} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">البلدية الافتراضية</Label>
              <SearchableSelect options={getMunicipalityOptions(defaultWilaya)} value={defaultCommune} onValueChange={setDefaultCommune}
                placeholder="اختر البلدية الافتراضية" disabled={loadingMunicipalities || !defaultWilaya} />
            </div>
          </div>

          <div className="border-t border-border/40 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground/80">إعدادات التشغيل</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">طريقة التسجيل</Label>
                <select value={registrationMethod} onChange={(e) => setRegistrationMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border/70 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all">
                  <option value="api">API سريع (مباشر)</option>
                  <option value="bot">بوت تلقائي (Selenium)</option>
                </select>
                <p className="text-xs text-muted-foreground">اختر بين الـ API السريع أو البوت المرئي.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">وضع Headless</Label>
                <select value={headlessMode ? "true" : "false"} onChange={(e) => setHeadlessMode(e.target.value === "true")}
                  className="w-full h-10 px-3 rounded-xl border border-border/70 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all">
                  <option value="false">لا (مع واجهة)</option>
                  <option value="true">نعم (بدون واجهة)</option>
                </select>
                <p className="text-xs text-muted-foreground">{headlessMode ? "سيعمل المتصفح في الخلفية" : "سيظهر المتصفح أثناء العمل"}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">عدد العمال (التوازي)</Label>
                <Input type="number" value={delay} onChange={(e) => setDelay(parseInt(e.target.value) || 5)} min={1} max={60}
                  className="rounded-xl border-border/70 focus:border-primary/50" />
              </div>
            </div>
          </div>

          <div className="border-t border-border/40 pt-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground/80">الإيميل الأساسي (توليد إيميلات فرعية)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input value={baseEmail} onChange={(e) => setBaseEmail(e.target.value)} placeholder="مثال: myemail@gmail.com" dir="ltr"
                className="flex-1 min-w-[200px] rounded-xl border-border/70 focus:border-primary/50" />
              <Button type="button" variant="outline" size="sm"
                onClick={() => {
                  if (!baseEmail) { toast.error("يرجى إدخال إيميل أولاً"); return; }
                  if (!baseEmail.includes('@')) { toast.error("يرجى إدخال إيميل صحيح"); return; }
                  const [username] = baseEmail.split('@');
                  const cleanUsername = username.replace(/\./g, '');
                  const maxVariants = Math.pow(2, cleanUsername.length - 1);
                  const neededEnd = emailStartIndex + children.length;
                  if (neededEnd > maxVariants) { toast.error(`الإيميلات المتبقية (${maxVariants - emailStartIndex}) أقل من عدد الأطفال (${children.length}). الحد الأقصى ${maxVariants}، المستخدم ${emailStartIndex}`); return; }
                  const updated = applyDotEmails(baseEmail, children, emailStartIndex);
                  setChildren(updated);
                  const newIndex = emailStartIndex + children.length;
                  setEmailStartIndex(newIndex);
                  try { localStorage.setItem('camp_base_email', baseEmail); localStorage.setItem('camp_email_index', newIndex.toString()); } catch {}
                  toast.success(`تم توزيع ${children.length} إيميل فرعي (من #${emailStartIndex + 1} إلى #${newIndex})`);
                }}
                className="rounded-xl">
                توزيع الإيميلات
              </Button>
              {emailStartIndex > 0 && (
                <Button type="button" variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => { setEmailStartIndex(0); try { localStorage.setItem('camp_email_index', '0'); } catch {} toast.success("تم إعادة العداد إلى 0"); }}>
                  إعادة العداد
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="flex items-center gap-1"><Info className="w-3 h-3 inline" /> حيلة النقطة في Gmail: يتم توليد إيميل فريد لكل طفل تلقائياً.</p>
              {baseEmail && baseEmail.includes('@') && (() => {
                const [u] = baseEmail.split('@'); const clean = u.replace(/\./g, ''); const max = Math.pow(2, clean.length - 1); const remaining = max - emailStartIndex;
                return <p>الحد الأقصى: <span className="font-medium text-foreground/70">{max}</span> إيميل — المتبقي: <span className="font-medium text-foreground/70">{remaining}</span> إيميل.
                  {emailStartIndex > 0 && <> آخر رقم مستخدم: <span className="font-medium text-amber-600">#{emailStartIndex}</span></>}</p>;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Children */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold">الأطفال</h2>
              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground/70">{children.length}</span> طفل في الدفعة</p>
            </div>
          </div>
          <div className="flex gap-2">
            {children.length > 1 && (
              <>
                <Button onClick={() => {
                  if (confirm("هل تريد تفعيل التسجيل القسري لجميع الأطفال؟ (سيتم تجاوز فحص التكرار)")) {
                    setChildren(prev => prev.map(c => ({ ...c, force_registration: true })));
                    toast.success("تم تفعيل التسجيل القسري للكل");
                  }
                }} variant="outline" size="sm" className="h-8 text-amber-600 border-amber-200 hover:bg-amber-50">
                  <AlertTriangle className="w-3.5 h-3.5 ml-1.5" />
                  تسجيل قسري للكل
                </Button>
                <Button onClick={collapseAll} variant="ghost" size="sm" className="h-8 text-muted-foreground">
                  <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
                  طي
                </Button>
                <Button onClick={expandAll} variant="ghost" size="sm" className="h-8 text-muted-foreground">
                  <ChevronUp className="w-3.5 h-3.5 ml-1.5" />
                  توسيع
                </Button>
              </>
            )}
          </div>
        </div>

        {children.map((child, index) => {
          const isCollapsed = collapsedChildren.has(index);
          const childName = `${child.child_last_name || ''} ${child.child_first_name || ''}`.trim() || `طفل #${index + 1}`;
          const age = child.birth_date ? calculateAge(child.birth_date) : '';
          const ageYears = child.birth_date ? getAgeYears(child.birth_date) : null;
          const hasData = child.child_first_name || child.child_last_name || child.birth_date;
          const hasWarning = ageYears !== null && (ageYears >= 17 || ageYears < 6);
          
          return (
            <div key={child.id || index} data-child-index={index}
              className="bg-white dark:bg-slate-900 border border-border/60 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
              <div className={`px-5 py-3.5 flex items-center justify-between cursor-pointer select-none transition-colors ${isCollapsed ? 'bg-muted/20' : 'bg-white dark:bg-slate-900 border-b border-border/40'}`}
                onClick={() => toggleChildCollapse(index)}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${hasData ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm truncate">{childName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">#{index + 1}</span>
                      {child.isNew && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">جديد</span>
                      )}
                    </div>
                    {isCollapsed && hasData && (
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {age && (
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${hasWarning ? 'bg-red-50 text-red-600' : 'bg-muted text-muted-foreground'}`}>
                            🎂 {age}
                          </span>
                        )}
                        {child.gender && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {child.gender === 'ذكر' ? '♂' : '♀'} {child.gender}
                          </span>
                        )}
                        {child.parent_phone && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono" dir="ltr">
                            📱 {child.parent_phone}
                          </span>
                        )}
                        {child.parent_national_id?.length === 18 && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-green-50 text-green-700">✓ اكتمل</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {hasWarning && hasData && !isCollapsed && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">تحذير العمر</span>
                  )}
                  {(child.child_photo_path || child.birth_certificate_path) && (
                    <Button variant="ghost" size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await campRegistrationApi.reExtractChild(batchId, child.id);
                          toast.success(`تم بدء إعادة الاستخراج الذكي لـ ${childName}`);
                          // تحديث البيانات بعد 3 ثوانٍ لاستلام النتائج من المعالجة الخلفية
                          setTimeout(async () => {
                            try {
                              const refreshed = await campRegistrationApi.getBatch(batchId);
                              const batch = refreshed.data;
                              if (batch.children && batch.children.length > 0) {
                                const loadedChildren = batch.children.map((c: any) => {
                                  const genderValue = c.gender === "MALE" ? "ذكر" : c.gender === "FEMALE" ? "أنثى" : c.gender || "ذكر";
                                  const birthWilaya = resolveWilayaCode(c.birth_wilaya || "", wilayas);
                                  const residenceWilaya = resolveWilayaCode(c.residence_wilaya || "", wilayas);
                                  return {
                                    id: c.id,
                                    isNew: false,
                                    child_first_name: c.child_first_name || "",
                                    child_last_name: c.child_last_name || "",
                                    birth_date: c.birth_date || "",
                                    gender: genderValue,
                                    birth_wilaya: birthWilaya,
                                    birth_commune: c.birth_commune || "",
                                    residence_wilaya: residenceWilaya,
                                    residence_commune: c.residence_commune || "",
                                    address: c.address || "",
                                    parent_first_name: c.parent_first_name || "",
                                    parent_last_name: c.parent_last_name || "",
                                    parent_phone: c.parent_phone || "",
                                    parent_email: c.parent_email || "",
                                    parent_national_id: c.parent_national_id || "",
                                    youth_institution: c.youth_institution || "",
                                    unified_member_number: c.unified_member_number || "",
                                    child_photo_path: c.child_photo_path || "",
                                    birth_certificate_path: c.birth_certificate_path || "",
                                    folder_name: c.folder_name || "",
                                    force_registration: c.force_registration || false,
                                  };
                                });
                                setChildren(loadedChildren);
                              }
                            } catch (e) {
                              console.error('Failed to refresh batch after re-extract:', e);
                            }
                          }, 3000);
                        } catch (err) {
                          console.error('Failed to re-extract child:', err);
                          toast.error('فشل في إعادة الاستخراج');
                        }
                      }}
                      className="text-amber-500 hover:text-amber-700 hover:bg-amber-50 h-8 px-2 text-xs gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                      إعادة استخراج
                    </Button>
                  )}
                  <Button variant="ghost" size="sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm(`هل تريد حذف الطفل: ${childName}؟`)) return;
                      if (!child.isNew && child.id) {
                        try { await campRegistrationApi.deleteChild(batchId, child.id); }
                        catch (err) { console.error('Failed to delete child from backend:', err); toast.error('فشل في حذف الطفل من قاعدة البيانات'); return; }
                      }
                      setChildren(prev => prev.filter((_, i) => i !== index));
                      toast.success(`تم حذف ${childName}`);
                    }}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <div className="text-muted-foreground">
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </div>
              </div>
              {!isCollapsed && (
              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">لقب الطفل <span className="text-red-500">*</span></Label>
                  <Input value={child.child_last_name} onChange={(e) => updateChild(index, "child_last_name", e.target.value)}
                    onBlur={() => { if (child.child_last_name && !child.parent_last_name) { updateChild(index, "parent_last_name", child.child_last_name); } }}
                    placeholder="اللقب" className="rounded-xl border-border/70 focus:border-primary/50" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">اسم الطفل <span className="text-red-500">*</span></Label>
                  <Input value={child.child_first_name} onChange={(e) => updateChild(index, "child_first_name", e.target.value)}
                    placeholder="الاسم" className="rounded-xl border-border/70 focus:border-primary/50" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">تاريخ الميلاد <span className="text-red-500">*</span></Label>
                  <DateTimePicker
                    value={child.birth_date}
                    onChange={(value) => updateChild(index, "birth_date", value)}
                    placeHolder="YYYY-MM-DD"
                  />
                  {child.birth_date && (
                    <div className="mt-1">
                      <span className="text-sm text-muted-foreground">
                        🎂 {calculateAge(child.birth_date)}
                      </span>
                      {(getAgeYears(child.birth_date) >= 17 || getAgeYears(child.birth_date) < 6) && (
                        <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
                          ⚠️ تنبيه: عمر الطفل {calculateAge(child.birth_date)} {getAgeYears(child.birth_date) >= 17 ? '(أكبر من 17 سنة)' : '(أقل من 6 سنوات)'}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الجنس</Label>
                  <select value={child.gender} onChange={(e) => updateChild(index, "gender", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border/70 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all">
                    <option value="">اختر</option>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">ولاية الميلاد</Label>
                  <SearchableSelect options={wilayaOptions} value={child.birth_wilaya} onValueChange={(value) => handleWilayaChange(value, index, 'birth')}
                    placeholder="اختر الولاية" disabled={loadingWilayas} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">بلدية الميلاد</Label>
                  <SearchableSelect options={getMunicipalityOptions(child.birth_wilaya)} value={child.birth_commune}
                    onValueChange={(value) => updateChild(index, "birth_commune", value)} placeholder="اختر البلدية"
                    disabled={loadingMunicipalities || !child.birth_wilaya} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">ولاية الإقامة</Label>
                  <SearchableSelect options={wilayaOptions} value={child.residence_wilaya}
                    onValueChange={(value) => handleWilayaChange(value, index, 'residence')}
                    placeholder="اختر الولاية" disabled={loadingWilayas} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">بلدية الإقامة</Label>
                  <SearchableSelect options={getMunicipalityOptions(child.residence_wilaya || "68", true)} value={child.residence_commune}
                    onValueChange={(value) => updateChild(index, "residence_commune", value)} placeholder="اختر البلدية"
                    disabled={loadingMunicipalities || !child.residence_wilaya} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">العنوان</Label>
                  <Input value={child.address} onChange={(e) => updateChild(index, "address", e.target.value)}
                    placeholder="أدخل العنوان" className="rounded-xl border-border/70 focus:border-primary/50" />
                  <p className="text-xs text-muted-foreground">💡 سيتم إضافة البلدية وولاية بوسعادة تلقائياً</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">لقب الولي</Label>
                  <Input value={child.parent_last_name} onChange={(e) => updateChild(index, "parent_last_name", e.target.value)}
                    placeholder="لقب الولي" className="rounded-xl border-border/70 focus:border-primary/50" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">اسم الولي</Label>
                  <Input value={child.parent_first_name} onChange={(e) => updateChild(index, "parent_first_name", e.target.value)}
                    placeholder="اسم الولي" className="rounded-xl border-border/70 focus:border-primary/50" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">هاتف الولي</Label>
                  <Input value={child.parent_phone} onChange={(e) => updateChild(index, "parent_phone", e.target.value)}
                    placeholder="05/06/07XXXXXXXX" maxLength={10} pattern="(05|06|07)\d{8}" inputMode="numeric" dir="ltr"
                    className={`rounded-xl border-border/70 focus:border-primary/50 ${child.parent_phone.length === 10 && ['05', '06', '07'].some(p => child.parent_phone.startsWith(p)) ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`} />
                  <p className="text-xs text-muted-foreground">📱 يجب أن يكون 10 أرقام ويبدأ بـ 05 أو 06 أو 07</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">بريد الولي</Label>
                  <Input type="email" value={child.parent_email} onChange={(e) => updateChild(index, "parent_email", e.target.value)}
                    onBlur={() => handleEmailBlur(index)} placeholder="email@example.com" dir="ltr"
                    className="rounded-xl border-border/70 focus:border-primary/50" />
                  <p className="text-xs text-muted-foreground">💡 سيتم إضافة @gmail.com تلقائياً</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">رقم بطاقة الولي</Label>
                  <Input value={child.parent_national_id} onChange={(e) => updateChild(index, "parent_national_id", e.target.value)}
                    placeholder="أدخل 18 رقماً" maxLength={18} pattern="\d{18}" inputMode="numeric" dir="ltr"
                    className={`rounded-xl border-border/70 focus:border-primary/50 ${child.parent_national_id.length === 18 ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`} />
                  <p className="text-xs text-muted-foreground">🔢 يجب أن يتكون من 18 رقماً</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">رقم الانخراط الموحد (YouthConnect)</Label>
                  <Input value={child.unified_member_number || ''} onChange={(e) => updateChild(index, 'unified_member_number', e.target.value)}
                    placeholder="مثال: 280709-26-1-012-0084" dir="ltr"
                    className="rounded-xl border-border/70 focus:border-primary/50" />
                  <p className="text-xs text-muted-foreground">💡 رقم الانخراط الموحد من منصة المنخرطين (اختياري)</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">مسار صورة الطفل</Label>
                  <div className="flex gap-2">
                    <Input value={child.child_photo_path} onChange={(e) => updateChild(index, "child_photo_path", e.target.value)}
                      placeholder="/path/to/photo.jpg" dir="ltr" className="flex-1 rounded-xl border-border/70 focus:border-primary/50" />
                    {child.child_photo_path && (
                      <Button type="button" variant="outline" className="w-10 h-10 p-0 rounded-xl shrink-0"
                        onClick={() => window.open(getStorageUrl(child.child_photo_path) || "#", "_blank")}>
                        <Eye className="w-4 h-4 text-slate-500" />
                      </Button>
                    )}
                    <div className="relative overflow-hidden shrink-0">
                      <Button type="button" variant="outline" className="w-10 h-10 p-0 rounded-xl"><Upload className="w-4 h-4" /></Button>
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) { updateChild(index, "child_photo_path", file.name); e.target.value = ''; } }} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">مسار شهادة الميلاد</Label>
                  <div className="flex gap-2">
                    <Input value={child.birth_certificate_path} onChange={(e) => updateChild(index, "birth_certificate_path", e.target.value)}
                      placeholder="certificate.pdf" dir="ltr" className="flex-1 rounded-xl border-border/70 focus:border-primary/50" />
                    {child.birth_certificate_path && (
                      <Button type="button" variant="outline" className="w-10 h-10 p-0 rounded-xl shrink-0"
                        onClick={() => window.open(getStorageUrl(child.birth_certificate_path) || "#", "_blank")}>
                        <Eye className="w-4 h-4 text-slate-500" />
                      </Button>
                    )}
                    <div className="relative overflow-hidden shrink-0">
                      <Button type="button" variant="outline" className="w-10 h-10 p-0 rounded-xl"><Upload className="w-4 h-4" /></Button>
                      <input type="file" accept=".pdf,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) { updateChild(index, "birth_certificate_path", file.name); e.target.value = ''; } }} />
                    </div>
                  </div>
                </div>
              </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between gap-4 p-4 bg-gradient-to-l from-primary/[0.03] to-transparent border border-primary/10 rounded-2xl">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">{children.filter(c => c.child_first_name || c.child_last_name).length}</span> طفل مكتمل البيانات من أصل <span className="font-medium text-foreground/70">{children.length}</span>
        </div>
        <div className="flex gap-3">
          <Link href={`/camp-registration/${batchId}`}>
            <Button variant="outline" size="sm" className="rounded-xl">إلغاء</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={isSubmitting} size="sm"
            className="rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-sm">
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الحفظ...</>
            ) : (
              <><Save className="w-4 h-4 ml-2" /> حفظ التعديلات</>
            )}
          </Button>
        </div>
      </div>
      {/* Smart Import Modal */}
      {showSmartImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSmartImportModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">الاستيراد السحري للبيانات</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">استخراج بيانات الأطفال بالذكاء الاصطناعي</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowSmartImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gradient-to-l from-primary/[0.06] to-transparent border border-primary/10 rounded-xl p-3.5 text-sm text-foreground/80">
                <p>سيقوم النظام بفحص المجلد المختار واستخراج بيانات الأطفال من الصور وشهادات الميلاد تلقائياً باستخدام الذكاء الاصطناعي.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">مسار المجلد على السيرفر</label>
                <input type="text" placeholder="/path/to/folder" value={smartImportDir} onChange={(e) => setSmartImportDir(e.target.value)} dir="ltr"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <Button variant="outline" onClick={() => setShowSmartImportModal(false)} disabled={isSmartImporting} className="flex-1 rounded-xl">إلغاء</Button>
              <Button onClick={handleStartSmartExtract} disabled={isSmartImporting || !smartImportDir.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-sm">
                {isSmartImporting ? <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري...</> : "بدء الاستخراج"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PermissionGuard>
              );
}