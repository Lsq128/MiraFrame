/**
 * Versions API — artifact versioning, rollback, diff.
 */
import { fetchApi } from "./client";
import type {
  VersionListRead,
  VersionEntityType,
  ArtifactVersion,
  RollbackResponse,
  RollbackRequest,
  VersionCompareRead,
} from "@/types";

export const versionsApi = {
  list: (projectId: number, entityType: VersionEntityType, entityId: number) =>
    fetchApi<VersionListRead>(
      `/api/v1/projects/${projectId}/versions?entity_type=${entityType}&entity_id=${entityId}`,
    ),

  get: (versionId: number) =>
    fetchApi<ArtifactVersion>(`/api/v1/versions/${versionId}`),

  rollback: (
    entityType: VersionEntityType,
    entityId: number,
    targetVersion: number,
  ) =>
    fetchApi<RollbackResponse>("/api/v1/versions/rollback", {
      method: "POST",
      body: JSON.stringify({
        entity_type: entityType,
        entity_id: entityId,
        target_version: targetVersion,
      } satisfies RollbackRequest),
    }),

  compare: (
    projectId: number,
    entityType: VersionEntityType,
    entityId: number,
    v1: number,
    v2: number,
  ) =>
    fetchApi<VersionCompareRead>(
      `/api/v1/projects/${projectId}/versions/compare?entity_type=${entityType}&entity_id=${entityId}&v1=${v1}&v2=${v2}`,
    ),
};
