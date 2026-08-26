/**
 * Photos API - Immich Integration
 * واجهة برمجة التطبيقات للصور
 */
import api from './client';

// Types
export interface ImmichAsset {
    id: string;
    type: string;
    originalFileName: string;
    fileCreatedAt?: string;
    thumbnailUrl?: string;
    previewUrl?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
    people: { id: string; name: string }[];
    rotation?: number;
    exifInfo?: {
        make?: string;
        model?: string;
        exposureTime?: string;
        fNumber?: number;
        focalLength?: number;
        iso?: number;
        lensModel?: string;
        dateTimeOriginal?: string;
    };
}

export interface ImmichPerson {
    id: string;
    name: string;
    thumbnailPath?: string;
    assetCount: number;
    employee_id?: string;
    employee_name?: string;
    is_mapped: boolean;
}

export interface ImmichAlbum {
    id: string;
    albumName: string;
    assetCount: number;
    description?: string;
    institution_id?: string;
    activity_id?: string;
    albumThumbnailAssetId?: string;
}

export interface PhotoStats {
    total_photos: number;
    total_videos: number;
    total_people: number;
    mapped_people: number;
    total_albums: number;
    storage_used?: string;
}

export interface PhotoTag {
    id: string;
    immich_asset_id: string;
    created_at: string;
    thumbnail_url?: string;
}

// API Functions
export const photosApi = {
    // Server Status
    async getStatus(): Promise<{ status: string; info: any }> {
        const response = await api.get('/photos/status');
        return response.data;
    },

    // Stats
    async getStats(): Promise<PhotoStats> {
        const response = await api.get('/photos/stats');
        return response.data;
    },

    // Assets
    async getAssets(page = 1, size = 500): Promise<ImmichAsset[]> {
        const response = await api.get('/photos/assets', {
            params: { page, size }
        });
        return response.data;
    },

    async getAsset(assetId: string): Promise<ImmichAsset> {
        const response = await api.get(`/photos/assets/${assetId}`);
        return response.data;
    },

    async uploadPhoto(file: File, options?: { institution_id?: string; activity_id?: string; album_id?: string }): Promise<any> {
        const formData = new FormData();
        formData.append('file', file);
        if (options?.institution_id) formData.append('institution_id', options.institution_id);
        if (options?.activity_id) formData.append('activity_id', options.activity_id);
        if (options?.album_id) formData.append('album_id', options.album_id);

        const response = await api.post('/photos/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    async deleteAsset(assetId: string): Promise<{ success: boolean; message: string }> {
        const response = await api.delete(`/photos/assets/${assetId}`);
        return response.data;
    },

    async bulkDeleteAssets(assetIds: string[]): Promise<{ success: boolean; count: number }> {
        const response = await api.post('/photos/assets/bulk-delete', { ids: assetIds });
        return response.data;
    },

    async bulkAddAssetsToAlbum(albumId: string, assetIds: string[]): Promise<{ success: boolean; count: number }> {
        const response = await api.put(`/photos/albums/${albumId}/assets/bulk`, { ids: assetIds });
        return response.data;
    },

    async rotateAsset(assetId: string, rotation: number): Promise<{ success: boolean; rotation: number }> {
        const response = await api.put(`/photos/assets/${assetId}/rotation?rotation=${rotation}`);
        return response.data;
    },



    // People (Face Recognition)
    async getPeople(): Promise<ImmichPerson[]> {
        const response = await api.get('/photos/people');
        return response.data;
    },

    async getPersonPhotos(personId: string): Promise<ImmichAsset[]> {
        const response = await api.get(`/photos/people/${personId}/assets`);
        return response.data;
    },

    async mapPersonToEmployee(personId: string, employeeId: string): Promise<any> {
        const response = await api.post(`/photos/people/${personId}/map`, {
            immich_person_id: personId,
            employee_id: employeeId
        });
        return response.data;
    },

    async renamePerson(personId: string, name: string): Promise<any> {
        const response = await api.put(`/photos/people/${personId}/name`, null, {
            params: { name }
        });
        return response.data;
    },

    async mergePeople(targetPersonId: string, sourcePersonIds: string[]): Promise<any> {
        const response = await api.post(`/photos/people/${targetPersonId}/merge`, {
            ids: sourcePersonIds
        });
        return response.data;
    },

    // Albums
    async getAlbums(): Promise<ImmichAlbum[]> {
        const response = await api.get('/photos/albums');
        return response.data;
    },

    async createAlbum(name: string, description?: string, institutionId?: string): Promise<ImmichAlbum> {
        const response = await api.post('/photos/albums', null, {
            params: { name, description, institution_id: institutionId }
        });
        return response.data;
    },

    async getAlbumAssets(albumId: string): Promise<ImmichAsset[]> {
        const response = await api.get(`/photos/albums/${albumId}/assets`);
        return response.data;
    },

    // Employee Photos
    async getEmployeePhotos(employeeId: string): Promise<any[]> {
        const response = await api.get(`/photos/employees/${employeeId}`);
        return response.data;
    },

    async tagEmployeeInPhoto(employeeId: string, assetId: string, personId?: string): Promise<any> {
        const response = await api.post(`/photos/employees/${employeeId}/tag`, {
            immich_asset_id: assetId,
            employee_id: employeeId,
            immich_person_id: personId
        });
        return response.data;
    },

    // Institution Photos
    async getInstitutionPhotos(institutionId: string, photoType?: string): Promise<any[]> {
        const response = await api.get(`/photos/institutions/${institutionId}`, {
            params: { photo_type: photoType }
        });
        return response.data;
    },

    async tagInstitutionPhoto(institutionId: string, assetId: string, photoType = 'general', caption?: string): Promise<any> {
        const response = await api.post(`/photos/institutions/${institutionId}/tag`, {
            immich_asset_id: assetId,
            institution_id: institutionId,
            photo_type: photoType,
            caption
        });
        return response.data;
    },

    // Search
    async search(query: string): Promise<{ assets: { items: ImmichAsset[] } }> {
        const response = await api.get('/photos/search', {
            params: { q: query }
        });
        return response.data;
    },

    // Places
    async getPlaces(): Promise<ImmichPlace[]> {
        const response = await api.get('/photos/places');
        return response.data;
    },

    async getPlaceAssets(lat: number, lon: number, radius: number = 0.1): Promise<ImmichAsset[]> {
        const response = await api.get('/photos/places/assets', {
            params: { lat, lon, radius }
        });
        return response.data;
    },

    // Institutions List
    async getInstitutionsList(): Promise<InstitutionWithPhotos[]> {
        const response = await api.get('/photos/institutions-list');
        return response.data;
    }
};

// Interfaces
export interface ImmichPlace {
    name: string;
    city: string;
    country: string;
    lat: number;
    lon: number;
    assetCount: number;
    assets: string[];
}

export interface InstitutionWithPhotos {
    id: string;
    name: string;
    institution_type: string;
    photoCount: number;
}
