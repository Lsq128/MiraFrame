import { describe, it, expect } from "vitest";
import { useProjectStore } from "../stores/projectStore";
import type { Project } from "@openoii/shared";
import { cn } from "../lib/utils";

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "00000000-0000-0000-0000-000000000001",
  title: "Test Project",
  story: null,
  style: null,
  summary: null,
  visualBible: null,
  videoUrl: null,
  status: "draft",
  targetShotCount: null,
  characterHints: [],
  creationMode: null,
  referenceImages: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  providerSettings: {
    text: {
      selectedKey: "openai",
      source: "default",
      resolvedKey: "openai",
      valid: true,
      status: "valid",
      reasonCode: null,
      reasonMessage: null,
      capabilities: null,
    },
    image: {
      selectedKey: "openai",
      source: "default",
      resolvedKey: "openai",
      valid: true,
      status: "valid",
      reasonCode: null,
      reasonMessage: null,
      capabilities: null,
    },
    video: {
      selectedKey: "openai",
      source: "default",
      resolvedKey: "openai",
      valid: true,
      status: "valid",
      reasonCode: null,
      reasonMessage: null,
      capabilities: null,
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
    expect(cn("px-4", "px-2")).toBe("px-2"); // tailwind-merge resolves conflict
  });
});
