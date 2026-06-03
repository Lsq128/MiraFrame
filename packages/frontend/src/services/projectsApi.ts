/**
 * Projects API — CRUD, generation, outline, messages, feedback.
 */
import { fetchApi } from "./client";
import type {
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  Character,
  Shot,
  StoryOutline,
  StoryOutlineUpdatePayload,
  Message,
  AgentRun,
  ProjectRevisionPayload,
} from "@/types";

export const projectsApi = {
  list: async () => (await fetchApi<Array<Project | ServerProject>>("/api/v1/projects")).map(normalizeProject),

  get: async (id: number) =>
    normalizeProject(await fetchApi<Project | ServerProject>(`/api/v1/projects/${id}`)),

  create: (data: CreateProjectPayload) =>
    fetchApi<Project | ServerProject>("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }).then(normalizeProject),

  update: (id: number, data: UpdateProjectPayload) =>
    fetchApi<Project | ServerProject>(`/api/v1/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }).then(normalizeProject),

  delete: (id: number) =>
    fetchApi<void>(`/api/v1/projects/${id}`, { method: "DELETE" }),

  deleteMany: (ids: number[]) =>
    fetchApi<void>("/api/v1/projects/batch-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  uploadReference: async (
    projectId: number,
    file: File,
  ): Promise<{ url: string; reference_images: string[] }> => {
    const formData = new FormData();
    formData.append("file", file);
    const base = (() => {
      if (typeof window === "undefined") return "http://localhost:3000";
      try { if ((import.meta as any)?.env?.DEV) return `${window.location.protocol}//${window.location.hostname}:3000`; } catch { /* */ }
      return window.location.origin;
    })();
    const res = await fetch(
      `${base}/api/v1/projects/${projectId}/upload-reference`,
      {
        method: "POST",
        body: formData,
      },
    );
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json() as Promise<{ url: string; reference_images: string[] }>;
  },

  getCharacters: async (id: number) =>
    (await fetchApi<Array<Character | ServerCharacter>>(`/api/v1/projects/${id}/characters`)).map(normalizeCharacter),

  getShots: async (id: number) =>
    (await fetchApi<Array<Shot | ServerShot>>(`/api/v1/projects/${id}/shots`)).map(normalizeShot),

  getOutline: (id: number) =>
    fetchApi<StoryOutline | null>(`/api/v1/projects/${id}/outline`),

  updateOutline: (id: number, data: StoryOutlineUpdatePayload) =>
    fetchApi<StoryOutline>(`/api/v1/projects/${id}/outline`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getMessages: async (id: number) =>
    (await fetchApi<Array<Message | ServerMessage>>(`/api/v1/projects/${id}/messages`)).map(normalizeMessage),

  getLatestRun: async (id: number) => {
    const run = await fetchApi<AgentRun | ServerAgentRun | null>(`/api/v1/projects/${id}/runs/latest`);
    return run ? normalizeAgentRun(run) : null;
  },

  generate: (
    id: number,
    data?: { seed?: number; notes?: string; auto_mode?: boolean; target_stage?: string },
  ) =>
    fetchApi<AgentRun>(`/api/v1/projects/${id}/generate`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    }),

  cancel: (id: number, runId?: number | null) =>
    fetchApi<{ status: string; cancelled: number }>(
      runId
        ? `/api/v1/projects/${id}/generate/${runId}/cancel`
        : `/api/v1/projects/${id}/generate/cancel`,
      { method: "POST" },
    ),

  resume: (id: number, runId: number, feedback?: string) =>
    fetchApi<{ status: string }>(`/api/v1/projects/${id}/generate/${runId}/resume`, {
      method: "POST",
      body: JSON.stringify({ confirm: true, feedback }),
    }),

  approveOutline: (id: number, feedback?: string) =>
    fetchApi<{ status: string; run_id?: number; resumed: boolean }>(
      `/api/v1/projects/${id}/approve-outline`,
      {
        method: "POST",
        body: JSON.stringify({ feedback }),
      },
    ),

  feedback: (
    id: number,
    content: string,
    runId?: number,
    feedbackType?: string,
    entityType?: string,
    entityId?: number,
  ) =>
    fetchApi<{ status: string; run_id?: number }>(
      `/api/v1/projects/${id}/feedback`,
      {
        method: "POST",
        body: JSON.stringify({
          content,
          run_id: runId,
          feedback_type: feedbackType,
          entity_type: entityType,
          entity_id: entityId,
        }),
      },
    ),

  submitRevision: (id: number, data: ProjectRevisionPayload) =>
    fetchApi<{ status: string; run_id?: number }>(`/api/v1/projects/${id}/revisions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

type ServerProject = Project & {
  storyOutline?: Project["story_outline"];
  visualBible?: Project["visual_bible"];
  outlineApproved?: Project["outline_approved"];
  videoUrl?: Project["video_url"];
  targetShotCount?: Project["target_shot_count"];
  characterHints?: Project["character_hints"];
  creationMode?: Project["creation_mode"];
  referenceImages?: Project["reference_images"];
  createdAt?: Project["created_at"];
  updatedAt?: Project["updated_at"];
  universeId?: Project["universe_id"];
  chapterNumber?: Project["chapter_number"];
  chapterTitle?: Project["chapter_title"];
};

type ServerMessage = Message & {
  projectId?: Message["project_id"];
  runId?: Message["run_id"];
  isLoading?: Message["is_loading"];
  createdAt?: Message["created_at"];
};

type ServerCharacter = Character & {
  projectId?: Character["project_id"];
  imageUrl?: Character["image_url"];
  referenceImages?: Character["reference_images"];
  visualNotes?: Character["visual_notes"];
  approvedName?: Character["approved_name"];
  approvedDescription?: Character["approved_description"];
  approvedImageUrl?: Character["approved_image_url"];
};

type ServerShot = Shot & {
  projectId?: Shot["project_id"];
  imageUrl?: Shot["image_url"];
  videoUrl?: Shot["video_url"];
  imagePrompt?: Shot["image_prompt"];
  motionNote?: Shot["motion_note"];
};

type ServerAgentRun = AgentRun & {
  projectId?: AgentRun["project_id"];
  currentAgent?: AgentRun["current_agent"];
  threadId?: AgentRun["thread_id"];
  resourceType?: AgentRun["resource_type"];
  resourceId?: AgentRun["resource_id"];
  providerSnapshot?: AgentRun["provider_snapshot"];
  createdAt?: AgentRun["created_at"];
  updatedAt?: AgentRun["updated_at"];
};

function normalizeProject(project: Project | ServerProject): Project {
  const p = project as ServerProject;
  return {
    ...p,
    story_outline: p.story_outline ?? p.storyOutline ?? null,
    visual_bible: p.visual_bible ?? p.visualBible ?? null,
    outline_approved: p.outline_approved ?? p.outlineApproved ?? false,
    video_url: p.video_url ?? p.videoUrl ?? null,
    target_shot_count: p.target_shot_count ?? p.targetShotCount ?? undefined,
    character_hints: p.character_hints ?? p.characterHints ?? null,
    creation_mode: p.creation_mode ?? p.creationMode ?? null,
    reference_images: p.reference_images ?? p.referenceImages ?? null,
    created_at: p.created_at ?? p.createdAt ?? "",
    updated_at: p.updated_at ?? p.updatedAt ?? "",
    universe_id: p.universe_id ?? p.universeId ?? null,
    chapter_number: p.chapter_number ?? p.chapterNumber ?? null,
    chapter_title: p.chapter_title ?? p.chapterTitle ?? null,
  };
}

function normalizeMessage(message: Message | ServerMessage): Message {
  const m = message as ServerMessage;
  return {
    ...m,
    project_id: m.project_id ?? m.projectId ?? 0,
    run_id: m.run_id ?? m.runId ?? null,
    is_loading: m.is_loading ?? m.isLoading ?? false,
    created_at: m.created_at ?? m.createdAt ?? "",
  };
}

function normalizeCharacter(character: Character | ServerCharacter): Character {
  const c = character as ServerCharacter;
  return {
    ...c,
    project_id: c.project_id ?? c.projectId ?? 0,
    image_url: c.image_url ?? c.imageUrl ?? null,
    reference_images: c.reference_images ?? c.referenceImages ?? null,
    visual_notes: c.visual_notes ?? c.visualNotes ?? null,
    approved_name: c.approved_name ?? c.approvedName ?? null,
    approved_description: c.approved_description ?? c.approvedDescription ?? null,
    approved_image_url: c.approved_image_url ?? c.approvedImageUrl ?? null,
  };
}

function normalizeShot(shot: Shot | ServerShot): Shot {
  const s = shot as ServerShot;
  return {
    ...s,
    project_id: s.project_id ?? s.projectId ?? 0,
    image_url: s.image_url ?? s.imageUrl ?? null,
    video_url: s.video_url ?? s.videoUrl ?? null,
    image_prompt: s.image_prompt ?? s.imagePrompt ?? undefined,
    motion_note: s.motion_note ?? s.motionNote ?? undefined,
  };
}

function normalizeAgentRun(run: AgentRun | ServerAgentRun): AgentRun {
  const r = run as ServerAgentRun;
  return {
    ...r,
    project_id: r.project_id ?? r.projectId ?? 0,
    current_agent: r.current_agent ?? r.currentAgent ?? undefined,
    thread_id: r.thread_id ?? r.threadId ?? undefined,
    resource_type: r.resource_type ?? r.resourceType ?? undefined,
    resource_id: r.resource_id ?? r.resourceId ?? undefined,
    provider_snapshot: r.provider_snapshot ?? r.providerSnapshot ?? null,
    created_at: r.created_at ?? r.createdAt ?? "",
    updated_at: r.updated_at ?? r.updatedAt ?? "",
  };
}
