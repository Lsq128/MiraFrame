import { describe, it, expect } from "vitest";
import { useProjectStore } from "../stores/projectStore";
import type { Project } from "@/types";
import { cn } from "../lib/utils";

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 1,
  title: "Test Project",
  story: undefined,
  style: undefined,
  summary: undefined,
  video_url: undefined,
  status: "draft",
  target_shot_count: undefined,
  character_hints: [],
  creation_mode: undefined,
  reference_images: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  provider_settings: {
    text: {
      selected_key: "openai",
      source: "default",
      resolved_key: "openai",
      valid: true,
      status: "valid",
    },
    image: {
      selected_key: "openai",
      source: "default",
      resolved_key: "openai",
      valid: true,
      status: "valid",
    },
    video: {
      selected_key: "openai",
      source: "default",
      resolved_key: "openai",
      valid: true,
      status: "valid",
    },
  },
  ...overrides,
});

describe("projectStore", () => {
  it("initializes with null project", () => {
    const { project } = useProjectStore.getState();
    expect(project).toBeNull();
  });

  it("setProject updates state", () => {
    const mock = makeProject({ title: "My Title" });
    useProjectStore.getState().setProject(mock);
    expect(useProjectStore.getState().project?.title).toBe("My Title");

    useProjectStore.getState().clearProject();
    expect(useProjectStore.getState().project).toBeNull();
  });

  it("updateProject merges partial", () => {
    const mock = makeProject({ title: "Original" });
    useProjectStore.getState().setProject(mock);
    useProjectStore.getState().updateProject({ title: "Updated" });
    expect(useProjectStore.getState().project?.title).toBe("Updated");
  });
});

describe("cn (className utility)", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
    expect(cn("px-4", "px-2")).toBe("px-2");
  });
});
