import api from './client';
import type { PaginatedResponse } from './client';

export interface CampTripMember {
  id?: string;
  child_id?: string;
  member_id?: string;
  member_type: 'main' | 'scout' | 'association' | 'institution' | 'municipality' | 'authority';
  is_standby: boolean;
  first_name?: string;
  last_name?: string;
  gender?: string;
  birth_date?: string;
  municipality?: string;
  parent_full_name?: string;
  parent_phone?: string;
  parent_national_id?: string;
  parent_email?: string;
  address?: string;
  residence_wilaya?: string;
  youth_institution?: string;
  enrollment_institution?: string;
  ministry_number?: string;
  unified_adherence_number?: string;
  photo_path?: string;
  parental_declaration_path?: string;
  parental_declaration_sent_at?: string;
  medical_certificate_path?: string;
  screenshot_path?: string;
  receipt_path?: string;
  has_hidden_spaces?: boolean;
  duplicate_info?: string;
  is_deleted_alert?: boolean;
}


export interface FieldComparison {
  field: string;
  label: string;
  local_value?: string | null;
  ministry_value?: string | null;
  match: boolean;
}

export interface VerifyMinistryResponse {
  has_differences: boolean;
  ministry_data_exists: boolean;
  comparisons: FieldComparison[];
  alerts: string[];
}
export interface CampTrip {
  id: string;
  name: string;
  description?: string;
  capacity: number;
  scouts_quota: number;
  associations_quota: number;
  institutions_quota: number;
  start_date?: string;
  end_date?: string;
  status: string;
  created_at: string;
  members?: CampTripMember[];
  ministry_session_id?: string | null;
  ministry_session_name?: string | null;
}

export interface CampTripStats {
  total_trips: number;
  active_trips: number;
  planned_trips: number;
  completed_trips: number;
  total_members: number;
  total_capacity: number;
  occupancy_rate: number;
}

export interface CampTripCreateRequest {
  name: string;
  description?: string;
  capacity?: number;
  scouts_quota?: number;
  associations_quota?: number;
  institutions_quota?: number;
  start_date?: string;
  end_date?: string;
  members: CampTripMember[];
}

// ========== Smart Allocation Types ==========

export interface SimulationRequest {
  total_children: number;
  children_per_batch: number;
  scouts_quota: number;
  associations_quota: number;
  institutions_quota: number;
  enable_standby: boolean;
  standby_count_per_batch: number;
  first_batch_date: string;
  days_between_batches: number;
  gender_male_percentage: number;
  selected_age_groups: Record<string, boolean>;
  selected_municipality_ids: string[];
  // New lottery configuration fields
  enable_small_mun_protection: boolean;
  small_mun_threshold: number;
  min_children_per_batch: number;
  max_children_per_batch: number;
  reunification_slots: number;
  min_females_per_batch: number;
}

export interface SimulatedChild {
  id: string;
  child_id?: string;
  name: string;
  gender: string;
  age: number | string;
  municipality: string;
  member_type: string;
  is_standby: boolean;
  parent_key?: string;
  family_key?: string;
  imbalance_reason?: string;
}

export interface SimulatedBatch {
  id: string;
  name: string;
  count: number;
  smart_count: number;
  reserved_count: number;
  scouts_quota: number;
  associations_quota: number;
  institutions_quota: number;
  standby_count: number;
  start_date: string;
  stats: Record<string, number>;
  children: SimulatedChild[];
  imbalance_reasons?: string[];
}

export interface SimulationResult {
  success: boolean;
  batches: SimulatedBatch[];
  overall_mun_stats: Record<string, { registered: number; distributed: number }>;
  total_distributed: number;
  total_standby: number;
  total_pool: number;
  warnings: string[];
  reunification_log?: Array<{
    family_key: string;
    family_name?: string;
    members_count: number;
    target_batch: string;
  }>;
}

export interface AvailableMunicipality {
  id: string;
  name_ar: string;
  wilaya_code: string;
}


export const campTripsApi = {
  simulateAllocation: (data: SimulationRequest) =>
    api.post<SimulationResult>('/camp-trips/simulate-allocation', data),

  getStats: () =>
    api.get<CampTripStats>('/camp-trips/stats'),

  createTrip: (data: CampTripCreateRequest) =>
    api.post<CampTrip>('/camp-trips/', data),

  listTrips: (params?: { page?: number; page_size?: number; status?: string }) =>
    api.get<PaginatedResponse<CampTrip>>('/camp-trips/', { params }),

  getTrip: (tripId: string) =>
    api.get<CampTrip>(`/camp-trips/${tripId}?t=${Date.now()}`),

  updateTrip: (tripId: string, data: Partial<CampTripCreateRequest>) =>
    api.put<CampTrip>(`/camp-trips/${tripId}`, data),

  updateStatus: (tripId: string, status: string) =>
    api.put<CampTrip>(`/camp-trips/${tripId}/status`, { status }),

  deleteTrip: (tripId: string) =>
    api.delete(`/camp-trips/${tripId}`),

  addMembers: (tripId: string, members: CampTripMember[]) =>
    api.post<CampTrip>(`/camp-trips/${tripId}/members`, members),

  removeMember: (tripId: string, memberId: string, reason?: string) =>
    api.delete(`/camp-trips/${tripId}/members/${memberId}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`),

  removeMembers: (tripId: string, memberIds: string[], reason?: string) =>
    api.delete(`/camp-trips/${tripId}/members`, { params: { members: memberIds, reason } }),

  syncMinistryNumbers: (tripId: string, limit: number = 0) =>
    api.post<{task_id: string; message: string}>(`/camp-trips/${tripId}/sync-ministry-numbers?limit=${limit}`),

  getTaskProgress: (taskId: string) =>
    api.get<{task_id: string; status: string; processed: number; total: number; message: string; updated_count: number}>(`/camp-trips/tasks/${taskId}/progress`),

  verifyMinistryBulk: (tripId: string) =>
    api.post<{task_id: string; message: string}>(`/camp-trips/${tripId}/verify-ministry-data/bulk`),

  syncMinisterial: (tripId: string, memberId: string) =>
    api.post<{success: boolean; message: string}>(`/camp-trips/${tripId}/members/${memberId}/sync-ministerial`),

  enrollMinisterial: (tripId: string, memberId: string) =>
    api.post(`/camp-trips/${tripId}/members/${memberId}/enroll-ministerial`),

  fetchFromMinisterial: (tripId: string, memberId: string) =>
    api.post<{message: string; member_id: string}>(`/camp-trips/${tripId}/members/${memberId}/fetch-from-ministerial`),

  verifyMinistryData: (tripId: string, memberId: string) =>
    api.post<VerifyMinistryResponse>(`/camp-trips/${tripId}/members/${memberId}/verify-ministry-data`),

  updateMemberType: (tripId: string, memberId: string, data: { member_type: string, youth_institution?: string, is_standby?: boolean, ministry_number?: string, unified_adherence_number?: string, enrollment_institution?: string, force_registration?: boolean }) =>
    api.put<CampTripMember>(`/camp-trips/${tripId}/members/${memberId}/type`, data),

  bulkUpdateMemberType: (tripId: string, data: { member_ids: string[], member_type: string, is_standby?: boolean }) =>
    api.post<{success: boolean, message: string, updated_count: number}>(`/camp-trips/${tripId}/members/bulk-update-type`, data),

  uploadDeclaration: (tripId: string, memberId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string }>(`/camp-trips/${tripId}/members/${memberId}/upload-declaration`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  uploadMedicalCertificate: (tripId: string, memberId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string }>(`/camp-trips/${tripId}/members/${memberId}/upload-medical-certificate`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  exportToExcel: async (tripId: string, tripName: string) => {
    const response = await api.get<{message: string}>(`/camp-trips/${tripId}/export/excel`);
    return response.data;
  },
  getAvailableMunicipalities: () =>
    api.get<AvailableMunicipality[]>('/camp-trips/available-municipalities'),

  copyStandbyFromTrip: (tripId: string, sourceTripId: string, addToStandby: boolean = true) =>
    api.post<CampTrip>(`/camp-trips/${tripId}/standby/copy/${sourceTripId}?add_to_standby=${addToStandby}`),

  /** جلب الدورات المتاحة من المنصة الوزارية */
  getSessions: () =>
    api.get<{ success: boolean; data: any[] }>('/camp-trips/sessions'),

  /** توجيه الطفل إلى الدورة المحددة على الفوج */
  assignSession: (tripId: string, memberId: string) =>
    api.post<{ success: boolean; message: string; data: { child_id: string; session_id: string; session_name: string } }>(
      `/camp-trips/${tripId}/members/${memberId}/assign-session`
    ),

};

// === Crop Settings ===

export interface CropSetting {
  id: string;
  document_type: string;
  x_offset_pct: number;
  y_offset_pct: number;
  width_pct: number;
  height_pct: number;
  updated_at: string;
}

export interface CropSettingUpdate {
  document_type: string;
  x_offset_pct: number;
  y_offset_pct: number;
  width_pct: number;
  height_pct: number;
}

export interface CropSettingsBulkUpdate {
  settings: CropSettingUpdate[];
}

export async function getCropSettings(): Promise<CropSetting[]> {
  const response = await api.get('/camp-trips/crop-settings');
  return response.data;
}

export async function updateCropSettings(data: CropSettingsBulkUpdate): Promise<CropSetting[]> {
  const response = await api.put('/camp-trips/crop-settings', data);
  return response.data;
}
