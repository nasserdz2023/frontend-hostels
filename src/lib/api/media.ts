import api from "./client";

export enum MediaStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    USED = "used"
}

export enum MediaType {
    IMAGE = "image",
    VIDEO = "video",
    DOCUMENT = "document"
}

export enum MediaSource {
    TELEGRAM = "telegram",
    UPLOAD = "upload"
}

export interface MediaItem {
    id: string;
    file_url: string;
    thumbnail_url?: string;
    file_type: MediaType;
    source: MediaSource;
    caption?: string;
    sender_info?: any;
    status: MediaStatus;
    created_at: string;
    updated_at?: string;
}

export interface MediaStats {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
}

export const MediaRequest = {
    getAll: async (params?: { skip?: number; limit?: number; status?: string; source?: string; date?: string; period?: string; file_type?: string }) => {
        const query = new URLSearchParams();
        if (params?.skip) query.append("skip", params.skip.toString());
        if (params?.limit) query.append("limit", params.limit.toString());
        if (params?.status) query.append("status", params.status);
        if (params?.source) query.append("source", params.source);
        if (params?.date) query.append("date", params.date);
        if (params?.period) query.append("period", params.period);
        if (params?.file_type) query.append("file_type", params.file_type);

        const res = await api.get(`/media-office/?${query.toString()}`);
        return res.data as MediaItem[];
    },

    getStats: async () => {
        const res = await api.get("/media-office/stats");
        return res.data as MediaStats;
    },

    upload: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.post("/media-office/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        return res.data as MediaItem;
    },

    updateStatus: async (id: string, status: MediaStatus, caption?: string) => {
        const res = await api.patch(`/media-office/${id}`, { status, caption });
        return res.data as MediaItem;
    },

    delete: async (id: string) => {
        await api.delete(`/media-office/${id}`);
    }
};
