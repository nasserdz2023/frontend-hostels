"use client";

const DRAFT_PREFIX = "djs_draft_";

export interface Draft<T> {
    data: T;
    step: number;
    timestamp: number;
}

export const DraftService = {
    save: <T>(key: string, data: T, step: number = 1) => {
        if (typeof window === "undefined") return;
        const draft: Draft<T> = {
            data,
            step,
            timestamp: Date.now(),
        };
        localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(draft));
    },

    load: <T>(key: string): Draft<T> | null => {
        if (typeof window === "undefined") return null;
        const item = localStorage.getItem(DRAFT_PREFIX + key);
        if (!item) return null;
        try {
            return JSON.parse(item);
        } catch {
            return null;
        }
    },

    clear: (key: string) => {
        if (typeof window === "undefined") return;
        localStorage.removeItem(DRAFT_PREFIX + key);
    },

    hasDraft: (key: string): boolean => {
        if (typeof window === "undefined") return false;
        return !!localStorage.getItem(DRAFT_PREFIX + key);
    }
};
