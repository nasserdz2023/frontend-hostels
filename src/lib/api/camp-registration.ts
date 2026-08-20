/**
 * Camp Registration API
 * واجهة برمجة التسجيل في المخيم
 */
import api from './client';
import type { PaginatedResponse } from './client';

export interface CampRegistration {
  id: string;
  batch_id: string;
  child_first_name: string;
  child_last_name: string;
  birth_date: string;
  gender?: string;
  child_country?: string;
  birth_wilaya?: string;
  birth_commune?: string;
  residence_wilaya?: string;
  residence_commune?: string;
  address?: string;
  parent_first_name?: string;
  parent_last_name?: string;
  parent_phone?: string;
  parent_email?: string;
  parent_national_id?: string;
  youth_institution?: string;
  child_photo_path?: string;
  birth_certificate_path?: string;
  // ✅ إضافة: المسارات الفعالة التي تحل محل Member إذا كان مرتبطاً
  effective_photo_path?: string;
  effective_birth_certificate_path?: string;
  status: 'pending' | 'processing' | 'success' | 'completed' | 'failed' | 'error';
  error_message?: string;
  receipt_token?: string;
  registration_data?: any;
  screenshot_path?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
  force_registration?: boolean;
  force_registered_first_name?: string;
  force_registered_last_name?: string;
  force_registered_number?: string;
  member_id?: string;
  unified_member_number?: string;
  sync_status?: string;
  last_synced_at?: string;
}

export interface RegistrationBatch {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'error';
  total_children: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  registration_method?: string;
  headless_mode: boolean;
  delay_between_registrations: number;
  default_directory?: string;
  default_email?: string;
  default_wilaya?: string;
  default_commune?: string;
  institution_id?: string;
  force_camp_on_member_fail: boolean;
  started_at?: string;
  completed_at?: string;
  created_by_id?: string;
  created_at: string;
  updated_at: string;
  children?: CampRegistration[];
}

export interface BatchStatistics {
  total_batches: number;
  total_registrations: number;
  successful_registrations: number;
  failed_registrations: number;
  registrations_today: number;
  registrations_this_week: number;
  registrations_this_month: number;
  success_rate: number;
  status_breakdown: Record<string, number>;
  recent_batches: RegistrationBatch[];
}

export interface ImportResponse {
  total_rows: number;
  successful: number;
  failed: number;
  errors: string[];
  message: string;
}

export interface CreateBatchRequest {
  name: string;
  description?: string;
  registration_method?: string;
  headless_mode?: boolean;
  delay_between_registrations?: number;
  default_directory?: string;
  default_email?: string;
  default_wilaya?: string;
  default_commune?: string;
  institution_id?: string;
  force_camp_on_member_fail?: boolean;
  children: {
    member_id?: string;
    unified_member_number?: string;
    receipt_token?: string;
    child_first_name: string;
    child_last_name: string;
    birth_date: string;
    gender?: string;
    child_country?: string;
    birth_wilaya?: string;
    birth_commune?: string;
    residence_wilaya?: string;
    residence_commune?: string;
    address?: string;
    parent_first_name?: string;
    parent_last_name?: string;
    parent_phone?: string;
    parent_email?: string;
    parent_national_id?: string;
    youth_institution?: string;
    child_photo_path?: string;
    birth_certificate_path?: string;
  }[];
}

// API Functions
export const campRegistrationApi = {
  // Batches
  createBatch: (data: CreateBatchRequest) =>
    api.post<RegistrationBatch>('/camp-registration/batches', data),

  listBatches: (params?: {
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }) =>
    api.get<PaginatedResponse<RegistrationBatch>>('/camp-registration/batches', { params }),

  getBatch: (batchId: string) =>
    api.get<RegistrationBatch>(`/camp-registration/batches/${batchId}`),

  updateBatch: (batchId: string, data: Partial<RegistrationBatch>) =>
    api.put<RegistrationBatch>(`/camp-registration/batches/${batchId}`, data),

  deleteBatch: (batchId: string, force: boolean = false) =>
    api.delete(`/camp-registration/batches/${batchId}?force=${force}`),

  startBatch: (batchId: string, externalWorker: boolean = true) =>
    api.post(`/camp-registration/batches/${batchId}/start?external_worker=${externalWorker}`),


  stopBatch: (batchId: string) =>
    api.post(`/camp-registration/batches/${batchId}/stop`),

  restartBatch: (batchId: string, targetStatuses?: string[], externalWorker: boolean = true) =>
    api.post(`/camp-registration/batches/${batchId}/restart`, null, {
      params: {
        ...(targetStatuses ? { target_statuses: targetStatuses } : {}),
        external_worker: externalWorker
      }
    }),

  // Children Management
  addChildrenToBatch: (batchId: string, data: CreateBatchRequest) =>
    api.post(`/camp-registration/batches/${batchId}/children`, data),

  bulkUpdateChildren: (batchId: string, children: any[]) =>
    api.put(`/camp-registration/batches/${batchId}/children/bulk-update`, children),

  updateChild: (batchId: string, childId: string, data: CreateBatchRequest['children'][0]) =>
    api.put(`/camp-registration/batches/${batchId}/children/${childId}`, data),

  updateChildStatus: (batchId: string, childId: string, status: string) =>
    api.put(`/camp-registration/batches/${batchId}/children/${childId}/status`, { status }),

  deleteChild: (batchId: string, childId: string) =>
    api.delete(`/camp-registration/batches/${batchId}/children/${childId}`),

  moveChild: (batchId: string, childId: string, targetBatchId: string) =>
    api.post(`/camp-registration/batches/${batchId}/children/${childId}/move`, { target_batch_id: targetBatchId }),

  // Import/Export
  startSmartImport: (batchId: string, targetDir: string) =>
    api.post<{ message: string; target_dir: string }>(`/camp-registration/batches/${batchId}/smart-import`, { target_dir: targetDir }),

  stopSmartImport: () =>
    api.post<{ message: string }>(`/camp-registration/batches/smart-import/stop`),

  listSmartFolders: (targetDir: string) =>
    api.post<{ folders: { name: string; path: string; status: string; has_cache: boolean; cached_data: any }[]; total: number }>(`/camp-registration/smart-extract/list-folders`, { target_dir: targetDir }),

  startSmartExtract: (baseDir: string, provider: string = 'gemini', retryFailedOnly: boolean = false, folderPaths?: string[]) =>
    api.post<{ job_id: string; total: number; cached: number }>(`/camp-registration/smart-extract/start`, { base_dir: baseDir, provider, retry_failed_only: retryFailedOnly, folder_paths: folderPaths }),

  getSmartExtractProgress: (jobId: string) =>
    api.get<{
      status: string;
      total: number;
      processed: number;
      success: number;
      failed: number;
      cached: number;
      current_folder: string | null;
      results: {
        folder_name: string;
        folder_path: string;
        status: string;
        mapped_data: any;
        error_message: string | null;
      }[];
    }>(`/camp-registration/smart-extract/progress/${jobId}`),

  stopSmartExtractJob: (jobId: string) =>
    api.post<{ message: string }>(`/camp-registration/smart-extract/stop/${jobId}`),

  extractFolder: (folderPath: string, provider: string = 'gemini') =>
    api.post<{
      child_first_name: string;
      child_last_name: string;
      birth_date: string;
      gender: string;
      birth_wilaya: string;
      birth_commune: string;
      residence_commune: string;
      address: string;
      parent_first_name: string;
      parent_last_name: string;
      parent_phone: string;
      parent_national_id: string;
      child_photo_path: string;
      birth_certificate_path: string;
      folder_name: string;
    }>(`/camp-registration/smart-extract/folder`, { folder_path: folderPath, provider }, { timeout: 300000 }), // انتظار حتى 5 دقائق للتدوير

  reExtractChild: (batchId: string, childId: string) =>
    api.post<{ message: string; child_id: string; folder_name: string }>(`/camp-registration/batches/${batchId}/children/${childId}/re-extract`),

  createBatchFromChildren: (data: {
    child_ids: string[];
    name: string;
    description?: string;
    registration_method?: string;
    headless_mode?: boolean;
    delay_between_registrations?: number;
    default_directory?: string;
    default_wilaya?: string;
    default_commune?: string;
    institution_id?: string;
    force_camp_on_member_fail?: boolean;
  }) =>
    api.post<RegistrationBatch>('/camp-registration/batches/create-from-children', data),

  importBatch: (batchId: string, file: File, skipDuplicates: boolean = true) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/camp-registration/batches/${batchId}/import`, formData, {
      params: { skip_duplicates: skipDuplicates },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  exportBatch: (batchId: string, status?: string) =>
    api.get(`/camp-registration/batches/${batchId}/export`, {
      responseType: 'blob',
      params: status ? { status } : {},
    }),

  syncJsonCache: (baseDir: string, children: any[]) =>
    api.post(`/camp-registration/smart-extract/sync-json-cache`, { base_dir: baseDir, children }),

  // Statistics
  getStatistics: () =>
    api.get<BatchStatistics>('/camp-registration/statistics'),

  getDetailedStatistics: () =>
    api.get('/camp-registration/statistics/detailed'),

  getScreenshots: (batch_id: string, child_id?: string) =>
    api.get(`/camp-registration/batches/${batch_id}/screenshots`, {
      params: child_id ? { child_id: child_id } : {}
    }),

  getChildFiles: (batch_id: string, child_id: string) =>
    api.get<{ files: Array<{ name: string; path: string; size: number | null; last_modified: string | null; url: string }> }>(`/camp-registration/batches/${batch_id}/children/${child_id}/files`),

  searchChildren: (search?: string, page = 1, size = 50) =>
    api.get<{ items: CampRegistration[]; total: number; page: number; page_size: number }>(
      '/camp-registration/children/search',
      { params: { search, page, page_size: size } }
    ),

  exportToExcel: async (childIds?: string[], search?: string) => {
    const response = await api.post('/camp-registration/children/export/excel', {
        child_ids: childIds,
        search: search
    }, {
        responseType: 'blob',
        timeout: 300000, // 5 minutes
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `قائمة_الأطفال_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  getChild: (childId: string) =>
    api.get<CampRegistration>(`/camp-registration/children/${childId}`),

  uploadChildFile: (batchId: string, childId: string, fileType: 'photo' | 'certificate', file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(
      `/camp-registration/batches/${batchId}/children/${childId}/upload-file?file_type=${fileType}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
  
  migrateFilesToMinio: (batchId: string) =>
    api.post<{ message: string; migrated_photos: number; migrated_certs: number; errors: string[] }>(
      `/camp-registration/batches/${batchId}/migrate-files-to-minio`
    ),

  convertToMember: (childId: string) =>
    api.post(`/camp-registration/children/${childId}/convert-to-member`),

  scanUploadExtract: (batchId: string, formData: FormData) =>
    api.post<{
      child_id: string;
      batch_id: string;
      folder_name: string;
      photo_url: string;
      certificate_url: string;
      guardian_id_url: string | null;
      smart_extract: string;
      message: string;
    }>(`/camp-registration/batches/${batchId}/scan-upload-extract`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),
  
  checkDuplicate: (firstName: string, lastName: string, birthDate: string, excludeChildId?: string) =>
    api.get<{
      is_duplicate: boolean;
      child?: {
        id: string;
        batch_name: string;
        status: string;
        created_at: string;
      }
    }>('/camp-registration/children/check-duplicate', {
      params: {
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        exclude_child_id: excludeChildId
      }
    }),

  syncBatchFromMinistry: (batchId: string, accountIds?: string[]) =>
    api.post<{
      message: string;
      total_children: number;
      processed: number;
      photos_downloaded: number;
      certificates_downloaded: number;
      receipts_downloaded: number;
      errors: string[];
      skipped: number;
    }>(`/camp-registration/batches/${batchId}/sync-from-ministry`, accountIds ? { account_ids: accountIds } : null,
    { timeout: 300000 }), // 5 دقائق timeout

  syncChildFilesFromLocal: (childId: string) =>
    api.post(`/camp-registration/children/${childId}/sync-files-from-local`),

  registerToMinistry: (batchId: string, childId?: string) =>
    api.post<{
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
    }>(`/camp-registration/batches/${batchId}/register-to-ministry`, null, {
        params: childId ? { child_id: childId } : {},
        timeout: 600000 
    }), // 10 دقائق timeout

};

export default campRegistrationApi;
