/**
 * Shots API — update, approve, regenerate, delete.
 */
import { fetchApi } from "./client";
import type { Shot, ShotUpdatePayload, AgentRun } from "@/types";

export const shotsApi = {
  update: (id: number, data: ShotUpdatePayload) =>
    fetchApi<Shot>(`/api/v1/shots/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  approve: (id: number) =>
    fetchApi<Shot>(`/api/v1/shots/${id}/approve`, {
      method: "POST",
    }),

  regenerate: (id: number, type: "image" | "video") =>
    fetchApi<AgentRun>(`/api/v1/shots/${id}/regenerate`, {
      method: "POST",
      body: JSON.stringify({ type }),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/api/v1/shots/${id}`, { method: "DELETE" }),
};
