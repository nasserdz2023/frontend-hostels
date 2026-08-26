"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Users, User, Handshake, Building2, Pencil, Edit, Trash2, Plus, DollarSign, UsersRound, Send, Check, Image as ImageIcon, MapPin, Calendar, Clock, Lock, ChevronDown, Upload, Save, Calendar as CalendarIcon, XCircle, AlertCircle, MoreHorizontal, CheckCircle, BarChart } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { activitiesApi, Activity, ACTIVITY_STATUS_LABELS, ActivityStatus, ActivityRoom, Session, Registration, RegistrationStatus, SessionStatus, ActivityLocationType, ActivityStatistics } from "@/lib/api/activities";
import { employeesApi, Employee } from "@/lib/api/employees";
import { institutionsApi, Room } from "@/lib/api/institutions";
import { useAuthStore } from "@/lib/stores/auth";
import { ActivityGallery } from "@/components/activities/ActivityGallery";
import { ActivityStatusStepper } from "@/components/activities/ActivityStatusStepper";
import { ApprovalTimeline, TimelineEvent } from "@/components/common/ApprovalTimeline";
import { PhotoSelector } from "@/components/photos/PhotoSelector";
import dynamic from "next/dynamic";

const ImageCropper = dynamic(() => import("@/components/ui/image-cropper").then(m => m.ImageCropper), {
    ssr: false, loading: () => <div className="h-80 rounded-lg border bg-muted/30 animate-pulse" />
});
import { photosApi } from "@/lib/api/photos";
import { associationsApi, Association } from "@/lib/api/associations";
import { useInstitutionsStore } from "@/lib/stores/institutions";

// ... existing imports ...

// Cover Image Selector

interface ActivityGroup {
    id: string;
    name: string;
    min_age?: number;
    max_age?: number;
    max_participants?: number;
}

interface ActivityCoordinator {
    id: string;
    employee_id: string;
    role: string;
    is_primary?: boolean;
    employee?: {
        firstname_ar: string;
        lastname_ar: string;
        employee_number?: string;
    };
}

interface ActivityPartner {
    id: string;
    partner_name?: string;
    partner_type: string;
    institution?: { name_ar: string };
    institution_id?: string;
    contribution?: string;
}

export default function ActivityDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = use(params);
    const router = useRouter();
    const t = useTranslations("activities");
    const { user, hasPermission } = useAuthStore();
    const { fetchInstitutions, institutions } = useInstitutionsStore();

    const [activity, setActivity] = useState<Activity | null>(null);
    const [groups, setGroups] = useState<ActivityGroup[]>([]);
    const [coordinators, setCoordinators] = useState<ActivityCoordinator[]>([]);
    const [partners, setPartners] = useState<ActivityPartner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("details");
    const [approving, setApproving] = useState(false);

    // Dialog states
    const [groupDialogOpen, setGroupDialogOpen] = useState(false);
    const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
    const [newGroup, setNewGroup] = useState({ name: "", min_age: "", max_age: "", max_participants: "" });
    const [newPartner, setNewPartner] = useState({ partner_name: "", partner_type: "ASSOCIATION", institution_id: "", contribution: "" });

    // Coordinator State
    const [coordinatorDialogOpen, setCoordinatorDialogOpen] = useState(false);
    const [newCoordinator, setNewCoordinator] = useState({ employee_id: "", is_primary: false });

    // New states for committees and budget
    // Committees State
    const [committees, setCommittees] = useState<any[]>([]);
    const [budgetItems, setBudgetItems] = useState<any[]>([]);
    const [committeeDialogOpen, setCommitteeDialogOpen] = useState(false);
    const [memberDialogOpen, setMemberDialogOpen] = useState(false);
    const [selectedCommittee, setSelectedCommittee] = useState<any>(null);
    const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
    const [newCommittee, setNewCommittee] = useState({ name_ar: "", committee_type: "ORGANIZING", description: "" });
    const [newMember, setNewMember] = useState({ employee_id: "", is_head: false });
    const [newBudgetItem, setNewBudgetItem] = useState({ item_name: "", category: "MATERIALS", estimated_amount: "" });
    const [editingBudgetItem, setEditingBudgetItem] = useState<any>(null);

    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [statistics, setStatistics] = useState<ActivityStatistics | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
    const [newSession, setNewSession] = useState({
        session_date: "",
        start_time: "",
        end_time: "",
        room_id: "",
        instructor_id: "",
        topic: "",
        notes: ""
    });
    const [editingSession, setEditingSession] = useState<Session | null>(null);

    // Locations State
    const [rooms, setRooms] = useState<ActivityRoom[]>([]);
    const [roomDialogOpen, setRoomDialogOpen] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState("");
    const [locationDetails, setLocationDetails] = useState("");
    const [locationType, setLocationType] = useState<ActivityLocationType>(ActivityLocationType.INTERNAL);
    const [availableRooms, setAvailableRooms] = useState<(Room & { institution_name?: string })[]>([]);

    // Cover Image Selector
    const [coverSelectorOpen, setCoverSelectorOpen] = useState(false);
    const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
    const [postponeDialogOpen, setPostponeDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [postponeReason, setPostponeReason] = useState("");
    const [rejecting, setRejecting] = useState(false);
    const [postponing, setPostponing] = useState(false);
    const [croppingImage, setCroppingImage] = useState<string | null>(null);

    const handleSelectCover = async (assetIds: string[]) => {
        if (assetIds.length === 0) return;
        const assetId = assetIds[0];
        // Use preview URL for cropping
        // Add random query param to avoid caching issues with canvas
        const coverUrl = `/api/v1/photos/assets/${assetId}/preview?t=${new Date().getTime()}`;
        setCroppingImage(coverUrl);
    };

    const handleCropSave = async (croppedBlob: Blob) => {
        try {
            // 1. Upload the cropped image
            const file = new File([croppedBlob], `cover_crop_${id}_${Date.now()}.jpg`, { type: "image/jpeg" });
            const result = await photosApi.uploadPhoto(file, {
                // Optional: tag it or put in special album if needed
            });

            // 2. Update activity with new asset
            const newCoverUrl = `/api/v1/photos/assets/${result.id}/preview`;
            await activitiesApi.updateActivity(id, { cover_image: newCoverUrl });

            toast.success("تم تحديث صورة الغلاف");
            setActivity(prev => prev ? { ...prev, cover_image: newCoverUrl } : null);
            setCroppingImage(null);
        } catch (error) {
            console.error("Failed to save cropped cover:", error);
            toast.error("فشل حفظ الصورة المعدلة");
        }
    };

    // Associations for autocomplete
    const [associationOptions, setAssociationOptions] = useState<{ value: string, label: string }[]>([]);

    useEffect(() => {
        if (newPartner.partner_type === 'ASSOCIATION') {
            const fetchAssociations = async () => {
                try {
                    const res = await associationsApi.getAll({ limit: 1000 });
                    if (res && res.items) {
                        setAssociationOptions(res.items.map(a => ({ value: a.name_ar, label: a.name_ar })));
                    }
                } catch (e) {
                    console.error("Failed to fetch associations", e);
                }
            };
            fetchAssociations();
        }
    }, [newPartner.partner_type]);

    useEffect(() => {
        loadActivity();
    }, [id]);

    const loadActivity = async (isBackground = false) => {
        try {
            if (!isBackground) setIsLoading(true);
            const data = await activitiesApi.getActivity(id);
            setActivity(data);
            setLocationType(data.location_type || ActivityLocationType.INTERNAL);
            setLocationDetails(data.location_details || "");

            await Promise.all([
                loadGroups(),
                loadCoordinators(),
                loadPartners(),
                loadCommittees(),
                loadBudget(),
                loadRooms(),
                loadCommittees(),
                loadBudget(),
                loadRooms(),

                loadRegistrations(),
                loadSessions(),
                loadStatistics()
            ]);
        } catch (error) {
            console.error("Failed to load activity:", error);
            toast.error("فشل تحميل النشاط");
        } finally {
            setIsLoading(false);
        }
    };

    // Polling for real-time status updates


    const loadGroups = async () => {
        try {
            const data = await activitiesApi.getActivityGroups(id);
            setGroups(data);
        } catch (error) {
            console.error("Failed to load groups:", error);
        }
    };

    const loadCoordinators = async () => {
        try {
            const data = await activitiesApi.getActivityCoordinators(id);
            setCoordinators(data);
        } catch (error) {
            console.error("Failed to load coordinators:", error);
        }
    };

    const loadPartners = async () => {
        try {
            const data = await activitiesApi.getActivityPartners(id);
            setPartners(data);
        } catch (error) {
            console.error("Failed to load partners:", error);
        }
    };

    const loadCommittees = async () => {
        try {
            const data = await activitiesApi.getActivityCommittees(id);
            setCommittees(data);
        } catch (error) {
            console.error("Failed to load committees:", error);
        }
    };

    // Paginated employee fetch function for infinite scroll SearchableSelect
    const fetchEmployees = async (params: { search?: string; page: number; size: number }): Promise<{
        items: { value: string; label: string }[];
        total: number;
        hasMore: boolean;
    }> => {
        try {
            const data = await employeesApi.getAll({
                search: params.search,
                page: params.page,
                size: params.size,
                is_active: true
            });
            const response = Array.isArray(data) ? { items: data, total: data.length } : data;
            const items = response.items.map((emp: any) => ({
                value: emp.id,
                label: `${emp.firstname_ar} ${emp.lastname_ar}${emp.employee_number ? ` (${emp.employee_number})` : ''}`
            }));
            return {
                items,
                total: response.total,
                hasMore: (params.page * params.size) < response.total
            };
        } catch (error) {
            console.error("Failed to fetch employees:", error);
            return { items: [], total: 0, hasMore: false };
        }
    };

    const loadBudget = async () => {
        try {
            const data = await activitiesApi.getActivityBudget(id);
            setBudgetItems(data);
        } catch (error) {
            console.error("Failed to load budget:", error);
        }
    };

    const loadRooms = async () => {
        try {
            const data = await activitiesApi.getActivityRooms(id);
            setRooms(data);
        } catch (error) {
            console.error("Failed to load rooms:", error);
        }
    };

    const loadRegistrations = async () => {
        try {
            const data = await activitiesApi.getActivityRegistrations(id);
            
            // Normalize custom_data keys to prevent duplicate columns (merge camelCase into snake_case)
            const normalized = data.map((reg: any) => {
                if (reg.custom_data && typeof reg.custom_data === "object") {
                    const normalizedData = { ...reg.custom_data };
                    if ("educationLevel" in normalizedData) {
                        normalizedData.education_level = normalizedData.educationLevel;
                        delete normalizedData.educationLevel;
                    }
                    if ("nearestInstitution" in normalizedData) {
                        normalizedData.nearest_institution = normalizedData.nearestInstitution;
                        delete normalizedData.nearestInstitution;
                    }
                    if ("passId" in normalizedData) {
                        normalizedData.pass_id = normalizedData.passId;
                        delete normalizedData.passId;
                    }
                    return { ...reg, custom_data: normalizedData };
                }
                return reg;
            });
            
            setRegistrations(normalized);
        } catch (error) {
            console.error("Failed to load registrations:", error);
        }
    };

    const loadStatistics = async () => {
        try {
            setLoadingStats(true);
            const data = await activitiesApi.getActivityStatistics(id);
            setStatistics(data);
        } catch (error) {
            console.error("Failed to load statistics:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    const loadSessions = async () => {
        try {
            const data = await activitiesApi.getActivitySessions(id);
            setSessions(data);
        } catch (error) {
            console.error("Failed to load sessions:", error);
        }
    };

    const handleAddSession = async () => {
        if (!newSession.session_date || !newSession.start_time) {
            toast.error("يرجى ملء التاريخ والتوقيت");
            return;
        }
        try {
            await activitiesApi.createSession(id, newSession);
            toast.success("تم إضافة الحصة");
            setSessionDialogOpen(false);
            setNewSession({ session_date: "", start_time: "", end_time: "", room_id: "", instructor_id: "", topic: "", notes: "" });
            loadSessions();
        } catch (error) {
            toast.error("فشل إضافة الحصة");
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!confirm("هل أنت متأكد من حذف هذه الحصة؟")) return;
        try {
            await activitiesApi.deleteSession(id, sessionId);
            toast.success("تم حذف الحصة");
            loadSessions();
        } catch (error) {
            toast.error("فشل حذف الحصة");
        }
    };

    const handleEditSession = (session: Session) => {
        setEditingSession(session);
        setNewSession({
            session_date: session.session_date,
            start_time: session.start_time,
            end_time: session.end_time || "",
            room_id: session.room_id || "",
            instructor_id: session.instructor_id || "",
            topic: session.topic || "",
            notes: session.notes || ""
        });
        loadInstitutionRooms();

        setSessionDialogOpen(true);
    };

    const handleUpdateSession = async () => {
        if (!editingSession) return;
        if (!newSession.session_date || !newSession.start_time) {
            toast.error("يرجى ملء التاريخ والتوقيت");
            return;
        }
        try {
            await activitiesApi.updateSession(editingSession.id, newSession);
            toast.success("تم تحديث الحصة");
            setSessionDialogOpen(false);
            setEditingSession(null);
            setNewSession({ session_date: "", start_time: "", end_time: "", room_id: "", instructor_id: "", topic: "", notes: "" });
            loadSessions();
        } catch (error) {
            toast.error("فشل تحديث الحصة");
        }
    };

    // ... Handlers (Keep all standard handlers) ...
    const loadInstitutionRooms = async () => {
        if (!activity?.institution_id) return;
        try {
            const allowedTypes = ['ACTIVITY', 'CONFERENCE', 'CLASSROOM'];

            // If user is Admin (Director/DeptHead), load ALL sector rooms
            if (user?.role === 'director' || user?.role === 'dept_head') {
                const response = await institutionsApi.getAll({ size: 1000 });
                const allRooms: (Room & { institution_name?: string })[] = [];
                response.items.forEach(inst => {
                    if (inst.rooms && inst.rooms.length > 0) {
                        inst.rooms.forEach(r => {
                            if (allowedTypes.includes(r.type)) {
                                allRooms.push({ ...r, institution_name: inst.name_ar });
                            }
                        });
                    }
                });
                setAvailableRooms(allRooms);
            } else {
                // Load rooms from main institution AND partner institutions
                const institutionIds = new Set<string>();
                institutionIds.add(activity.institution_id);

                // Add partner institutions
                partners.forEach(p => {
                    if (p.partner_type === 'INSTITUTION' && p.institution_id) {
                        institutionIds.add(p.institution_id);
                    }
                });

                const allRooms: (Room & { institution_name?: string })[] = [];

                // Fetch all institutions in parallel
                await Promise.all(Array.from(institutionIds).map(async (instId) => {
                    try {
                        const inst = await institutionsApi.getById(instId);
                        if (inst.rooms) {
                            inst.rooms.forEach(r => {
                                if (allowedTypes.includes(r.type)) {
                                    allRooms.push({ ...r, institution_name: inst.name_ar });
                                }
                            });
                        }
                    } catch (err) {
                        console.error(`Failed to load rooms for institution ${instId}`, err);
                    }
                }));

                setAvailableRooms(allRooms);
            }
        } catch (error) {
            console.error("Failed to load institution rooms:", error);
        }
    };

    const handleUpdateLocation = async () => {
        try {
            await activitiesApi.updateActivity(id, {
                location_type: locationType,
                location_details: locationDetails
            });
            toast.success("تم تحديث معلومات المكان");
            loadActivity();
        } catch (error) {
            toast.error("فشل تحديث المعلومات");
        }
    };

    const handleAddGroup = async () => {
        try {
            await activitiesApi.addActivityGroup(id, {
                name: newGroup.name,
                min_age: newGroup.min_age ? parseInt(newGroup.min_age) : undefined,
                max_age: newGroup.max_age ? parseInt(newGroup.max_age) : undefined,
                max_participants: newGroup.max_participants ? parseInt(newGroup.max_participants) : 0,
            });
            toast.success("تم إضافة الفوج");
            setGroupDialogOpen(false);
            setNewGroup({ name: "", min_age: "", max_age: "", max_participants: "" });
            loadGroups();
        } catch (error) {
            toast.error("فشل إضافة الفوج");
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الفوج؟")) return;
        try {
            await activitiesApi.deleteActivityGroup(id, groupId);
            toast.success("تم حذف الفوج");
            loadGroups();
        } catch (error) {
            toast.error("فشل حذف الفوج");
        }
    };

    const handleAddPartner = async () => {
        try {
            await activitiesApi.addActivityPartner(id, newPartner as any);
            toast.success("تم إضافة الشريك");
            setPartnerDialogOpen(false);
            setNewPartner({ partner_name: "", partner_type: "ASSOCIATION", institution_id: "", contribution: "" });
            loadPartners();
        } catch (error) {
            toast.error("فشل إضافة الشريك");
        }
    };

    const handleDeletePartner = async (partnerId: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الشريك؟")) return;
        try {
            await activitiesApi.deleteActivityPartner(id, partnerId);
            toast.success("تم حذف الشريك");
            loadPartners();
        } catch (error) {
            toast.error("فشل حذف الشريك");
        }
    };

    const handleAddCoordinator = async () => {
        if (!newCoordinator.employee_id) {
            toast.error("يرجى اختيار موظف");
            return;
        }
        try {
            await activitiesApi.addActivityCoordinator(id, {
                employee_id: newCoordinator.employee_id,
                role: newCoordinator.is_primary ? "MAIN" : "ASSISTANT"
            });
            toast.success("تم إضافة الإطار");
            setCoordinatorDialogOpen(false);
            setNewCoordinator({ employee_id: "", is_primary: false });
            loadCoordinators();
        } catch (error) {
            toast.error("فشل إضافة الإطار");
        }
    };

    const handleDeleteCoordinator = async (coordinatorId: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الإطار؟")) return;
        try {
            await activitiesApi.deleteActivityCoordinator(id, coordinatorId);
            toast.success("تم حذف الإطار");
            loadCoordinators();
        } catch (error) {
            toast.error("فشل حذف الإطار");
        }
    };

    const handleAddCommittee = async () => {
        try {
            await activitiesApi.createActivityCommittee(id, newCommittee);
            toast.success("تم إضافة اللجنة");
            setCommitteeDialogOpen(false);
            setNewCommittee({ name_ar: "", committee_type: "ORGANIZING", description: "" });
            loadCommittees();
        } catch (error) {
            toast.error("فشل إضافة اللجنة");
        }
    };

    const handleDeleteCommittee = async (committeeId: string) => {
        if (!confirm("هل أنت متأكد من حذف هذه اللجنة؟")) return;
        try {
            await activitiesApi.deleteActivityCommittee(id, committeeId);
            toast.success("تم حذف اللجنة");
            loadCommittees();
        } catch (error) {
            toast.error("فشل حذف اللجنة");
        }
    };

    const handleAddMember = async () => {
        if (!selectedCommittee || !newMember.employee_id) return;
        try {
            await activitiesApi.addCommitteeMember(selectedCommittee.id, newMember);
            toast.success("تم إضافة العضو");
            setNewMember({ employee_id: "", is_head: false });
            loadCommittees();
        } catch (error) {
            toast.error("فشل إضافة العضو");
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm("هل أنت متأكد؟")) return;
        try {
            await activitiesApi.removeCommitteeMember(memberId);
            toast.success("تم حذف العضو");
            loadCommittees();
        } catch (error) {
            toast.error("فشل حذف العضو");
        }
    };

    useEffect(() => {
        if (selectedCommittee) {
            const updated = committees.find(c => c.id === selectedCommittee.id);
            if (updated) setSelectedCommittee(updated);
        }
    }, [committees]);

    const handleAddBudgetItem = async () => {
        if (!newBudgetItem.item_name || !newBudgetItem.estimated_amount) return;

        try {
            if (editingBudgetItem) {
                // Update existing item
                const updatedItem = await activitiesApi.updateBudgetItem(id as string, editingBudgetItem.id, {
                    description: newBudgetItem.item_name,
                    category: newBudgetItem.category,
                    estimated_amount: parseFloat(newBudgetItem.estimated_amount) || 0
                });

                setBudgetItems(prev => prev.map(item => item.id === editingBudgetItem.id ? updatedItem : item));
                setEditingBudgetItem(null);
            } else {
                // Add new item
                const newItem = await activitiesApi.addBudgetItem(id as string, {
                    description: newBudgetItem.item_name,
                    category: newBudgetItem.category,
                    estimated_amount: parseFloat(newBudgetItem.estimated_amount) || 0
                });
                setBudgetItems([...budgetItems, newItem]);
            }

            setNewBudgetItem({ item_name: "", category: "MATERIALS", estimated_amount: "" });
            setBudgetDialogOpen(false);
        } catch (error) {
            console.error("Failed to save budget item:", error);
            alert("فشل في حفظ البند");
        }
    };

    const handleEditBudgetItem = (item: any) => {
        setEditingBudgetItem(item);
        setNewBudgetItem({
            item_name: item.item_name,
            category: item.category || "MATERIALS",
            estimated_amount: item.estimated_amount.toString()
        });
        setBudgetDialogOpen(true);
    };

    const handleDeleteBudgetItem = async (itemId: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا البند؟")) return;
        try {
            await activitiesApi.deleteBudgetItem(id, itemId);
            toast.success("تم حذف بند الميزانية");
            loadBudget();
        } catch (error) {
            toast.error("فشل حذف البند");
        }
    };

    const handleAddRoom = async () => {
        if (!selectedRoomId) return;
        try {
            await activitiesApi.addActivityRoom(id, { room_id: selectedRoomId });
            toast.success("تم إضافة القاعة");
            setRoomDialogOpen(false);
            setSelectedRoomId("");
            loadRooms();
        } catch (error) {
            toast.error("فشل إضافة القاعة");
        }
    };

    const handleDeleteRoom = async (roomId: string) => {
        if (!confirm("هل أنت متأكد؟")) return;
        try {
            await activitiesApi.deleteActivityRoom(id, roomId);
            toast.success("تم حذف القاعة");
            loadRooms();
        } catch (error) {
            toast.error("فشل حذف القاعة");
        }
    };

    const handleSubmit = async () => {
        if (!confirm("هل أنت متأكد من إرسال النشاط للموافقة؟")) return;
        setApproving(true);
        try {
            await activitiesApi.submitForApproval(id);
            toast.success("تم إرسال النشاط بنجاح");
            loadActivity();
        } catch (error) {
            toast.error("فشل إرسال النشاط");
        } finally {
            setApproving(false);
        }
    };

    const handleApprove = async () => {
        if (!confirm("هل أنت متأكد من الموافقة على النشاط؟")) return;
        setApproving(true);
        try {
            await activitiesApi.approveActivity(id);
            toast.success("تمت الموافقة بنجاح");
            loadActivity();
        } catch (error) {
            toast.error("فشل الموافقة على النشاط");
        } finally {
            setApproving(false);
        }
    };

    const handleReservation = async () => {
        if (!rejectionReason.trim()) {
            toast.error("يرجى إدخال سبب التحفظ");
            return;
        }

        setRejecting(true);
        try {
            await activitiesApi.reserveActivity(id, rejectionReason);
            toast.success("تم تسجيل التحفظ على النشاط");
            setRejectionDialogOpen(false);
            loadActivity();
        } catch (error) {
            toast.error("فشل تسجيل التحفظ");
        } finally {
            setRejecting(false);
        }
    };

    const handleChangeStatus = async (newStatus: ActivityStatus) => {
        if (!confirm(`هل أنت متأكد من تغيير الحالة إلى ${ACTIVITY_STATUS_LABELS[newStatus]?.ar}?`)) return;
        try {
            await activitiesApi.changeActivityStatus(id, newStatus);
            toast.success("تم تغيير الحالة بنجاح");
            loadActivity();
        } catch (error) {
            toast.error("فشل تغيير الحالة");
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast.error("يرجى إدخال سبب الرفض");
            return;
        }

        setRejecting(true);
        try {
            await activitiesApi.rejectActivity(id, rejectionReason);
            toast.success("تم رفض النشاط");
            setRejectionDialogOpen(false);
            loadActivity();
        } catch (error) {
            toast.error("فشل رفض النشاط");
        } finally {
            setRejecting(false);
        }
    };

    const handlePostpone = async () => {
        if (!postponeReason.trim()) {
            toast.error("يرجى إدخال سبب التأجيل");
            return;
        }

        setPostponing(true);
        try {
            await activitiesApi.changeActivityStatus(id, ActivityStatus.POSTPONED, postponeReason);
            toast.success("تم تأجيل النشاط");
            setPostponeDialogOpen(false);
            setPostponeReason("");
            loadActivity();
        } catch (error) {
            toast.error("فشل تأجيل النشاط");
        } finally {
            setPostponing(false);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("ar-DZ");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!activity) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <p className="text-gray-500">النشاط غير موجود</p>
                <Button onClick={() => router.back()}>
                    <ArrowRight className="w-4 h-4 me-2" />
                    رجوع
                </Button>
            </div>
        );
    }

    // --- Profile Layout components ---
    const isOwner = user?.id === activity.created_by?.id;

    console.log("Activity Debug:", {
        status: activity.status,
        isOwner,
        userId: user?.id,
        creatorId: activity.created_by?.id
    });

    return (
        <div className="min-h-screen bg-gray-50/50" dir={locale === 'ar' ? 'rtl' : 'ltr'}>

            {/* Hero Section */}
            <div className="relative bg-white border-b">
                {/* Cover Image Area */}
                <div className="h-48 md:h-64 bg-slate-100 relative overflow-hidden group">
                    {activity.cover_image ? (
                        <img src={activity.cover_image} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                            <ImageIcon className="w-16 h-16 text-white/30" />
                        </div>
                    )}

                    {/* Back Button Overlay */}
                    {/* Back Button Overlay */}
                    <div className="absolute top-4 end-4 z-10">
                        <Button variant="secondary" size="icon" className="rounded-full shadow-md hover:bg-white" onClick={() => router.back()}>
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Change Cover Button (Left) */}
                    {hasPermission('activities', 'update') && (
                        <div className="absolute top-4 start-4 z-10">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="shadow-md hover:bg-white gap-2"
                                onClick={() => setCoverSelectorOpen(true)}
                            >
                                <ImageIcon className="w-4 h-4" />
                                تغيير الغلاف
                            </Button>
                        </div>
                    )}
                </div>

                <PhotoSelector
                    open={coverSelectorOpen}
                    onOpenChange={setCoverSelectorOpen}
                    onSelect={handleSelectCover}
                    title="اختر صورة الغلاف"
                    multiple={false}
                />

                {croppingImage && (
                    <ImageCropper
                        open={!!croppingImage}
                        onOpenChange={(open) => !open && setCroppingImage(null)}
                        imageSrc={croppingImage}
                        onCropComplete={handleCropSave}
                        aspect={16 / 5} // Activity cover aspect ratio
                    />
                )}

                {/* Profile Header Content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative -mt-16 sm:-mt-20 pb-6 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">

                        {/* Main Info */}
                        <div className="flex flex-col gap-2 relative z-10">
                            <div className="p-1 bg-white rounded-lg shadow-sm inline-block w-fit">
                                {hasPermission('activities', 'approve.final') ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className="focus:outline-none flex items-center gap-1">
                                            <Badge variant={activity.status === ActivityStatus.COMPLETED ? "default" : "secondary"} className="text-sm px-3 py-1 cursor-pointer hover:bg-slate-200 transition-colors">
                                                {ACTIVITY_STATUS_LABELS[activity.status]?.ar || activity.status}
                                                <ChevronDown className="w-3 h-3 ms-1" />
                                            </Badge>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {Object.values(ActivityStatus).map((status) => (
                                                <DropdownMenuItem key={status} onClick={() => handleChangeStatus(status)}>
                                                    {ACTIVITY_STATUS_LABELS[status]?.ar || status}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <Badge variant={activity.status === ActivityStatus.COMPLETED ? "default" : "secondary"} className="text-sm px-3 py-1">
                                        {ACTIVITY_STATUS_LABELS[activity.status]?.ar || activity.status}
                                    </Badge>
                                )}
                            </div>

                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 -mx-2">{activity.title_ar}</h1>
                            <p className="text-gray-600 font-medium flex items-center gap-2">
                                <span className="bg-gray-100 px-2 py-1 rounded text-sm">{activity.code}</span>
                                {activity.institution && <span className="text-sm text-gray-500">• {activity.institution.name_ar}</span>}
                            </p>
                        </div>



                        {/* Right Side Actions Container */}
                        {/* Right Side Actions Container */}
                        <div className="flex flex-col items-end gap-3 mt-4 md:mt-0 me-auto">
                            {(activity.status === ActivityStatus.RESERVATION || activity.status === ActivityStatus.REJECTED) && (() => {
                                // Find latest rejection/reservation note
                                const latestRejection = activity.approvals
                                    ?.filter(a => a.status === 'RESERVATION' || a.status === 'REJECTED')
                                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

                                if (!latestRejection) return null;

                                return (
                                    <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 lg:max-w-xl self-end mb-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle className="font-bold flex items-center gap-2">
                                            {activity.status === ActivityStatus.RESERVATION ? "سبب التحفظ" : "سبب الرفض"}
                                            <span className="text-xs font-normal opacity-75">
                                                - {new Date(latestRejection.created_at).toLocaleDateString('ar-DZ')}
                                            </span>
                                        </AlertTitle>
                                        <AlertDescription className="mt-2 text-sm">
                                            {latestRejection.notes || "لا يوجد سبب محدد"}
                                            {latestRejection.approved_by && (
                                                <div className="mt-1 text-xs opacity-75">
                                                    من طرف: {latestRejection.approver?.firstname_ar} {latestRejection.approver?.lastname_ar}
                                                </div>
                                            )}
                                        </AlertDescription>
                                    </Alert>
                                );
                            })()}

                            {/* Postponement Reason Alert */}
                            {activity.status === ActivityStatus.POSTPONED && activity.postponement_reason && (
                                <Alert className="bg-orange-50 border-orange-200 text-orange-800 lg:max-w-xl self-end mb-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle className="font-bold">سبب التأجيل</AlertTitle>
                                    <AlertDescription className="mt-2 text-sm">
                                        {activity.postponement_reason}
                                    </AlertDescription>
                                </Alert>
                            )}
                            {/* Stepper for Large Screens */}
                            <div className="hidden md:block min-w-[500px]">
                                <ActivityStatusStepper status={activity.status} />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-2 rounded-lg">
                                {/* Submit Button - Only show for DRAFT or RESERVATION status AND Owner */}
                                {(activity.status === ActivityStatus.DRAFT || activity.status === ActivityStatus.RESERVATION) && isOwner && (
                                    <Button onClick={handleSubmit} disabled={approving} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                        <Send className="w-4 h-4 me-2" />
                                        {activity.status === ActivityStatus.RESERVATION ? "إعادة الإرسال" : "إرسال للموافقة"}
                                    </Button>
                                )}

                                {/* Approve Button (Dept Head) */}
                                {activity.status === ActivityStatus.PENDING_DEPARTMENT && hasPermission('activities', 'approve.department') && (
                                    <Button onClick={handleApprove} disabled={approving} className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                                        <Check className="w-4 h-4 me-2" />
                                        موافقة
                                    </Button>
                                )}

                                {/* Approve Button (Director - Final) */}
                                {/* Approve Button (Director - Final) */}
                                {((activity.status === ActivityStatus.PENDING_DIRECTOR) || (activity.status === ActivityStatus.DRAFT && hasPermission('activities', 'approve.final'))) && hasPermission('activities', 'approve.final') && (
                                    <Button onClick={handleApprove} disabled={approving} className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                                        <Check className="w-4 h-4 me-2" />
                                        موافقة نهائية
                                    </Button>
                                )}

                                {/* Postpone Button - for Ongoing/Published activities */}
                                {(activity.status === ActivityStatus.PUBLISHED || activity.status === ActivityStatus.ONGOING) &&
                                    hasPermission('activities', 'update') && (
                                        <Dialog open={postponeDialogOpen} onOpenChange={setPostponeDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" className="shadow-sm border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800">
                                                    <CalendarIcon className="w-4 h-4 me-2" />
                                                    تأجيل
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>تأجيل النشاط</DialogTitle>
                                                    <DialogDescription>
                                                        يرجى ذكر سبب تأجيل النشاط (مثل: سوء الأحوال الجوية).
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>سبب التأجيل</Label>
                                                        <Textarea
                                                            placeholder="ادخل سبب التأجيل هنا..."
                                                            value={postponeReason}
                                                            onChange={(e) => setPostponeReason(e.target.value)}
                                                            rows={4}
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" onClick={() => setPostponeDialogOpen(false)}>إلغاء</Button>
                                                        <Button onClick={handlePostpone} disabled={postponing} className="bg-orange-600 hover:bg-orange-700 text-white">
                                                            {postponing && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                                                            تأكيد التأجيل
                                                        </Button>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )}

                                {/* Reservation/Rejection Logic */}
                                {/* For PENDING_DEPARTMENT: dept head or director can reserve/reject */}
                                {/* For PENDING_DIRECTOR: only director can reserve/reject */}
                                {((activity.status === ActivityStatus.PENDING_DEPARTMENT && (hasPermission('activities', 'approve.department') || hasPermission('activities', 'approve.final'))) ||
                                    (activity.status === ActivityStatus.PENDING_DIRECTOR && hasPermission('activities', 'approve.final'))) && (
                                        <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button variant="destructive" className="shadow-sm">
                                                    <XCircle className="w-4 h-4 me-2" />
                                                    رفض / تحفظ
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>رفض أو تحفظ على النشاط</DialogTitle>
                                                    <DialogDescription>
                                                        يرجى اختيار الإجراء المناسب وذكر السبب.
                                                        <ul className="list-disc list-inside mt-2 text-sm text-gray-500">
                                                            <li><b>تحفظ:</b> إعادة النشاط للمسؤول للتعديل (يمكن إعادة إرساله).</li>
                                                            <li><b>رفض نهائي:</b> رفض النشاط بشكل كامل (لا يمكن إعادة إرساله).</li>
                                                        </ul>
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>السبب / الملاحظات</Label>
                                                        <Textarea
                                                            placeholder="ادخل سبب الرفض أو التحفظ هنا..."
                                                            value={rejectionReason}
                                                            onChange={(e) => setRejectionReason(e.target.value)}
                                                            rows={4}
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" onClick={() => setRejectionDialogOpen(false)}>إلغاء</Button>

                                                        <Button
                                                            onClick={handleReservation}
                                                            disabled={rejecting}
                                                            className="bg-orange-500 hover:bg-orange-600 text-white"
                                                        >
                                                            {rejecting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                                                            تسجيل تحفظ
                                                        </Button>

                                                        {hasPermission('activities', 'approve.final') && (
                                                            <Button
                                                                variant="destructive"
                                                                onClick={handleReject}
                                                                disabled={rejecting}
                                                            >
                                                                {rejecting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                                                                رفض نهائي
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )}

                                {/* Edit Button - Only for DRAFT or RESERVATION (after return for edits) AND Owner */}
                                {(activity.status === ActivityStatus.DRAFT || activity.status === ActivityStatus.RESERVATION) && isOwner && (
                                    <Button variant="outline" className="shadow-sm" onClick={() => router.push(`/${locale}/activities/${id}/edit`)}>
                                        <Pencil className="w-4 h-4 me-2" />
                                        تعديل
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stepper for Mobile */}
                <div className="md:hidden px-4 py-4 bg-white border-b">
                    <ActivityStatusStepper status={activity.status} />
                </div>

                {/* Sticky Tab Navigation */}
                <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Tabs value={activeTab} onValueChange={setActiveTab} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                            <div className="overflow-x-auto pb-px -mx-4 px-4 sm:mx-0 sm:px-0">
                                <TabsList className="bg-transparent h-14 w-auto dark:bg-transparent p-0 flex justify-start gap-6">
                                    <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full">
                                        التفاصيل
                                    </TabsTrigger>
                                    <TabsTrigger value="gallery" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" />
                                        المعرض
                                    </TabsTrigger>
                                    <TabsTrigger value="groups" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        الأفواج <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">{groups.length}</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="partners" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full flex items-center gap-2">
                                        <Handshake className="w-4 h-4" />
                                        الشركاء <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">{partners.length}</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="committees" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full flex items-center gap-2">
                                        <UsersRound className="w-4 h-4" />
                                        الإطارات
                                    </TabsTrigger>
                                    <TabsTrigger value="budget" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" />
                                        الميزانية
                                    </TabsTrigger>
                                    <TabsTrigger value="locations" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full flex items-center gap-2">
                                        <Building2 className="w-4 h-4" />
                                        المكان
                                    </TabsTrigger>
                                    <TabsTrigger value="registrations" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full">
                                        التسجيلات
                                    </TabsTrigger>
                                    <TabsTrigger value="sessions" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full">
                                        الحصص
                                    </TabsTrigger>
                                    <TabsTrigger value="statistics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-full flex items-center gap-2">
                                        <BarChart className="w-4 h-4" />
                                        الإحصائيات
                                    </TabsTrigger>
                                </TabsList>
                            </div>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                    <TabsContent value="details" className="mt-0 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Main Info Card */}
                            <div className="md:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>حول النشاط</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="leading-relaxed text-gray-700 whitespace-pre-wrap">{activity.description_ar || "لا يوجد وصف"}</p>

                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {activity.objectives?.map((obj, i) => (
                                                <Badge key={i} variant="outline">{obj}</Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {activity.approvals && activity.approvals.length > 0 && (
                                    <ApprovalTimeline
                                        events={activity.approvals.map((approval: any) => ({
                                            id: approval.id,
                                            status: approval.status,
                                            level: approval.approval_level,
                                            actorName: approval.approved_by ? `${approval.approved_by.firstname_ar} ${approval.approved_by.lastname_ar}` : undefined,
                                            date: approval.created_at,
                                            comments: approval.notes
                                        }))}
                                    />
                                )}
                            </div>

                            {/* Side Info */}
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">معلومات سريعة</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-sm">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="font-medium">التاريخ</p>
                                                <p className="text-gray-500">{formatDate(activity.start_date)} - {formatDate(activity.end_date)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Users className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="font-medium">المشاركين</p>
                                                <p className="text-gray-500">{activity.max_participants ? `الحد الأقصى ${activity.max_participants}` : "مفتوح"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Lock className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="font-medium">أولوية</p>
                                                <p className="text-gray-500">{activity.is_major_event ? "نشاط رئيسي" : "عادي"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 pt-3 border-t">
                                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <p className="font-medium">تاريخ الإنشاء</p>
                                                <p className="text-gray-500">{formatDate(activity.created_at)}</p>
                                            </div>
                                        </div>

                                        {activity.created_by && (
                                            <div className="flex items-center gap-3">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <p className="font-medium">أنشأه</p>
                                                    <p className="text-gray-500">
                                                        {activity.created_by.firstname_ar} {activity.created_by.lastname_ar}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {activity.updated_at && (
                                            <div className="flex items-center gap-3">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <p className="font-medium">آخر تعديل</p>
                                                    <p className="text-gray-500">{formatDate(activity.updated_at)}</p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="gallery" className="mt-0">
                        <ActivityGallery activityId={id} />
                    </TabsContent>

                    <TabsContent value="groups" className="mt-0">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>الأفواج</CardTitle>
                                {['DRAFT', 'RESERVATION'].includes(activity?.status || '') && (
                                    <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm">
                                                <Plus className="w-4 h-4 me-2" />
                                                إضافة فوج
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>إضافة فوج جديد</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label>اسم الفوج</Label>
                                                    <Input value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} placeholder="اسم الفوج" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label>العمر الأدنى</Label>
                                                        <Input type="number" value={newGroup.min_age} onChange={e => setNewGroup({ ...newGroup, min_age: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <Label>العمر الأقصى</Label>
                                                        <Input type="number" value={newGroup.max_age} onChange={e => setNewGroup({ ...newGroup, max_age: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label>الحد الأقصى للمشاركين</Label>
                                                    <Input type="number" value={newGroup.max_participants} onChange={e => setNewGroup({ ...newGroup, max_participants: e.target.value })} />
                                                </div>
                                                <Button onClick={handleAddGroup} className="w-full">إضافة</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>الاسم</TableHead>
                                            <TableHead>الفئة العمرية</TableHead>
                                            <TableHead>الحد الأقصى</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groups.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                                    لا توجد أفواج
                                                </TableCell>
                                            </TableRow>
                                        ) : groups.map(group => (
                                            <TableRow key={group.id}>
                                                <TableCell className="font-medium">{group.name}</TableCell>
                                                <TableCell>{group.min_age && group.max_age ? `${group.min_age} - ${group.max_age} سنة` : "-"}</TableCell>
                                                <TableCell>{group.max_participants || "-"}</TableCell>
                                                <TableCell>
                                                    {['DRAFT', 'RESERVATION'].includes(activity?.status || '') && (
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteGroup(group.id)}>
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="partners" className="mt-0">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>الشركاء</CardTitle>
                                {['DRAFT', 'RESERVATION', 'PUBLISHED', 'ONGOING', 'POSTPONED'].includes(activity?.status || '') && (
                                    <Dialog open={partnerDialogOpen} onOpenChange={setPartnerDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm">
                                                <Plus className="w-4 h-4 me-2" />
                                                إضافة شريك
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>إضافة شريك جديد</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    {newPartner.partner_type === 'ASSOCIATION' ? (
                                                        <div className="space-y-2">
                                                            <Label>اسم الشريك (بحث في الجمعيات)</Label>
                                                            <SearchableSelect
                                                                placeholder="اختر جمعية..."
                                                                searchPlaceholder="ابحث عن اسم الجمعية..."
                                                                options={associationOptions}
                                                                onValueChange={(val) => setNewPartner({ ...newPartner, partner_name: val })}
                                                                value={newPartner.partner_name}
                                                                emptyMessage="لم يتم العثور على جمعيات"
                                                            />
                                                        </div>
                                                    ) : newPartner.partner_type === 'INSTITUTION' ? (
                                                        <div className="space-y-2">
                                                            <Label>المؤسسة</Label>
                                                            <SearchableSelect
                                                                placeholder="اختر مؤسسة..."
                                                                searchPlaceholder="ابحث عن اسم المؤسسة..."
                                                                options={institutions.map(inst => ({ label: inst.name_ar, value: inst.id }))}
                                                                onValueChange={(val) => setNewPartner({ ...newPartner, institution_id: val, partner_name: "" })}
                                                                value={newPartner.institution_id}
                                                                emptyMessage="لم يتم العثور على مؤسسات"
                                                                onOpen={() => {
                                                                    if (institutions.length === 0) fetchInstitutions({ size: 100 });
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Label>اسم الشريك</Label>
                                                            <Input
                                                                value={newPartner.partner_name}
                                                                onChange={e => setNewPartner({ ...newPartner, partner_name: e.target.value })}
                                                                placeholder="اسم الشريك"
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label>نوع الشريك</Label>
                                                    <select className="w-full border rounded p-2" value={newPartner.partner_type} onChange={e => setNewPartner({ ...newPartner, partner_type: e.target.value })}>
                                                        <option value="ASSOCIATION">جمعية</option>
                                                        <option value="INSTITUTION">مؤسسة (قطاع الشباب)</option>
                                                        <option value="COMPANY">شركة</option>
                                                        <option value="GOVERNMENT">مؤسسة حكومية</option>
                                                        <option value="OTHER">أخرى</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label>المساهمة</Label>
                                                    <Textarea value={newPartner.contribution} onChange={e => setNewPartner({ ...newPartner, contribution: e.target.value })} placeholder="وصف المساهمة" />
                                                </div>
                                                <Button onClick={handleAddPartner} className="w-full">إضافة</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>الاسم</TableHead>
                                            <TableHead>النوع</TableHead>
                                            <TableHead>المساهمة</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {partners.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                                    لا يوجد شركاء
                                                </TableCell>
                                            </TableRow>
                                        ) : partners.map(partner => (
                                            <TableRow key={partner.id}>
                                                <TableCell className="font-medium">
                                                    {partner.partner_type === 'INSTITUTION' ? partner.institution?.name_ar : partner.partner_name}
                                                </TableCell>
                                                <TableCell>
                                                    {partner.partner_type === 'ASSOCIATION' ? 'جمعية' :
                                                        partner.partner_type === 'COMPANY' ? 'شركة' :
                                                            partner.partner_type === 'GOVERNMENT' ? 'مؤسسة حكومية' :
                                                                partner.partner_type === 'INSTITUTION' ? 'مؤسسة شبابية' :
                                                                    partner.partner_type === 'OTHER' ? 'أخرى' : partner.partner_type}
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate">{partner.contribution || "-"}</TableCell>
                                                <TableCell>
                                                    {['DRAFT', 'RESERVATION', 'PUBLISHED', 'ONGOING', 'POSTPONED'].includes(activity?.status || '') && (
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeletePartner(partner.id)}>
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="committees" className="mt-0 space-y-6">
                        {/* Coordinators Section */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>الأطر والمنسقون</CardTitle>
                                {['DRAFT', 'RESERVATION', 'PUBLISHED', 'ONGOING', 'POSTPONED'].includes(activity?.status || '') && (
                                    <Dialog open={coordinatorDialogOpen} onOpenChange={setCoordinatorDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm">
                                                <Plus className="w-4 h-4 me-2" />
                                                إضافة إطار
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>إضافة إطار / منسق</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label>الموظف</Label>
                                                    <SearchableSelect
                                                        fetchOptions={fetchEmployees}
                                                        value={newCoordinator.employee_id}
                                                        onValueChange={(val) => setNewCoordinator({ ...newCoordinator, employee_id: val })}
                                                        placeholder="اختر موظف..."
                                                        searchPlaceholder="بحث عن موظف..."
                                                        className="w-full"

                                                    />
                                                </div>

                                                <div className="flex items-center space-x-2 space-x-reverse">
                                                    <input
                                                        type="checkbox"
                                                        id="is_primary"
                                                        checked={newCoordinator.is_primary}
                                                        onChange={e => setNewCoordinator({ ...newCoordinator, is_primary: e.target.checked })}
                                                        className="h-4 w-4"
                                                    />
                                                    <Label htmlFor="is_primary">منسق رئيسي للنشاط</Label>
                                                </div>
                                                <Button onClick={handleAddCoordinator} className="w-full">إضافة</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-end">الموظف</TableHead>
                                            <TableHead className="text-end">الدور</TableHead>
                                            <TableHead className="text-end">رئيسي</TableHead>
                                            <TableHead className="text-end"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {coordinators.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                                    لا يوجد أطر
                                                </TableCell>
                                            </TableRow>
                                        ) : coordinators.map(coord => (
                                            <TableRow key={coord.id}>
                                                <TableCell className="font-medium">
                                                    {coord.employee ? `${coord.employee.firstname_ar} ${coord.employee.lastname_ar}` : "-"}
                                                </TableCell>
                                                <TableCell>
                                                    {(coord.role === 'main' || coord.role === 'MAIN') ? 'منسق رئيسي' :
                                                        (coord.role === 'assistant' || coord.role === 'ASSISTANT') ? 'مساعد' : coord.role}
                                                </TableCell>
                                                <TableCell>
                                                    {coord.is_primary && (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                            رئيسي
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {['DRAFT', 'RESERVATION', 'PUBLISHED', 'ONGOING', 'POSTPONED'].includes(activity?.status || '') && (
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCoordinator(coord.id)}>
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Committees Section */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>الجان</CardTitle>
                                {['DRAFT', 'RESERVATION', 'PUBLISHED', 'ONGOING', 'POSTPONED'].includes(activity?.status || '') && (
                                    <Dialog open={committeeDialogOpen} onOpenChange={setCommitteeDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm">
                                                <Plus className="w-4 h-4 me-2" />
                                                إضافة لجنة
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>إضافة لجنة تنظيمية</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label>اسم اللجنة</Label>
                                                    <Input value={newCommittee.name_ar} onChange={e => setNewCommittee({ ...newCommittee, name_ar: e.target.value })} placeholder="مثال: لجنة الاستقبال" />
                                                </div>
                                                <div>
                                                    <Label>الوصف</Label>
                                                    <Textarea value={newCommittee.description} onChange={e => setNewCommittee({ ...newCommittee, description: e.target.value })} />
                                                </div>
                                                <Button onClick={handleAddCommittee} className="w-full">إضافة</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </CardHeader>
                            <CardContent>
                                {committees.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        لا توجد لجان
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {committees.map(committee => (
                                            <div key={committee.id} className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h3 className="font-bold">{committee.name}</h3>
                                                        <p className="text-sm text-gray-500">{committee.description}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {['DRAFT', 'RESERVATION', 'PUBLISHED', 'ONGOING', 'POSTPONED'].includes(activity?.status || '') && (
                                                            <Dialog open={memberDialogOpen && selectedCommittee?.id === committee.id} onOpenChange={(open) => {
                                                                setMemberDialogOpen(open);
                                                                if (open) setSelectedCommittee(committee);
                                                                else setSelectedCommittee(null);
                                                            }}>
                                                                <DialogTrigger asChild>
                                                                    <Button size="sm" variant="outline">
                                                                        <Plus className="w-4 h-4 me-2" />
                                                                        عضو
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent>
                                                                    <DialogHeader>
                                                                        <DialogTitle>إضافة عضو للجنة: {committee.name}</DialogTitle>
                                                                    </DialogHeader>
                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <Label>الموظف</Label>
                                                                            <SearchableSelect
                                                                                fetchOptions={fetchEmployees}
                                                                                value={newMember.employee_id}
                                                                                onValueChange={(val) => setNewMember({ ...newMember, employee_id: val })}
                                                                                placeholder="اختر موظف..."
                                                                                searchPlaceholder="بحث عن موظف..."
                                                                                className="w-full"

                                                                            />
                                                                        </div>
                                                                        <div className="flex items-center space-x-2 space-x-reverse">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={newMember.is_head}
                                                                                onChange={e => setNewMember({ ...newMember, is_head: e.target.checked })}
                                                                                className="h-4 w-4"
                                                                            />
                                                                            <Label>رئيس اللجنة</Label>
                                                                        </div>
                                                                        <Button onClick={handleAddMember} className="w-full">إضافة</Button>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        )}
                                                        {['DRAFT', 'RESERVATION', 'PUBLISHED', 'ONGOING', 'POSTPONED'].includes(activity?.status || '') && (
                                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteCommittee(committee.id)}>
                                                                <Trash2 className="w-4 h-4 text-red-500" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Members List */}
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>الاسم</TableHead>
                                                            <TableHead>الدور</TableHead>
                                                            <TableHead></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {committee.members?.map((member: any) => (
                                                            <TableRow key={member.id}>
                                                                <TableCell>
                                                                    {member.employee ? `${member.employee.firstname_ar} ${member.employee.lastname_ar}` : "-"}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {member.is_head && <Badge>رئيس</Badge>}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {['DRAFT', 'RESERVATION', 'PUBLISHED', 'ONGOING', 'POSTPONED'].includes(activity?.status || '') && (
                                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.id)}>
                                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                                        </Button>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {(!committee.members || committee.members.length === 0) && (
                                                            <TableRow>
                                                                <TableCell colSpan={3} className="text-center text-gray-400 py-4">لا يوجد أعضاء</TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="registrations" className="mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>التسجيلات</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {(() => {
                                    // Dynamically detect all custom_data keys
                                    const FIELD_LABELS: Record<string, string> = {
                                        municipality: "البلدية",
                                        education_level: "المستوى التعليمي",
                                        educationLevel: "المستوى التعليمي",
                                        nearest_institution: "أقرب مؤسسة",
                                        nearestInstitution: "أقرب مؤسسة",
                                        interests: "المواهب",
                                        pass_id: "رقم المشاركة",
                                        passId: "رقم المشاركة",
                                        email: "البريد",
                                        school: "المدرسة",
                                        club: "النادي",
                                        team: "الفريق",
                                        category: "الفئة",
                                        level: "المستوى",
                                        specialization: "التخصص",
                                        experience: "الخبرة",
                                    };
                                    const customKeys = Array.from(
                                        new Set(registrations.flatMap(r => r.custom_data ? Object.keys(r.custom_data) : []))
                                    ).filter(k => k !== 'email' && k !== 'source');
                                    const totalCols = 5 + customKeys.length + 1;

                                    const handleRegAction = async (regId: string, action: 'approve' | 'reject' | 'cancel' | 'hard_delete') => {
                                        try {
                                            if (action === 'hard_delete') {
                                                if (!window.confirm("هل أنت متأكد من حذف هذا التسجيل نهائياً؟")) return;
                                                await activitiesApi.deleteRegistration(regId);
                                                toast.success("تم حذف التسجيل نهائياً");
                                            } else if (action === 'cancel') {
                                                await activitiesApi.updateRegistration(regId, { status: 'CANCELLED' as any });
                                                toast.success("تم إلغاء التسجيل");
                                            } else if (action === 'approve') {
                                                await activitiesApi.updateRegistration(regId, { status: 'APPROVED' as any });
                                                toast.success("تمت الموافقة");
                                            } else {
                                                await activitiesApi.updateRegistration(regId, { status: 'REJECTED' as any });
                                                toast.success("تم الرفض");
                                            }
                                            loadRegistrations();
                                        } catch (e) {
                                            toast.error("فشل في العملية للأسف");
                                        }
                                    };

                                    return (
                                        <div className="overflow-x-auto" dir="rtl">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>#</TableHead>
                                                        <TableHead>المشارك</TableHead>
                                                        {customKeys.map(k => (
                                                            <TableHead key={k}>{FIELD_LABELS[k] || k}</TableHead>
                                                        ))}
                                                        <TableHead>تاريخ التسجيل</TableHead>
                                                        <TableHead>الحالة</TableHead>
                                                        <TableHead>الدفع</TableHead>
                                                        <TableHead>إجراءات</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {registrations.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={totalCols} className="text-center text-gray-500 py-8">
                                                                لا توجد تسجيلات
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : registrations.map((reg, idx) => (
                                                        <TableRow key={reg.id}>
                                                            <TableCell className="text-xs text-gray-500 font-mono">
                                                                {idx + 1}
                                                            </TableCell>
                                                            <TableCell className="font-medium">
                                                                {reg.participant ?
                                                                    `${reg.participant.firstname_ar} ${reg.participant.lastname_ar}` :
                                                                    "مشارك غير معروف"}
                                                            </TableCell>
                                                            {customKeys.map(k => (
                                                                <TableCell key={k}>
                                                                    <span className="text-sm max-w-[200px] block truncate" title={reg.custom_data?.[k]?.toString()}>
                                                                        {reg.custom_data?.[k]?.toString() || "-"}
                                                                    </span>
                                                                </TableCell>
                                                            ))}
                                                            <TableCell>{formatDate(reg.registration_date)}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={reg.status === 'APPROVED' ? 'default' : 'secondary'}>
                                                                    {reg.status === 'APPROVED' ? 'مقبول' :
                                                                        reg.status === 'PENDING' ? 'قيد الانتظار' :
                                                                            reg.status === 'REJECTED' ? 'مرفوض' :
                                                                                reg.status === 'CANCELLED' ? 'ملغى' : reg.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">
                                                                    {reg.payment_status === 'PAID' ? 'مدفوع' :
                                                                        reg.payment_status === 'PENDING' ? 'غير مدفوع' :
                                                                            reg.payment_status === 'EXEMPT' ? 'معفى' : reg.payment_status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon">
                                                                            <MoreHorizontal className="w-4 h-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        {reg.status !== 'APPROVED' && (
                                                                            <DropdownMenuItem onClick={() => handleRegAction(reg.id, 'approve')} className="text-green-600">
                                                                                <CheckCircle className="w-4 h-4 me-2" /> قبول
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {reg.status !== 'REJECTED' && (
                                                                            <DropdownMenuItem onClick={() => handleRegAction(reg.id, 'reject')} className="text-orange-600">
                                                                                <XCircle className="w-4 h-4 me-2" /> رفض
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        <DropdownMenuItem onClick={() => handleRegAction(reg.id, 'cancel')} className="text-gray-600">
                                                                            <Trash2 className="w-4 h-4 me-2" /> إلغاء التسجيل
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => handleRegAction(reg.id, 'hard_delete')} className="text-red-600 font-bold">
                                                                            <Trash2 className="w-4 h-4 me-2" /> حذف نهائي
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="sessions" className="mt-0">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>برنامج الحصص</CardTitle>
                                {['DRAFT', 'RESERVATION', 'PUBLISHED', 'ONGOING', 'POSTPONED'].includes(activity?.status || '') && (
                                    <Dialog open={sessionDialogOpen} onOpenChange={(open) => {
                                        setSessionDialogOpen(open);
                                        if (open) {
                                            loadInstitutionRooms();
                                        } else {
                                            setEditingSession(null);
                                            setNewSession({ session_date: "", start_time: "", end_time: "", room_id: "", instructor_id: "", topic: "", notes: "" });
                                        }
                                    }}>
                                        <DialogTrigger asChild>
                                            <Button size="sm">
                                                <Plus className="w-4 h-4 me-2" />
                                                إضافة حصة
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>{editingSession ? 'تعديل حصة' : 'إضافة حصة جديدة'}</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label>التاريخ</Label>
                                                        <DateTimePicker
                                                            value={newSession.session_date}
                                                            onChange={(val) => setNewSession({ ...newSession, session_date: val })}
                                                            placeHolder="اختر تاريخ الحصة"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>الموضوع (اختياري)</Label>
                                                        <Input value={newSession.topic} onChange={e => setNewSession({ ...newSession, topic: e.target.value })} placeholder="موضوع الحصة" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label>وقت البداية</Label>
                                                        <Input type="time" value={newSession.start_time} onChange={e => setNewSession({ ...newSession, start_time: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <Label>وقت النهاية</Label>
                                                        <Input type="time" value={newSession.end_time} onChange={e => setNewSession({ ...newSession, end_time: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label>القاعة (اختياري)</Label>
                                                    <select
                                                        className="w-full border rounded p-2"
                                                        value={newSession.room_id}
                                                        onChange={e => setNewSession({ ...newSession, room_id: e.target.value })}
                                                    >
                                                        <option value="">-- اختر قاعة --</option>
                                                        {availableRooms.map(room => (
                                                            <option key={room.id} value={room.id}>
                                                                {room.institution_name ? `${room.institution_name} - ` : ''}{room.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label>المؤطر (اختياري)</Label>
                                                    <SearchableSelect
                                                        fetchOptions={fetchEmployees}
                                                        value={newSession.instructor_id}
                                                        onValueChange={(val) => setNewSession({ ...newSession, instructor_id: val })}
                                                        placeholder="اختر مؤطر..."
                                                        searchPlaceholder="بحث عن موظف..."
                                                        className="w-full"

                                                    />
                                                </div>
                                                <Button onClick={editingSession ? handleUpdateSession : handleAddSession} className="w-full">
                                                    {editingSession ? 'تحديث' : 'إضافة'}
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-end">التاريخ</TableHead>
                                            <TableHead className="text-end">التوقيت</TableHead>
                                            <TableHead className="text-end">الموضوع</TableHead>
                                            <TableHead className="text-end">المكان</TableHead>
                                            <TableHead className="text-end">المؤطر</TableHead>
                                            <TableHead className="text-end">الحالة</TableHead>
                                            <TableHead className="text-end">إجراءات</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sessions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                                                    لا توجد حصص مبرمجة
                                                </TableCell>
                                            </TableRow>
                                        ) : sessions.map(session => (
                                            <TableRow key={session.id}>
                                                <TableCell className="font-medium">{formatDate(session.session_date)}</TableCell>
                                                <TableCell>{session.start_time} - {session.end_time || "?"}</TableCell>
                                                <TableCell>{session.topic || "-"}</TableCell>
                                                <TableCell>{session.room?.name || session.location_override || "-"}</TableCell>
                                                <TableCell>
                                                    {session.instructor ?
                                                        `${session.instructor.firstname_ar} ${session.instructor.lastname_ar}` :
                                                        "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={session.status === 'SCHEDULED' ? 'outline' : 'secondary'}>
                                                        {session.status === 'SCHEDULED' ? 'مبرمجة' :
                                                            session.status === 'COMPLETED' ? 'منجزة' :
                                                                session.status === 'CANCELLED' ? 'ملغاة' : session.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {['DRAFT', 'RESERVATION', 'PUBLISHED', 'ONGOING', 'POSTPONED'].includes(activity?.status || '') && (
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEditSession(session)}
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteSession(session.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="statistics" className="mt-0">
                        {loadingStats ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : statistics ? (
                            <div className="space-y-6">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardDescription className="text-xs font-medium">إجمالي التسجيلات</CardDescription>
                                            <CardTitle className="text-3xl">{statistics.total_registrations}</CardTitle>
                                        </CardHeader>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardDescription className="text-xs font-medium">ذكور</CardDescription>
                                            <CardTitle className="text-3xl text-blue-600">{statistics.total_males}</CardTitle>
                                        </CardHeader>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardDescription className="text-xs font-medium">إناث</CardDescription>
                                            <CardTitle className="text-3xl text-pink-600">{statistics.total_females}</CardTitle>
                                        </CardHeader>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardDescription className="text-xs font-medium">متوسط العمر</CardDescription>
                                            <CardTitle className="text-3xl">{statistics.average_age ?? '-'}</CardTitle>
                                        </CardHeader>
                                    </Card>
                                </div>

                                {/* Status Distribution */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">حالة التسجيلات</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {Object.entries(statistics.status_distribution).map(([status, count]) => (
                                                <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        {status === 'PENDING' ? 'قيد الانتظار' :
                                                            status === 'APPROVED' ? 'مقبول' :
                                                                status === 'REJECTED' ? 'مرفوض' :
                                                                    status === 'CANCELLED' ? 'ملغي' : status}
                                                    </span>
                                                    <span className="text-lg font-bold">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Gender Distribution */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">توزيع الجنس</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {Object.entries(statistics.gender_distribution).map(([gender, count]) => (
                                                <div key={gender} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        {gender === 'MALE' ? 'ذكر' :
                                                            gender === 'FEMALE' ? 'أنثى' :
                                                                gender === 'unknown' ? 'غير محدد' : gender}
                                                    </span>
                                                    <span className="text-lg font-bold">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Age Distribution */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">توزيع الأعمار</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {Object.entries(statistics.age_distribution).map(([group, count]) => {
                                                const maxCount = Math.max(...Object.values(statistics.age_distribution), 1);
                                                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                                                const labels: Record<string, string> = {
                                                    '0_12': '0-12 سنة',
                                                    '13_17': '13-17 سنة',
                                                    '18_25': '18-25 سنة',
                                                    '26_35': '26-35 سنة',
                                                    '36_50': '36-50 سنة',
                                                    '51_plus': '51+ سنة'
                                                };
                                                return (
                                                    <div key={group}>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="text-gray-600">{labels[group] || group}</span>
                                                            <span className="font-medium">{count}</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                            <div
                                                                className="bg-primary h-2.5 rounded-full transition-all duration-500"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Monthly Registrations */}
                                {statistics.monthly_registrations.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">التسجيلات الشهرية</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {statistics.monthly_registrations.map((item) => {
                                                    const maxCount = Math.max(...statistics.monthly_registrations.map(m => m.count), 1);
                                                    const percentage = (item.count / maxCount) * 100;
                                                    return (
                                                        <div key={item.month}>
                                                            <div className="flex justify-between text-sm mb-1">
                                                                <span className="text-gray-600">{item.month}</span>
                                                                <span className="font-medium">{item.count}</span>
                                                            </div>
                                                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                                <div
                                                                    className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Daily Registrations */}
                                {statistics.daily_registrations && statistics.daily_registrations.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">التسجيلات اليومية</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {statistics.daily_registrations.map((item) => {
                                                    const maxCount = Math.max(...statistics.daily_registrations.map(m => m.count), 1);
                                                    const percentage = (item.count / maxCount) * 100;
                                                    return (
                                                        <div key={item.date}>
                                                            <div className="flex justify-between text-sm mb-1">
                                                                <span className="text-gray-600">{item.date}</span>
                                                                <span className="font-medium">{item.count}</span>
                                                            </div>
                                                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                                <div
                                                                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Custom Field Statistics */}
                                {statistics.custom_field_statistics && Object.keys(statistics.custom_field_statistics).length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">إحصائيات الحقول المخصصة</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {Object.entries(statistics.custom_field_statistics).map(([fieldName, values]) => (
                                                <div key={fieldName}>
                                                    <h4 className="font-medium text-gray-700 mb-3 text-sm border-b pb-2">
                                                        {fieldName === 'municipality' ? 'البلدية' :
                                                         fieldName === 'education_level' ? 'المستوى التعليمي' :
                                                         fieldName === 'interests' ? 'الاهتمامات' :
                                                         fieldName === 'nearest_institution' ? 'أقرب مؤسسة' :
                                                         fieldName === 'الموهبة' ? 'الموهبة' :
                                                         fieldName === 'نسبة الاتقان' ? 'نسبة الإتقان' :
                                                         fieldName}
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {values.map((item, idx) => {
                                                            const maxCount = Math.max(...values.map(v => v.count), 1);
                                                            const percentage = (item.count / maxCount) * 100;
                                                            return (
                                                                <div key={idx}>
                                                                    <div className="flex justify-between text-sm mb-1">
                                                                        <span className="text-gray-600 truncate max-w-[70%]">{item.value}</span>
                                                                        <span className="font-medium text-gray-800">{item.count}</span>
                                                                    </div>
                                                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                                                        <div
                                                                            className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                                                                            style={{ width: `${percentage}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="py-10 text-center text-gray-500">
                                    لا توجد إحصائيات متاحة
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="budget" className="mt-0">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>الميزانية التقديرية</CardTitle>
                                {['DRAFT', 'RESERVATION', 'PUBLISHED', 'ONGOING', 'POSTPONED'].includes(activity?.status || '') && (
                                    <Dialog open={budgetDialogOpen} onOpenChange={(open) => {
                                        setBudgetDialogOpen(open);
                                        if (!open) {
                                            setEditingBudgetItem(null);
                                            setNewBudgetItem({ item_name: "", category: "MATERIALS", estimated_amount: "" });
                                        }
                                    }}>
                                        <DialogTrigger asChild>
                                            <Button size="sm">
                                                <Plus className="w-4 h-4 me-2" />
                                                {editingBudgetItem ? 'تعديل بند' : 'إضافة بند'}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>{editingBudgetItem ? 'تعديل بند الميزانية' : 'إضافة بند ميزانية'}</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label>البند</Label>
                                                    <Input value={newBudgetItem.item_name} onChange={e => setNewBudgetItem({ ...newBudgetItem, item_name: e.target.value })} placeholder="اسم البند" />
                                                </div>
                                                <div>
                                                    <Label>الفئة</Label>
                                                    <select className="w-full border rounded p-2" value={newBudgetItem.category} onChange={e => setNewBudgetItem({ ...newBudgetItem, category: e.target.value })}>
                                                        <option value="MATERIALS">مواد وتجهيزات</option>
                                                        <option value="SERVICES">خدمات</option>
                                                        <option value="CATERING">إطعام</option>
                                                        <option value="TRANSPORT">نقل</option>
                                                        <option value="AWARDS">جوائز</option>
                                                        <option value="OTHER">أخرى</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label>المبلغ التقديري</Label>
                                                    <Input type="number" value={newBudgetItem.estimated_amount} onChange={e => setNewBudgetItem({ ...newBudgetItem, estimated_amount: e.target.value })} />
                                                </div>
                                                <Button onClick={handleAddBudgetItem} className="w-full">{editingBudgetItem ? 'حفظ التعديلات' : 'إضافة'}</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>البند</TableHead>
                                            <TableHead>الفئة</TableHead>
                                            <TableHead>المبلغ التقديري</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {budgetItems.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                                    لا توجد بنود
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <>
                                                {budgetItems.map(item => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>{item.item_name}</TableCell>
                                                        <TableCell>
                                                            {item.category === 'VENUE' ? 'الإيواء' :
                                                                item.category === 'MATERIALS' ? 'العتاد' :
                                                                    item.category === 'CATERING' ? 'الإطعام/الإفطار' :
                                                                        item.category === 'TRANSPORT' ? 'النقل' :
                                                                            item.category === 'AWARDS' ? 'الجوائز' :
                                                                                item.category === 'SERVICES' ? 'خدمات' :
                                                                                    item.category === 'OTHER' ? 'أخرى' : item.category}
                                                        </TableCell>
                                                        <TableCell>{Number(item.estimated_amount).toLocaleString()} دج</TableCell>
                                                        <TableCell className="flex gap-2 justify-end">
                                                            {['DRAFT', 'RESERVATION', 'PUBLISHED', 'ONGOING', 'POSTPONED'].includes(activity?.status || '') && (
                                                                <>
                                                                    <Button variant="ghost" size="icon" onClick={() => handleEditBudgetItem(item)}>
                                                                        <Pencil className="w-4 h-4 text-blue-500" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteBudgetItem(item.id)}>
                                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow className="bg-gray-50 font-bold">
                                                    <TableCell colSpan={2} className="text-end">المجموع التقديري</TableCell>
                                                    <TableCell>{budgetItems.reduce((sum, item) => sum + (Number(item.estimated_amount) || 0), 0).toLocaleString()} دج</TableCell>
                                                    <TableCell></TableCell>
                                                </TableRow>
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="locations" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>أماكن الإنجاز</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>نوع المكان</Label>
                                        <div className="flex flex-wrap gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="location_type"
                                                    value="INTERNAL"
                                                    checked={locationType === ActivityLocationType.INTERNAL}
                                                    onChange={() => setLocationType(ActivityLocationType.INTERNAL)}
                                                    className="h-4 w-4"
                                                />
                                                <span>داخلي (داخل المؤسسة)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="location_type"
                                                    value="EXTERNAL"
                                                    checked={locationType === ActivityLocationType.EXTERNAL}
                                                    onChange={() => setLocationType(ActivityLocationType.EXTERNAL)}
                                                    className="h-4 w-4"
                                                />
                                                <span>خارجي (خارج المؤسسة)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="location_type"
                                                    value="HYBRID"
                                                    checked={locationType === ActivityLocationType.HYBRID}
                                                    onChange={() => setLocationType(ActivityLocationType.HYBRID)}
                                                    className="h-4 w-4"
                                                />
                                                <span>مختلط</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <Label>تفاصيل المكان (للانشطة الخارجية والمختلطة)</Label>
                                        <Textarea
                                            value={locationDetails}
                                            onChange={e => setLocationDetails(e.target.value)}
                                            placeholder="وصف مكان النشاط..."
                                            disabled={locationType === ActivityLocationType.INTERNAL}
                                        />
                                    </div>

                                    <Button onClick={handleUpdateLocation} className="w-full">حفظ التغييرات</Button>
                                </CardContent>
                            </Card>

                            <Card className={locationType === ActivityLocationType.EXTERNAL ? "opacity-50 pointer-events-none" : ""}>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>القاعات المحجوزة</CardTitle>
                                    <Dialog open={roomDialogOpen} onOpenChange={(open) => {
                                        setRoomDialogOpen(open);
                                        if (open) loadInstitutionRooms();
                                    }}>
                                        <DialogTrigger asChild>
                                            <Button size="sm" disabled={locationType === ActivityLocationType.EXTERNAL}>
                                                <Plus className="w-4 h-4 me-2" />
                                                حجز قاعة
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>حجز قاعة</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label>القاعة</Label>
                                                    <select
                                                        className="w-full border rounded p-2"
                                                        value={selectedRoomId}
                                                        onChange={e => setSelectedRoomId(e.target.value)}
                                                    >
                                                        <option value="">اختر قاعة...</option>
                                                        {availableRooms
                                                            .filter(room => !rooms.some(existing => existing.room_id === room.id))
                                                            .map(room => (
                                                                <option key={room.id} value={room.id}>
                                                                    {room.institution_name ? `${room.institution_name} - ` : ''}{room.name} (السعة: {room.capacity})
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                                <Button onClick={handleAddRoom} className="w-full">حجز</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>القاعة</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rooms.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={2} className="text-center text-gray-500 py-8">
                                                        لا توجد قاعات محجوزة
                                                    </TableCell>
                                                </TableRow>
                                            ) : rooms.map(room => (
                                                <TableRow key={room.id}>
                                                    <TableCell className="font-medium">
                                                        {room.room?.institution ? `${room.room.institution.name_ar} - ` : ''}
                                                        {room.room?.name || "قاعة غير معروفة"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRoom(room.id)}>
                                                            <Trash2 className="w-4 h-4 text-red-500" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div >
    );
}
