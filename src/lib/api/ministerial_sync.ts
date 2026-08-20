import api from './client';

// ============== Account Types ==============

export interface MinisterialAccount {
  id: string;
  label: string;
  wilaya_name: string;
  email: string;
  created_at: string;
}

export interface MinisterialAccountCreate {
  label: string;
  wilaya_name: string;
  email: string;
  password?: string;
}

export interface MinisterialAccountUpdate {
  label?: string;
  wilaya_name?: string;
  email?: string;
  password?: string;
}

// ============== Import History Types ==============

export interface MinisterialSyncImport {
  id: string;
  account_id: string;
  status: string;
  total_fetched: number;
  total_new: number;
  total_duplicates: number;
  total_errors: number;
  started_at: string | null;
  completed_at: string | null;
  created_by_name?: string;
}

export interface MinisterialSyncImportDetail extends MinisterialSyncImport {
  error_message: string | null;
  imported_child_ids: string[] | null;
  accounts_used: string[] | null;
  municipalities_filtered: string[] | null;
}

// ============== Stats Type ==============

export interface MinisterialSyncStats {
  total_imports: number;
  total_fetched: number;
  total_new: number;
  total_duplicates: number;
  total_errors: number;
}

// ============== Paginated Response ==============

export interface PaginatedImportResponse {
  items: MinisterialSyncImport[];
  total: number;
  page: number;
  page_size: number;
}

// ============== Registration Dashboard Types ==============

export interface ChildRegistrationDashboardItem {
  id: string;
  child_first_name: string;
  child_last_name: string;
  child_full_name?: string;
  gender?: string;
  birth_date?: string;
  residence_wilaya?: string;
  created_at?: string;
  status: string;
  has_member: boolean;
  youth_institution?: string;
  photo_url?: string;
  source?: string;
}

export interface RegistrationsStats {
  total_files: number;
  accepted_count: number;
  under_review_count: number;
  unguided_count: number;
  unguided_members: number;
}

export interface PaginatedRegistrationsResponse {
  items: ChildRegistrationDashboardItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============== API Methods ==============

export const ministerialSyncApi = {
  // Accounts CRUD
  getAccounts: () =>
    api.get<MinisterialAccount[]>('/ministerial-sync/accounts'),

  createAccount: (data: MinisterialAccountCreate) =>
    api.post<MinisterialAccount>('/ministerial-sync/accounts', data),

  updateAccount: (id: string, data: MinisterialAccountUpdate) =>
    api.put<MinisterialAccount>(`/ministerial-sync/accounts/${id}`, data),

  deleteAccount: (id: string) =>
    api.delete(`/ministerial-sync/accounts/${id}`),

  // Sync Operations
  triggerSync: (account_ids?: string[]) =>
    api.post<MinisterialSyncImport>('/ministerial-sync/sync', { account_ids }, { timeout: 120000 }),

  getImports: () =>
    api.get<PaginatedImportResponse>('/ministerial-sync/imports'),

  getImportDetail: (id: string) =>
    api.get<MinisterialSyncImportDetail>(`/ministerial-sync/imports/${id}`),

  getStats: () =>
    api.get<MinisterialSyncStats>('/ministerial-sync/stats'),

  // Registration Dashboard
  getRegistrations: (params?: { search?: string; status?: string; wilaya?: string; unguided_only?: boolean; without_parental_declaration?: boolean; page?: number; page_size?: number }) =>
    api.get<PaginatedRegistrationsResponse>('/ministerial-sync/registrations', { params }),

  getRegistrationsStats: () =>
    api.get<RegistrationsStats>('/ministerial-sync/registrations/stats'),

  // Year Management
  getYearsOverview: () =>
    api.get<YearsOverviewResponse>('/ministerial-sync/years'),

  getCurrentYear: () =>
    api.get<{ current_year: number }>('/ministerial-sync/years/current'),

  archiveYear: (new_year: number) =>
    api.post<ArchiveYearResponse>('/ministerial-sync/years/archive', { new_year }),

  getYearStats: (year: number) =>
    api.get<YearOverview>(`/ministerial-sync/years/${year}`),
};

// ============== Year Management Types ==============

export interface YearStats {
  batches_count: number;
  registrations_count: number;
  imports_count: number;
}

export interface YearOverview {
  year: number;
  is_archived: boolean;
  batches_count: number;
  registrations_count: number;
  imports_count: number;
}

export interface YearsOverviewResponse {
  current_year: number;
  current_stats: YearStats;
  archived_years: YearOverview[];
}

export interface ArchiveYearResponse {
  archived_year: number;
  new_year: number;
  archived_stats: YearStats;
}
