"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { institutionsApi, InstitutionFilters, YouthInstitution } from "@/lib/api/institutions";

export const institutionKeys = {
    all: ["institutions"] as const,
    lists: () => [...institutionKeys.all, "list"] as const,
    list: (filters: InstitutionFilters) => [...institutionKeys.lists(), filters] as const,
    details: () => [...institutionKeys.all, "detail"] as const,
    detail: (id: string) => [...institutionKeys.details(), id] as const,
    wilayas: () => [...institutionKeys.all, "wilayas"] as const,
    municipalities: (wilayaCode?: string) => [...institutionKeys.all, "municipalities", wilayaCode] as const,
    stats: (id: string) => [...institutionKeys.all, "stats", id] as const,
};

export function useInstitutions(filters: InstitutionFilters = {}) {
    return useQuery({
        queryKey: institutionKeys.list(filters),
        queryFn: () => institutionsApi.getAll(filters),
        staleTime: 30 * 1000,
    });
}

export function useInstitution(id: string) {
    return useQuery({
        queryKey: institutionKeys.detail(id),
        queryFn: () => institutionsApi.getById(id),
        enabled: !!id,
    });
}

export function useWilayas() {
    return useQuery({
        queryKey: institutionKeys.wilayas(),
        queryFn: () => institutionsApi.getWilayas(),
        staleTime: 5 * 60 * 1000,
    });
}

export function useMunicipalities(wilayaCode?: string) {
    return useQuery({
        queryKey: institutionKeys.municipalities(wilayaCode),
        queryFn: () => institutionsApi.getMunicipalities(wilayaCode),
        staleTime: 5 * 60 * 1000,
    });
}

export function useInstitutionStats(id: string) {
    return useQuery({
        queryKey: institutionKeys.stats(id),
        queryFn: () => institutionsApi.getStats(id),
        enabled: !!id,
    });
}

export function useCreateInstitution() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => institutionsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: institutionKeys.lists() });
        },
    });
}

export function useUpdateInstitution() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => institutionsApi.update(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: institutionKeys.lists() });
            queryClient.invalidateQueries({ queryKey: institutionKeys.detail(id) });
        },
    });
}

export function useDeleteInstitution() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, permanent }: { id: string; permanent?: boolean }) =>
            institutionsApi.delete(id, permanent),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: institutionKeys.lists() });
        },
    });
}
