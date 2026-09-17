import api, { PaginatedResponse, getApiBaseUrl } from './client';

// ============== Types ==============

export interface Association {
    id: string;
    name_ar: string;
    name_fr?: string;
    type: 'sports_club' | 'sports_association' | 'youth_association' | 'neighborhood_committee' | 'league' | 'other';
    sport_type?: string;
    municipality_id?: string;
    institution_id?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;

    president_name?: string;
    president_phone?: string;
    president_email?: string;

    approval_number?: string;
    approval_date?: string;
    expiry_date?: string;
    renewal_number?: string;
    renewal_date?: string;

    status: 'active' | 'inactive' | 'under_renewal' | 'under_study' | 'not_renewed' | 'end_of_approval' | 'frozen' | 'expired' | 'dissolved';
    member_count: number;
    notes?: string;

    // Relations
    municipality?: {
        id: string;
        name_ar: string;
        name_fr?: string;
    };
    institution?: {
        id: string;
        name_ar: string;
        name_fr?: string;
    };
    members: AssociationMember[];
    documents: AssociationDocument[];

    created_at: string;
    updated_at: string;
}

export interface AssociationCreate {
    name_ar: string;
    name_fr?: string;
    type: string;
    sport_type?: string;
    municipality_id?: string;
    institution_id?: string;
    address?: string;
    president_name?: string;
    president_phone?: string;
    president_email?: string;
    approval_number?: string;
    approval_date?: string;
    status?: string;
    member_count?: number;
    notes?: string;
    [key: string]: any; // Allow flexibility
}

export type AssociationUpdate = Partial<AssociationCreate>;

export interface AssociationMember {
    id: string;
    association_id: string;
    fullname_ar: string;
    fullname_fr?: string;
    role?: string;
    phone?: string;
    email?: string;
    occupation?: string;
    created_at: string;
}

export interface AssociationMemberCreate {
    fullname_ar: string;
    fullname_fr?: string;
    role?: string;
    phone?: string;
    email?: string;
    occupation?: string;
}

export interface AssociationDocument {
    id: string;
    association_id: string;
    name: string;
    file_path: string;
    file_size?: number;
    mime_type?: string;
    uploaded_at: string;
}

export interface AssociationFilters {
    skip?: number;
    limit?: number;
    search?: string;
    type?: string;
    municipality_id?: string;
    institution_id?: string;
    status?: string;
    fields?: string;
}

// ============== API Functions ==============

export const associationsApi = {
    // CRUD Operations
    getAll: async (params: AssociationFilters = {}): Promise<PaginatedResponse<Association>> => {
        const response = await api.get<PaginatedResponse<Association>>('/associations', { params });
        return response.data;
    },

    getOne: async (id: string): Promise<Association> => {
        const response = await api.get<Association>(`/associations/${id}`);
        return response.data;
    },

    create: async (data: AssociationCreate | FormData): Promise<Association> => {
        const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
        const response = await api.post<Association>('/associations', data, { headers });
        return response.data;
    },

    update: async (id: string, data: AssociationUpdate | FormData): Promise<Association> => {
        const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
        const response = await api.put<Association>(`/associations/${id}`, data, { headers });
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/associations/${id}`);
    },

    // Members Sub-resource
    addMember: async (id: string, data: AssociationMemberCreate): Promise<AssociationMember> => {
        const response = await api.post<AssociationMember>(`/associations/${id}/members`, data);
        return response.data;
    },

    deleteMember: async (memberId: string): Promise<void> => {
        await api.delete(`/associations/members/${memberId}`);
    },

    // Documents Sub-resource
    addDocument: async (id: string, file: File, name?: string): Promise<AssociationDocument> => {
        const formData = new FormData();
        formData.append('file', file);
        if (name) formData.append('name', name);

        const response = await api.post<AssociationDocument>(`/associations/${id}/documents`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    deleteDocument: async (documentId: string): Promise<void> => {
        await api.delete(`/associations/documents/${documentId}`);
    },

    // Import/Export
    exportToExcel: async (filters: AssociationFilters = {}): Promise<Blob> => {
        const response = await api.get('/associations/export/excel', {
            params: filters,
            responseType: 'blob'
        });
        return response.data;
    },

    downloadTemplate: async (): Promise<Blob> => {
        const response = await api.get('/associations/export/template', {
            responseType: 'blob'
        });
        return response.data;
    },

    importFromExcel: async (file: File, updateExisting: boolean = false): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('update_existing', String(updateExisting));

        const response = await api.post('/associations/import/excel', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
};


// ============== SPORTS ORGANIZATIONS TYPES ==============

export type EventType = 'competition' | 'tournament' | 'championship' | 'training_camp' | 'friendly' | 'exhibition' | 'other';
export type EventStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
export type PersonnelType = 'referee' | 'coach';
export type PersonnelClassification = 'local' | 'regional' | 'national' | 'international';
export type ProgramType = 'monthly' | 'quarterly' | 'annual';

export interface SportsEvent {
    id: string;
    organizer_id: string;
    title_ar: string;
    title_fr?: string;
    event_type: EventType;
    sport_discipline?: string;
    description?: string;
    start_date: string;
    end_date: string;
    location?: string;
    municipality_id?: string;
    expected_participants?: number;
    expected_teams?: number;
    estimated_budget?: number;
    status: EventStatus;
    submitted_at?: string;
    approved_by_id?: string;
    approved_at?: string;
    rejection_reason?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface SportsEventCreate {
    organizer_id: string;
    title_ar: string;
    title_fr?: string;
    event_type: EventType;
    sport_discipline?: string;
    description?: string;
    start_date: string;
    end_date: string;
    location?: string;
    municipality_id?: string;
    expected_participants?: number;
    expected_teams?: number;
    estimated_budget?: number;
    notes?: string;
}

export interface RefereeCoach {
    id: string;
    fullname_ar: string;
    fullname_fr?: string;
    birth_date?: string;
    phone?: string;
    email?: string;
    personnel_type: PersonnelType;
    classification: PersonnelClassification;
    sport_discipline: string;
    license_number?: string;
    license_year?: number;
    license_expiry?: string;
    league_id: string;
    is_active: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface RefereeCoachCreate {
    fullname_ar: string;
    fullname_fr?: string;
    birth_date?: string;
    phone?: string;
    email?: string;
    personnel_type: PersonnelType;
    classification?: PersonnelClassification;
    sport_discipline: string;
    license_number?: string;
    license_year?: number;
    license_expiry?: string;
    league_id: string;
    notes?: string;
}

export interface ActivityProgram {
    id: string;
    association_id: string;
    program_type: ProgramType;
    year: number;
    month?: number;
    quarter?: number;
    title?: string;
    description?: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface ActivityProgramCreate {
    association_id: string;
    program_type: ProgramType;
    year: number;
    month?: number;
    quarter?: number;
    title?: string;
    description?: string;
}


// ============== SPORTS EVENTS API ==============

export const sportsEventsApi = {
    getAll: async (params: { organizer_id?: string; status?: string; event_type?: string; skip?: number; limit?: number } = {}): Promise<SportsEventListResponse> => {
        const response = await api.get<SportsEventListResponse>('/associations/sports-events/', { params });
        return response.data;
    },

    getOne: async (id: string): Promise<SportsEvent> => {
        const response = await api.get<SportsEvent>(`/associations/sports-events/${id}`);
        return response.data;
    },

    create: async (data: SportsEventCreate): Promise<SportsEvent> => {
        const response = await api.post<SportsEvent>('/associations/sports-events/', data);
        return response.data;
    },

    update: async (id: string, data: Partial<SportsEventCreate>): Promise<SportsEvent> => {
        const response = await api.put<SportsEvent>(`/associations/sports-events/${id}`, data);
        return response.data;
    },

    submit: async (id: string): Promise<void> => {
        await api.post(`/associations/sports-events/${id}/submit`);
    },

    approve: async (id: string): Promise<void> => {
        await api.post(`/associations/sports-events/${id}/approve`);
    },

    reject: async (id: string, reason: string): Promise<void> => {
        await api.post(`/associations/sports-events/${id}/reject`, null, { params: { reason } });
    }
};


// ============== REFEREES & COACHES API ==============

export const refereesCoachesApi = {
    getAll: async (params: { league_id?: string; personnel_type?: string; sport_discipline?: string } = {}): Promise<RefereeCoach[]> => {
        const response = await api.get<RefereeCoach[]>('/associations/referees-coaches/', { params });
        return response.data;
    },

    create: async (data: RefereeCoachCreate): Promise<RefereeCoach> => {
        const response = await api.post<RefereeCoach>('/associations/referees-coaches/', data);
        return response.data;
    },

    update: async (id: string, data: Partial<RefereeCoachCreate>): Promise<RefereeCoach> => {
        const response = await api.put<RefereeCoach>(`/associations/referees-coaches/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/associations/referees-coaches/${id}`);
    }
};


// ============== ACTIVITY PROGRAMS API ==============

export const activityProgramsApi = {
    getAll: async (params: { association_id?: string; program_type?: string; year?: number } = {}): Promise<ActivityProgram[]> => {
        const response = await api.get<ActivityProgram[]>('/associations/activity-programs/', { params });
        return response.data;
    },

    create: async (data: ActivityProgramCreate): Promise<ActivityProgram> => {
        const response = await api.post<ActivityProgram>('/associations/activity-programs/', data);
        return response.data;
    },

    update: async (id: string, data: Partial<ActivityProgramCreate & { status?: string }>): Promise<ActivityProgram> => {
        const response = await api.put<ActivityProgram>(`/associations/activity-programs/${id}`, data);
        return response.data;
    }
};

// Paginated response for sports events
export interface SportsEventListResponse {
    items: SportsEvent[];
    total: number;
    page: number;
    size: number;
    pages: number;
}
