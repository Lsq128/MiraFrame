import { create } from "zustand";
import type { Project } from "@openoii/shared";

interface ProjectState {
  project: Project | null;
  isLoading: boolean;
  error: string | null;

  setProject: (project: Project) => void;
  updateProject: (partial: Partial<Project>) => void;
  clearProject: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: null,
  isLoading: false,
  error: null,

  setProject: (project) => set({ project, isLoading: false }),
  updateProject: (partial) =>
    set((state) => ({
      project: state.project ? { ...state.project, ...partial } : null,
    })),
  clearProject: () => set({ project: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
