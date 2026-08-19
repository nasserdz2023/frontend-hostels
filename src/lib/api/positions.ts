/**
 * Positions API Client
 * عميل API للمناصب الوظيفية
 */
import api from './client';

// ==================== Types ====================

export interface Position {
    id: string;
    name_ar: string;
    name_en?: string;
    name_fr?: string;
}

// ==================== API ====================

export const positionsApi = {
    /**
     * Get all positions
     */
    async getAll(): Promise<Position[]> {
        const response = await api.get<Position[]>('/employees/positions');
        return response.data;
    },
};
