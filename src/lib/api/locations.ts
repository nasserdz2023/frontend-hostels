import api from './client';

// Types
export interface Wilaya {
    id: number;
    code: string;
    name_ar: string;
    name_fr: string;
    name_en?: string;
    is_active: boolean;
}

export interface WilayaCreate {
    code: string;
    name_ar: string;
    name_fr: string;
    name_en?: string;
    is_active?: boolean;
}

export interface WilayaUpdate {
    code?: string;
    name_ar?: string;
    name_fr?: string;
    name_en?: string;
    is_active?: boolean;
}


export interface Daira {
    code: string;
    wilaya_code: string;
    name_ar: string;
    name_en: string;
    name_fr: string;
}

export interface Municipality {
    id: string; // UUID
    name_ar: string;
    name_fr?: string;
    name_en?: string;
    code?: string;
    wilaya_code: string;
    district_id?: string;
    daira_code?: string; // Added daira_code
    latitude?: number | null;
    longitude?: number | null;
    zoom?: number | null;
}

export interface MunicipalityCreate {
    name_ar: string;
    name_fr?: string;
    name_en?: string;
    code?: string;
    wilaya_code: string;
    district_id?: string;
    daira_code?: string; // Added daira_code
    latitude?: number | null;
    longitude?: number | null;
    zoom?: number | null;
}

export interface MunicipalityUpdate {
    name_ar?: string;
    name_fr?: string;
    name_en?: string;
    code?: string;
    wilaya_code?: string;
    district_id?: string;
    daira_code?: string; // Added daira_code
    latitude?: number | null;
    longitude?: number | null;
    zoom?: number | null;
}

export interface District {
    id: string; // UUID
    code?: string;
    name_ar: string;
    name_fr?: string;
    name_en?: string;
    wilaya_code?: string;
    municipalities?: Municipality[];
}

export interface DistrictCreate {
    name_ar: string;
    name_fr?: string;
    wilaya_code?: string;
}

export interface DistrictUpdate {
    name_ar?: string;
    name_fr?: string;
    wilaya_code?: string;
}


// API Client
export const locationsApi = {
    // Wilayas
    getWilayas: async (): Promise<Wilaya[]> => {
        const response = await api.get<Wilaya[]>('/wilayas/');
        return response.data;
    },

    createWilaya: async (data: WilayaCreate): Promise<Wilaya> => {
        const response = await api.post<Wilaya>('/wilayas/', data);
        return response.data;
    },

    updateWilaya: async (id: number, data: WilayaUpdate): Promise<Wilaya> => {
        const response = await api.put<Wilaya>(`/wilayas/${id}`, data);
        return response.data;
    },

    deleteWilaya: async (id: number): Promise<void> => {
        await api.delete(`/wilayas/${id}`);
    },


    // Dairas
    getDairas: async (wilayaCode?: string): Promise<Daira[]> => {
        const params = wilayaCode ? { wilaya_code: wilayaCode } : {};
        const response = await api.get<Daira[]>('/dairas', { params });
        return response.data;
    },

    createDaira: async (data: any): Promise<Daira> => {
        const response = await api.post<Daira>('/dairas', data);
        return response.data;
    },

    updateDaira: async (code: string, data: any): Promise<Daira> => {
        const response = await api.put<Daira>(`/dairas/${code}`, data);
        return response.data;
    },

    deleteDaira: async (code: string): Promise<void> => {
        await api.delete(`/dairas/${code}`);
    },

    // Municipalities
    getMunicipalities: async (wilayaCode?: string): Promise<Municipality[]> => {
        const params = wilayaCode ? { wilaya_code: wilayaCode } : {};
        const response = await api.get<Municipality[]>('/municipalities/', { params });
        return response.data;
    },

    createMunicipality: async (data: MunicipalityCreate): Promise<Municipality> => {
        const response = await api.post<Municipality>('/municipalities/', data);
        return response.data;
    },

    updateMunicipality: async (id: string, data: MunicipalityUpdate): Promise<Municipality> => {
        const response = await api.put<Municipality>(`/municipalities/${id}`, data);
        return response.data;
    },

    deleteMunicipality: async (id: string): Promise<void> => {
        await api.delete(`/municipalities/${id}`);
    },

    // Districts
    getDistricts: async (skip: number = 0, limit: number = 100): Promise<District[]> => {
        const response = await api.get<District[]>('/districts/', { params: { skip, limit } });
        return response.data;
    },

    createDistrict: async (data: DistrictCreate): Promise<District> => {
        const response = await api.post<District>('/districts/', data);
        return response.data;
    },

    updateDistrict: async (id: string, data: DistrictUpdate): Promise<District> => {
        const response = await api.put<District>(`/districts/${id}`, data);
        return response.data;
    },

    deleteDistrict: async (id: string): Promise<void> => {
        await api.delete(`/districts/${id}`);
    }
};
