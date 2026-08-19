/**
 * Grades API Client
 * عميل API للرتب
 */
import api from './client';

// ==================== Types ====================

export interface Grade {
    id: string;
    name_ar: string;
    name_en?: string;
    name_fr?: string;
    code?: string;
    level?: number;
    group_id?: string;
    group?: { id: string; name_ar: string; name_en?: string; name_fr?: string };
    is_full_time?: boolean;
}

// ==================== API ====================

export const gradesApi = {
    /**
     * Get all grades
     */
    async getAll(): Promise<Grade[]> {
        const response = await api.get<Grade[]>('/employees/grades');
        return response.data;
    },
};
