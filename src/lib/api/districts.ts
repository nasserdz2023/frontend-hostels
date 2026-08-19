import api from './client';
import { District } from './locations';
export type { District };

export interface CreateDistrictDTO {
    name_ar: string;
    name_fr?: string;
    wilaya_code?: string;
}

export interface UpdateDistrictDTO {
    name_ar?: string;
    name_fr?: string;
    wilaya_code?: string;
}

export const districtsApi = {
    async getAll(): Promise<District[]> {
        const response = await api.get<District[]>('/districts');
        return response.data;
    },

    async create(data: CreateDistrictDTO): Promise<District> {
        const response = await api.post<District>('/districts', data);
        return response.data;
    },

    async update(id: string, data: UpdateDistrictDTO): Promise<District> {
        const response = await api.put<District>(`/districts/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/districts/${id}`);
    }
};
