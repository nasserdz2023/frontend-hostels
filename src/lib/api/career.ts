import api from './client';

// Types
export interface CareerEvent {
    id: string;
    employee_id: string;
    employee_name?: string;
    employee_profile_photo?: string;
    event_type: 'HIRE' | 'CONFIRMATION' | 'PROMOTION' | 'TRANSFER' | 'POSITION_CHANGE' | 'GRADE_CHANGE' | 'DEPARTMENT_CHANGE' | 'STATUS_CHANGE' | 'RETIREMENT' | 'END_OF_SERVICE';
    event_date: string;

    old_grade_id?: string;
    new_grade_id?: string;
    old_position_id?: string;
    new_position_id?: string;
    old_institution_id?: string;
    new_institution_id?: string;
    old_department_id?: string;
    new_department_id?: string;
    old_status?: string;
    new_status?: string;

    notes?: string;
    document_reference?: string;

    // Legal fields
    controller_visa?: string | null;
    controller_visa_date?: string | null;
    decision_date?: string | null;
    issuing_authority?: string | null;
    legal_basis?: string | null;

    // Expanded relationships
    old_grade?: { id: string; name_ar: string };
    new_grade?: { id: string; name_ar: string };
    old_position?: { id: string; name_ar: string };
    new_position?: { id: string; name_ar: string };
    old_institution?: { id: string; name_ar: string };
    new_institution?: { id: string; name_ar: string };
    old_department?: { id: string; name_ar: string };
    new_department?: { id: string; name_ar: string };

    document_path?: string | null;
    document_filename?: string | null;

    created_by_id?: string;
    created_at?: string;
}

export interface CreateCareerEventDTO {
    event_type: string;
    event_date: string;
    old_grade_id?: string;
    new_grade_id?: string;
    old_position_id?: string;
    new_position_id?: string;
    old_institution_id?: string;
    new_institution_id?: string;
    old_department_id?: string;
    new_department_id?: string;
    old_status?: string;
    new_status?: string;
    notes?: string;
    document_reference?: string;

    // Legal fields
    controller_visa?: string | null;
    controller_visa_date?: string | null;
    decision_date?: string | null;
    issuing_authority?: string | null;
    legal_basis?: string | null;
}

// Types for paginated list
export interface CareerEventFilters {
    employee_id?: string;
    event_type?: string;
    date_from?: string;
    date_to?: string;
    skip?: number;
    limit?: number;
}

export interface CareerEventDeleteResponse {
    message: string;
}

// API Functions
export const careerApi = {
    /**
     * Get all career events with pagination and filters
     */
    async getAll(params?: CareerEventFilters): Promise<{ items: CareerEvent[]; total: number }> {
        const sp = new URLSearchParams();
        if (params?.employee_id) sp.append('employee_id', params.employee_id);
        if (params?.event_type) sp.append('event_type', params.event_type);
        if (params?.date_from) sp.append('date_from', params.date_from);
        if (params?.date_to) sp.append('date_to', params.date_to);
        if (params?.skip !== undefined) sp.append('skip', String(params.skip));
        if (params?.limit !== undefined) sp.append('limit', String(params.limit));
        const res = await api.get<{ items: CareerEvent[]; total: number }>(
            `/employees/career-history?${sp.toString()}`
        );
        return res.data;
    },

    /**
     * Get career history for an employee
     */
    async getCareerHistory(employeeId: string): Promise<CareerEvent[]> {
        const response = await api.get<CareerEvent[]>(`/employees/${employeeId}/career-history`);
        return response.data;
    },

    /**
     * Create a new career event
     */
    async createCareerEvent(employeeId: string, data: CreateCareerEventDTO): Promise<CareerEvent> {
        const response = await api.post<CareerEvent>(`/employees/${employeeId}/career-history`, data);
        return response.data;
    },

    /**
     * Delete a career event by employee ID
     */
    async deleteCareerEvent(employeeId: string, eventId: string): Promise<void> {
        await api.delete(`/employees/${employeeId}/career-history/${eventId}`);
    },

    /**
     * Delete a career event by event ID (global)
     */
    async delete(eventId: string): Promise<CareerEventDeleteResponse> {
        const res = await api.delete<CareerEventDeleteResponse>(`/employees/career-history/${eventId}`);
        return res.data;
    },

    /**
     * Update a career event
     */
    async updateCareerEvent(employeeId: string, eventId: string, data: Partial<CreateCareerEventDTO>): Promise<CareerEvent> {
        const response = await api.patch<CareerEvent>(`/employees/${employeeId}/career-history/${eventId}`, data);
        return response.data;
    },

    /**
     * Upload a decision document for a career event
     */
    async uploadDocument(employeeId: string, eventId: string, file: File): Promise<CareerEvent> {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post<CareerEvent>(
            `/employees/${employeeId}/career-history/${eventId}/document`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return res.data;
    },

    /**
     * Delete the decision document for a career event
     */
    async deleteDocument(employeeId: string, eventId: string): Promise<CareerEvent> {
        const res = await api.delete<CareerEvent>(
            `/employees/${employeeId}/career-history/${eventId}/document`
        );
        return res.data;
    }
};

// Event type labels in Arabic
export const EVENT_TYPE_LABELS: Record<string, string> = {
    HIRE: 'توظيف',
    CONFIRMATION: 'ترسيم',
    PROMOTION: 'ترقية',
    TRANSFER: 'نقل',
    POSITION_CHANGE: 'تغيير منصب',
    GRADE_CHANGE: 'تغيير رتبة',
    DEPARTMENT_CHANGE: 'تغيير مصلحة',
    STATUS_CHANGE: 'تغيير وضعية',
    RETIREMENT: 'تقاعد',
    END_OF_SERVICE: 'إنهاء الخدمة'
};

// Event type icon names (Lucide)
export const EVENT_TYPE_ICONS: Record<string, string> = {
    HIRE: 'UserPlus',
    CONFIRMATION: 'BadgeCheck',
    PROMOTION: 'ArrowUp',
    TRANSFER: 'ArrowRightLeft',
    POSITION_CHANGE: 'Briefcase',
    GRADE_CHANGE: 'ChevronUp',
    DEPARTMENT_CHANGE: 'GitBranch',
    STATUS_CHANGE: 'ToggleLeft',
    RETIREMENT: 'Sunset',
    END_OF_SERVICE: 'LogOut'
};

// Event type colors
export const EVENT_TYPE_COLORS: Record<string, string> = {
    HIRE: 'bg-emerald-500',
    CONFIRMATION: 'bg-teal-500',
    PROMOTION: 'bg-blue-500',
    TRANSFER: 'bg-purple-500',
    POSITION_CHANGE: 'bg-orange-500',
    GRADE_CHANGE: 'bg-amber-500',
    DEPARTMENT_CHANGE: 'bg-indigo-500',
    STATUS_CHANGE: 'bg-slate-500',
    RETIREMENT: 'bg-red-500',
    END_OF_SERVICE: 'bg-gray-600'
};
