import api, { PaginatedResponse } from './client';

// Daira types
export interface Daira {
    id: string;
    code: string;
    wilaya_code: string;
    name_ar: string;
    name_en: string;
    name_fr: string;
    name_ber?: string;
    latitude?: number;
    longitude?: number;
    municipality_count?: number;
}

// Types matches Backend Schemas
export interface DepartmentType {
    id: string;
    code: string;
    name_ar: string;
    name_en?: string;
    name_fr?: string;
    is_active: boolean;
    is_archived?: boolean;
    wilaya_choice?: 'PENDING' | 'MSILA' | 'BOU_SAADA';
    display_order: number;
}

export interface OfficeType {
    id: string;
    code: string;
    name_ar: string;
    name_en?: string;
    name_fr?: string;
    department_id: string;
    is_active: boolean;
    is_archived?: boolean;
    wilaya_choice?: 'PENDING' | 'MSILA' | 'BOU_SAADA';
    display_order: number;
}

export interface Reference {
    id: string;
    name_ar: string;
    name_en: string;
    name_fr: string;
}

export interface GradeGroup extends Reference {
    display_order: number;
}

export interface Grade extends Reference {
    code: string;
    level?: number;
    group_id?: string;
    group?: GradeGroup;
    is_full_time?: boolean;
}

export interface CreateGradeDTO {
    code?: string;
    name_ar: string;
    name_en?: string;
    name_fr?: string;
    level?: number;
    group_id?: string;
    is_full_time?: boolean;
}

export interface UpdateGradeDTO extends Partial<CreateGradeDTO> { }

export interface Position extends Reference {
    code: string;
    is_senior: boolean;
    display_order?: number;
    position_type?: string;
}

export interface EducationLevel extends Reference {
    code: string;
    level_order: number;
    category?: string;
}

export interface Employee {
    id: string;
    firstname_ar: string;
    lastname_ar: string;
    firstname_fr?: string;
    lastname_fr?: string;
    father_name?: string;
    mother_fullname?: string;
    national_id?: string;
    phone?: string;
    mobile?: string;
    email?: string;
    address?: string;
    city?: string;

    // Personal
    birth_date?: string;
    is_birth_date_estimated?: boolean;
    birth_place?: string;
    birth_wilaya_code?: string;
    birth_wilaya?: { code: string; name_ar: string };
    birth_municipality_id?: string;
    birth_municipality?: { id: string; name_ar: string };
    gender?: string;
    marital_status?: string;
    children_count?: number;
    profile_photo?: string;

    // Additional Personal Info
    blood_type?: string;
    military_service_status?: string;
    military_service_number?: string;

    // Family Info
    spouse_name?: string;
    spouse_profession?: string;
    spouse_employer?: string;
    spouse_employee_id?: string;

    // Job
    employee_number?: string;

    grade_id?: string;
    grade?: Grade; // Expanded

    position_id?: string;
    position?: Position; // Expanded

    department_id?: string;
    department?: DepartmentType; // Expanded
    office_id?: string;
    office?: OfficeType; // Expanded
    original_administration_type?: string;
    original_department?: string;
    institution_id?: string;
    institution?: {
        id: string;
        name_ar: string;
        name_fr?: string;
        short_name?: string;
        municipality?: { id: string; name_ar: string; name_fr?: string; daira_code?: string };
    };

    // Location
    work_location_type?: string;
    work_district_id?: string;
    work_municipality_id?: string;
    work_district?: { id: string; name_ar: string; name_fr?: string };
    work_municipality?: { id: string; name_ar: string; name_fr?: string; district_id?: string; daira_code?: string };

    secondary_position?: { id: string; code: string; name_ar: string; name_fr?: string; is_senior: boolean; position_type?: string };
    secondary_municipality?: { id: string; name_ar: string; name_fr?: string; daira_code?: string };
    secondary_institution?: { id: string; name_ar: string; name_fr?: string; daira_code?: string };
    secondary_district?: { id: string; name_ar: string; name_fr?: string };
    secondary_department_id?: string;
    secondary_office_id?: string;
    secondary_department?: DepartmentType;
    secondary_office?: OfficeType;

    // Legal Position Status
    legal_position?: 'ACTIVE' | 'SECONDMENT' | 'AVAILABILITY' | 'MISE_A_DISPOSITION' | 'DETACHMENT' | 'MILITARY_SERVICE' | 'OUT_OF_FRAME' | 'RETIRED' | 'SUSPENDED';
    legal_position_start?: string;
    legal_position_destination?: string;

    // Status (New standard)
    work_status?: string;
    work_status_date?: string;
    work_status_reason?: string;

    appointment_type?: string;

    rank?: string;
    employment_type?: string;
    hire_date?: string;
    confirmation_date?: string;
    last_promotion_date?: string;

    // Emergency
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relationship?: string;

    // Education
    hiring_education_level_id?: string;
    hiring_education_level?: EducationLevel;
    certificates?: any[];
    experiences?: any[];
    languages?: any[];

    // Bank
    bank_name?: string;
    bank_account?: string;
    social_security_number?: string;

    user_id?: string;
    is_active: boolean;
    is_archived?: boolean;
    wilaya_choice?: 'PENDING' | 'MSILA' | 'BOU_SAADA';
    created_at: string;
    email_sent?: boolean;

    // Wish document
    wish_document_path?: string | null;
    wish_document_name?: string | null;
    wish_document_url?: string | null;
    master_pdf_id?: string | null;
    page_number?: number | null;
}

export interface MasterPDF {
    id: string;
    original_filename: string;
    file_path: string;
    file_size?: number;
    total_pages?: number;
    uploaded_by_id?: string;
    notes?: string;
    created_at: string;
    public_url?: string;
}

export interface EmployeeFilters {
    search?: string;
    department?: string | string[];
    institution_id?: string | string[];
    grade_group_id?: string | string[];
    grade_id?: string | string[];
    position_id?: string | string[];
    office_id?: string | string[];
    gender?: 'MALE' | 'FEMALE';
    sector?: 'youth' | 'sports';
    position_type?: string | string[];
    original_admin?: string | string[];
    daira_code?: string | string[];
    municipality_id?: string | string[];
    legal_position?: string;
    is_active?: boolean;
    include_archived?: boolean;
    page?: number;
    size?: number;
    sort_by?: 'newest' | 'oldest' | 'alphabetical' | 'employee_number' | 'age_desc' | 'age_asc' | 'position' | 'grade';
    exclude_position_codes?: string;
}

export interface CreateEmployeeDTO {
    firstname_ar: string;
    lastname_ar: string;
    firstname_fr?: string;
    lastname_fr?: string;
    national_id?: string;
    phone?: string;
    mobile?: string;
    email?: string;
    address?: string;
    city?: string;

    birth_date?: string;
    birth_place?: string;
    gender?: string;
    marital_status?: string;
    profile_photo?: string;

    employee_number?: string;
    grade_id?: string;
    position_id?: string;
    department_id?: string;
    original_department?: string;
    institution_id?: string;

    // Location
    work_location_type?: string;
    work_district_id?: string;
    work_municipality_id?: string;

    // Status
    work_status?: string;
    work_status_date?: string;
    work_status_reason?: string;

    appointment_type?: string;

    rank?: string;
    employment_type?: string;
    hire_date?: string;
    confirmation_date?: string;
    last_promotion_date?: string;

    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relationship?: string;

    bank_name?: string;
    bank_account?: string;
    social_security_number?: string;

    create_user_account?: boolean;
}

export interface UpdateEmployeeDTO extends Partial<CreateEmployeeDTO> {
    is_active?: boolean;
}

// API functions
export const employeesApi = {
    /**
     * Get paginated list of employees
     */
    async getAll(filters?: EmployeeFilters): Promise<PaginatedResponse<Employee>> {
        const params = new URLSearchParams();
        if (filters?.search) params.append('search', filters.search);
        if (filters?.department) params.append('department', Array.isArray(filters.department) ? filters.department.join(',') : filters.department);
        if (filters?.institution_id) params.append('institution_id', Array.isArray(filters.institution_id) ? filters.institution_id.join(',') : filters.institution_id);
        if (filters?.grade_group_id) params.append('grade_group_id', Array.isArray(filters.grade_group_id) ? filters.grade_group_id.join(',') : filters.grade_group_id);
        if (filters?.grade_id) params.append('grade_id', Array.isArray(filters.grade_id) ? filters.grade_id.join(',') : filters.grade_id);
        if (filters?.position_id) params.append('position_id', Array.isArray(filters.position_id) ? filters.position_id.join(',') : filters.position_id);
        if (filters?.office_id) params.append('office_id', Array.isArray(filters.office_id) ? filters.office_id.join(',') : filters.office_id);

        if (filters?.gender) params.append('gender', filters.gender);
        if (filters?.sector) params.append('sector', filters.sector);

        if (filters?.position_type) params.append('position_type', Array.isArray(filters.position_type) ? filters.position_type.join(',') : filters.position_type);
        if (filters?.original_admin) params.append('original_admin', Array.isArray(filters.original_admin) ? filters.original_admin.join(',') : filters.original_admin);
        if (filters?.daira_code) params.append('daira_code', Array.isArray(filters.daira_code) ? filters.daira_code.join(',') : filters.daira_code);
        if (filters?.municipality_id) params.append('municipality_id', Array.isArray(filters.municipality_id) ? filters.municipality_id.join(',') : filters.municipality_id);
        if (filters?.legal_position) params.append('legal_position', filters.legal_position);

        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.size) params.append('size', filters.size.toString());
        if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
        if (filters?.sort_by) params.append('sort_by', filters.sort_by);
        if (filters?.include_archived !== undefined) params.append('include_archived', String(filters.include_archived));

        const response = await api.get<any>(
            `/employees?${params.toString()}`
        );

        // Handle Backend returning Array instead of Paginated Object
        if (Array.isArray(response.data)) {
            return {
                items: response.data,
                total: response.data.length,
                page: filters?.page || 1,
                size: filters?.size || 10
            };
        }

        return response.data;
    },

    /**
     * Get single employee by ID
     */
    async getById(id: string): Promise<Employee> {
        const response = await api.get<Employee>(`/employees/${id}`);
        return response.data;
    },

    /**
     * Create new employee
     */
    async create(data: CreateEmployeeDTO): Promise<Employee> {
        const response = await api.post<Employee>('/employees', data);
        return response.data;
    },

    /**
     * Update employee
     */
    async update(id: string, data: UpdateEmployeeDTO): Promise<Employee> {
        const response = await api.patch<Employee>(`/employees/${id}`, data);
        return response.data;
    },

    /**
     * Update employee wish (Wilaya choice)
     */
    async updateWish(id: string, wilayaChoice: string): Promise<{ status: string, message: string, is_archived: boolean }> {
        const response = await api.patch<{ status: string, message: string, is_archived: boolean }>(`/employees/${id}/wish`, { wilaya_choice: wilayaChoice });
        return response.data;
    },

    /**
     * Upload wish document for employee
     */
    async uploadWishDocument(employeeId: string, file: File): Promise<{
        status: string,
        message: string,
        file_path: string,
        file_url: string,
        file_name: string,
    }> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/employees/${employeeId}/wish/document`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * Delete wish document for employee
     */
    async deleteWishDocument(employeeId: string): Promise<{
        status: string,
        message: string,
    }> {
        const response = await api.delete(`/employees/${employeeId}/wish/document`);
        return response.data;
    },

    /**
     * Upload master PDF
     */
    async uploadMasterPdf(file: File): Promise<MasterPDF> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post<MasterPDF>('/employees/wishes/master-pdf/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * List master PDFs
     */
    async listMasterPdfs(): Promise<MasterPDF[]> {
        const response = await api.get<MasterPDF[]>('/employees/wishes/master-pdf');
        return response.data;
    },

    /**
     * Delete master PDF
     */
    async deleteMasterPdf(id: string): Promise<any> {
        const response = await api.delete(`/employees/wishes/master-pdf/${id}`);
        return response.data;
    },

    /**
     * Merge wish documents into a single PDF
     * دمج وثائق الرغبات (بطاقة الرغبات) في ملف PDF واحد
     */
    async exportMergedWishPdf(employeeIds: string[]): Promise<void> {
        const response = await api.post('/employees/wishes/export-merged-pdf', 
            { employee_ids: employeeIds },
            { 
                responseType: 'blob',
                timeout: 300000, // 5 minutes
            }
        );

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `wish_cards_merged_${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    /**
     * Export merged wish PDF with SSE progress tracking
     * تصدير بطاقات الرغبات مع تتبع التقدم عبر SSE
     */
    async exportMergedWishPdfStream(
        employeeIds: string[],
        onProgress: (current: number, total: number, employeeName: string) => void,
        onComplete: (downloadUrl: string) => void,
        onError: (message: string) => void
    ): Promise<void> {
        try {
            const { getApiBaseUrl } = await import('./client');
            const baseURL = getApiBaseUrl();

            const response = await fetch(`${baseURL}/employees/wishes/export-merged-pdf/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ employee_ids: employeeIds }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                onError(errorText || 'فشل الاتصال بالخادم');
                return;
            }

            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(trimmed.slice(6));

                            switch (data.type) {
                                case 'start':
                                    // Optionally handle start
                                    break;
                                case 'progress':
                                    onProgress(data.current, data.total, data.employee_name);
                                    break;
                                case 'complete':
                                    onComplete(data.download_url);
                                    return;
                                case 'error':
                                    onError(data.message);
                                    return;
                            }
                        } catch (e) {
                            console.warn('Failed to parse SSE data:', trimmed);
                        }
                    }
                }
            }
        } catch (error: any) {
            onError(error.message || 'حدث خطأ في الاتصال');
        }
    },

    /**
     * Set page number and extract document from master PDF
     */
    async extractAndUploadWishDocument(employeeId: string, masterPdfId: string, pageNumber: number): Promise<{
        status: string,
        message: string,
        file_path: string,
        file_url: string,
        file_name: string,
    }> {
        // Step 1: Save page number
        await api.patch(`/employees/${employeeId}/wish/page-number`, {
            master_pdf_id: masterPdfId,
            page_number: pageNumber,
        });
        // Step 2: Extract and upload
        const response = await api.post(`/employees/${employeeId}/wish/extract-and-upload`);
        return response.data;
    },

    /**
     * Delete employee
     * @param id Employee ID
     * @param hard If true, permanently delete the employee and associated user (DEV_ADMIN only)
     */
    async delete(id: string, hard: boolean = false): Promise<void> {
        const url = hard ? `/employees/${id}?hard=true` : `/employees/${id}`;
        await api.delete(url);
    },

    /**
     * Create user account for existing employee
     * Requires users.create permission and valid email on employee
     */
    async createUserForEmployee(employeeId: string): Promise<{
        email: string;
        password: string;
        message: string;
        email_sent: boolean;
    }> {
        const response = await api.post(`/employees/${employeeId}/create-user`);
        return response.data;
    },

    /**
     * Get Grades
     */
    async getGrades(): Promise<Grade[]> {
        const response = await api.get<Grade[]>('/employees/grades');
        return response.data;
    },

    /**
     * Create Grade
     */
    async createGrade(data: CreateGradeDTO): Promise<Grade> {
        const response = await api.post<Grade>('/employees/grades', data);
        return response.data;
    },

    /**
     * Update Grade
     */
    async updateGrade(id: string, data: UpdateGradeDTO): Promise<Grade> {
        const response = await api.put<Grade>(`/employees/grades/${id}`, data);
        return response.data;
    },

    /**
     * Delete Grade
     */
    async deleteGrade(id: string): Promise<void> {
        await api.delete(`/employees/grades/${id}`);
    },

    /**
     * Get Positions
     */
    async getPositions(): Promise<Position[]> {
        const response = await api.get<Position[]>('/employees/positions');
        return response.data;
    },

    /**
     * Get Departments
     */
    async getDepartments(): Promise<DepartmentType[]> {
        const response = await api.get<DepartmentType[]>('/employees/departments/list');
        return response.data;
    },

    /**
     * Get Offices (optionally by department)
     */
    async getOffices(departmentId?: string): Promise<OfficeType[]> {
        let url = '/employees/offices/list';
        if (departmentId) {
            url += `?department_id=${departmentId}`;
        }
        const response = await api.get<OfficeType[]>(url);
        return response.data;
    },

    async generateNumber(): Promise<string> {
        const response = await api.get<{ employee_number: string }>('/employees/generate-number');
        return response.data.employee_number;
    },

    /**
     * Get Education Levels
     */
    async getEducationLevels(): Promise<EducationLevel[]> {
        const response = await api.get<EducationLevel[]>('/employees/education-levels');
        return response.data;
    },

    /**
     * Get Grade Groups
     */
    async getGradeGroups(): Promise<GradeGroup[]> {
        const response = await api.get<GradeGroup[]>('/employees/grade-groups');
        return response.data;
    },

    /**
     * Create Grade Group
     */
    async createGradeGroup(data: { name_ar: string; name_en?: string; name_fr?: string; display_order: number }): Promise<GradeGroup> {
        const response = await api.post<GradeGroup>('/employees/grade-groups', data);
        return response.data;
    },

    /**
     * Update Grade Group
     */
    async updateGradeGroup(id: string, data: { name_ar?: string; name_en?: string; name_fr?: string; display_order?: number }): Promise<GradeGroup> {
        const response = await api.put<GradeGroup>(`/employees/grade-groups/${id}`, data);
        return response.data;
    },

    /**
     * Delete Grade Group
     */
    async deleteGradeGroup(id: string): Promise<void> {
        await api.delete(`/employees/grade-groups/${id}`);
    },

    /**
     * Create Position
     */
    async createPosition(data: { code: string; name_ar: string; name_fr?: string; name_en?: string; is_senior?: boolean; display_order?: number }): Promise<Position> {
        const response = await api.post<Position>('/employees/positions', data);
        return response.data;
    },

    /**
     * Update Position
     */
    async updatePosition(id: string, data: { code?: string; name_ar?: string; name_fr?: string; name_en?: string; is_senior?: boolean; display_order?: number }): Promise<Position> {
        const response = await api.put<Position>(`/employees/positions/${id}`, data);
        return response.data;
    },

    /**
     * Delete Position
     */
    async deletePosition(id: string): Promise<void> {
        await api.delete(`/employees/positions/${id}`);
    },

    /**
     * Check field existence
     */
    async checkExistence(field: string, value: string, excludeId?: string): Promise<{ exists: boolean; message?: string; employee_name?: string }> {
        const response = await api.get<{ exists: boolean; message?: string; employee_name?: string }>('/employees/check-exists', {
            params: { field, value, exclude_id: excludeId }
        });
        return response.data;
    },

    /**
     * Check if employee with same name exists
     */
    async checkNameDuplicate(
        firstname_ar: string,
        lastname_ar: string,
        excludeId?: string
    ): Promise<{ exists: boolean; count?: number; message?: string; employees?: { id: string; firstname_ar: string; lastname_ar: string; name: string; employee_number: string; birth_date: string; birth_place: string; institution_name: string }[] }> {
        const response = await api.get<{ exists: boolean; count?: number; message?: string; employees?: { id: string; firstname_ar: string; lastname_ar: string; name: string; employee_number: string; birth_date: string; birth_place: string; institution_name: string }[] }>('/employees/check-name-duplicate', {
            params: { firstname_ar, lastname_ar, exclude_id: excludeId }
        });
        return response.data;
    },

    // --- Export/Import ---
    async exportToExcel(fields: string[], filters?: EmployeeFilters, groupBy?: string) {
        const params = new URLSearchParams();
        if (fields.length > 0) params.append('fields', fields.join(','));

        if (filters?.search) params.append('search', filters.search);
        if (filters?.department) params.append('department', Array.isArray(filters.department) ? filters.department.join(',') : filters.department);
        if (filters?.institution_id) params.append('institution_id', Array.isArray(filters.institution_id) ? filters.institution_id.join(',') : filters.institution_id);
        if (filters?.grade_group_id) params.append('grade_group_id', Array.isArray(filters.grade_group_id) ? filters.grade_group_id.join(',') : filters.grade_group_id);
        if (filters?.grade_id) params.append('grade_id', Array.isArray(filters.grade_id) ? filters.grade_id.join(',') : filters.grade_id);
        if (filters?.position_id) params.append('position_id', Array.isArray(filters.position_id) ? filters.position_id.join(',') : filters.position_id);
        if (filters?.office_id) params.append('office_id', Array.isArray(filters.office_id) ? filters.office_id.join(',') : filters.office_id);
        if (filters?.gender) params.append('gender', filters.gender);
        if (filters?.sector) params.append('sector', filters.sector);
        if (filters?.position_type) params.append('position_type', Array.isArray(filters.position_type) ? filters.position_type.join(',') : filters.position_type);
        if (filters?.original_admin) params.append('original_admin', Array.isArray(filters.original_admin) ? filters.original_admin.join(',') : filters.original_admin);
        if (filters?.daira_code) params.append('daira_code', Array.isArray(filters.daira_code) ? filters.daira_code.join(',') : filters.daira_code);
        if (filters?.municipality_id) params.append('municipality_id', Array.isArray(filters.municipality_id) ? filters.municipality_id.join(',') : filters.municipality_id);
        if (filters?.legal_position) params.append('legal_position', filters.legal_position);
        if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
        if (filters?.include_archived !== undefined) params.append('include_archived', String(filters.include_archived));
        if (filters?.exclude_position_codes) params.append('exclude_position_codes', filters.exclude_position_codes);
        if (filters?.sort_by) params.append('sort_by', filters.sort_by);
        if (groupBy) params.append('group_by', groupBy);

        const response = await api.get(`/employees/export/excel?${params.toString()}`, {
            responseType: 'blob',
            timeout: 300000, // 5 minutes
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `employees_${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    async downloadTemplate() {
        const response = await api.get('/employees/export/template', {
            responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'employees_template.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    async importFromExcel(file: File, updateExisting: boolean = false) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/employees/import/excel', formData, {
            params: { update_existing: updateExisting },
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    },

    // ==================== EMPLOYEE CHILDREN ====================

    /**
     * Get employee children
     */
    async getChildren(employeeId: string): Promise<EmployeeChild[]> {
        const response = await api.get<EmployeeChild[]>(`/employees/${employeeId}/children`);
        return response.data;
    },

    /**
     * Create employee child
     */
    async createChild(employeeId: string, data: CreateEmployeeChildDTO): Promise<EmployeeChild> {
        const response = await api.post<EmployeeChild>(`/employees/${employeeId}/children`, data);
        return response.data;
    },

    /**
     * Update employee child
     */
    async updateChild(employeeId: string, childId: string, data: UpdateEmployeeChildDTO): Promise<EmployeeChild> {
        const response = await api.put<EmployeeChild>(`/employees/${employeeId}/children/${childId}`, data);
        return response.data;
    },

    /**
     * Delete employee child
     */
    async deleteChild(employeeId: string, childId: string): Promise<void> {
        await api.delete(`/employees/${employeeId}/children/${childId}`);
    },

    /**
     * Get Dairas (administrative divisions)
     */
    async getDairas(wilayaCode?: string): Promise<Daira[]> {
        const params = wilayaCode ? `?wilaya_code=${wilayaCode}` : '';
        const response = await api.get<Daira[]>(`/dairas${params}`);
        return response.data;
    },

    /**
     * Get Municipalities
     */
    async getMunicipalities(wilayaCode?: string): Promise<{ id: string; name_ar: string; name_fr: string; code: string }[]> {
        const params = wilayaCode ? { wilaya_code: wilayaCode } : {};
        const response = await api.get<any[]>('/municipalities/', { params });
        return response.data;
    }
};

// Employee Child Types
export interface EmployeeChild {
    id: string;
    employee_id: string;
    firstname: string;
    lastname?: string;
    birth_date?: string;
    gender?: string;
    is_student: boolean;
    school_name?: string;
    has_disability: boolean;
    notes?: string;
    created_at?: string;
}

export interface CreateEmployeeChildDTO {
    firstname: string;
    lastname?: string;
    birth_date?: string;
    gender?: string;
    is_student?: boolean;
    school_name?: string;
    has_disability?: boolean;
    notes?: string;
}

export interface UpdateEmployeeChildDTO extends Partial<CreateEmployeeChildDTO> { }

// ==================== DATA FILL ASSIST ====================

export interface DataFillFileColumn {
  index: number;
  name: string;
  sampleValues: string[];
}

export interface DataFillColumnMapping {
  columnIndex: number;
  columnName: string;
  dbField: string | null;
  isNameColumn: boolean;
}

export interface DataFillChangedField {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
}

export interface DataFillMatchedEmployee {
  rowIndex: number;
  employeeId: string | null;
  employeeName: string | null;
  matchScore: number | null;
  changedFields: DataFillChangedField[];
  status: string;
}

export interface DataFillPreviewResponse {
  totalRows: number;
  columns: DataFillFileColumn[];
  nameParts: string[];
  matchedEmployees: DataFillMatchedEmployee[];
  columnMappings: DataFillColumnMapping[];
}

export interface DataFillApplyUpdateRequest {
  rowIndex: number;
  employeeId: string | null;
  fieldUpdates: Record<string, any>;
  editedValues: Record<string, any>;
}

export interface DataFillApplyUpdateResponse {
  success: boolean;
  message: string;
  appliedCount: number;
  rejectedCount: number;
}

function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
      return Object.keys(obj).reduce((acc: Record<string, any>, key: string) => {
          const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
          acc[camelKey] = snakeToCamel(obj[key]);
          return acc;
      }, {});
  }
  return obj;
}

function camelToSnake(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  if (typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof FormData) && !(obj instanceof URLSearchParams)) {
      return Object.keys(obj).reduce((acc: Record<string, any>, key: string) => {
          const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          acc[snakeKey] = camelToSnake(obj[key]);
          return acc;
      }, {});
  }
  return obj;
}

/**
 * Preview an Excel/CSV file for data fill assistance.
 * Sends the file to the backend for analysis and returns column info, name parts,
 * and matched employees.
 */
export async function previewImport(
  file: File,
  mappings?: string,
  nameAssignments?: string,
): Promise<DataFillPreviewResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (mappings) formData.append('mappings', mappings);
  if (nameAssignments) formData.append('name_assignments', nameAssignments);

  const { default: api } = await import('./client');
  const response = await api.post('/employees/import/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return snakeToCamel(response.data);
}

/**
 * Apply the confirmed field updates for a single employee row.
 */
export async function applyImportUpdate(
  data: DataFillApplyUpdateRequest,
): Promise<DataFillApplyUpdateResponse> {
  const { default: api } = await import('./client');
  const response = await api.post('/employees/import/apply', camelToSnake(data));
  return snakeToCamel(response.data);
}

// ==================== REJECT IMPORT ROW ====================

export interface DataFillRejectRowRequest {
  rowIndex: number;
  employeeId: string | null;
  reason?: string;
}

export interface DataFillRejectRowResponse {
  success: boolean;
  message: string;
  rowIndex: number;
}

/**
 * Reject a single row from the import preview.
 */
export async function rejectImportRow(
  data: DataFillRejectRowRequest,
): Promise<DataFillRejectRowResponse> {
  const { default: api } = await import('./client');
  const response = await api.post('/employees/import/reject', camelToSnake(data));
  return snakeToCamel(response.data);
}

// Add methods to the employeesApi object
// Note: these are also available as standalone functions above
;(employeesApi as any).previewImport = previewImport;
;(employeesApi as any).applyImportUpdate = applyImportUpdate;
;(employeesApi as any).rejectImportRow = rejectImportRow;
