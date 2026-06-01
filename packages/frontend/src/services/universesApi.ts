/**
 * Universes API — shared IP management, character sharing, cross-project sync.
 */
import { fetchApi } from "./client";
import type {
  Universe,
  UniverseDetail,
  UniverseProjectLinkRead,
  SharedCharacterRead,
} from "@/types";

export const universesApi = {
  list: () => fetchApi<Universe[]>("/api/v1/universes"),

  get: (id: number) => fetchApi<UniverseDetail>(`/api/v1/universes/${id}`),

  create: (data: {
    name: string;
    description?: string | null;
    world_setting?: string | null;
    style_rules?: string | null;
    cover_image_url?: string | null;
  }) =>
    fetchApi<Universe>("/api/v1/universes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: number,
    data: {
      name?: string | null;
      description?: string | null;
      world_setting?: string | null;
      style_rules?: string | null;
      cover_image_url?: string | null;
      is_active?: boolean | null;
    },
  ) =>
    fetchApi<Universe>(`/api/v1/universes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  addProject: (
    universeId: number,
    projectId: number,
    chapterNumber?: number | null,
    chapterTitle?: string | null,
  ) =>
    fetchApi<UniverseProjectLinkRead>(
      `/api/v1/universes/${universeId}/projects`,
      {
        method: "POST",
        body: JSON.stringify({
          project_id: projectId,
          chapter_number: chapterNumber ?? null,
          chapter_title: chapterTitle ?? null,
        }),
      },
    ),

  removeProject: (universeId: number, projectId: number) =>
    fetchApi<void>(`/api/v1/universes/${universeId}/projects/${projectId}`, {
      method: "DELETE",
    }),

  listSharedCharacters: (universeId: number) =>
    fetchApi<SharedCharacterRead[]>(
      `/api/v1/universes/${universeId}/shared-characters`,
    ),

  promoteCharacter: (universeId: number, characterId: number) =>
    fetchApi<SharedCharacterRead>(
      `/api/v1/universes/${universeId}/shared-characters`,
      {
        method: "POST",
        body: JSON.stringify({ character_id: characterId }),
      },
    ),

  importCharacter: (projectId: number, sharedCharacterId: number) =>
    fetchApi<{ id: number; name: string; project_id: number }>(
      `/api/v1/universes/projects/${projectId}/import-character/${sharedCharacterId}`,
      { method: "POST" },
    ),

  syncCharacter: (characterId: number) =>
    fetchApi<SharedCharacterRead>(
      `/api/v1/universes/characters/${characterId}/sync-to-universe`,
      { method: "POST" },
    ),
};
