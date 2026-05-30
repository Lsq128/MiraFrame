import { fetchApi } from "./client";

export const generationApi = {
  generate: (
    projectId: string,
    opts?: { auto_mode?: boolean; target_stage?: string },
  ) =>
    fetchApi<{ run_id: string; thread_id: string; status: string }>(
      `/api/v1/projects/${projectId}/generate`,
      { method: "POST", body: JSON.stringify(opts || {}) },
    ),

  cancel: (projectId: string, runId: string) =>
    fetchApi<{ status: string }>(
      `/api/v1/projects/${projectId}/generate/${runId}/cancel`,
      { method: "POST" },
    ),

  resume: (projectId: string, runId: string, confirm: boolean) =>
    fetchApi<{ status: string }>(
      `/api/v1/projects/${projectId}/generate/${runId}/resume`,
      { method: "POST", body: JSON.stringify({ confirm }) },
    ),

  feedback: (projectId: string, runId: string, feedback: string) =>
    fetchApi<{ status: string }>(
      `/api/v1/projects/${projectId}/generate/${runId}/feedback`,
      { method: "POST", body: JSON.stringify({ feedback }) },
    ),
};
