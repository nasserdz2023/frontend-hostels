import api, { PaginatedResponse, getApiBaseUrl } from './client';
import { Employee } from './employees';

// Types
export interface Wilaya {
    id: number;
    code: string;
    name_ar: string;
    name_fr: string;
}

export interface Municipality {
    id: string;
    name_ar: string;
    name_fr: string;
    code: string;
    wilaya_code: string;
    latitude?: number;
    longitude?: number;
    zoom?: number;
}

export interface Room {
    id: string;
    name: string;
    type: string;
    area?: number;
    capacity?: number;
    room_condition?: string;
    responsible_employee_id?: string;
    responsible_employee?: Employee;
}

export interface Field {
    id: string;
    name: string;
    type: string;
    surface_type?: string;
    dimensions?: string;
    has_lighting?: boolean;
    has_stands?: boolean;
    field_condition?: string;
    responsible_employee_id?: string;
    responsible_employee?: Employee;
}

export interface SportsFacilitySimple {
    id: string;
    name_ar: string;
    type: string;
    status: string;
    ownership?: string;
    surface_type?: string;
    notes?: string;
}

export interface YouthInstitution {
    id: string;
    name_ar: string;
    name_fr: string;
    name_en?: string;
    short_name?: string;
    type: InstitutionType;
    sector: 'YOUTH' | 'SPORTS' | 'ADMIN';
    municipality_id: string;
    municipality?: Municipality;
    address?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    email?: string;
    website?: string;
    social_media_links?: string;
    ministerial_code?: string;
    logo?: string;
    description?: string;
    legal_nature?: string;
    ownership?: string;
    material_status?: string;
    institutional_model?: string;
    rooms?: Room[];
    fields?: Field[];
    sports_facilities?: SportsFacilitySimple[];
    associations?: {
        id: string;
        name_ar: string;
        type: string;
        status: string;
    }[];
    is_active: boolean;
    is_public: boolean;
    established_date?: string;
    created_at: string;
    updated_at: string;
}

export interface InstitutionAccount {
    id: string;
    institution_id: string;
    platform_name: string;
    url?: string;
    username: string;
    password?: string; // Optional for security on reads
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateInstitutionAccountDTO {
    platform_name: string;
    url?: string;
    username: string;
    password?: string;
    notes?: string;
}

export type UpdateInstitutionAccountDTO = Partial<CreateInstitutionAccountDTO>;

export type InstitutionType =
    | 'ADMIN'
    | 'YOUTH_HOUSE'
    | 'YOUTH_HOSTEL'
    | 'SPORTS_COMPLEX'
    | 'MULTI_HALL'
    | 'MULTI_SPORTS_HALL'
    | 'SPECIALIZED_SPORTS_HALL'
    | 'SWIMMING_POOL'
    | 'SPORTS_FIELD'
    | 'SCIENTIFIC_LEISURE'
    | 'YOUTH_CAMP'
    | 'CULTURAL_CENTER'
    | 'YOUTH_CLUB'
    | 'MEDIATHEQUE'
    | 'ACCOMMODATION_WING';

export interface InstitutionFilters {
    type?: InstitutionType;
    sector?: string;
    municipality_id?: string;
    status?: string;
    search?: string;
    page?: number;
    size?: number;
    sort_by?: string;
    legal_nature?: string;
}

export interface CreateInstitutionDTO {
    name_ar: string;
    name_fr?: string;
    name_en?: string;
    type: InstitutionType;
    sector: 'YOUTH' | 'SPORTS' | 'ADMIN';
    municipality_id: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    email?: string;
    description?: string;
    legal_nature?: string;
    ownership?: string;
    material_status?: string;
    institutional_model?: string;
    is_public: boolean;
    ministerial_code?: string;
    established_date?: string;
}

export interface UpdateInstitutionDTO extends Partial<CreateInstitutionDTO> {
    status?: 'active' | 'inactive' | 'under_maintenance';
}

// API functions
export const institutionsApi = {
    /**
     * Get paginated list of institutions
     */
    async getAll(filters?: InstitutionFilters): Promise<PaginatedResponse<YouthInstitution>> {
        const params = new URLSearchParams();
        if (filters?.type) params.append('type', filters.type);
        if (filters?.sector) params.append('sector', filters.sector);
        if (filters?.municipality_id) params.append('municipality_id', filters.municipality_id);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.sort_by) params.append('sort_by', filters.sort_by);
        if (filters?.legal_nature) params.append('legal_nature', filters.legal_nature);

        const page = filters?.page || 1;
        const size = filters?.size || 10;
        const skip = (page - 1) * size;

        params.append('skip', skip.toString());
        params.append('limit', size.toString());

        const response = await api.get<YouthInstitution[]>(
            `/institutions/?${params.toString()}`
        );

        // Adapter: Backend returns Array, Frontend expects PaginatedResponse
        return {
            items: response.data,
            total: response.data.length,
            page: filters?.page || 1,
            size: filters?.size || 10,
            pages: Math.ceil(response.data.length / (filters?.size || 10))
        };
    },

    /**
     * Get public list of institutions
     */
    async getPublic(filters?: { sector?: string; size?: number }): Promise<PaginatedResponse<YouthInstitution>> {
        const params = new URLSearchParams();
        if (filters?.sector) params.append('sector', filters.sector);

        const size = filters?.size || 50;
        const skip = 0; // Public endpoint usually just returns a list, but let's stick to standard params if needed

        // Backend public endpoint: /institutions/public?skip=0&limit=50&sector=...
        params.append('limit', size.toString());
        params.append('skip', skip.toString());

        const response = await api.get<YouthInstitution[]>(
            `/institutions/public?${params.toString()}`
        );

        return {
            items: response.data,
            total: response.data.length,
            page: 1,
            size: size,
            pages: 1
        };
    },

    /**
     * Get single institution by ID
     */
    async getById(id: string): Promise<YouthInstitution> {
        const response = await api.get<YouthInstitution>(`/institutions/${id}`);
        return response.data;
    },

    /**
     * Create new institution
     */
    async create(data: CreateInstitutionDTO): Promise<YouthInstitution> {
        const response = await api.post<YouthInstitution>('/institutions/', data);
        return response.data;
    },

    /**
     * Update institution
     */
    async update(id: string, data: UpdateInstitutionDTO): Promise<YouthInstitution> {
        const response = await api.patch<YouthInstitution>(`/institutions/${id}`, data);
        return response.data;
    },

    /**
     * Delete institution
     */
    /**
     * Delete institution
     */
    async delete(id: string, permanent: boolean = false): Promise<void> {
        await api.delete(`/institutions/${id}`, {
            params: { permanent }
        });
    },

    // --- Institution Accounts API ---
    async getAccounts(institutionId: string): Promise<InstitutionAccount[]> {
        const response = await api.get<InstitutionAccount[]>(`/institutions/${institutionId}/accounts`);
        return response.data;
    },

    async createAccount(institutionId: string, data: CreateInstitutionAccountDTO): Promise<InstitutionAccount> {
        const response = await api.post<InstitutionAccount>(`/institutions/${institutionId}/accounts`, data);
        return response.data;
    },

    async updateAccount(accountId: string, data: UpdateInstitutionAccountDTO): Promise<InstitutionAccount> {
        const response = await api.put<InstitutionAccount>(`/institutions/accounts/${accountId}`, data);
        return response.data;
    },

    async deleteAccount(accountId: string): Promise<void> {
        await api.delete(`/institutions/accounts/${accountId}`);
    },

    /**
     * Get institution statistics (usage stats)
     */
    async getStats(id: string): Promise<{ employees: number; activities: number; presentations: number }> {
        const response = await api.get(`/institutions/${id}/stats`);
        return response.data;
    },

    /**
     * Get all wilayas
     */
    async getWilayas(): Promise<Wilaya[]> {
        const response = await api.get<Wilaya[]>('/wilayas');
        return response.data;
    },

    /**
     * Get municipalities (optionally filtered by wilaya)
     */
    async getMunicipalities(wilayaCode?: string, excludePositionKeyword?: string, excludeEmployeeId?: string): Promise<Municipality[]> {
        const params = new URLSearchParams();
        if (wilayaCode) params.append('wilaya_code', wilayaCode);
        if (excludePositionKeyword) params.append('exclude_position_keyword', excludePositionKeyword);
        if (excludeEmployeeId) params.append('exclude_employee_id', excludeEmployeeId);

        const response = await api.get<Municipality[]>(`/municipalities?${params.toString()}`);
        return response.data;
    },

    // Rooms
    async createRoom(institutionId: string, data: Partial<Room>): Promise<Room> {
        const response = await api.post<Room>(`/institutions/${institutionId}/rooms/`, data);
        return response.data;
    },

    async deleteRoom(roomId: string): Promise<void> {
        await api.delete(`/institutions/rooms/${roomId}/`);
    },

    async updateRoom(roomId: string, data: Partial<Room>): Promise<Room> {
        const response = await api.put<Room>(`/institutions/rooms/${roomId}`, data);
        return response.data;
    },

    // Fields
    async createField(institutionId: string, data: Partial<Field>): Promise<Field> {
        const response = await api.post<Field>(`/institutions/${institutionId}/fields/`, data);
        return response.data;
    },

    async deleteField(fieldId: string): Promise<void> {
        await api.delete(`/institutions/fields/${fieldId}/`);
    },

    async updateField(fieldId: string, data: Partial<Field>): Promise<Field> {
        const response = await api.put<Field>(`/institutions/fields/${fieldId}`, data);
        return response.data;
    },

    /**
     * Upload institution logo to MinIO
     * Stores in: institutions/logos/{uuid}.{ext}
     */
    async uploadLogo(file: File): Promise<{ url: string; filename: string; message: string; warning?: string }> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post<{ url: string; filename: string; message: string; warning?: string }>(
            '/institutions/upload/logo',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    /**
     * Upload institution gallery image to MinIO
     * Stores in: institutions/gallery/{uuid}.{ext}
     */
    async uploadGalleryImage(file: File): Promise<{ url: string; filename: string; message: string; warning?: string }> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post<{ url: string; filename: string; message: string; warning?: string }>(
            '/institutions/upload/gallery',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    // Excel Export/Import

    /**
     * Export institutions to Excel
     * @param fields - Array of field keys to export
     * @param filters - Optional filters to apply
     */
    async exportToExcel(fields: string[], filters?: InstitutionFilters): Promise<void> {
        const params = new URLSearchParams();
        if (fields.length > 0) {
            params.append('fields', fields.join(','));
        }
        if (filters?.search) params.append('search', filters.search);
        if (filters?.sector) params.append('sector', filters.sector);
        if (filters?.type) params.append('type', filters.type);

        const response = await api.get(`/institutions/export/excel?${params.toString()}`, {
            responseType: 'blob',
        });

        // Trigger download
        const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'institutions.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },

    /**
     * Download empty Excel template for import
     */
    async downloadTemplate(): Promise<void> {
        const response = await api.get('/institutions/export/template', {
            responseType: 'blob',
        });

        // Trigger download
        const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'institutions_template.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },

    /**
     * Import institutions from Excel file
     * @param file - Excel file to import
     * @param updateExisting - Whether to update existing records
     */
    async importFromExcel(file: File, updateExisting: boolean = false): Promise<{
        success: boolean;
        created: number;
        updated: number;
        errors: string[];
        total_errors: number;
        message: string;
    }> {
        const formData = new FormData();
        formData.append('file', file);

        const params = new URLSearchParams();
        params.append('update_existing', updateExisting.toString());

        const response = await api.post<{
            success: boolean;
            created: number;
            updated: number;
            errors: string[];
            total_errors: number;
            message: string;
        }>(
            `/institutions/import/excel?${params.toString()}`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },
};

// Institution type labels
export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, { ar: string; fr: string; en: string }> = {
    ADMIN: { ar: 'إدارة', fr: 'Administration', en: 'Administration' },
    YOUTH_HOUSE: { ar: 'دار الشباب', fr: 'Maison de Jeunes', en: 'Youth House' },
    YOUTH_HOSTEL: { ar: 'بيت شباب', fr: 'Auberge de Jeunes', en: 'Youth Hostel' },
    SPORTS_COMPLEX: { ar: 'مركب رياضي جواري', fr: 'Complexe Sportif de Proximité', en: 'Neighborhood Sports Complex' },
    MULTI_HALL: { ar: 'قاعة متعددة النشاطات', fr: 'Salle Polyvalente', en: 'Multi-Activity Hall' },
    MULTI_SPORTS_HALL: { ar: 'قاعة متعددة الرياضات', fr: 'Salle Omnisports', en: 'Multi-Sports Hall' },
    SPECIALIZED_SPORTS_HALL: { ar: 'قاعة متخصصة في الرياضة', fr: 'Salle de Sport Spécialisée', en: 'Specialized Sports Hall' },
    SWIMMING_POOL: { ar: 'مسبح', fr: 'Piscine', en: 'Swimming Pool' },
    SPORTS_FIELD: { ar: 'ملعب', fr: 'Terrain de Sport', en: 'Sports Field' },
    SCIENTIFIC_LEISURE: { ar: 'مركز الترفيه العلمي', fr: 'Centre de Loisirs Scientifiques', en: 'Scientific Leisure Center' },
    YOUTH_CAMP: { ar: 'مخيم الشباب', fr: 'Camp de Jeunes', en: 'Youth Camp' },
    CULTURAL_CENTER: { ar: 'مركز ثقافي', fr: 'Centre Culturel', en: 'Cultural Center' },
    YOUTH_CLUB: { ar: 'نادي الشباب', fr: 'Club de Jeunesse', en: 'Youth Club' },
    MEDIATHEQUE: { ar: 'ميدياتك', fr: 'Médiathèque', en: 'Mediatheque' },
    ACCOMMODATION_WING: { ar: 'جناح الايواء', fr: "Aile d'Hébergement", en: 'Accommodation Wing' },
};

// Sector labels
export const INSTITUTION_SECTOR_LABELS = {
    YOUTH: { ar: 'شباب', fr: 'Jeunesse', en: 'Youth' },
    SPORTS: { ar: 'رياضة', fr: 'Sport', en: 'Sports' },
    ADMIN: { ar: 'إدارة', fr: 'Administration', en: 'Administration' },
    UNCATEGORIZED: { ar: 'غير مصنف', fr: 'Non Classifié', en: 'Uncategorized' },
};

// Mapping institution types to their sectors (for filtering and other uses)
export const INSTITUTION_TYPE_SECTOR_MAP: Record<InstitutionType, 'YOUTH' | 'SPORTS' | 'ADMIN' | 'UNCATEGORIZED'> = {
    ADMIN: 'ADMIN',
    YOUTH_HOUSE: 'YOUTH',
    YOUTH_HOSTEL: 'YOUTH',
    SPORTS_COMPLEX: 'YOUTH',
    MULTI_HALL: 'YOUTH',
    MULTI_SPORTS_HALL: 'SPORTS',
    SPECIALIZED_SPORTS_HALL: 'SPORTS',
    SWIMMING_POOL: 'SPORTS',
    SPORTS_FIELD: 'SPORTS',
    SCIENTIFIC_LEISURE: 'UNCATEGORIZED',
    YOUTH_CAMP: 'YOUTH',
    CULTURAL_CENTER: 'UNCATEGORIZED',
    YOUTH_CLUB: 'YOUTH',
    MEDIATHEQUE: 'YOUTH',
    ACCOMMODATION_WING: 'YOUTH',
};

// Helper functions for filtering
export const getTypesForSector = (sector: 'YOUTH' | 'SPORTS' | 'ADMIN' | 'UNCATEGORIZED'): InstitutionType[] => {
    return (Object.entries(INSTITUTION_TYPE_SECTOR_MAP) as [InstitutionType, string][])
        .filter(([_, s]) => s === sector)
        .map(([type, _]) => type);
};

export const getSectorForType = (type: InstitutionType): 'YOUTH' | 'SPORTS' | 'ADMIN' | 'UNCATEGORIZED' => {
    return INSTITUTION_TYPE_SECTOR_MAP[type] || 'YOUTH';
};

// Status labels
export const INSTITUTION_STATUS_LABELS = {
    true: { ar: 'نشط', fr: 'Actif', variant: 'success' },
    false: { ar: 'غير نشط', fr: 'Inactif', variant: 'destructive' },
};

// Legal Nature labels
export const LEGAL_NATURE_LABELS: Record<string, { ar: string; fr: string; en: string }> = {
    ATTACHED: { ar: 'ملحقة', fr: 'Attaché', en: 'Attached' },
    NOT_ATTACHED: { ar: 'غير ملحقة', fr: 'Non attaché', en: 'Not Attached' },
};

// Legal Nature labels for grouping (same as LEGAL_NATURE_LABELS but for reuse)
export const LEGAL_NATURE_GROUP_LABELS: Record<string, { ar: string; fr: string; en: string }> = {
    ATTACHED: { ar: 'ملحقة', fr: 'Attaché', en: 'Attached' },
    NOT_ATTACHED: { ar: 'غير ملحقة', fr: 'Non attaché', en: 'Not Attached' },
};

// Ownership labels
export const OWNERSHIP_LABELS: Record<string, { ar: string; fr: string; en: string }> = {
    STATE: { ar: 'أملاك دولة', fr: 'Domaine de l\'État', en: 'State Property' },
    MUNICIPAL: { ar: 'أملاك بلدية', fr: 'Domaine communal', en: 'Municipal Property' },
    WILLAYA: { ar: 'أملاك ولاية', fr: 'Domaine de wilaya', en: 'Wilaya Property' },
    SECTORAL: { ar: 'قطاعية', fr: 'Sectoriel', en: 'Sectoral' },
    PRIVATE: { ar: 'ملكية خاصة', fr: 'Propriété privée', en: 'Private Property' },
    MIXED: { ar: 'مختلط', fr: 'Mixte', en: 'Mixed' },
};

// Material Status labels
export const MATERIAL_STATUS_LABELS: Record<string, { ar: string; fr: string; en: string }> = {
    GOOD: { ar: 'جيدة', fr: 'Bon état', en: 'Good' },
    FAIR: { ar: 'متوسطة', fr: 'État moyen', en: 'Fair' },
    POOR: { ar: 'سيئة', fr: 'Mauvais état', en: 'Poor' },
    UNDER_CONSTRUCTION: { ar: 'قيد الإنجاز', fr: 'En construction', en: 'Under Construction' },
    DILAPIDATED: { ar: 'مهترئة', fr: 'Délabré', en: 'Dilapidated' },
    CLOSED: { ar: 'مغلقة', fr: 'Fermé', en: 'Closed' },
};

// Institutional Model labels
export const INSTITUTIONAL_MODEL_LABELS: Record<string, { ar: string; fr: string; en: string }> = {
    TYPE_01: { ar: 'Type 01', fr: 'Type 01', en: 'Type 01' },
    TYPE_02: { ar: 'Type 02', fr: 'Type 02', en: 'Type 02' },
    TYPE_03: { ar: 'Type 03', fr: 'Type 03', en: 'Type 03' },
    AJ50_LITS: { ar: 'AJ50 lits', fr: 'AJ50 lits', en: 'AJ50 lits' },
};
