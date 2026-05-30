import { fetchApi } from "./client";
import type { Project, CreateProjectPayload } from "@openoii/shared";

export const projectApi = {
  list: () => fetchApi<Project[]>("/api/v1/projects"),

  get: (id: string) => fetchApi<Project>(`/api/v1/projects/${id}`),

  create: (payload: CreateProjectPayload) =>
    fetchApi<Project>("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<Project>) =>
    fetchApi<Project>(`/api/v1/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/api/v1/projects/${id}`, { method: "DELETE" }),
};
