/**
 * Animator Registration API
 * واجهة برمجة تسجيل المنشطين
 */
import api from './client';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AnimatorBatch {
  id: string;
  name: string;
  description?: string;
  year: number;
  status: string;
  total_animators: number;
  created_at: string;
  updated_at: string;
}

export interface AnimatorRegistration {
  id: string;
  batch_id: string;
  national_id?: string;
  first_name: string;
  last_name: string;
  birth_date?: string;
  birth_wilaya?: string;
  birth_commune?: string;
  residence_wilaya?: string;
  residence_commune?: string;
  gender?: string;
  marital_status?: string;
  phone?: string;
  email?: string;
  position: string;
  position_type: string;
  certificate_date?: string;
  previous_centers?: string[];
  responsibilities?: string;
  languages?: string[];
  photo_path?: string;
  residence_card_path?: string;
  certificate_path?: string;
  student_card_path?: string;
  medical_cert_path?: string;
  chest_cert_path?: string;
  status: string;
  ministry_sync_status?: string;
  ministry_number?: string;
  ministry_user_id?: string;
  ministry_password?: string;
  created_at: string;
  updated_at: string;
}

export interface AnimatorBatchWithAnimators extends AnimatorBatch {
  animators: AnimatorRegistration[];
}

// ─── API Functions ──────────────────────────────────────────────────────────

export const animatorRegistrationApi = {
  // Batches
  getBatches: () =>
    api.get<AnimatorBatch[]>('/animator-registration/batches'),

  getBatch: (id: string) =>
    api.get<AnimatorBatchWithAnimators>(`/animator-registration/batches/${id}`),

  createBatch: (payload: { name: string; year: number; description?: string }) =>
    api.post<AnimatorBatch>('/animator-registration/batches', payload),

  updateBatch: (id: string, payload: Partial<AnimatorBatch>) =>
    api.put<AnimatorBatch>(`/animator-registration/batches/${id}`, payload),

  deleteBatch: (id: string) =>
    api.delete(`/animator-registration/batches/${id}`),

  // Animators
  getAnimator: (id: string) =>
    api.get<AnimatorRegistration>(`/animator-registration/animators/${id}`),

  updateAnimator: (id: string, payload: Partial<AnimatorRegistration>) =>
    api.put<AnimatorRegistration>(`/animator-registration/animators/${id}`, payload),

  deleteAnimator: (id: string) =>
    api.delete(`/animator-registration/animators/${id}`),

  // Re-extract
  reExtractAnimator: (animatorId: string) =>
    api.post<{ message: string; status?: string; animator_id?: string; extracted?: Record<string, unknown> }>(
      `/animator-registration/animators/${animatorId}/re-extract`
    ),

  reExtractAllAnimators: (batchId: string) =>
    api.post<{ message: string; status?: string; total?: number; results?: Array<{ id: string; status: string }> }>(
      `/animator-registration/batches/${batchId}/re-extract-all`
    ),


  // Search & filter animators across all batches
  searchAnimators: (params: {
    q?: string;
    gender?: string;
    position?: string;
    position_type?: string;
    residence_wilaya?: string;
    birth_wilaya?: string;
    batch_id?: string;
    status?: string;
    group_by?: string;
  }) =>
    api.get<{
      items?: Array<{
        id: string;
        first_name: string;
        last_name: string;
        national_id: string;
        batch_id: string;
        status: string;
        gender: string;
        position: string;
        position_type: string;
        residence_wilaya: string;
        birth_wilaya: string;
      }>;
      grouped?: Record<string, Array<{ id: string; first_name: string; last_name: string; national_id: string; batch_id: string; status: string; gender: string; position: string; position_type: string; residence_wilaya: string; birth_wilaya: string }>>;
      total: number;
    }>(`/animator-registration/animators/search`, { params }),

  // Ministry Sync
  registerToMinistry: (id: string, force = false) =>
    api.post<{ message: string; status: string }>(
      `/animator-registration/animators/${id}/register-to-ministry`,
      null,
      { params: force ? { force: true } : {} }
    ),

  // Document Scanner — upload files for OCR extraction
  scanDocuments: (
    batchId: string,
    files: {
      first_name: string;
      last_name: string;
      photo?: File;
      residence_card?: File;
      certificate?: File;
      student_card?: File;
      medical_cert?: File;
      chest_cert?: File;
    }
  ) => {
    const formData = new FormData();
    formData.append('first_name', files.first_name);
    formData.append('last_name', files.last_name);
    if (files.photo) formData.append('photo', files.photo);
    if (files.residence_card) formData.append('residence_card', files.residence_card);
    if (files.certificate) formData.append('certificate', files.certificate);
    if (files.student_card) formData.append('student_card', files.student_card);
    if (files.medical_cert) formData.append('medical_cert', files.medical_cert);
    if (files.chest_cert) formData.append('chest_cert', files.chest_cert);

    return api.post<{ animator_id: string; message: string; extracted_data: any }>(
      `/animator-registration/batches/${batchId}/scan`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      }
    );
  },

  // Single document upload/replace
  uploadDocument: (animatorId: string, docType: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ message: string; url: string }>(
      `/animator-registration/animators/${animatorId}/documents/${docType}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      }
    );
  },

  // Get scan URL for single document
  getScanSingleUrl: (animatorId: string, docType: string) =>
    api.get<{ scan_url: string; doc_type: string }>(
      `/animator-registration/animators/${animatorId}/scan-single/${docType}`
    ),

  // Ministry Sync — Import animators from ministry
  startMinistrySync: (limit?: number | null) =>
    api.post<{ message: string; batch_id?: string }>(
      '/animator-registration/sync-from-ministry/start',
      { limit: limit ?? null }
    ),

  getMinistrySyncStatus: () =>
    api.get<{
      is_running: boolean;
      progress: number;
      total: number;
      current_step: string;
      message: string;
      errors: string[];
      done: boolean;
      batch_id?: string;
    }>('/animator-registration/sync-from-ministry/status'),

  cancelMinistrySync: () =>
    api.post<{ message: string }>('/animator-registration/sync-from-ministry/cancel'),
};

export default animatorRegistrationApi;
