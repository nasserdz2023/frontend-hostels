import api from './client';
import { Municipality } from './locations';

export interface UpdateMunicipalityDTO {
    name_ar?: string;
    name_fr?: string;
    code?: string;
    district_id?: string | null;
}

export const municipalitiesApi = {
    async update(id: string, data: UpdateMunicipalityDTO): Promise<Municipality> {
        const response = await api.put<Municipality>(`/municipalities/${id}`, data);
        return response.data;
    }
};
