/**
 * Characters API — CRUD, bible, embeddings, reference images.
 */
import { fetchApi } from "./client";
import type {
  Character,
  CharacterUpdatePayload,
  CharacterBible,
  AgentRun,
} from "@/types";

export const charactersApi = {
  update: (id: number, data: CharacterUpdatePayload) =>
    fetchApi<Character>(`/api/v1/characters/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  approve: (id: number) =>
    fetchApi<Character>(`/api/v1/characters/${id}/approve`, {
      method: "POST",
    }),

  regenerate: (id: number) =>
    fetchApi<AgentRun>(`/api/v1/characters/${id}/regenerate`, {
      method: "POST",
      body: JSON.stringify({ type: "image" }),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/api/v1/characters/${id}`, { method: "DELETE" }),

  getBible: (id: number) =>
    fetchApi<CharacterBible>(`/api/v1/characters/${id}/bible`),

  updateBible: (
    id: number,
    data: { visual_notes?: string | null; reference_images?: string[] },
  ) =>
    fetchApi<CharacterBible>(`/api/v1/characters/${id}/bible`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  addReferenceImage: (id: number, imageUrl: string) =>
    fetchApi<CharacterBible>(`/api/v1/characters/${id}/reference-images`, {
      method: "POST",
      body: JSON.stringify({ image_url: imageUrl }),
    }),

  deleteReferenceImage: (id: number, index: number) =>
    fetchApi<void>(`/api/v1/characters/${id}/reference-images/${index}`, {
      method: "DELETE",
    }),

  computeEmbedding: (id: number) =>
    fetchApi<Character>(`/api/v1/characters/${id}/compute-embedding`, {
      method: "POST",
    }),
};
