/**
 * Members API
 * واجهة برمجة المنخرطين
 */
import api from './client';
import type { PaginatedResponse } from './client';

// ==================== Types ====================

export interface Member {
  id: string;
  local_number: string;
  ministry_number?: string;
  unified_member_number?: string;
  national_id?: string;
  first_name: string;
  last_name: string;
  first_name_fr?: string;
  last_name_fr?: string;
  username?: string;
  email?: string;
  password?: string;
  birth_date?: string;
  gender?: string;
  has_disabilities: boolean;
  birth_wilaya?: string;
  birth_commune?: string;
  address?: string;
  residence_wilaya?: string;
  residence_commune?: string;
  institution?: string;
  academic_level?: string;
  favorite_activities?: string[];
  photo_path?: string;
  birth_certificate_path?: string;
  national_id_path?: string;
  membership_year?: number;
  membership_status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  sync_status?: 'SYNCED' | 'PENDING' | 'CONFLICT' | 'ERROR';
  last_synced_at?: string;
  is_ai_generated?: boolean;
  camp_rejection_reason?: string;
  created_by_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface Guardian {
  id: string;
  member_id: string;
  national_id?: string;
  first_name: string;
  last_name: string;
  gender?: string;
  birth_date?: string;
  birth_wilaya?: string;
  birth_commune?: string;
  phone?: string;
  email?: string;
  national_id_path?: string;
  relationship_type?: string;
  candidate_phone?: string;
  created_at: string;
}

export interface GuardianDetail extends Guardian {
  members: Member[];
}

export interface GuardianListResponse {
  items: Guardian[];
  total: number;
  page: number;
  page_size: number;
}

export interface MemberDetail extends Member {
  guardians: Guardian[];
  camp_count: number;
}

export interface MemberStatistics {
  total_members: number;
  active_members: number;
  expired_members: number;
  cancelled_members: number;
  by_gender: Record<string, number>;
  by_wilaya: Record<string, number>;
  by_institution: Record<string, number>;
  by_year: Record<string, number>;
}

export interface MemberCard {
  id: string;
  local_number: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  membership_year: number;
  institution?: string;
  card_url?: string;
}

// ==================== API Functions ====================

const BASE_URL = '/members';

export const membersApi = {
  // Create a new member
  async create(data: {
    national_id?: string;
    first_name: string;
    last_name: string;
    first_name_fr?: string;
    last_name_fr?: string;
    username?: string;
    email?: string;
    password?: string;
    birth_date?: string;
    gender?: string;
    has_disabilities?: boolean;
    birth_wilaya?: string;
    birth_commune?: string;
    address?: string;
    residence_wilaya?: string;
    institution?: string;
    academic_level?: string;
    favorite_activities?: string[];
    photo_path?: string;
    membership_year?: number;
    guardian?: {
      national_id?: string;
      first_name: string;
      last_name: string;
      gender?: string;
      birth_date?: string;
      birth_wilaya?: string;
      birth_commune?: string;
      phone?: string;
      relationship_type?: string;
      candidate_phone?: string;
    };
  }): Promise<{ data: Member }> {
    return api.post(BASE_URL, data);
  },

  // List all members with pagination and filters
  async list(params?: {
    search?: string;
    status?: string;
    institution?: string;
    year?: number;
    commune?: string;
    daira?: string;
    gender?: string;
    age_group?: string;
    youth_connect?: boolean;
    created_period?: string;
    sort_by?: string;
    page?: number;
    size?: number;
  }): Promise<{ data: PaginatedResponse<Member> }> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.set('search', params.search);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.institution) queryParams.set('institution', params.institution);
    if (params?.year) queryParams.set('year', params.year.toString());
    if (params?.commune) queryParams.set('commune', params.commune);
    if (params?.daira) queryParams.set('daira', params.daira);
    if (params?.gender) queryParams.set('gender', params.gender);
    if (params?.age_group) queryParams.set('age_group', params.age_group);
    if (params?.youth_connect !== undefined) queryParams.set('youth_connect', params.youth_connect.toString());
    if (params?.created_period) queryParams.set('created_period', params.created_period);
    if (params?.sort_by) queryParams.set('sort_by', params.sort_by);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.size) queryParams.set('page_size', params.size.toString());
    
    return api.get(`${BASE_URL}?${queryParams.toString()}`);
  },

  // Get member by ID
  async get(memberId: string): Promise<{ data: MemberDetail }> {
    return api.get(`${BASE_URL}/${memberId}`);
  },

  // Get member by local number
  async getByLocalNumber(localNumber: string): Promise<{ data: MemberDetail }> {
    return api.get(`${BASE_URL}/by-local-number/${localNumber}`);
  },

  // Update a member
  async update(memberId: string, data: Partial<{
    ministry_number: string;
    national_id: string;
    first_name: string;
    last_name: string;
    first_name_fr: string;
    last_name_fr: string;
    username: string;
    email: string;
    password: string;
    birth_date: string;
    gender: string;
    has_disabilities: boolean;
    birth_wilaya: string;
    birth_commune: string;
    address: string;
    residence_wilaya: string;
    institution: string;
    academic_level: string;
    favorite_activities: string[];
    photo_path: string;
    membership_year: number;
    membership_status: string;
  }>): Promise<{ data: Member }> {
    return api.put(`${BASE_URL}/${memberId}`, data);
  },

  // Delete a member
  async delete(memberId: string): Promise<{ message: string }> {
    return api.delete(`${BASE_URL}/${memberId}`);
  },

  // Add guardian to a member
  async addGuardian(memberId: string, guardianData: {
    national_id?: string;
    first_name: string;
    last_name: string;
    gender?: string;
    birth_date?: string;
    birth_wilaya?: string;
    birth_commune?: string;
    phone?: string;
    relationship_type?: string;
    candidate_phone?: string;
  }): Promise<{ data: Guardian }> {
    return api.post(`${BASE_URL}/${memberId}/guardians`, guardianData);
  },

  // Link a member to a camp
  async linkCamp(memberId: string, data: {
    camp_registration_id?: string;
    camp_year: number;
    notes?: string;
  }): Promise<{ data: any }> {
    return api.post(`${BASE_URL}/${memberId}/camps`, data);
  },

  // Get member's camps
  async getMemberCamps(memberId: string): Promise<{ data: any[] }> {
    return api.get(`${BASE_URL}/${memberId}/camps`);
  },

  // Search members
  async search(query: string, limit: number = 10): Promise<{ data: Member[] }> {
    return api.get(`${BASE_URL}/search/query?query=${encodeURIComponent(query)}&limit=${limit}`);
  },

  // Check for duplicates
  async checkDuplicate(params: {
    national_id?: string;
    first_name?: string;
    last_name?: string;
    birth_date?: string;
  }): Promise<{ has_duplicate: boolean; duplicates: Array<{ id: string; local_number: string; first_name: string; last_name: string; birth_date: string }> }> {
    const queryParams = new URLSearchParams();
    if (params.national_id) queryParams.set('national_id', params.national_id);
    if (params.first_name) queryParams.set('first_name', params.first_name);
    if (params.last_name) queryParams.set('last_name', params.last_name);
    if (params.birth_date) queryParams.set('birth_date', params.birth_date);
    
    return api.get(`${BASE_URL}/check-duplicate?${queryParams.toString()}`);
  },

  // Get statistics
  async getStatistics(): Promise<{ data: MemberStatistics }> {
    return api.get(`${BASE_URL}/statistics`);
  },

  // Import members from CSV
  async import(file: File): Promise<{
    total_rows: number;
    successful: number;
    failed: number;
    errors: string[];
    message: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`${BASE_URL}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // Export members to Excel
  async export(params?: {
    status?: 'active' | 'expired' | 'cancelled';
    institution?: string;
    year?: number;
    created_period?: string;
    ids?: string;
  }): Promise<Blob> {
    const response = await api.get(`${BASE_URL}/export/excel`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // Get member card data
  async getCard(memberId: string): Promise<{ data: MemberCard }> {
    return api.get(`${BASE_URL}/${memberId}/card`);
  },

  // Import from camp registration
  async importFromCampRegistration(registrationId: string, institutionName?: string): Promise<{ data: Member }> {
    const url = institutionName 
      ? `${BASE_URL}/import/camp-registration/${registrationId}?institution_name=${encodeURIComponent(institutionName)}`
      : `${BASE_URL}/import/camp-registration/${registrationId}`;
    return api.post(url);
  },

  // Import entire batch from camp
  async importFromCampBatch(batchId: string, institutionName?: string): Promise<{ batch_id: string; total: number; successful: number; skipped: number }> {
    const url = institutionName 
      ? `${BASE_URL}/import/camp-batch/${batchId}?institution_name=${encodeURIComponent(institutionName)}`
      : `${BASE_URL}/import/camp-batch/${batchId}`;
    return api.post(url);
  },

  // Search guardians
  async searchGuardians(query: string, limit: number = 10): Promise<{ data: Guardian[] }> {
    return api.get(`${BASE_URL}/guardians/search?query=${encodeURIComponent(query)}&limit=${limit}`);
  },

  // Get guardian by national ID
  async getGuardianByNationalId(nationalId: string) {
    return api.get<Guardian>(`/members/guardians/by-national-id/${nationalId}`);
  },

  listGuardians(params: { search?: string; page?: number; page_size?: number }) {
    return api.get<GuardianListResponse>("/members/guardians/list", { params });
  },

  getGuardianDetail(id: string) {
    return api.get<GuardianDetail>(`/members/guardians/item/${id}`);
  },

  // Start smart bulk import
  async smartBulkImport(targetDir: string): Promise<{ message: string; target_dir: string }> {
    return api.post(`${BASE_URL}/import/smart-bulk`, { target_dir: targetDir });
  },

  // Stop smart bulk import
  async stopSmartBulkImport(targetDir: string): Promise<{ message: string }> {
    return api.post(`${BASE_URL}/import/smart-bulk/stop`, { target_dir: targetDir });
  },

  // Magical Generate members using AI
  async magicalGenerate(data: {
    count: number;
    institution?: string;
    municipality?: string;
    save_to_db?: boolean;
  }): Promise<{ 
    data: {
      total_generated: number; 
      members: Member[]; 
      provider_used?: string; 
      message: string 
    }
  }> {
    return api.post(`${BASE_URL}/magical-generate`, data, { timeout: 600000 });
  },

  // Group members by specific field
  async groupBy(by: string): Promise<{ data: MemberGroupResponse }> {
    return api.get(`${BASE_URL}/group-by?by=${by}`);
  },

  // ==================== File Upload ====================

  /** رفع صورة المنخرط */
  async uploadPhoto(memberId: string, file: File): Promise<{ data: { message: string; photo_path: string; thumbnail_path?: string } }> {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`${BASE_URL}/${memberId}/upload/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /** رفع شهادة ميلاد المنخرط */
  async uploadBirthCertificate(memberId: string, file: File): Promise<{ data: { message: string; birth_certificate_path: string } }> {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`${BASE_URL}/${memberId}/upload/birth-certificate`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /** رفع بطاقة تعريف المنخرط */
  async uploadNationalId(memberId: string, file: File): Promise<{ data: { message: string; national_id_path: string } }> {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`${BASE_URL}/${memberId}/upload/national-id`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /** رفع بطاقة تعريف الولي */
  async uploadGuardianNationalId(guardianId: string, file: File): Promise<{ data: { message: string; national_id_path: string } }> {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`${BASE_URL}/guardians/${guardianId}/upload/national-id`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /** تجديد رقم الانخراط الموحد في YouthConnect */
  /** تجديد رقم الانخراط الموحد في YouthConnect */
  async renewYouthconnect(memberId: string, institution?: string): Promise<{ data: { success: boolean; message: string; ministry_number?: string } }> {
    let url = `${BASE_URL}/${memberId}/renew-youthconnect`;
    if (institution) {
      url += `?institution_override=${encodeURIComponent(institution)}`;
    }
    return api.post(url);
  },

  /** حذف وثيقة منخرط */
  async deleteDocument(memberId: string, docType: 'photo' | 'birth-certificate' | 'national-id'): Promise<{ data: { message: string } }> {
    return api.delete(`${BASE_URL}/${memberId}/upload/${docType}`);
  },
};

export interface MemberGroupItem {
  key: string;
  count: number;
  label?: string;
}

export interface MemberGroupResponse {
  group_by: string;
  items: MemberGroupItem[];
}

export default membersApi;