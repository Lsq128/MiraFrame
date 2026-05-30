import { describe, it, expect } from "vitest";
import { nextStage, PHASE2_STAGES } from "../constants/stages";

describe("nextStage", () => {
  it("returns the next stage for a valid input", () => {
    expect(nextStage("plan_outline")).toBe("outline_approval");
    expect(nextStage("outline_approval")).toBe("plan_characters");
  });

  it("returns null for the last stage", () => {
    expect(nextStage("add_audio")).toBeNull();
  });

  it("all stages except last have a next stage", () => {
    for (let i = 0; i < PHASE2_STAGES.length - 1; i++) {
      expect(nextStage(PHASE2_STAGES[i])).not.toBeNull();
    }
  });
});
