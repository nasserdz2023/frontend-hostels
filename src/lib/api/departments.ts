/**
 * Departments API Client
 * عميل API للأقسام والمصالح
 */
import api from './client';

// ==================== Types ====================

export interface DepartmentResponse {
    id: string;
    name_ar: string;
    name_fr?: string;
    code?: string;
    description?: string;
    parent_id?: string;
    manager_id?: string;
    created_at?: string;
    updated_at?: string;
}

export interface CreateDepartmentDTO {
    name_ar: string;
    name_fr?: string;
    code?: string;
    description?: string;
    parent_id?: string;
    manager_id?: string;
}

export interface UpdateDepartmentDTO extends Partial<CreateDepartmentDTO> { }

// ==================== API ====================

export const departmentsApi = {
    /**
     * Get all departments
     */
    async getAll(): Promise<DepartmentResponse[]> {
        const response = await api.get<DepartmentResponse[]>('/reception/departments');
        return response.data;
    },

    /**
     * Get department by ID
     */
    async getById(id: string): Promise<DepartmentResponse> {
        const response = await api.get<DepartmentResponse>(`/reception/departments/${id}`);
        return response.data;
    },

    /**
     * Create new department
     */
    async create(data: CreateDepartmentDTO): Promise<DepartmentResponse> {
        const response = await api.post<DepartmentResponse>('/reception/departments', data);
        return response.data;
    },

    /**
     * Update department
     */
    async update(id: string, data: UpdateDepartmentDTO): Promise<DepartmentResponse> {
        const response = await api.put<DepartmentResponse>(`/reception/departments/${id}`, data);
        return response.data;
    },

    /**
     * Delete department
     */
    async delete(id: string): Promise<void> {
        await api.delete(`/reception/departments/${id}`);
    },
};
