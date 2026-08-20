"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { campTripsApi, CampTripMember } from "@/lib/api/camp-trips";
import { campRegistrationApi, CampRegistration } from "@/lib/api/camp-registration";
import { membersApi, Member } from "@/lib/api/members";
import { institutionsApi } from "@/lib/api/institutions";
import { associationsApi } from "@/lib/api/associations";
import { UserPlus, Loader2, Users, ChevronDown, ChevronUp, Search, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OdooSearch } from "@/components/odoo/OdooSearch";
import { toast } from "sonner";
import { formatAgePrecise } from "@/lib/camp-allocation-utils";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { locationsApi } from "@/lib/api/locations";

const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || 'https://api.djs68.com/storage';

interface AddMembersModalProps {
  tripId: string;
  onAdded: () => void;
  instMinisterialMap?: Record<string, string>;
  canEditSeat?: boolean;
}

export function AddMembersModal({ tripId, onAdded, instMinisterialMap, canEditSeat = true }: AddMembersModalProps) {
  const t = useTranslations("camp-trips");
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [localInstMap, setLocalInstMap] = useState<Record<string, string>>(instMinisterialMap || {});

  useEffect(() => {
    if (instMinisterialMap && Object.keys(instMinisterialMap).length > 0) {
      setLocalInstMap(instMinisterialMap);
    } else if (open && Object.keys(localInstMap).length === 0) {
      institutionsApi.getAll({ size: 500 })
        .then(res => {
          const map: Record<string, string> = {};
          (res.items || []).forEach((inst: any) => {
            if (inst.ministerial_code) {
              map[inst.ministerial_code.trim()] = inst.name_ar;
            }
          });
          setLocalInstMap(map);
        })
        .catch(err => console.error(err));
    }
  }, [open, instMinisterialMap]);

  const getInstCodeMismatch = (adherenceNum?: string | null, currentInstName?: string | null): string | null => {
    if (!adherenceNum || !localInstMap) return null;
    const first6 = adherenceNum.split('-')[0].trim();
    if (!first6 || first6.length !== 6 || !localInstMap[first6]) return null;
    
    const expectedInstName = localInstMap[first6];
    let resolvedInst = currentInstName?.trim() || '';
    
    if (Object.values(localInstMap).includes(resolvedInst)) {
      // matched directly
    } else {
      const code6 = resolvedInst.split('-')[0].trim();
      if (code6.length === 6 && localInstMap[code6]) {
        resolvedInst = localInstMap[code6];
      }
    }
    
    if (expectedInstName.trim() === resolvedInst) return null;
    return `تنبيه: رقم الانخراط يبدأ بالكود الوزاري ${first6} التابع لمؤسسة "${expectedInstName}" وليس "${resolvedInst || 'مؤسسة أخرى'}"`;
  };
  
  // Advanced Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<any>({
    status: null,
    institution: null,
    year: null,
    commune: null,
    daira: null,
    gender: null,
    age_group: null,
    youth_connect: null,
  });
  const [groupBy, setGroupBy] = useState<string | null>(null);
  
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Map<string, Member>>(new Map());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isFetching = useRef(false);

  // References
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [bousaadaCommunes, setBousaadaCommunes] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [realInstitutions, setRealInstitutions] = useState<any[]>([]);
  
  // Manual Add State
  const [manualFirstName, setManualFirstName] = useState("");
  const [manualLastName, setManualLastName] = useState("");
  const [manualBirthDate, setManualBirthDate] = useState("");
  const [manualGender, setManualGender] = useState("ذكر");
  const [manualMunicipality, setManualMunicipality] = useState("");
  const [manualParentName, setManualParentName] = useState("");
  const [manualParentPhone, setManualParentPhone] = useState("");
  const [manualParentNid, setManualParentNid] = useState("");
  const [manualAdherenceNumber, setManualAdherenceNumber] = useState("");

  // Member settings
  const [memberType, setMemberType] = useState<string>("main");
  const [selectedInstitution, setSelectedInstitution] = useState<string>("");
  const [associations, setAssociations] = useState<any[]>([]);
  const [selectedAssociation, setSelectedAssociation] = useState<string>("");
  const [selectedEnrollInstitution, setSelectedEnrollInstitution] = useState<string>("");
  const [scoutYouthInstitution, setScoutYouthInstitution] = useState<string>("");
  const [municipalityName, setMunicipalityName] = useState<string>("");
  const [authorityName, setAuthorityName] = useState<string>("");
  const [isStandby, setIsStandby] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Registration search state
  const [regSearchQuery, setRegSearchQuery] = useState("");
  const [registrations, setRegistrations] = useState<CampRegistration[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [selectedRegistrations, setSelectedRegistrations] = useState<Map<string, CampRegistration>>(new Map());
  const [regPage, setRegPage] = useState(1);
  const [hasMoreRegs, setHasMoreRegs] = useState(true);

  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        loadData(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filters, groupBy, open]);

  useEffect(() => {
    if (open && activeTab === "registration") {
      const timer = setTimeout(() => {
        loadRegistrations(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [regSearchQuery, activeTab, open]);

  const loadInitialData = async () => {
    try {
      const [instRes, commRes, realInstRes, assocRes, bousaadaRes] = await Promise.all([
        membersApi.groupBy("institution"),
        membersApi.groupBy("commune"),
        institutionsApi.getAll({ size: 200, sector: 'YOUTH' }),
        associationsApi.getAll({ limit: 1000 }),
        locationsApi.getMunicipalities("68").catch(() => []),
      ]);
      setInstitutions(instRes.data.items.map((i: any) => ({ label: i.label || i.key, value: i.key })));
      setMunicipalities(commRes.data.items.map((i: any) => ({ label: i.label || i.key, value: i.key })));
      setRealInstitutions(realInstRes.items.map((i: any) => ({ label: i.name_ar, value: i.name_ar })));
      setAssociations(assocRes.items.map((a: any) => ({ label: a.name_ar, value: a.name_ar })));
      setBousaadaCommunes((bousaadaRes as any[]).map((m: any) => ({ label: m.name_ar, value: m.name_ar })));
    } catch (error) {
      console.error("Failed to load statistics", error);
    }
  };

  const loadData = async (reset = false) => {
    if (isFetching.current && !reset) return;
    
    isFetching.current = true;
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const page = reset ? 1 : currentPage;
      const size = groupBy ? 1000 : 20; 
      
      const res = await membersApi.list({
        search: searchQuery || undefined,
        status: filters.status?.[0] as any || undefined,
        institution: filters.institution?.[0] || undefined,
        year: filters.year?.[0] ? parseInt(filters.year[0]) : undefined,
        commune: filters.commune?.[0] || undefined,
        daira: filters.daira?.[0] || undefined,
        gender: filters.gender?.[0] || undefined,
        age_group: filters.age_group?.[0] || undefined,
        youth_connect: filters.youth_connect?.[0] === "true" ? true : filters.youth_connect?.[0] === "false" ? false : undefined,
        page: page,
        size: size,
      });
      
      const newItems = res.data.items || [];
      
      if (reset) {
        setMembers(newItems);
        setCurrentPage(2);
      } else {
        setMembers(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNewItems = newItems.filter((m: any) => !existingIds.has(m.id));
          return [...prev, ...uniqueNewItems];
        });
        setCurrentPage(prev => prev + 1);
      }
      
      setHasMore(newItems.length === size); 
    } catch {
      toast.error("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isFetching.current = false;
    }
  };

  const loadRegistrations = async (reset = false) => {
    setLoadingRegs(true);
    try {
      const page = reset ? 1 : regPage;
      const res = await campRegistrationApi.searchChildren(regSearchQuery || undefined, page, 50);
      const items = res.data.items || [];
      
      if (reset) {
        setRegistrations(items);
        setRegPage(2);
      } else {
        setRegistrations(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const uniqueNew = items.filter((r: CampRegistration) => !existingIds.has(r.id));
          return [...prev, ...uniqueNew];
        });
        setRegPage(prev => prev + 1);
      }
      setHasMoreRegs(items.length === 50);
    } catch (err) {
      console.error("Failed to load registrations", err);
    } finally {
      setLoadingRegs(false);
    }
  };

  const groupedMembers = useMemo(() => {
    if (!groupBy) return null;
    const groups: Record<string, { name: string, items: Member[] }> = {};
    members.forEach(member => {
      let groupKey = "other";
      let groupName = "غير محدد";
      if (groupBy === "institution") {
        groupKey = member.institution || "no-institution";
        groupName = member.institution || "بدون مؤسسة";
      } else if (groupBy === "commune") {
        groupKey = member.residence_commune || "no-commune";
        groupName = member.residence_commune || "بدون بلدية";
      } else if (groupBy === "gender") {
        groupKey = member.gender || "no-gender";
        groupName = member.gender || "غير محدد";
      } else if (groupBy === "status") {
        groupKey = member.membership_status || "ACTIVE";
        groupName = member.membership_status === 'ACTIVE' ? 'نشط' : member.membership_status === 'EXPIRED' ? 'منتهي' : 'ملغي';
      }
      if (!groups[groupKey]) groups[groupKey] = { name: groupName, items: [] };
      groups[groupKey].items.push(member);
    });
    return groups;
  }, [members, groupBy]);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) newSet.delete(groupKey);
      else newSet.add(groupKey);
      return newSet;
    });
  };

  const toggleSelection = (member: Member) => {
    const mismatchMsg = getInstCodeMismatch(member.unified_member_number, member.institution);
    if (mismatchMsg) {
      toast.warning(mismatchMsg);
    }
    setSelectedMembers(prev => {
      const newMap = new Map(prev);
      if (newMap.has(member.id)) newMap.delete(member.id);
      else newMap.set(member.id, member);
      return newMap;
    });
  };

  const toggleRegistrationSelection = (reg: CampRegistration) => {
    const mismatchMsg = getInstCodeMismatch(reg.unified_member_number, reg.youth_institution);
    if (mismatchMsg) {
      toast.warning(mismatchMsg);
    }
    setSelectedRegistrations(prev => {
      const newMap = new Map(prev);
      if (newMap.has(reg.id)) newMap.delete(reg.id);
      else newMap.set(reg.id, reg);
      return newMap;
    });
  };

  const selectAllGroup = (groupMembers: Member[]) => {
    setSelectedMembers(prev => {
      const newMap = new Map(prev);
      const allSelected = groupMembers.every(m => newMap.has(m.id));
      if (allSelected) {
        groupMembers.forEach(m => newMap.delete(m.id));
      } else {
        groupMembers.forEach(m => {
          const mismatchMsg = getInstCodeMismatch(m.unified_member_number, m.institution);
          if (mismatchMsg && !newMap.has(m.id)) toast.warning(mismatchMsg);
          newMap.set(m.id, m);
        });
      }
      return newMap;
    });
  };

  const handleAdd = async () => {
    if (memberType === 'association' && !selectedAssociation) {
      toast.error('الرجاء اختيار الجمعية');
      return;
    }
    if (memberType === 'scout' && !scoutYouthInstitution.trim()) {
      toast.error('الرجاء إدخال اسم الفوج الكشفي');
      return;
    }
    if (memberType === 'municipality' && !municipalityName.trim()) {
      toast.error('الرجاء إدخال اسم البلدية');
      return;
    }
    if (memberType === 'authority' && !authorityName.trim()) {
      toast.error('الرجاء إدخال اسم الهيئة');
      return;
    }
    if (memberType === 'institution' && !selectedInstitution) {
      toast.error('الرجاء اختيار المؤسسة المعنية');
      return;
    }

    let membersToAdd: CampTripMember[] = [];

    if (activeTab === "search") {
      if (selectedMembers.size === 0) return;
      
      const eligibleMembers = Array.from(selectedMembers.values());
      const mismatched = eligibleMembers.filter((m: any) => getInstCodeMismatch(m.unified_member_number, m.institution));
      if (mismatched.length > 0) {
        toast.warning('تنبيه: تم إضافة منخرطين لديهم كود تعريف وزاري تابع لمؤسسة أخرى.');
      }

      // Optionally show warning if some have rejections
      const rejected = eligibleMembers.filter((m: any) => m.camp_rejection_reason);
      if (rejected.length > 0) {
          toast.error(`تم استبعاد ${rejected.length} منخرط بسبب مشاكل سابقة في التخييم.`);
      }
      const validMembers = eligibleMembers.filter((m: any) => !m.camp_rejection_reason);
      
      if (validMembers.length === 0) {
          toast.error('لا يوجد أي منخرط مؤهل لإضافته للمخيم.');
          return;
      }

      membersToAdd = validMembers.map(c => ({
        member_id: c.id,
        member_type: memberType as any,
        is_standby: isStandby,
        first_name: c.first_name,
        last_name: c.last_name,
        gender: c.gender,
        birth_date: c.birth_date,
        municipality: c.residence_commune,
        residence_wilaya: c.residence_wilaya,
        address: c.address,
        youth_institution: memberType === 'scout' ? scoutYouthInstitution : memberType === 'municipality' ? municipalityName : memberType === 'authority' ? authorityName : memberType === 'association' ? selectedAssociation : memberType === 'institution' ? selectedInstitution : (selectedEnrollInstitution || c.institution),
        enrollment_institution: selectedEnrollInstitution || undefined,
        ministry_number: c.ministry_number?.match(/^[0-9a-f]{24}$/i) ? c.ministry_number : undefined,
        unified_adherence_number: c.unified_member_number?.startsWith('RCPT-') ? undefined : c.unified_member_number,
        photo_path: c.photo_path,
      } as any));
    } else if (activeTab === "registration") {
      if (selectedRegistrations.size === 0) return;
      
      const mismatchedRegs = Array.from(selectedRegistrations.values()).filter((reg: any) => getInstCodeMismatch(reg.unified_member_number, reg.youth_institution));
      if (mismatchedRegs.length > 0) {
        toast.warning('تنبيه: تم إضافة أطفال لديهم كود تعريف وزاري تابع لمؤسسة أخرى.');
      }
      
      membersToAdd = Array.from(selectedRegistrations.values()).map(reg => ({
        child_id: reg.id,
        member_type: memberType as any,
        is_standby: isStandby,
        first_name: reg.child_first_name,
        last_name: reg.child_last_name,
        gender: reg.gender,
        birth_date: reg.birth_date,
        municipality: reg.residence_commune,
        residence_wilaya: reg.residence_wilaya,
        address: reg.address,
        youth_institution: memberType === 'scout' ? scoutYouthInstitution : memberType === 'municipality' ? municipalityName : memberType === 'authority' ? authorityName : memberType === 'association' ? selectedAssociation : memberType === 'institution' ? selectedInstitution : (selectedEnrollInstitution || reg.youth_institution),
        enrollment_institution: selectedEnrollInstitution || undefined,
        unified_adherence_number: reg.unified_member_number?.startsWith('RCPT-') ? undefined : reg.unified_member_number,
        photo_path: reg.effective_photo_path || reg.child_photo_path,
        parental_declaration_path: reg.effective_birth_certificate_path || reg.birth_certificate_path,
        parent_full_name: reg.parent_first_name && reg.parent_last_name ? `${reg.parent_first_name} ${reg.parent_last_name}` : undefined,
        parent_phone: reg.parent_phone,
        parent_national_id: reg.parent_national_id,
      } as any));
    } else {
      if (!manualFirstName.trim() || !manualLastName.trim() || !manualBirthDate.trim() || !manualParentName.trim()) {
        alert(t("required_fields"));
        return;
      }
      const instName = memberType === 'scout' ? scoutYouthInstitution : memberType === 'municipality' ? municipalityName : memberType === 'authority' ? authorityName : memberType === 'association' ? selectedAssociation : memberType === 'institution' ? selectedInstitution : selectedEnrollInstitution;
      if (manualAdherenceNumber.trim()) {
        const mismatchMsg = getInstCodeMismatch(manualAdherenceNumber.trim(), instName);
        if (mismatchMsg) {
          toast.warning(mismatchMsg);
        }
      }
      membersToAdd = [{
        member_type: memberType as any,
        is_standby: isStandby,
        first_name: manualFirstName.trim(),
        last_name: manualLastName.trim(),
        birth_date: manualBirthDate.trim(),
        gender: manualGender,
        municipality: manualMunicipality.trim() || undefined,
        youth_institution: instName || undefined,
        enrollment_institution: selectedEnrollInstitution || undefined,
        parent_full_name: manualParentName.trim(),
        parent_phone: manualParentPhone.trim() || undefined,
        parent_national_id: manualParentNid.trim() || undefined,
        unified_adherence_number: manualAdherenceNumber.trim() || undefined,
      }];
    }

    setSubmitting(true);
    try {
      await campTripsApi.addMembers(tripId, membersToAdd);
      toast.success('تمت الإضافة بنجاح');
      setOpen(false);
      setSelectedMembers(new Map());
      setSelectedRegistrations(new Map());
      setManualFirstName("");
      setManualLastName("");
      setManualBirthDate("");
      setManualParentName("");
      setManualParentPhone("");
      setManualParentNid("");
      setManualMunicipality("");
      setManualAdherenceNumber("");
      onAdded();
    } catch (e: any) {
      console.error(e);
      const serverMsg = e?.response?.data?.detail;
      toast.error(serverMsg || t("failed_add_members"));
    } finally {
      setSubmitting(false);
    }
  };

  const searchFilters = [
    { id: 'status', label: 'الحالة', type: 'multiselect' as const, options: [{ label: 'نشط', value: 'ACTIVE' }, { label: 'منتهي', value: 'EXPIRED' }, { label: 'ملغي', value: 'CANCELLED' }] },
    { id: 'institution', label: 'المؤسسة', type: 'multiselect' as const, options: institutions },
    { id: 'commune', label: 'البلدية', type: 'multiselect' as const, options: municipalities },
    { id: 'gender', label: 'الجنس', type: 'multiselect' as const, options: [{ label: 'ذكر', value: 'MALE' }, { label: 'أنثى', value: 'FEMALE' }] },
  ];

  const groupByOptions = [
    { id: "institution", label: "المؤسسة" },
    { id: "commune", label: "البلدية" },
    { id: "gender", label: "الجنس" },
    { id: "status", label: "وضعية الانخراط" },
  ];

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) {
        setRegSearchQuery("");
        setRegistrations([]);
        setSelectedRegistrations(new Map());
        setRegPage(1);
        setHasMoreRegs(true);
      }
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
          <UserPlus className="h-4 w-4" /> {t("add_children")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0" dir="rtl">
        <DialogHeader className="px-6 py-4 border-b shrink-0 bg-slate-50/50">
          <DialogTitle className="text-xl font-bold text-slate-800">{t("add_children_to_trip")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-6 py-2 border-b bg-slate-50/50 shrink-0">
                <TabsList className="grid w-full grid-cols-3" dir="rtl">
                <TabsTrigger value="search">البحث المتقدم للمنخرطين</TabsTrigger>
                <TabsTrigger value="registration">من التسجيلات</TabsTrigger>
                <TabsTrigger value="manual">{t("manual_add")}</TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="search" className="flex-1 overflow-hidden flex flex-col min-h-0 p-0 m-0 data-[state=active]:flex">
              <div className="border-b shrink-0 bg-white shadow-sm z-10">
                  <OdooSearch 
                    placeholder="البحث بالاسم أو رقم الانخراط..."
                    filters={searchFilters}
                    groupByOptions={groupByOptions}
                    onSearch={setSearchQuery}
                    onFilterChange={setFilters}
                    onGroupChange={setGroupBy}
                    initialSearch={searchQuery}
                    initialGroupBy={groupBy}
                  />
              </div>

              <ScrollArea className="flex-1 p-6 bg-slate-50/50">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                ) : groupBy && groupedMembers ? (
                    <div className="space-y-4">
                        {Object.entries(groupedMembers).map(([groupKey, group]) => {
                            const isCollapsed = collapsedGroups.has(groupKey);
                            return (
                                <div key={groupKey} className="rounded-xl border bg-white shadow-sm overflow-hidden transition-all">
                                    <div className="w-full flex items-center border-b bg-slate-50/80">
                                        <button
                                            onClick={() => toggleGroup(groupKey)}
                                            className="flex-1 flex items-center justify-between px-5 py-3 hover:bg-slate-100/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-emerald-100/50 text-emerald-600">
                                                    <Users className="h-4 w-4" />
                                                </div>
                                                <div className="text-right">
                                                    <h3 className="text-sm font-bold text-slate-800">{group.name}</h3>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                    {group.items.length}
                                                </span>
                                                {isCollapsed ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
                                            </div>
                                        </button>
                                        <div className="px-4 flex items-center border-r" onClick={e => e.stopPropagation()}>
                                            <Checkbox 
                                              checked={group.items.length > 0 && group.items.every(m => selectedMembers.has(m.id))}
                                              onCheckedChange={() => selectAllGroup(group.items)}
                                            />
                                        </div>
                                    </div>
                                    {!isCollapsed && (
                                        <div className="p-2 space-y-1 bg-white">
                                            {group.items.map((member) => (
                                                <div key={member.id} className="flex items-center space-x-2 space-x-reverse border-b last:border-0 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors" onClick={() => toggleSelection(member)}>
                                                    <Checkbox 
                                                      id={member.id} 
                                                      checked={selectedMembers.has(member.id)}
                                                      onCheckedChange={() => toggleSelection(member)}
                                                    />
                                                    <Label className="text-sm font-medium leading-none cursor-pointer flex-grow flex items-center gap-3">
                                                        {member.photo_path ? (
                                                            <img src={member.photo_path.startsWith('http') ? member.photo_path : `${STORAGE_URL}/${member.photo_path}`} className="w-8 h-8 rounded-full object-cover border" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border">
                                                                {member.first_name?.[0]}{member.last_name?.[0]}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                                              <span>{member.first_name} {member.last_name}</span>
                                                              {getInstCodeMismatch(member.unified_member_number, member.institution) && (
                                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 text-[11px] font-bold gap-1 cursor-help" title={getInstCodeMismatch(member.unified_member_number, member.institution) || ''}>
                                                                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                                                                  كود مؤسسة أخرى
                                                                </span>
                                                              )}
                                                              {(member as any).duplicate_info && (
                                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold gap-1 cursor-help" title={(member as any).duplicate_info}>
                                                                  <AlertTriangle className="w-3.5 h-3.5" />
                                                                  {(member as any).duplicate_info}
                                                                </span>
                                                              )}
                                                              {(member as any).is_deleted_alert && !(member as any).duplicate_info?.includes('تم حذفه') && (
                                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold gap-1 cursor-help" title="تم حذفه سابقاً من نظام التخييم">
                                                                  <AlertTriangle className="w-3.5 h-3.5" />
                                                                  محذوف مسبقاً
                                                                </span>
                                                              )}
                                                            </div>
                                                            <div className="text-xs text-slate-500 font-normal">{member.institution} • {member.residence_commune}</div>
                                                        </div>
                                                        {(member as any).camp_rejection_reason && (
                                                            <span className="mr-auto text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">مرفوض مسبقا</span>
                                                        )}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-1 bg-white border rounded-xl overflow-hidden shadow-sm">
                        {members.length === 0 ? (
                            <div className="text-center text-slate-500 py-12 flex flex-col items-center justify-center">
                                <Search className="h-10 w-10 text-slate-200 mb-3" />
                                {t("no_results")}
                            </div>
                        ) : members.map(member => (
                            <div key={member.id} className="flex items-center space-x-2 space-x-reverse border-b last:border-0 p-3 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => toggleSelection(member)}>
                                <Checkbox 
                                  id={member.id} 
                                  checked={selectedMembers.has(member.id)}
                                  onCheckedChange={() => toggleSelection(member)}
                                />
                                <Label className="text-sm font-medium leading-none cursor-pointer flex-grow flex items-center gap-3">
                                    {member.photo_path ? (
                                        <img src={member.photo_path.startsWith('http') ? member.photo_path : `${STORAGE_URL}/${member.photo_path}`} className="w-8 h-8 rounded-full object-cover border" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border">
                                            {member.first_name?.[0]}{member.last_name?.[0]}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                          <span>{member.first_name} {member.last_name}</span>
                                          {getInstCodeMismatch(member.unified_member_number, member.institution) && (
                                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 text-[11px] font-bold gap-1 cursor-help" title={getInstCodeMismatch(member.unified_member_number, member.institution) || ''}>
                                              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                                              كود مؤسسة أخرى
                                            </span>
                                          )}
                                          {(member as any).duplicate_info && (
                                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold gap-1 cursor-help" title={(member as any).duplicate_info}>
                                              <AlertTriangle className="w-3.5 h-3.5" />
                                              {(member as any).duplicate_info}
                                            </span>
                                          )}
                                          {(member as any).is_deleted_alert && !(member as any).duplicate_info?.includes('تم حذفه') && (
                                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold gap-1 cursor-help" title="تم حذفه سابقاً من نظام التخييم">
                                              <AlertTriangle className="w-3.5 h-3.5" />
                                              محذوف مسبقاً
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-slate-500 font-normal">{member.institution} • {member.residence_commune}</div>
                                    </div>
                                    {(member as any).camp_rejection_reason && (
                                        <span className="mr-auto text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">مرفوض مسبقا</span>
                                    )}
                                </Label>
                            </div>
                        ))}
                        {hasMore && members.length > 0 && (
                            <div className="p-4 flex justify-center border-t bg-slate-50/50">
                                <Button variant="outline" size="sm" onClick={() => loadData(false)} disabled={loadingMore}>
                                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تحميل المزيد'}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="manual" className="flex-1 overflow-y-auto p-6 m-0 data-[state=active]:flex flex-col bg-slate-50/50">
                <div className="bg-white p-6 rounded-xl border shadow-sm grid grid-cols-2 gap-5 max-w-3xl mx-auto w-full">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">{t("manual_first_name")}</Label>
                    <Input value={manualFirstName} onChange={e => setManualFirstName(e.target.value)} placeholder={t("manual_first_name")} className="bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">{t("manual_last_name")}</Label>
                    <Input value={manualLastName} onChange={e => setManualLastName(e.target.value)} placeholder={t("manual_last_name")} className="bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">{t("manual_birth_date")}</Label>
                    <DateTimePicker value={manualBirthDate} onChange={setManualBirthDate} placeHolder={t("manual_birth_date")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">{t("manual_gender")}</Label>
                    <Select value={manualGender} onValueChange={setManualGender}>
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ذكر">{t("male")}</SelectItem>
                        <SelectItem value="أنثى">{t("female")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="text-slate-700 font-bold">{t("manual_parent_name")}</Label>
                    <Input value={manualParentName} onChange={e => setManualParentName(e.target.value)} placeholder={t("manual_parent_name")} className="bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">{t("manual_parent_phone")}</Label>
                    <Input value={manualParentPhone} onChange={e => setManualParentPhone(e.target.value)} placeholder={t("manual_parent_phone")} className="bg-slate-50" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">{t("manual_parent_nid")}</Label>
                    <Input value={manualParentNid} onChange={e => setManualParentNid(e.target.value)} placeholder={t("manual_parent_nid")} className="bg-slate-50" dir="ltr" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="text-slate-700 font-bold">{t("manual_municipality")}</Label>
                    <SearchableSelect 
                      options={bousaadaCommunes} 
                      value={manualMunicipality} 
                      onValueChange={setManualMunicipality} 
                      placeholder="اختر بلدية من ولاية بوسعادة..." 
                      searchPlaceholder="بحث عن بلدية..." 
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="text-slate-700 font-bold">رقم الانخراط الموحد (اختياري)</Label>
                    <Input value={manualAdherenceNumber} onChange={e => setManualAdherenceNumber(e.target.value)} placeholder="مثال: 280709-26-1-012-0047" className="bg-slate-50 font-mono" dir="ltr" />
                  </div>
              </div>
            </TabsContent>

            <TabsContent value="registration" className="flex-1 overflow-hidden flex flex-col min-h-0 p-0 m-0 data-[state=active]:flex">
              <div className="border-b shrink-0 bg-white shadow-sm z-10 px-6 py-3">
                <Input
                  placeholder="البحث بالاسم..."
                  value={regSearchQuery}
                  onChange={e => setRegSearchQuery(e.target.value)}
                  className="bg-slate-50"
                />
              </div>
              
              <ScrollArea className="flex-1 p-6 bg-slate-50/50">
                {loadingRegs ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  </div>
                ) : (
                  <div className="space-y-1 bg-white border rounded-xl overflow-hidden shadow-sm">
                    {registrations.length === 0 ? (
                      <div className="text-center text-slate-500 py-12 flex flex-col items-center justify-center">
                        <Search className="h-10 w-10 text-slate-200 mb-3" />
                        لا توجد تسجيلات
                      </div>
                    ) : registrations.map(reg => (
                      <div 
                        key={reg.id} 
                        className="flex items-center space-x-2 space-x-reverse border-b last:border-0 p-3 hover:bg-slate-50 cursor-pointer transition-colors" 
                        onClick={() => toggleRegistrationSelection(reg)}
                      >
                        <Checkbox 
                          id={reg.id}
                          checked={selectedRegistrations.has(reg.id)}
                          onCheckedChange={() => toggleRegistrationSelection(reg)}
                        />
                        <Label className="text-sm font-medium leading-none cursor-pointer flex-grow flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border">
                            {reg.child_first_name?.[0]}{reg.child_last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                              <span>{reg.child_first_name} {reg.child_last_name}</span>
                              {getInstCodeMismatch(reg.unified_member_number, reg.youth_institution) && (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 text-[11px] font-bold gap-1 cursor-help" title={getInstCodeMismatch(reg.unified_member_number, reg.youth_institution) || ''}>
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                                  كود مؤسسة أخرى
                                </span>
                              )}
                              {(reg as any).duplicate_info && (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold gap-1 cursor-help" title={(reg as any).duplicate_info}>
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  {(reg as any).duplicate_info}
                                </span>
                              )}
                              {(reg as any).is_deleted_alert && !(reg as any).duplicate_info?.includes('تم حذفه') && (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold gap-1 cursor-help" title="تم حذفه سابقاً من نظام التخييم">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  محذوف مسبقاً
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-normal">
                              {reg.residence_commune || ''} • 
                              <span className={`mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                reg.status === 'success' ? 'bg-green-100 text-green-700' :
                                reg.status === 'failed' || reg.status === 'error' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {reg.status === 'success' ? 'ناجح' :
                                 reg.status === 'failed' ? 'فشل' :
                                 reg.status === 'error' ? 'خطأ' :
                                 reg.status === 'processing' ? 'قيد المعالجة' : 'قيد الانتظار'}
                              </span>
                            </div>
                          </div>
                        </Label>
                      </div>
                    ))}
                    {hasMoreRegs && registrations.length > 0 && (
                      <div className="p-4 flex justify-center border-t bg-slate-50/50">
                        <Button variant="outline" size="sm" onClick={() => loadRegistrations(false)} disabled={loadingRegs}>
                          {loadingRegs ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تحميل المزيد'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <div className="p-6 border-t bg-white shrink-0">
            <div className="flex flex-col gap-4">
                <div className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-600">إعدادات الإضافة</h3>
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer select-none" onClick={() => setIsStandby(!isStandby)}>
                      <Checkbox id="is_standby" checked={isStandby} onCheckedChange={(c) => setIsStandby(!!c)} />
                      <Label htmlFor="is_standby" className="text-sm font-bold text-slate-700 cursor-pointer">{t("add_to_standby")}</Label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700">{t("seat_type")}</Label>
                        {canEditSeat ? (
                        <Select value={memberType} onValueChange={setMemberType}>
                        <SelectTrigger className="bg-white border-slate-200">
                            <SelectValue placeholder={t("seat_type")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="main">{t("seat_main")}</SelectItem>
                            <SelectItem value="institution">{t("seat_institution")}</SelectItem>
                            <SelectItem value="scout">{t("seat_scout")}</SelectItem>
                            <SelectItem value="association">{t("seat_association")}</SelectItem>
                            <SelectItem value="municipality">البلدية</SelectItem>
                            <SelectItem value="authority">هيئة</SelectItem>
                        </SelectContent>
                        </Select>
                        ) : (
                        <div className="h-10 w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 text-sm font-medium text-slate-500">
                            <span>{t("seat_main")}</span>
                            <span className="text-xs text-slate-400 font-normal">ثابت</span>
                        </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        {memberType === 'association' && (
                          <>
                            <Label className="font-bold text-slate-700">الجمعية</Label>
                            <SearchableSelect 
                              options={associations} 
                              value={selectedAssociation} 
                              onValueChange={setSelectedAssociation}
                              placeholder="اختر الجمعية"
                              searchPlaceholder="بحث عن جمعية..."
                            />
                          </>
                        )}
                        {memberType === 'scout' && (
                          <>
                            <Label className="font-bold text-slate-700">اسم الفوج الكشفي</Label>
                            <Input 
                              value={scoutYouthInstitution} 
                              onChange={(e) => setScoutYouthInstitution(e.target.value)} 
                              placeholder="أدخل اسم الفوج الكشفي"
                            />
                          </>
                        )}
                        {memberType === 'municipality' && (
                          <>
                            <Label className="font-bold text-slate-700">البلدية</Label>
                            <Input 
                              value={municipalityName} 
                              onChange={(e) => setMunicipalityName(e.target.value)} 
                              placeholder="أدخل اسم البلدية"
                            />
                          </>
                        )}
                        {memberType === 'authority' && (
                          <>
                            <Label className="font-bold text-slate-700">هيئة</Label>
                            <Input 
                              value={authorityName} 
                              onChange={(e) => setAuthorityName(e.target.value)} 
                              placeholder="أدخل اسم الهيئة"
                            />
                          </>
                        )}
                        {memberType === 'institution' && (
                          <>
                            <Label className="font-bold text-slate-700">المؤسسة المعنية</Label>
                            <SearchableSelect 
                              options={realInstitutions} 
                              value={selectedInstitution} 
                              onValueChange={setSelectedInstitution}
                              placeholder="اختر المؤسسة..."
                              searchPlaceholder="بحث عن مؤسسة..."
                            />
                          </>
                        )}
                        {memberType === 'main' && (
                          <div className="flex items-center h-full">
                            <p className="text-sm text-slate-400 italic">(مؤسسة الانخراط في الأسفل)</p>
                          </div>
                        )}
                      </div>
                  </div>
                  {memberType !== 'institution' && (
                  <div className="mt-3">
                    <Label className="font-bold text-slate-700">مؤسسة الانخراط التابع لها</Label>
                    <div className="mt-1.5">
                      <SearchableSelect 
                        options={realInstitutions} 
                        value={selectedEnrollInstitution || selectedInstitution} 
                        onValueChange={setSelectedEnrollInstitution}
                        placeholder="اختر مؤسسة الانخراط — اختياري"
                        searchPlaceholder="بحث عن مؤسسة..."
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">اختياري — لتحديد المؤسسة التابع لها الطفل</p>
                  </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 mt-2">
                <Button variant="outline" onClick={() => setOpen(false)} className="px-6">{t("cancel")}</Button>
                <Button onClick={handleAdd} disabled={submitting || (activeTab === "search" && selectedMembers.size === 0) || (activeTab === "registration" && selectedRegistrations.size === 0)} className="px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {activeTab === "search" ? t("add_count", { count: selectedMembers.size }) : 
                     activeTab === "registration" ? `إضافة ${selectedRegistrations.size} طفل` : 
                     t("add_button")}
                </Button>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
