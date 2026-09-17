export interface BadgeTemplate {
    id: string;
    name: string;
    html_content: string;
    html_content_back?: string;
    css_content?: string;
    width_mm: number;
    height_mm: number;
    orientation: "portrait" | "landscape";
    background_image_url?: string;
    background_opacity?: number;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface BadgePersonData {
    id: string;
    name: string;
    role: string;
    photo_url?: string;
    qr_code_content: string;
    extra_fields: Record<string, any>;
}

export interface BadgeGenerationRequest {
    template_id: string;
    source_type: "employees" | "activity_participants" | "activity_organizers";
    source_id?: string;
    person_ids: string[];
}
