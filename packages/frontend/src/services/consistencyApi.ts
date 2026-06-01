/**
 * Consistency Evaluation API — character visual consistency scoring.
 */
import { fetchApi } from "./client";
import type {
  ConsistencyEvalResponse,
  ConsistencyReportRead,
} from "@/types";

export const consistencyApi = {
  triggerEval: (projectId: number) =>
    fetchApi<ConsistencyEvalResponse>(
      `/api/v1/projects/${projectId}/consistency-eval`,
      { method: "POST" },
    ),

  getReport: (projectId: number) =>
    fetchApi<ConsistencyReportRead>(
      `/api/v1/projects/${projectId}/consistency-report`,
    ),

  getHistory: (projectId: number, limit?: number) =>
    fetchApi<ConsistencyReportRead[]>(
      `/api/v1/projects/${projectId}/consistency-report/history${limit ? `?limit=${limit}` : ""}`,
    ),
};
