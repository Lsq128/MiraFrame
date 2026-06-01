import { create } from "zustand";
import type {
  Project,
  ProjectProviderSettings,
  StoryOutline,
  BlockingClip,
} from "@/types";

interface ProjectState {
  // Core project object
  project: Project | null;
  isLoading: boolean;
  error: string | null;

  // Flat project metadata fields (for fine-grained subscriptions)
  projectVideoUrl: string | null;
  projectStatus: string | null;
  projectUpdatedAt: number | null;
  projectTitle: string | null;
  projectSummary: string | null;
  projectStoryOutline: StoryOutline | null;
  projectVisualBible: string | null;
  projectOutlineApproved: boolean;
  projectStory: string | null;
  projectStyle: string | null;
  projectTargetShotCount: number | null;
  projectCharacterHints: string[] | null;
  projectCreationMode: string | null;
  projectReferenceImages: string[] | null;
  projectExports: string[] | null;
  projectProviderSettings: ProjectProviderSettings | null;
  projectUniverseId: number | null;
  projectChapterNumber: number | null;
  projectChapterTitle: string | null;
  blockingClips: BlockingClip[] | null;

  // Actions
  setProject: (project: Project) => void;
  updateProject: (partial: Partial<Project>) => void;
  clearProject: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Individual field setters (for WS event handlers)
  setProjectVideoUrl: (url: string | null) => void;
  setProjectStatus: (status: string | null) => void;
  setProjectUpdatedAt: (ts: number | null) => void;
  setProjectTitle: (title: string | null) => void;
  setProjectSummary: (summary: string | null) => void;
  setProjectStoryOutline: (outline: StoryOutline | null) => void;
  setProjectVisualBible: (bible: string | null) => void;
  setProjectOutlineApproved: (approved: boolean) => void;
  setProjectStory: (story: string | null) => void;
  setProjectStyle: (style: string | null) => void;
  setProjectTargetShotCount: (count: number | null) => void;
  setProjectCharacterHints: (hints: string[] | null) => void;
  setProjectCreationMode: (mode: string | null) => void;
  setProjectReferenceImages: (images: string[] | null) => void;
  setProjectExports: (exports: string[] | null) => void;
  setProjectProviderSettings: (settings: ProjectProviderSettings | null) => void;
  setProjectUniverseId: (id: number | null) => void;
  setProjectChapterNumber: (num: number | null) => void;
  setProjectChapterTitle: (title: string | null) => void;
  setBlockingClips: (clips: BlockingClip[] | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: null,
  isLoading: false,
  error: null,

  projectVideoUrl: null,
  projectStatus: null,
  projectUpdatedAt: null,
  projectTitle: null,
  projectSummary: null,
  projectStoryOutline: null,
  projectVisualBible: null,
  projectOutlineApproved: false,
  projectStory: null,
  projectStyle: null,
  projectTargetShotCount: null,
  projectCharacterHints: null,
  projectCreationMode: null,
  projectReferenceImages: null,
  projectExports: null,
  projectProviderSettings: null,
  projectUniverseId: null,
  projectChapterNumber: null,
  projectChapterTitle: null,
  blockingClips: null,

  setProject: (project) =>
    set({
      project,
      isLoading: false,
      // Sync flat fields
      projectVideoUrl: project.video_url ?? null,
      projectStatus: project.status ?? null,
      projectUpdatedAt: project.updated_at ? new Date(project.updated_at).getTime() : null,
      projectTitle: project.title ?? null,
      projectSummary: project.summary ?? null,
      projectStoryOutline: project.story_outline ?? null,
      projectVisualBible: project.visual_bible ?? null,
      projectOutlineApproved: project.outline_approved ?? false,
      projectStory: project.story ?? null,
      projectStyle: project.style ?? null,
      projectTargetShotCount: project.target_shot_count ?? null,
      projectCharacterHints: project.character_hints ?? null,
      projectCreationMode: project.creation_mode ?? null,
      projectReferenceImages: project.reference_images ?? null,
      projectExports: project.exports ?? null,
      projectProviderSettings: project.provider_settings ?? null,
      projectUniverseId: project.universe_id ?? null,
      projectChapterNumber: project.chapter_number ?? null,
      projectChapterTitle: project.chapter_title ?? null,
    }),

  updateProject: (partial) =>
    set((state) => {
      const updated = state.project ? { ...state.project, ...partial } : null;
      return {
        project: updated as Project | null,
        // Sync flat fields from partial
        ...(partial.video_url !== undefined && { projectVideoUrl: partial.video_url }),
        ...(partial.status !== undefined && { projectStatus: partial.status }),
        ...(partial.summary !== undefined && { projectSummary: partial.summary }),
        ...(partial.story_outline !== undefined && { projectStoryOutline: partial.story_outline }),
        ...(partial.visual_bible !== undefined && { projectVisualBible: partial.visual_bible }),
        ...(partial.outline_approved !== undefined && { projectOutlineApproved: partial.outline_approved }),
        ...(partial.story !== undefined && { projectStory: partial.story }),
        ...(partial.style !== undefined && { projectStyle: partial.style }),
        ...(partial.target_shot_count !== undefined && { projectTargetShotCount: partial.target_shot_count }),
        ...(partial.character_hints !== undefined && { projectCharacterHints: partial.character_hints }),
        ...(partial.creation_mode !== undefined && { projectCreationMode: partial.creation_mode }),
        ...(partial.reference_images !== undefined && { projectReferenceImages: partial.reference_images }),
        ...(partial.exports !== undefined && { projectExports: partial.exports }),
        ...(partial.provider_settings !== undefined && { projectProviderSettings: partial.provider_settings }),
        ...(partial.universe_id !== undefined && { projectUniverseId: partial.universe_id }),
        ...(partial.chapter_number !== undefined && { projectChapterNumber: partial.chapter_number }),
        ...(partial.chapter_title !== undefined && { projectChapterTitle: partial.chapter_title }),
      };
    }),

  clearProject: () =>
    set({
      project: null,
      projectVideoUrl: null,
      projectStatus: null,
      projectUpdatedAt: null,
      projectTitle: null,
      projectSummary: null,
      projectStoryOutline: null,
      projectVisualBible: null,
      projectOutlineApproved: false,
      projectStory: null,
      projectStyle: null,
      projectTargetShotCount: null,
      projectCharacterHints: null,
      projectCreationMode: null,
      projectReferenceImages: null,
      projectExports: null,
      projectProviderSettings: null,
      projectUniverseId: null,
      projectChapterNumber: null,
      projectChapterTitle: null,
      blockingClips: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  setProjectVideoUrl: (url) => set({ projectVideoUrl: url }),
  setProjectStatus: (status) => set({ projectStatus: status }),
  setProjectUpdatedAt: (ts) => set({ projectUpdatedAt: ts }),
  setProjectTitle: (title) => set({ projectTitle: title }),
  setProjectSummary: (summary) => set({ projectSummary: summary }),
  setProjectStoryOutline: (outline) => set({ projectStoryOutline: outline }),
  setProjectVisualBible: (bible) => set({ projectVisualBible: bible }),
  setProjectOutlineApproved: (approved) => set({ projectOutlineApproved: approved }),
  setProjectStory: (story) => set({ projectStory: story }),
  setProjectStyle: (style) => set({ projectStyle: style }),
  setProjectTargetShotCount: (count) => set({ projectTargetShotCount: count }),
  setProjectCharacterHints: (hints) => set({ projectCharacterHints: hints }),
  setProjectCreationMode: (mode) => set({ projectCreationMode: mode }),
  setProjectReferenceImages: (images) => set({ projectReferenceImages: images }),
  setProjectExports: (exports) => set({ projectExports: exports }),
  setProjectProviderSettings: (settings) => set({ projectProviderSettings: settings }),
  setProjectUniverseId: (id) => set({ projectUniverseId: id }),
  setProjectChapterNumber: (num) => set({ projectChapterNumber: num }),
  setProjectChapterTitle: (title) => set({ projectChapterTitle: title }),
  setBlockingClips: (clips) => set({ blockingClips: clips }),
}));
