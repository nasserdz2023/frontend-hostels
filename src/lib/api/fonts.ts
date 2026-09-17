import api from "./client";

export interface CustomFont {
    id: string;
    name: string;
    font_family: string;
    file_url: string;
    format?: string;
    is_active: boolean;
    created_at: string;
}

export const fontsService = {
    getFonts: async () => {
        const response = await api.get<CustomFont[]>("/media-office/fonts");
        return response.data;
    },

    uploadFont: async (name: string, file: File) => {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("file", file);
        
        // Media endpoints usually expect multipart/form-data
        const response = await api.post<CustomFont>("/media-office/fonts/upload", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },

    deleteFont: async (id: string) => {
        await api.delete(`/media-office/fonts/${id}`);
    },
};
