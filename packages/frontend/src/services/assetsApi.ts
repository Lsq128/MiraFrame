/**
 * Assets API — asset library CRUD.
 */
import { fetchApi } from "./client";
import type {
  Asset,
  AssetList,
  AssetCreatePayload,
  Character,
  Shot,
} from "@/types";

export const assetsApi = {
  list: (opts?: { assetType?: string; search?: string; tag?: string }) => {
    const params = new URLSearchParams();
    if (opts?.assetType) params.set("asset_type", opts.assetType);
    if (opts?.search) params.set("search", opts.search);
    if (opts?.tag) params.set("tag", opts.tag);
    const qs = params.toString();
    return fetchApi<AssetList>(`/api/v1/assets${qs ? `?${qs}` : ""}`);
  },

  create: (data: AssetCreatePayload) =>
    fetchApi<Asset>("/api/v1/assets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createFromCharacter: (characterId: number) =>
    fetchApi<Asset>(`/api/v1/assets/from-character/${characterId}`, {
      method: "POST",
    }),

  createFromShot: (shotId: number) =>
    fetchApi<Asset>(`/api/v1/assets/from-shot/${shotId}`, {
      method: "POST",
    }),

  useInProject: (assetId: number, projectId: number) =>
    fetchApi<Character | Shot>(`/api/v1/assets/${assetId}/use-in-project`, {
      method: "POST",
      body: JSON.stringify({ project_id: projectId }),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/api/v1/assets/${id}`, { method: "DELETE" }),
};
