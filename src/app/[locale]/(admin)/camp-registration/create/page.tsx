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
import { useSearchParams, useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Plus, Trash2, Save, Loader2, ArrowLeft, Upload, Download, ChevronDown, ChevronUp, ScanLine, X, Layers, Settings2, Mail, Info, Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Link } from "@/i18n/routing";
import { Suspense } from "react";
import { campRegistrationApi, CreateBatchRequest } from "@/lib/api/camp-registration";
import { useAuthStore } from "@/lib/stores/auth";
import { locationsApi, Wilaya, Municipality } from "@/lib/api/locations";
import { institutionsApi, YouthInstitution } from "@/lib/api/institutions";
import { PermissionGuard } from "@/hooks/useRequirePermission";

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
  folder_name?: string; // اسم المجلد (للاستخراج الذكي - معرف فريد)
  force_registration?: boolean; // خيار التسجيل القسري
  id: string;
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

function CreateBatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const existingBatchId = searchParams.get('batchId');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasExistingChildrenRef = useRef(false);
  const [batchName, setBatchName] = useState("");
  const [batchDescription, setBatchDescription] = useState("");
  const [registrationMethod, setRegistrationMethod] = useState('api');
  const [headlessMode, setHeadlessMode] = useState(false);
  const [delay, setDelay] = useState(5);
  const [baseEmail, setBaseEmail] = useState("");
  const [emailStartIndex, setEmailStartIndex] = useState(0);
  const [defaultWilaya, setDefaultWilaya] = useState("68");
  const [defaultCommune, setDefaultCommune] = useState("");
  const [children, setChildren] = useState<ChildData[]>([{ ...emptyChild }]);
  const [collapsedChildren, setCollapsedChildren] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [smartImportDir, setSmartImportDir] = useState('');
  const [isSmartImporting, setIsSmartImporting] = useState(false);
  const [aiProvider, setAiProvider] = useState<"gemini" | "groq">("gemini");
  const [retryFailedOnly, setRetryFailedOnly] = useState(false);
  const [institutions, setInstitutions] = useState<YouthInstitution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [extractJobId, setExtractJobId] = useState<string | null>(null);
  const [extractProgress, setExtractProgress] = useState<any>(null);
  const [pendingNewChildren, setPendingNewChildren] = useState<ChildData[] | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showDuplicateUpdateDialog, setShowDuplicateUpdateDialog] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [duplicateChildren, setDuplicateChildren] = useState<ChildData[]>([]);
  const [forceCampOnMemberFail, setForceCampOnMemberFail] = useState(false);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  // Scan Upload state
  const [showScanUpload, setShowScanUpload] = useState(false);
  const [scanFolderName, setScanFolderName] = useState('');
  const [scanPhoto, setScanPhoto] = useState<File | null>(null);
  const [scanCert, setScanCert] = useState<File | null>(null);
  const [scanGuardianId, setScanGuardianId] = useState<File | null>(null);
  const [isUploadingScan, setIsUploadingScan] = useState(false);
  const [scanUploadCount, setScanUploadCount] = useState(0);
  const [createdBatchId, setCreatedBatchId] = useState<string | null>(existingBatchId);

  // دالة لإنشاء مفتاح فريد للطفل للتحقق من التكرار
  const getChildKey = (child: ChildData): string => {
    // اسم ملف الصورة هو المعرف الوحيد - يقارن باسم الملف فقط (بدون مسار ولا امتداد)
    const photoPath = child.child_photo_path || '';
    const fileName = photoPath.split('/').pop() || ''; // آخر جزء بعد الشرطة
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, ''); // أزل الامتداد (.jpg, .png ...)
    return nameWithoutExt ? `photo:${nameWithoutExt}` : '';
  };

  const DRAFT_KEY = 'camp_batch_draft';

  // Load saved config + draft from localStorage on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('camp_base_email');
      const savedIndex = localStorage.getItem('camp_email_index');
      if (savedEmail) setBaseEmail(savedEmail);
      if (savedIndex) setEmailStartIndex(parseInt(savedIndex) || 0);

      const savedWilaya = localStorage.getItem('camp_default_wilaya');
      const savedCommune = localStorage.getItem('camp_default_commune');
      if (savedWilaya) setDefaultWilaya(savedWilaya);
      if (savedCommune) setDefaultCommune(savedCommune);

      // Restore draft if exists
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        // Only restore if there's meaningful data (more than default)
        const hasChildren = parsed.children && parsed.children.length > 0 &&
          parsed.children.some((c: ChildData) => c.child_first_name || c.child_last_name);
        if (hasChildren || parsed.batchName) {
          setBatchName(parsed.batchName || '');
          setBatchDescription(parsed.batchDescription || '');
          setHeadlessMode(parsed.headlessMode || false);
          setDelay(parsed.delay || 5);
          if (parsed.baseEmail) setBaseEmail(parsed.baseEmail);
          setChildren(parsed.children || [{ ...emptyChild }]);
          setDraftLoaded(true);
          const savedAt = parsed.savedAt ? new Date(parsed.savedAt) : null;
          setLastSaved(savedAt);
          const childCount = parsed.children?.filter((c: ChildData) => c.child_first_name || c.child_last_name).length || 0;
          toast.info(`تم استعادة مسودة محفوظة (${childCount} طفل)`, { duration: 5000 });
          if (parsed.institution_id) setSelectedInstitutionId(parsed.institution_id);
          if (parsed.force_camp_on_member_fail !== undefined) setForceCampOnMemberFail(parsed.force_camp_on_member_fail);
        }
      }
    } catch { }
  }, []);

  // Auto-save draft to localStorage every 5 seconds
  const saveDraft = useCallback(() => {
    try {
      const draft = {
        batchName,
        batchDescription,
        headlessMode,
        delay,
        baseEmail,
        children,
        institution_id: selectedInstitutionId,
        force_camp_on_member_fail: forceCampOnMemberFail,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setLastSaved(new Date());

      // Also update parents cache
      const cache = JSON.parse(localStorage.getItem('camp_parents_cache') || '{}');
      let cacheUpdated = false;
      children.forEach(child => {
        const pFirst = child.parent_first_name?.trim();
        const pLast = child.parent_last_name?.trim();
        if (pFirst && pLast) {
          const fullName = `${pFirst} ${pLast}`;
          if (child.parent_national_id && child.parent_national_id.length === 18) {
            if (!cache[fullName]) cache[fullName] = {};
            if (cache[fullName].national_id !== child.parent_national_id) {
              cache[fullName].national_id = child.parent_national_id;
              cacheUpdated = true;
            }
          }
          if (child.parent_phone && child.parent_phone.length === 10) {
            if (!cache[fullName]) cache[fullName] = {};
            if (cache[fullName].phone !== child.parent_phone) {
              cache[fullName].phone = child.parent_phone;
              cacheUpdated = true;
            }
          }
          if (child.parent_email && child.parent_email.includes('@')) {
            if (!cache[fullName]) cache[fullName] = {};
            if (cache[fullName].email !== child.parent_email) {
              cache[fullName].email = child.parent_email;
              cacheUpdated = true;
            }
          }
        }
      });
      if (cacheUpdated) {
        localStorage.setItem('camp_parents_cache', JSON.stringify(cache));
      }
    } catch { }
  }, [batchName, batchDescription, headlessMode, delay, baseEmail, children, selectedInstitutionId, forceCampOnMemberFail]);

  useEffect(() => {
    const timer = setTimeout(saveDraft, 5000);
    return () => clearTimeout(timer);
  }, [saveDraft]);

  useEffect(() => {
    localStorage.setItem('camp_default_wilaya', defaultWilaya);
  }, [defaultWilaya]);

  useEffect(() => {
    localStorage.setItem('camp_default_commune', defaultCommune);
  }, [defaultCommune]);

  // Clear draft
  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { }
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
    const variants = generateGmailDotVariants(email, childrenList.length, startFrom);
    if (variants.length === 0) return childrenList;
    return childrenList.map((child, i) => ({
      ...child,
      parent_email: variants[i] || variants[variants.length - 1],
    }));
  };

  // Get a single next email variant for one child
  const getNextDotEmail = (email: string, index: number): string => {
    if (!email || !email.includes('@')) return '';
    const variants = generateGmailDotVariants(email, 1, index);
    return variants[0] || '';
  };

  // Locations state
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loadingWilayas, setLoadingWilayas] = useState(false);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);

  useEffect(() => {
    hasExistingChildrenRef.current = children.some(c => c.child_first_name || c.child_last_name);
  }, [children]);

  useEffect(() => {
    if (pendingNewChildren && !children.some(c => c.child_first_name || c.child_last_name)) {
      setChildren(prev => {
        const base = (prev.length === 1 && !prev[0].child_first_name && !prev[0].child_last_name) ? [] : prev;
        return [...base, ...pendingNewChildren];
      });
      setPendingNewChildren(null);
    }
  }, [pendingNewChildren]);

  // Polling effect for smart extract progress
  useEffect(() => {
    let interval: any;
    if (extractJobId) {
      interval = setInterval(async () => {
        try {
          const res = await campRegistrationApi.getSmartExtractProgress(extractJobId);
          setExtractProgress(res.data);

          if (res.data.status === "completed" || res.data.status === "stopped") {
            clearInterval(interval);
            setIsSmartImporting(false);
            setExtractJobId(null);
            toast.success(`تم استخراج ${res.data.success} من أصل ${res.data.total} مجلد`);

            // Map results to children
            if (res.data.results && res.data.results.length > 0) {
              const newChildren: any[] = [];
              const wilayasToFetch = new Set<string>();

              res.data.results.forEach((r: any) => {
                if ((r.status === "success" || r.status === "cached") && r.mapped_data) {
                  const w_code = r.mapped_data.birth_wilaya;
                  if (w_code) {
                    const targetCode = parseInt(w_code, 10);
                    if (!municipalities.some(m => parseInt(m.wilaya_code, 10) === targetCode)) {
                      wilayasToFetch.add(w_code);
                    }
                  }
                }
              });

              // Fetch all missing municipalities at once
              if (wilayasToFetch.size > 0) {
                toast.info(`جاري جلب بلديات لـ ${wilayasToFetch.size} ولاية جديدة...`);
                try {
                  const results = await Promise.all(Array.from(wilayasToFetch).map(code => locationsApi.getMunicipalities(code)));
                  const allNewMunis = results.flat();
                  if (allNewMunis.length > 0) {
                    setMunicipalities(prev => {
                      const existingIds = new Set(prev.map(m => m.id));
                      const uniqueNew = allNewMunis.filter(m => !existingIds.has(m.id));
                      return [...prev, ...uniqueNew];
                    });
                    // Small delay to ensure state propagates
                    await new Promise(r => setTimeout(r, 1000));
                  }
                } catch (e) {
                  console.error("Failed to fetch municipalities during polling", e);
                }
              }

              res.data.results.forEach((r: any) => {
                if (r.status === "success" || r.status === "cached") {
                  const data = r.mapped_data;
                  if (data) {
                    let extractedAddress = data.address || "";
                    if (defaultCommune) {
                      const communeObj = municipalities.find(m => m.id === defaultCommune || m.code === defaultCommune);
                      if (communeObj) {
                        extractedAddress = `بلدية ${communeObj.name_ar} - ولاية بوسعادة`;
                      }
                    }
                    newChildren.push({
                      id: crypto.randomUUID(),
                      child_first_name: data.child_first_name || "",
                      child_last_name: data.child_last_name || "",
                      birth_date: data.birth_date || "",
                      gender: data.gender || "MALE",
                      birth_wilaya: data.birth_wilaya || "",
                      birth_commune: data.birth_commune || "",
                      residence_wilaya: "68",
                      residence_commune: defaultCommune || data.residence_commune || "",
                      address: extractedAddress,
                      parent_first_name: data.parent_first_name || "",
                      parent_last_name: data.parent_last_name || "",
                      parent_phone: data.parent_phone || "",
                      parent_email: data.parent_email || "",
                      parent_national_id: data.parent_national_id || "",
                      youth_institution: "",
                      unified_member_number: data.unified_member_number || "",
                      child_photo_path: data.child_photo_path || r.folder_name || "",
                      birth_certificate_path: data.birth_certificate_path || r.folder_name || "",
                      folder_name: r.folder_name || "", // للمقارنة في getChildKey
                    });
                  }
                } else if (r.status === "failed") {
                  toast.error(`خطأ في ${r.folder_name}: ${r.error_message}`);
                }
              });

              if (newChildren.length > 0) {
                setPendingNewChildren(newChildren);
                setShowMergeDialog(true);
              }
            }
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [extractJobId, defaultCommune, municipalities]);

  // Automatic municipality fetcher for any wilaya used in children
  useEffect(() => {
    const usedWilayas = new Set<string>();
    children.forEach(c => {
      if (c.birth_wilaya) usedWilayas.add(c.birth_wilaya);
      if (c.residence_wilaya) usedWilayas.add(c.residence_wilaya);
    });
    if (defaultWilaya) usedWilayas.add(defaultWilaya);

    const wilayasToFetch = Array.from(usedWilayas).filter(code => {
      const targetCode = parseInt(code, 10);
      return !municipalities.some(m => parseInt(m.wilaya_code, 10) === targetCode);
    });

    if (wilayasToFetch.length > 0) {
      const fetchNewMunicipalities = async () => {
        try {
          // Prevent multiple simultaneous fetches for the same wilayas
          const results = await Promise.all(wilayasToFetch.map(code => locationsApi.getMunicipalities(code)));
          const allNewMunis = results.flat();
          if (allNewMunis.length > 0) {
            setMunicipalities(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const uniqueNew = allNewMunis.filter(m => !existingIds.has(m.id));
              if (uniqueNew.length === 0) return prev;
              return [...prev, ...uniqueNew];
            });
          }
        } catch (error) {
          console.error("Auto-fetch municipalities failed", error);
        }
      };
      fetchNewMunicipalities();
    }
  }, [children, defaultWilaya, municipalities.length]); // Use length to avoid infinite loops if possible

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
            updatedChildren[0].residence_commune = targetCommuneObj.id;
            updatedChildren[0].address = `بلدية ${targetCommuneObj.name_ar} ولاية بوسعادة`;
            updated = true;
          }
          return updated ? updatedChildren : prevChildren;
        });

        // Fetch institutions
        try {
          const instRes = await institutionsApi.getAll({ size: 200, sector: 'YOUTH' });
          setInstitutions(instRes.items || []);
        } catch (e) {
          console.error("Failed to fetch institutions", e);
        }
      } catch (error) {
        console.error("Failed to fetch locations", error);
      } finally {
        setLoadingWilayas(false);
      }
    }
    fetchWilayasData();
  }, []);

  const wilayaOptions = wilayas.map(w => ({
    value: w.code,
    label: `${w.code} - ${w.name_ar}`
  }));

  const getMunicipalityOptions = (wilayaCode: string, isResidence = false) => {
    if (isResidence) {
      const resMunicipalities = municipalities.filter(m => {
        const code = parseInt(m.wilaya_code, 10);
        return code === 28 || code === 68;
      });
      return resMunicipalities.map(m => ({ value: m.id, label: m.name_ar }));
    }
    if (!wilayaCode) return [];
    const targetCode = parseInt(wilayaCode, 10);
    const filteredMunicipalities = municipalities.filter(m => parseInt(m.wilaya_code, 10) === targetCode);
    return filteredMunicipalities.map(m => ({ value: m.id, label: m.name_ar }));
  };

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

  const handleDefaultCommuneChange = (communeId: string) => {
    setDefaultCommune(communeId);
    if (!communeId) return;

    const communeObj = municipalities.find(m => m.id === communeId || m.code === communeId);
    if (!communeObj) return;

    setChildren(prev => prev.map(child => ({
      ...child,
      residence_commune: communeId,
      address: `بلدية ${communeObj.name_ar} - ولاية بوسعادة`
    })));
    toast.success(`تم تحديث إقامة ${children.length} أطفال إلى ${communeObj.name_ar}`);
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

  const addChild = () => {
    const targetWilaya = defaultWilaya || "68";

    let communeObj;
    if (defaultCommune) {
      communeObj = municipalities.find(m => m.id === defaultCommune);
    } else {
      communeObj = municipalities.find(m => m.wilaya_code === "68" && m.name_ar === 'بوسعادة');
    }

    const targetCommuneId = communeObj?.id || '';
    const communeName = communeObj?.name_ar || '';

    const wilayaObj = wilayas.find(w => w.code === targetWilaya);
    const wilayaName = wilayaObj?.name_ar || 'بوسعادة';

    // Build default address
    const defaultAddress = communeName ? `بلدية ${communeName} ولاية بوسعادة` : '';

    // Auto-assign next dot email for this new child
    const nextEmailIndex = emailStartIndex + children.length;
    const autoEmail = baseEmail ? getNextDotEmail(baseEmail, nextEmailIndex) : '';

    const newChild = {
      ...emptyChild,
      id: Math.random().toString(36).substr(2, 9),
      birth_wilaya: targetWilaya,
      birth_commune: targetCommuneId,
      residence_commune: targetCommuneId,
      address: defaultAddress,
      parent_email: autoEmail,
    };
    setChildren([newChild, ...children]);
    // Reset collapse state for new child
    setCollapsedChildren(new Set());
    // Auto-focus the name input of the newly added child
    setTimeout(() => {
      const firstNameInput = document.querySelector('[data-child-index="0"] input') as HTMLInputElement;
      if (firstNameInput) {
        firstNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstNameInput.focus();
      }
    }, 100);
  };

  const removeChild = (index: number) => {
    if (children.length === 1) {
      toast.error("يجب أن يكون هناك طفل واحد على الأقل");
      return;
    }

    const newChildren = children.filter((_, i) => i !== index);
    setChildren(newChildren);

    // Rebuild collapse state for remaining children
    setCollapsedChildren(prev => {
      const newCollapsed = new Set<number>();
      newChildren.forEach((_, newIndex) => {
        const originalIndex = newIndex < index ? newIndex : newIndex + 1;
        if (prev.has(originalIndex)) {
          newCollapsed.add(newIndex);
        }
      });
      return newCollapsed;
    });
  };

  const checkDatabaseDuplicate = async (index: number, firstName: string, lastName: string, birthDate: string) => {
    try {
      const res = await campRegistrationApi.checkDuplicate(firstName, lastName, birthDate);
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
            checkDatabaseDuplicate(index, child.child_first_name, child.child_last_name, child.birth_date);
          }
        }
      }

      // Auto-update address when residence_commune changes
      if (field === 'residence_commune' && val) {
        const commune = municipalities.find(m => m.id === val || m.name_ar === val);
        if (commune) {
          const fullAddress = `بلدية ${commune.name_ar} - ولاية بوسعادة`;
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
          } catch { }
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
          } catch { }
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
    if (!existingBatchId && !batchName.trim()) {
      toast.error("يرجى إدخال اسم الدفعة");
      return;
    }

    // Validate children
    const requiredFields: { key: keyof ChildData; label: string }[] = [
      { key: 'child_first_name', label: 'اسم الطفل' },
      { key: 'child_last_name', label: 'لقب الطفل' },
      { key: 'birth_date', label: 'تاريخ الميلاد' },
      { key: 'gender', label: 'الجنس' },
      { key: 'birth_wilaya', label: 'ولاية الميلاد' },
      { key: 'birth_commune', label: 'بلدية الميلاد' },
      { key: 'residence_commune', label: 'بلدية الإقامة' },
      { key: 'address', label: 'العنوان' },
      { key: 'parent_first_name', label: 'اسم الولي' },
      { key: 'parent_last_name', label: 'لقب الولي' },
      { key: 'parent_phone', label: 'هاتف الولي' },
      { key: 'parent_national_id', label: 'رقم بطاقة تعريف الولي' },
    ];

    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      // فحص الحقول الإلزامية
      for (const field of requiredFields) {
        const val = child[field.key];
        if (!val || (typeof val === 'string' && !val.trim())) {
          toast.error(`${field.label} مطلوب للطفل رقم ${i + 1} (${child.child_first_name || 'بدون اسم'} ${child.child_last_name || ''})`, { duration: 8000 });
          return;
        }
      }

      // Check child age warning
      const age = getAgeYears(child.birth_date);
      if (age > 17) {
        toast.warning(`الطفل رقم ${i + 1} عمره ${calculateAge(child.birth_date)} (أكبر من 17 سنة) - يرجى التأكد من صحة البيانات`);
      } else if (age < 6) {
        toast.warning(`الطفل رقم ${i + 1} عمره ${calculateAge(child.birth_date)} (أقل من 6 سنوات) - يرجى التأكد من صحة البيانات`);
      }

      // Validate parent national ID
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

      // Validate parent phone
      if (child.parent_phone.length !== 10) {
        toast.error(`رقم هاتف الولي للطفل رقم ${i + 1} يجب أن يكون 10 أرقام (حالياً ${child.parent_phone.length})`);
        return;
      }
      if (!['05', '06', '07'].some(prefix => child.parent_phone.startsWith(prefix))) {
        toast.error(`رقم هاتف الولي للطفل رقم ${i + 1} يجب أن يبدأ بـ 05 أو 06 أو 07`);
        return;
      }
    }

    // === فحص التكرار بين الأطفال ===
    const seen = new Map<string, number>();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const key = `${child.child_first_name.trim()}|${child.child_last_name.trim()}|${child.birth_date.trim()}`;
      if (seen.has(key)) {
        const prevIndex = seen.get(key)!;
        toast.error(`تكرار: الطفل رقم ${i + 1} (${child.child_first_name} ${child.child_last_name}) مطابق للطفل رقم ${prevIndex + 1}`, { duration: 10000 });
        return;
      }
      seen.set(key, i);
    }

    setIsSubmitting(true);
    try {
      const data: CreateBatchRequest = {
        name: existingBatchId ? "تحديث الدفعة" : batchName,
        description: batchDescription || undefined,
        registration_method: registrationMethod,
        headless_mode: headlessMode,
        delay_between_registrations: delay,
        institution_id: selectedInstitutionId || undefined,
        force_camp_on_member_fail: forceCampOnMemberFail,
        children: children.map(child => ({
          child_first_name: child.child_first_name,
          child_last_name: child.child_last_name,
          birth_date: child.birth_date,
          gender: child.gender || undefined,
          child_country: "الجزائر",
          birth_wilaya: child.birth_wilaya || undefined,
          birth_commune: child.birth_commune || undefined,
          residence_wilaya: "68",
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
          force_registration: child.force_registration || false,
        })),
      };

      // Save defaults for next time
      try {
        if (baseEmail) localStorage.setItem('camp_base_email', baseEmail);
      } catch (e) { }

      if (existingBatchId) {
        await campRegistrationApi.addChildrenToBatch(existingBatchId, data);
        clearDraft();
        toast.success("تم إضافة الأطفال إلى الدفعة بنجاح");
        router.push(`/camp-registration/${existingBatchId}`);
      } else {
        await campRegistrationApi.createBatch(data);
        clearDraft();
        toast.success("تم إنشاء الدفعة بنجاح");
        router.push("/camp-registration");
      }
    } catch (error) {
      toast.error("فشل في إنشاء الدفعة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const normalizeArabic = (text: string) => {
    if (!text) return "";
    return text.trim()
      .replace(/[أإآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[ىي]/g, 'ي');
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("يجب أن يكون الملف بصيغة CSV");
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      // Parse CSV
      const rawHeaders = lines[0].split(',').map(h => h.trim());
      const importedChildren: ChildData[] = [];

      const headerMapping: Record<string, string[]> = {
        child_first_name: ['child_first_name', 'الاسم', 'اسم الطفل'],
        child_last_name: ['child_last_name', 'اللقب', 'لقب الطفل'],
        birth_date: ['birth_date', 'تاريخ الميلاد', 'تاريخ ميلاد الطفل'],
        gender: ['gender', 'الجنس'],
        birth_wilaya: ['birth_wilaya', 'ولاية الميلاد'],
        birth_commune: ['birth_commune', 'بلدية الميلاد'],
        residence_wilaya: ['residence_wilaya', 'ولاية الاقامة', 'ولاية الإقامة'],
        residence_commune: ['residence_commune', 'بلدية الاقامة', 'بلدية الإقامة'],
        address: ['address', 'العنوان'],
        parent_first_name: ['parent_first_name', 'اسم الولي'],
        parent_last_name: ['parent_last_name', 'لقب الولي'],
        parent_phone: ['parent_phone', 'هاتف الولي', 'رقم الهاتف'],
        parent_email: ['parent_email', 'بريد الولي', 'البريد الإلكتروني'],
        parent_national_id: ['parent_national_id', 'رقم التعريف الوطني للولي', 'بطاقة الولي', 'رقم بطاقة الولي'],
        youth_institution: ['youth_institution', 'المؤسسة', 'رقم الانخراط'],
        unified_member_number: ['unified_member_number', 'رقم الانخراط الموحد', 'رقم المنخرط الموحد'],
        child_photo_path: ['child_photo_path', 'مسار الصورة', 'الصورة', 'مسار صورة الطفل'],
        birth_certificate_path: ['birth_certificate_path', 'مسار الشهادة', 'الشهادة', 'مسار شهادة الميلاد']
      };

      // Identify all unique wilayas to fetch their municipalities
      const uniqueWilayas = new Set<string>();
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        rawHeaders.forEach((header, index) => { row[header] = values[index] || ''; });

        const b_wilaya_raw = headerMapping.birth_wilaya.map(k => row[k]).find(v => v) || '';
        const r_wilaya_raw = headerMapping.residence_wilaya.map(k => row[k]).find(v => v) || '';

        const resolveWilayaCode = (name: string) => {
          if (!name) return "";
          const norm = normalizeArabic(name);
          const found = wilayas.find(w => normalizeArabic(w.name_ar) === norm || name.startsWith(w.code) || w.code === name);
          return found ? found.code : "";
        };

        const b_code = resolveWilayaCode(b_wilaya_raw);
        if (b_code) uniqueWilayas.add(b_code);
        const r_code = resolveWilayaCode(r_wilaya_raw);
        if (r_code) uniqueWilayas.add(r_code);
      }

      // Fetch missing municipalities
      const loadedWilayas = new Set(municipalities.map(m => m.wilaya_code));
      const wilayasToFetch = Array.from(uniqueWilayas).filter(code => !loadedWilayas.has(code));

      let allMunicipalities = [...municipalities];
      if (wilayasToFetch.length > 0) {
        toast.info(`جاري جلب بلديات لـ ${wilayasToFetch.length} ولاية...`);
        const results = await Promise.all(wilayasToFetch.map(code => locationsApi.getMunicipalities(code)));
        const allNewMunis = results.flat();
        allMunicipalities = [...allMunicipalities, ...allNewMunis];
        setMunicipalities(allMunicipalities);
      }

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        rawHeaders.forEach((header, index) => { row[header] = values[index] || ''; });

        const resolve = (key: string) => {
          const keys = headerMapping[key] || [key];
          for (const k of keys) {
            if (row[k]) return row[k];
          }
          return '';
        };

        const c_first = resolve('child_first_name');
        const c_last = resolve('child_last_name');
        if (!c_first || !c_last) continue;

        // Name to ID resolution
        const findWilaya = (name: string) => {
          if (!name) return "";
          const norm = normalizeArabic(name);
          const found = wilayas.find(w => normalizeArabic(w.name_ar) === norm || name.startsWith(w.code) || w.code === name);
          return found ? found.code : name;
        };

        const findCommune = (name: string, wilayaCode?: string) => {
          if (!name) return "";
          const norm = normalizeArabic(name);
          const isMsilaBoussaada = wilayaCode === "28" || wilayaCode === "68";

          const found = allMunicipalities.find(m => {
            if (wilayaCode) {
              if (isMsilaBoussaada) {
                if (m.wilaya_code !== "28" && m.wilaya_code !== "68") return false;
              } else if (m.wilaya_code !== wilayaCode) {
                return false;
              }
            }
            return normalizeArabic(m.name_ar) === norm || m.id === name || m.code === name;
          });
          return found ? found.id : name;
        };

        const b_wilaya = findWilaya(resolve('birth_wilaya'));
        const r_wilaya = findWilaya(resolve('residence_wilaya')) || "68";

        importedChildren.push({
          id: Math.random().toString(36).substr(2, 9),
          child_first_name: c_first,
          child_last_name: c_last,
          birth_date: resolve('birth_date'),
          gender: resolve('gender') || 'MALE',
          birth_wilaya: b_wilaya,
          birth_commune: findCommune(resolve('birth_commune'), b_wilaya),
          residence_wilaya: r_wilaya,
          residence_commune: findCommune(resolve('residence_commune'), r_wilaya),
          address: resolve('address'),
          parent_first_name: resolve('parent_first_name'),
          parent_last_name: resolve('parent_last_name'),
          parent_phone: resolve('parent_phone'),
          parent_email: resolve('parent_email'),
          parent_national_id: resolve('parent_national_id'),
          youth_institution: resolve('youth_institution'),
          unified_member_number: resolve('unified_member_number'),
          child_photo_path: resolve('child_photo_path'),
          birth_certificate_path: resolve('birth_certificate_path'),
        });
      }

      if (importedChildren.length === 0) {
        toast.error("لم يتم العثور على بيانات صحيحة");
        return;
      }

      // تطبيق البريد الإلكتروني إن وجد
      const finalImported = baseEmail ? applyDotEmails(baseEmail, importedChildren) : importedChildren;

      // التحقق مما إذا كانت القائمة الحالية تحتوي على أطفال
      const hasExisting = children.some(c => c.child_first_name || c.child_last_name);
      if (hasExisting) {
        // يوجد أطفال في القائمة → نسأل المستخدم: دمج أم استبدال
        setPendingNewChildren(finalImported);
        setShowMergeDialog(true);
      } else {
        // القائمة فارغة → تعيين مباشر
        setChildren(finalImported);
        toast.success(`تم استيراد ${importedChildren.length} طفل بنجاح`);
      }

    } catch (error) {
      toast.error("فشل في قراءة الملف");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const csvContent = `child_first_name,child_last_name,birth_date,gender,birth_wilaya,birth_commune,residence_commune,address,parent_first_name,parent_last_name,parent_phone,parent_email,parent_national_id,youth_institution,unified_member_number,child_photo_path,birth_certificate_path
محمد,أحمد,2012-05-15,ذكر,25 - قسنطينة,قسنطينة,قسنطينة,"حي 500 مسكن",أحمد,محمد,0555123456,ahmed@email.com,123456789012345678,,,
فاطمة,علي,2013-08-20,أنثى,25 - قسنطينة,قسنطينة,قسنطينة,"حي النور",علي,حسين,0666987654,ali@email.com,987654321098765432,,,`;

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'camp_registration_template.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("تم تحميل النموذج");
  };


  return (


        <><div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/camp-registration">
          <Button variant="outline" size="icon" className="mt-1 shrink-0 h-9 w-9 rounded-xl">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            {existingBatchId ? "إضافة أطفال للدفعة" : "إنشاء دفعة جديدة"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">إضافة أطفال للتسجيل في المخيم عبر الاستيراد الذكي أو الإدخال اليدوي</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 border border-border/50 rounded-xl">
        {/* Left group: Import tools */}
        {hasPermission('camp_registration', 'import') && (
          <div className="flex items-center gap-1.5">
            <Button onClick={downloadTemplate} variant="ghost" size="sm" className="text-muted-foreground h-8">
              <Download className="w-3.5 h-3.5 ml-1.5" />
              النموذج
            </Button>
            <div className="w-px h-5 bg-border/60" />
            <Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="sm" disabled={isImporting} className="text-muted-foreground h-8">
              {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" /> : <Upload className="w-3.5 h-3.5 ml-1.5" />}
              CSV
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
          </div>
        )}

        {hasPermission('camp_registration', 'smart_extract') && (
          <>
            {/* AI Provider Toggle */}
            <div className="flex items-center gap-1 p-0.5 bg-background border border-border/60 rounded-lg">
              <button type="button" onClick={() => setAiProvider("gemini")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${aiProvider === "gemini" ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                Gemini
              </button>
              <button type="button" onClick={() => setAiProvider("groq")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${aiProvider === "groq" ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                Groq
              </button>
            </div>

            {/* Retry failed only checkbox */}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none px-1">
              <input type="checkbox" checked={retryFailedOnly} onChange={(e) => setRetryFailedOnly(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary/30 h-3.5 w-3.5" />
              إعادة الفاشلين فقط
            </label>

            <div className="w-px h-5 bg-border/60" />
          </>
        )}

        {/* Smart Import */}
        {hasPermission('camp_registration', 'smart_import') && (
          <Button type="button" onClick={async () => {
            if (extractJobId) {
              try { await campRegistrationApi.stopSmartExtractJob(extractJobId); toast.info("جاري إيقاف العملية..."); } catch (e) { toast.error("فشل في إيقاف العملية"); }
              return;
            }
            setIsSmartImporting(true); setExtractProgress(null);
            try {
              // الاستيراد الذكي يقرأ المجلدات مباشرة من MinIO لاحقاً، حالياً سنترك المسار فارغاً لتبسيط العمل أو نعتمد على مجلد مخصص في Backend
              const listRes = await campRegistrationApi.listSmartFolders("default");
              const folders = listRes.data.folders || [];
              const cachedFolders = folders.filter(f => f.has_cache && f.cached_data);
              const uncachedFolders = folders.filter(f => !f.has_cache);
              const cachedChildren: ChildData[] = [];
              cachedFolders.forEach(f => {
                const data = f.cached_data;
                if (data) {
                  let extractedAddress = data.address || "";
                  if (defaultCommune && data.residence_commune) extractedAddress = `بلدية ${data.residence_commune} - ولاية بوسعادة`;
                   cachedChildren.push({ id: crypto.randomUUID(), child_first_name: data.child_first_name || data.first_name || "", child_last_name: data.child_last_name || data.last_name || "", birth_date: data.birth_date || "", gender: data.gender || "MALE", birth_wilaya: data.birth_wilaya || "", birth_commune: data.birth_commune || "", residence_wilaya: "68", residence_commune: defaultCommune || data.residence_commune || "", address: extractedAddress, parent_first_name: data.parent_first_name || data.guardian_first_name || "", parent_last_name: data.parent_last_name || data.guardian_last_name || "", parent_phone: data.parent_phone || data.guardian_phone || "", parent_email: data.parent_email || "", parent_national_id: data.parent_national_id || data.guardian_national_id || "", youth_institution: data.youth_institution || data.institution || "", unified_member_number: data.unified_member_number || "", child_photo_path: data.child_photo_path || "", birth_certificate_path: data.birth_certificate_path || "", folder_name: f.name || "" });
                }
              });
              if (cachedChildren.length > 0) {
                setChildren(prev => { const base = (prev.length === 1 && !prev[0].child_first_name && !prev[0].child_last_name) ? [] : prev; const existingKeys = new Set(base.map(c => getChildKey(c)).filter(Boolean)); const filtered = cachedChildren.filter(c => !existingKeys.has(getChildKey(c))); const skipped = cachedChildren.length - filtered.length; if (skipped > 0) toast.info(`تخطي ${skipped} طفل موجود مسبقاً من الكاش`); return [...base, ...filtered]; });
              }
              if (uncachedFolders.length > 0) {
                const uncachedPaths = uncachedFolders.map(f => f.path);
                const startRes = await campRegistrationApi.startSmartExtract("default", aiProvider, retryFailedOnly, uncachedPaths);
                setExtractJobId(startRes.data.job_id);
                toast.success(`بدأ الاستخراج الذكي لـ ${startRes.data.total} مجلد`);
              } else { toast.success(`تمت إضافة ${cachedChildren.length} طفل من الكاش`); setIsSmartImporting(false); }
            } catch (e: any) { const detail = e?.response?.data?.detail; toast.error(typeof detail === 'string' ? detail : "فشل في بدء الاستخراج"); setIsSmartImporting(false); }
          }}
            variant="ghost" size="sm"
            className={`h-8 ${extractJobId ? "text-red-600 hover:bg-red-50" : "text-primary hover:bg-primary/5"}`}>
            {extractJobId ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" /> : null}
            {extractJobId ? `إيقاف (${extractProgress?.processed || 0}/${extractProgress?.total || 0})` : "الاستيراد السحري"}
          </Button>
        )}

        <div className="flex-1" />

        {/* Right group: Scan & Upload */}
        {hasPermission('camp_registration', 'scan') && (
          <Button onClick={() => setShowScanUpload(true)} variant="ghost" size="sm" className="h-8 text-muted-foreground">
            <Upload className="w-3.5 h-3.5 ml-1.5" />
            رفع يدوي
          </Button>
        )}
        {hasPermission('camp_registration', 'bot_control') && (
          <Button onClick={async () => {
            try {
              let targetBatchId = createdBatchId;
              if (!targetBatchId) {
                if (!batchName.trim()) { toast.error('يرجى إدخال اسم الدفعة أولاً'); return; }
                const batchRes = await campRegistrationApi.createBatch({ name: batchName, description: batchDescription, registration_method: registrationMethod, headless_mode: headlessMode, delay_between_registrations: delay, institution_id: selectedInstitutionId || undefined, force_camp_on_member_fail: forceCampOnMemberFail, children: [] });
                targetBatchId = batchRes.data.id; setCreatedBatchId(targetBatchId); toast.success(`تم إنشاء الدفعة "${batchName}" تلقائياً`);
              }
              window.location.href = `djs-scanner://${targetBatchId}`;
              toast.info("تم طلب فتح الماسح الضوئي...");
              setTimeout(() => { router.push(`/camp-registration/${targetBatchId}?live=true`); }, 1000);
            } catch (err: any) { toast.error(err?.response?.data?.detail || "حدث خطأ أثناء إعداد الدفعة للمسح"); }
          }}
            variant="outline" size="sm"
            className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <ScanLine className="w-3.5 h-3.5 ml-1.5" />
            مسح بالبوت
          </Button>
        )}
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
            {lastSaved ? (
              <> — آخر حفظ: <span dir="ltr" className="tabular-nums">{lastSaved.toLocaleTimeString('ar-DZ')}</span></>
            ) : (
              <> — مفعّل</>
            )}
          </span>
        </div>
        {draftLoaded && (
          <Button type="button" variant="ghost" size="sm"
            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
            onClick={() => { clearDraft(); setBatchName(''); setBatchDescription(''); setChildren([{ ...emptyChild }]); toast.success('تم مسح المسودة والبدء من جديد'); }}>
            مسح المسودة
          </Button>
        )}
      </div>

      {/* Batch Info */}
      <div className="bg-white dark:bg-slate-900 border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        {/* Card header */}
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

        {/* Card body */}
        <div className="p-6 space-y-5">
          {!existingBatchId && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">اسم الدفعة <span className="text-red-500">*</span></Label>
                <Input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="مثال: دفعة أفريل 2025"
                  className="rounded-xl border-border/70 focus:border-primary/50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">الوصف</Label>
                <Textarea value={batchDescription} onChange={(e) => setBatchDescription(e.target.value)} placeholder="وصف اختياري للدفعة..."
                  className="rounded-xl border-border/70 focus:border-primary/50 min-h-[40px]" />
              </div>
            </div>
          )}

          {/* Wilaya / Commune */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الولاية الافتراضية</Label>
              <SearchableSelect options={wilayaOptions} value={defaultWilaya} onValueChange={handleDefaultWilayaChange}
                placeholder="اختر الولاية الافتراضية" disabled={loadingWilayas} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">البلدية الافتراضية</Label>
              <SearchableSelect options={getMunicipalityOptions(defaultWilaya)} value={defaultCommune} onValueChange={handleDefaultCommuneChange}
                placeholder="اختر البلدية الافتراضية" disabled={loadingMunicipalities || !defaultWilaya} />
            </div>
          </div>

          {!existingBatchId && (
            <>
              {hasPermission('camp_registration', 'bot_control') && (
                <div className="border-t border-border/40 pt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground/80">إعدادات التشغيل</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">طريقة التسجيل</Label>
                      <select value={registrationMethod} onChange={(e) => setRegistrationMethod(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-border/70 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all">
                        <option value="api">API سريع (مباشر)</option>
                        <option value="bot">روبوت (متصفح خفي)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">وضع Headless</Label>
                      <select value={headlessMode ? "true" : "false"} onChange={(e) => setHeadlessMode(e.target.value === "true")}
                        className="w-full h-10 px-3 rounded-xl border border-border/70 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all" disabled={registrationMethod === 'api'}>
                        <option value="false">لا (مع واجهة)</option>
                        <option value="true">نعم (بدون واجهة)</option>
                      </select>
                      <p className="text-xs text-muted-foreground">{headlessMode ? "سيعمل المتصفح في الخلفية" : "سيظهر المتصفح أثناء العمل"}</p>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-sm font-medium">عدد العمال (التوازي)</Label>
                      <Input type="number" value={delay} onChange={(e) => setDelay(parseInt(e.target.value) || 5)} min={1} max={60}
                        className="rounded-xl border-border/70 focus:border-primary/50" />
                    </div>
                  </div>
                </div>
              )}

            </>
          )}

          {/* Email section */}
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
                  try { localStorage.setItem('camp_base_email', baseEmail); localStorage.setItem('camp_email_index', newIndex.toString()); } catch { }
                  toast.success(`تم توزيع ${children.length} إيميل فرعي (من #${emailStartIndex + 1} إلى #${newIndex})`);
                }}
                className="rounded-xl">
                توزيع الإيميلات
              </Button>
              {emailStartIndex > 0 && (
                <Button type="button" variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => { setEmailStartIndex(0); try { localStorage.setItem('camp_email_index', '0'); } catch { } toast.success("تم إعادة العداد إلى 0"); }}>
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

      {/* المؤسسة الشبابية و خيار التسجيل رغم الفشل */}
      <div className="bg-white dark:bg-slate-900 border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-5">
          <div className="col-span-full">
            <Label>المؤسسة الشبابية (لتسجيل المنخرط)</Label>
            <SearchableSelect
              options={institutions.map(inst => ({ value: inst.id, label: `${inst.name_ar} (${inst.short_name || ''})` }))}
              value={selectedInstitutionId}
              onValueChange={(value) => setSelectedInstitutionId(value)}
              placeholder="اختر المؤسسة الشبابية..."
            />
          </div>
          {hasPermission('camp_registration', 'edit') && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <input 
                type="checkbox" 
                id="forceCampOnMemberFail" 
                checked={forceCampOnMemberFail}
                onChange={(e) => setForceCampOnMemberFail(e.target.checked)}
                className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <Label htmlFor="forceCampOnMemberFail" className="text-amber-800 cursor-pointer font-medium">
                تسجيل المخيم حتى لو فشل جلب رقم الانخراط الموحد
              </Label>
            </div>
          )}
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
              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground/70">{children.length}</span> طفل في القائمة</p>
            </div>
          </div>
          <div className="flex gap-2">
            {children.length > 1 && (
              <>
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
            <Button onClick={addChild} variant="outline" size="sm" className="h-8">
              <Plus className="w-3.5 h-3.5 ml-1.5" />
              إضافة طفل
            </Button>
          </div>
        </div>

        {children.map((child, index) => {
          const isCollapsed = collapsedChildren.has(index);
          const childName = `${child.child_first_name} ${child.child_last_name}`.trim() || `طفل #${index + 1}`;
          const age = child.birth_date ? calculateAge(child.birth_date) : '';
          const ageYears = child.birth_date ? getAgeYears(child.birth_date) : null;
          const hasData = child.child_first_name || child.child_last_name || child.birth_date;
          const hasWarning = ageYears !== null && (ageYears >= 17 || ageYears < 6);

          return (
            <div key={child.id || index} data-child-index={index}
              className="bg-white dark:bg-slate-900 border border-border/60 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md">
              {/* Collapsible Header */}
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
                          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-green-50 text-green-700">
                            ✓ اكتمل
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {hasWarning && hasData && !isCollapsed && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
                      تحذير العمر
                    </span>
                  )}
                  <Button size="sm" variant="ghost"
                    onClick={(e) => { e.stopPropagation(); removeChild(index); }}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <div className="text-muted-foreground">
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Form */}
              {!isCollapsed && (
                <div className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">لقب الطفل <span className="text-red-500">*</span></Label>
                        <Input
                          value={child.child_last_name}
                          onChange={(e) => updateChild(index, "child_last_name", e.target.value)}
                          onBlur={() => {
                            // Copy child's last name to parent's last name when leaving the field
                            if (child.child_last_name && !child.parent_last_name) {
                              updateChild(index, "parent_last_name", child.child_last_name);
                            }
                          }}
                          placeholder="اللقب"
                          className="rounded-xl border-border/70 focus:border-primary/50"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">اسم الطفل <span className="text-red-500">*</span></Label>
                        <Input
                          value={child.child_first_name}
                          onChange={(e) => updateChild(index, "child_first_name", e.target.value)}
                          placeholder="الاسم"
                          className="rounded-xl border-border/70 focus:border-primary/50"
                        />
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
                              ⚠️ تنبيه: عمر الطفل {calculateAge(child.birth_date)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>الجنس</Label>
                      <select
                        value={child.gender}
                        onChange={(e) => updateChild(index, "gender", e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-border/70 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                      >
                        <option value="">اختر</option>
                        <option value="ذكر">ذكر</option>
                        <option value="أنثى">أنثى</option>
                      </select>
                    </div>

                    {hasPermission('camp_registration', 'edit') && (
                      <div className="space-y-1.5 flex flex-col justify-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer bg-red-50 dark:bg-red-950/20 p-2 rounded-xl border border-red-100 dark:border-red-900/30">
                          <input 
                            type="checkbox" 
                            checked={!!child.force_registration}
                            onChange={(e) => updateChild(index, "force_registration", e.target.checked)}
                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500 border-red-300"
                          />
                          <span className="text-xs font-bold text-red-700 dark:text-red-400">
                            تسجيل قسري (لتجاوز فحص المنصة الوزارية)
                          </span>
                        </label>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">ولاية الميلاد</Label>
                      <SearchableSelect
                        options={wilayaOptions}
                        value={child.birth_wilaya}
                        onValueChange={(value) => handleWilayaChange(value, index, 'birth')}
                        placeholder="اختر الولاية"
                        disabled={loadingWilayas}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">بلدية الميلاد</Label>
                      <SearchableSelect
                        options={getMunicipalityOptions(child.birth_wilaya)}
                        value={child.birth_commune}
                        onValueChange={(value) => updateChild(index, "birth_commune", value)}
                        placeholder="اختر البلدية"
                        disabled={loadingMunicipalities || !child.birth_wilaya}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">ولاية الإقامة</Label>
                      <SearchableSelect
                        options={wilayaOptions}
                        value={child.residence_wilaya}
                        onValueChange={(value) => handleWilayaChange(value, index, 'residence')}
                        placeholder="اختر الولاية"
                        disabled={loadingWilayas}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">بلدية الإقامة</Label>
                      <SearchableSelect
                        options={getMunicipalityOptions(child.residence_wilaya || "68", true)}
                        value={child.residence_commune}
                        onValueChange={(value) => updateChild(index, "residence_commune", value)}
                        placeholder="اختر البلدية"
                        disabled={loadingMunicipalities || !child.residence_wilaya}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">العنوان</Label>
                      <Input
                        value={child.address}
                        onChange={(e) => updateChild(index, "address", e.target.value)}
                        placeholder="أدخل العنوان"
                        className="rounded-xl border-border/70 focus:border-primary/50"
                      />
                      <p className="text-xs text-muted-foreground">
                        💡 سيتم إضافة البلدية وولاية بوسعادة تلقائياً
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">لقب الولي</Label>
                      <Input
                        value={child.parent_last_name}
                        onChange={(e) => updateChild(index, "parent_last_name", e.target.value)}
                        placeholder="لقب الولي"
                        className="rounded-xl border-border/70 focus:border-primary/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">اسم الولي</Label>
                      <Input
                        value={child.parent_first_name}
                        onChange={(e) => updateChild(index, "parent_first_name", e.target.value)}
                        placeholder="اسم الولي"
                        className="rounded-xl border-border/70 focus:border-primary/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">هاتف الولي <span className="text-red-500">*</span></Label>
                      <Input
                        value={child.parent_phone}
                        onChange={(e) => updateChild(index, "parent_phone", e.target.value)}
                        placeholder="05/06/07XXXXXXXX"
                        maxLength={10}
                        pattern="(05|06|07)\d{8}"
                        inputMode="numeric"
                        dir="ltr"
                        className={`rounded-xl border-border/70 focus:border-primary/50 ${child.parent_phone.length === 10 && ['05', '06', '07'].some(p => child.parent_phone.startsWith(p)) ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}
                      />
                      <p className="text-xs text-muted-foreground">
                        📱 يجب أن يكون 10 أرقام ويبدأ بـ 05 أو 06 أو 07
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">بريد الولي</Label>
                      <Input
                        type="email"
                        value={child.parent_email}
                        onChange={(e) => updateChild(index, "parent_email", e.target.value)}
                        onBlur={() => handleEmailBlur(index)}
                        placeholder="email@example.com"
                        dir="ltr"
                        className="rounded-xl border-border/70 focus:border-primary/50"
                      />
                      <p className="text-xs text-muted-foreground">
                        💡 سيتم إضافة @gmail.com تلقائياً
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">رقم بطاقة الولي <span className="text-red-500">*</span></Label>
                      <Input
                        value={child.parent_national_id}
                        onChange={(e) => updateChild(index, "parent_national_id", e.target.value)}
                        placeholder="أدخل 18 رقماً"
                        maxLength={18}
                        pattern="\d{18}"
                        inputMode="numeric"
                        dir="ltr"
                        className={`rounded-xl border-border/70 focus:border-primary/50 ${child.parent_national_id.length === 18 ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}
                      />
                      <p className="text-xs text-muted-foreground">
                        🔢 يجب أن يتكون من 18 رقماً
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">مسار صورة الطفل</Label>
                      <div className="flex gap-2">
                        <Input
                          value={child.child_photo_path}
                          onChange={(e) => updateChild(index, "child_photo_path", e.target.value)}
                          placeholder="/path/to/photo.jpg"
                          dir="ltr"
                          className="flex-1 rounded-xl border-border/70 focus:border-primary/50"
                        />
                        <div className="relative overflow-hidden shrink-0">
                          <Button type="button" variant="outline" className="w-10 h-10 p-0 rounded-xl">
                            <Upload className="w-4 h-4" />
                          </Button>
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const fileName = file.name;
                                updateChild(index, "child_photo_path", fileName);
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">مسار شهادة الميلاد</Label>
                      <div className="flex gap-2">
                        <Input
                          value={child.birth_certificate_path}
                          onChange={(e) => updateChild(index, "birth_certificate_path", e.target.value)}
                          placeholder="certificate.pdf"
                          dir="ltr"
                          className="flex-1 rounded-xl border-border/70 focus:border-primary/50"
                        />
                        <div className="relative overflow-hidden shrink-0">
                          <Button type="button" variant="outline" className="w-10 h-10 p-0 rounded-xl">
                            <Upload className="w-4 h-4" />
                          </Button>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const fileName = file.name;
                                updateChild(index, "birth_certificate_path", fileName);
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* رقم الانخراط الموحد */}
                      <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                        <Label className="text-sm font-medium">رقم الانخراط الموحد (YouthConnect)</Label>
                        <Input
                          value={child.unified_member_number || ''}
                          onChange={(e) => updateChild(index, "unified_member_number", e.target.value)}
                          placeholder="مثال: 280709-26-1-012-0084"
                          dir="ltr"
                          className="rounded-xl border-border/70 focus:border-primary/50"
                        />
                        <p className="text-xs text-muted-foreground">
                          💡 رقم الانخراط الموحد من منصة المنخرطين (اختياري)
                        </p>
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
          <Link href="/camp-registration">
            <Button variant="outline" size="sm" className="rounded-xl">إلغاء</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={isSubmitting} size="sm"
            className="rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-sm">
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الحفظ...</>
            ) : (
              <><Save className="w-4 h-4 ml-2" /> {existingBatchId ? "إضافة الأطفال" : "إنشاء الدفعة"}</>
            )}
          </Button>
        </div>
      </div>
    </div>

      <AlertDialog open={showMergeDialog && pendingNewChildren !== null && children.some(c => c.child_first_name || c.child_last_name)} onOpenChange={(open) => { if (!open) { setShowMergeDialog(false); setPendingNewChildren(null); setShowDuplicateUpdateDialog(false); setDuplicateCount(0); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>يوجد أطفال في القائمة الحالية</AlertDialogTitle>
            <AlertDialogDescription>
              توجد {children.filter(c => c.child_first_name || c.child_last_name).length} أطفال في القائمة الحالية.
              هل تريد دمج الأطفال الجدد مع القائمة الحالية أم استبدالها بالكامل؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowMergeDialog(false); setPendingNewChildren(null); }}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const newKids = pendingNewChildren!;
              setChildren(prev => {
                const base = (prev.length === 1 && !prev[0].child_first_name && !prev[0].child_last_name) ? [] : prev;
                const existingKeys = new Set(base.map(c => getChildKey(c)).filter(Boolean));

                // فصل الجدد عن المكررين
                const duplicates = newKids.filter(c => existingKeys.has(getChildKey(c)));
                const trulyNew = newKids.filter(c => !existingKeys.has(getChildKey(c)));

                if (duplicates.length > 0) {
                  // حفظ المكررين ليطلب من المستخدم لاحقاً
                  setDuplicateCount(duplicates.length);
                  setDuplicateChildren(duplicates);
                  setShowDuplicateUpdateDialog(true);
                  setShowMergeDialog(false);
                }

                if (trulyNew.length > 0) toast.success(`تم دمج ${trulyNew.length} طفل جديد مع القائمة الحالية`);
                return [...base, ...trulyNew];
              });
            }}>
              دمج
            </AlertDialogAction>
            <AlertDialogAction onClick={() => {
              setChildren(pendingNewChildren!);
              setShowMergeDialog(false);
              setPendingNewChildren(null);
              toast.success(`تم استبدال القائمة بـ ${pendingNewChildren!.length} طفل`);
            }}>
              استبدال
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ✅ حوار التكرار: هل تريد تحديث المكررين؟ */}
      <AlertDialog open={showDuplicateUpdateDialog} onOpenChange={(open) => { if (!open) { setShowDuplicateUpdateDialog(false); setDuplicateChildren([]); setDuplicateCount(0); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>أطفال مكررون</AlertDialogTitle>
            <AlertDialogDescription>
              يوجد {duplicateCount} طفل مكرر في القائمة (حسب اسم الصورة/المجلد).
              هل تريد تحديث بياناتهم بالجديدة المستخرجة أم الإبقاء على القديمة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDuplicateUpdateDialog(false);
              setDuplicateChildren([]);
              setDuplicateCount(0);
              toast.info(`تم الإبقاء على ${duplicateCount} طفل كما هم`);
            }}>
              الإبقاء على القديمة
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              // تحديث المكررين بالبيانات الجديدة
              setChildren(prev => {
                const updateKeys = new Set(duplicateChildren.map(c => getChildKey(c)).filter(Boolean));
                // إزالة القديمة وإضافة الجديدة
                const filtered = prev.filter(c => !updateKeys.has(getChildKey(c)));
                toast.success(`تم تحديث ${duplicateChildren.length} طفل بالبيانات الجديدة`);
                return [...filtered, ...duplicateChildren];
              });
              setShowDuplicateUpdateDialog(false);
              setDuplicateChildren([]);
              setDuplicateCount(0);
            }}>
              تحديث بالجديدة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scan Upload Modal */}
      {showScanUpload && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowScanUpload(false)}>
          <div id="scan-upload-create-modal" className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center">
                  <ScanLine className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">مسح ورفع وثائق طفل</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">رفع ملفات طفل جديد واستخراج البيانات تلقائياً</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowScanUpload(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {scanUploadCount > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800 rounded-xl p-3 text-sm text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-xs font-bold text-emerald-600">✓</span>
                  تم رفع {scanUploadCount} طفل بنجاح في هذه الجلسة
                  {createdBatchId && (
                    <span className="block mt-1 text-xs text-emerald-600 dark:text-emerald-400">الدفعة: {batchName}</span>
                  )}
                </div>
              )}

              {!createdBatchId && !batchName.trim() && (
                <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  يرجى إدخال اسم الدفعة أولاً قبل الرفع. سيتم إنشاء الدفعة تلقائياً عند أول رفع.
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">اسم الطفل / المجلد <span className="text-red-500">*</span></label>
                  <input type="text" value={scanFolderName} onChange={(e) => setScanFolderName(e.target.value)}
                    placeholder="مثال: BENALI_Mohamed"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                    dir="ltr" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">صورة الطفل (JPG) <span className="text-red-500">*</span></label>
                  <input type="file" accept="image/jpeg,image/jpg,image/png" onChange={(e) => setScanPhoto(e.target.files?.[0] || null)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-xs file:font-medium hover:file:bg-emerald-100 file:cursor-pointer" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">شهادة الميلاد (PDF) <span className="text-red-500">*</span></label>
                  <input type="file" accept="application/pdf" onChange={(e) => setScanCert(e.target.files?.[0] || null)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-xs file:font-medium hover:file:bg-emerald-100 file:cursor-pointer" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">بطاقة تعريف الولي (PDF) <span className="text-slate-400">- اختياري</span></label>
                  <input type="file" accept="application/pdf" onChange={(e) => setScanGuardianId(e.target.files?.[0] || null)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-xs file:font-medium hover:file:bg-emerald-100 file:cursor-pointer" />
                </div>
              </div>

              <div className="bg-gradient-to-l from-blue-50 to-white dark:from-blue-950 dark:to-slate-900 border border-blue-100 dark:border-blue-900 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
                💡 بعد الرفع، سيتم استخراج البيانات تلقائياً من شهادة الميلاد عبر الذكاء الاصطناعي في الخلفية.
                {!createdBatchId && batchName.trim() && (
                  <span className="block mt-1 font-semibold">🆕 سيتم إنشاء الدفعة "{batchName}" تلقائياً عند أول رفع.</span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <Button variant="outline" onClick={() => setShowScanUpload(false)} className="flex-1 rounded-xl">إلغاء</Button>
              <Button onClick={async () => {
                if (!scanFolderName.trim() || !scanPhoto || !scanCert) { toast.error('يرجى ملء جميع الحقول المطلوبة'); return; }
                if (!createdBatchId && !batchName.trim()) { toast.error('يرجى إدخال اسم الدفعة أولاً'); return; }
                setIsUploadingScan(true);
                try {
                  let targetBatchId = createdBatchId;
                  if (!targetBatchId) {
                    const batchRes = await campRegistrationApi.createBatch({ name: batchName, description: batchDescription, registration_method: registrationMethod, headless_mode: headlessMode, delay_between_registrations: delay, institution_id: selectedInstitutionId || undefined, force_camp_on_member_fail: forceCampOnMemberFail, children: [] });
                    targetBatchId = batchRes.data.id; setCreatedBatchId(targetBatchId); toast.success(`تم إنشاء الدفعة "${batchName}" تلقائياً`);
                  }
                  const formData = new FormData();
                  formData.append('folder_name', scanFolderName.trim());
                  formData.append('photo', scanPhoto);
                  formData.append('certificate', scanCert);
                  if (scanGuardianId) formData.append('guardian_id', scanGuardianId);
                  const res = await campRegistrationApi.scanUploadExtract(targetBatchId!, formData);
                  toast.success(res.data.message);
                  setScanUploadCount(prev => prev + 1);
                  setScanFolderName(''); setScanPhoto(null); setScanCert(null); setScanGuardianId(null);
                  const modal = document.getElementById('scan-upload-create-modal');
                  if (modal) modal.querySelectorAll('input[type="file"]').forEach((input: any) => { input.value = ''; });
                } catch (error: any) { toast.error(error?.response?.data?.detail || 'فشل في رفع الملفات'); }
                finally { setIsUploadingScan(false); }
              }}
                disabled={isUploadingScan || !scanFolderName.trim() || !scanPhoto || !scanCert}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-sm">
                {isUploadingScan ? <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري الرفع...</> : <><Upload className="w-4 h-4 ml-2" /> رفع واستخراج</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function CreateBatchPage() {
  return (
  <PermissionGuard module="camp_registration" action="view">
      <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>}>
        <CreateBatchContent />
      </Suspense>
    </PermissionGuard>
  );
}