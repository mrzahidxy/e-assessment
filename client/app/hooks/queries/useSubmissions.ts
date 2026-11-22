"use client"

import { useQuery } from "@tanstack/react-query"
import { backendApiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import type { Submission } from '@/types';

interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

export function useSubmissions(
  paperId?: string,
  status?: Submission["status"],
  loadAllPages = false
) {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['submissions', paperId, status, loadAllPages],
    enabled: isAuthenticated,
    queryFn: async () => {
      const fetchPage = async (page: number) => {
        const params = new URLSearchParams();
        if (paperId) params.set("paperId", paperId);
        if (status) params.set("status", status);
        if (loadAllPages) params.set("limit", "50");
        params.set("page", String(page));
        const res = await backendApiFetch<PaginatedResponse<Submission> | Submission[]>(
          `/submissions?${params.toString()}`
        );

        if (!res.success) {
          throw new Error(res.error || "Failed to load submissions");
        }

        return res.data;
      };

      const firstPage = await fetchPage(1);
      if (Array.isArray(firstPage)) return firstPage;
      if (!firstPage || !Array.isArray(firstPage.data)) return [];
      if (!loadAllPages) return firstPage.data;

      const submissions = [...firstPage.data];
      for (let page = 2; page <= firstPage.meta.totalPages; page += 1) {
        const nextPage = await fetchPage(page);
        if (Array.isArray(nextPage)) {
          submissions.push(...nextPage);
          break;
        }
        if (!nextPage || !Array.isArray(nextPage.data)) break;
        submissions.push(...nextPage.data);
      }
      return submissions;
    },
  });
}
