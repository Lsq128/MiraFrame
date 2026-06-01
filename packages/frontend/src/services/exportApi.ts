/**
 * Export API — PDF, webtoon export trigger and status polling.
 */
import { fetchApi } from "./client";
import type { ExportResponse } from "@/types";

export const exportApi = {
  triggerPdf: (projectId: number) =>
    fetchApi<ExportResponse>(`/api/v1/projects/${projectId}/export/pdf`, {
      method: "POST",
    }),

  triggerWebtoon: (projectId: number) =>
    fetchApi<ExportResponse>(`/api/v1/projects/${projectId}/export/webtoon`, {
      method: "POST",
    }),

  getStatus: (projectId: number, exportId: string) =>
    fetchApi<ExportResponse>(
      `/api/v1/projects/${projectId}/export/${exportId}/status`,
    ),
};
