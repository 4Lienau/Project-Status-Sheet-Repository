import { describe, it, expect } from "vitest";
import { aiService } from "./aiService";

describe("aiService.ensureMandatoryMilestones", () => {
  it("adds Project Kickoff at start when missing", () => {
    const milestones = [{ milestone: "Design Phase", owner: "Designer", completion: 0, status: "green" }];
    const result = aiService.ensureMandatoryMilestones(milestones);
    expect(result[0].milestone).toBe("Project Kickoff");
  });

  it("adds Project Closeout at end when missing", () => {
    const milestones = [{ milestone: "Design Phase", owner: "Designer", completion: 0, status: "green" }];
    const result = aiService.ensureMandatoryMilestones(milestones);
    expect(result[result.length - 1].milestone).toBe("Project Closeout");
  });

  it("does not duplicate Kickoff when already present", () => {
    const milestones = [
      { milestone: "Project Kickoff", owner: "PM", completion: 0, status: "green" },
      { milestone: "Design Phase", owner: "Designer", completion: 0, status: "green" },
      { milestone: "Project Closeout", owner: "PM", completion: 0, status: "green" },
    ];
    const result = aiService.ensureMandatoryMilestones(milestones);
    const kickoffs = result.filter((m: any) => m.milestone.toLowerCase().includes("kickoff"));
    expect(kickoffs).toHaveLength(1);
  });

  it("moves existing Kickoff to first position", () => {
    const milestones = [
      { milestone: "Design Phase", owner: "Designer", completion: 0, status: "green" },
      { milestone: "Project Kickoff", owner: "PM", completion: 0, status: "green" },
    ];
    const result = aiService.ensureMandatoryMilestones(milestones);
    expect(result[0].milestone).toBe("Project Kickoff");
  });
});

describe("aiService.validateMilestoneQuality", () => {
  it("returns isValid:true for well-formed milestones", () => {
    const milestones = [
      { milestone: "Project Kickoff", owner: "Project Manager", completion: 0, status: "green" },
    ];
    const result = aiService.validateMilestoneQuality(milestones);
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("flags milestone with name shorter than 5 characters", () => {
    const milestones = [{ milestone: "Hi", owner: "PM", completion: 0, status: "green" }];
    const result = aiService.validateMilestoneQuality(milestones);
    expect(result.isValid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("flags milestone with missing owner", () => {
    const milestones = [{ milestone: "Design Phase Complete", owner: "", completion: 0, status: "green" }];
    const result = aiService.validateMilestoneQuality(milestones);
    expect(result.isValid).toBe(false);
  });
});
