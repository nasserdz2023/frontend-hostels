import api from "./client";
import { BadgePersonData } from "../types/badges";

export interface IssuedDocumentPersonItem {
    person_id?: string;
    recipient_name: string;
    recipient_role?: string;
    employee_id?: string;
    extra_fields?: Record<string, any>;
}

export interface BatchIssueRequest {
    template_id: string;
    template_name: string;
    document_type: "certificate" | "badge";
    occasion?: string;
    people: IssuedDocumentPersonItem[];
}

export interface IssuedDocumentResponse {
    id: string;
    serial_number: string;
    document_type: string;
    template_id?: string;
    template_name: string;
    recipient_name: string;
    recipient_role?: string;
    employee_id?: string;
    occasion?: string;
    issued_by_id?: string;
    issued_at: string;
    is_revoked: boolean;
    revoked_at?: string;
    revoke_reason?: string;
    doc_metadata?: Record<string, any>;
}

export interface BatchIssueResponse {
    issued: IssuedDocumentResponse[];
    count: number;
}

export interface IssuedDocumentVerifyResponse {
    valid: boolean;
    serial_number?: string;
    document_type?: string;
    template_name?: string;
    recipient_name?: string;
    recipient_role?: string;
    occasion?: string;
    issued_at?: string;
    is_revoked: boolean;
    message: string;
}

export interface IssuedDocumentListResponse {
    items: IssuedDocumentResponse[];
    total: number;
}

export interface IssuedDocumentStats {
    total: number;
    certificates: number;
    badges: number;
    revoked: number;
    this_month: number;
    this_year: number;
}

export const issuedDocumentsService = {
    batchIssue: async (data: BatchIssueRequest) => {
        const response = await api.post<BatchIssueResponse>("/media-office/issued-documents/batch", data);
        return response.data;
    },

    getDocuments: async (skip: number = 0, limit: number = 50, documentType?: string, search?: string) => {
        const params = new URLSearchParams();
        params.append("skip", skip.toString());
        params.append("limit", limit.toString());
        if (documentType) params.append("document_type", documentType);
        if (search) params.append("search", search);

        const response = await api.get<IssuedDocumentListResponse>(`/media-office/issued-documents?${params.toString()}`);
        return response.data;
    },

    getDocumentStats: async () => {
        const response = await api.get<IssuedDocumentStats>("/media-office/issued-documents/stats");
        return response.data;
    },

    getOccasions: async () => {
        const response = await api.get<string[]>("/media-office/issued-documents/occasions");
        return response.data;
    },

    verifyDocument: async (serialNumber: string) => {
        const response = await api.get<IssuedDocumentVerifyResponse>(`/media-office/issued-documents/verify/${serialNumber}`);
        return response.data;
    },

    getDocument: async (id: string) => {
        const response = await api.get<IssuedDocumentResponse>(`/media-office/issued-documents/${id}`);
        return response.data;
    },

    revokeDocument: async (id: string, reason: string) => {
        const response = await api.patch<IssuedDocumentResponse>(`/media-office/issued-documents/${id}/revoke`, { reason });
        return response.data;
    }
};
