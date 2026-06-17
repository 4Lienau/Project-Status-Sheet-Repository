import { describe, it, expect } from "vitest";
import { calculateWeightedCompletion, calculateProjectDuration } from "./project";

type TestMilestone = {
  date: string;
  end_date?: string | null;
  completion: number;
  weight?: number;
};

describe("calculateWeightedCompletion", () => {
  it("returns 0 for empty milestone list", () => {
    expect(calculateWeightedCompletion([])).toBe(0);
  });

  it("returns 100 when all milestones are 100% complete", () => {
    const milestones = [
      { completion: 100, weight: 3 },
      { completion: 100, weight: 3 },
    ] as TestMilestone[];
    expect(calculateWeightedCompletion(milestones as any)).toBe(100);
  });

  it("returns 0 when no milestones are complete", () => {
    const milestones = [
      { completion: 0, weight: 3 },
      { completion: 0, weight: 5 },
    ] as TestMilestone[];
    expect(calculateWeightedCompletion(milestones as any)).toBe(0);
  });

  it("applies weight correctly — higher-weight milestone has more influence", () => {
    const milestones = [
      { completion: 100, weight: 1 }, // 100 * 1 = 100
      { completion: 0,   weight: 3 }, // 0   * 3 = 0
    ] as TestMilestone[];
    // weighted: 100/400 = 25%
    expect(calculateWeightedCompletion(milestones as any)).toBe(25);
  });

  it("uses default weight of 3 when weight is not set", () => {
    const milestones = [
      { completion: 50 }, // weight defaults to 3 → 50*3=150 / (3*100)=300 = 50%
    ] as TestMilestone[];
    expect(calculateWeightedCompletion(milestones as any)).toBe(50);
  });
});

describe("calculateProjectDuration", () => {
  it("returns all-null for empty milestone list", () => {
    const result = calculateProjectDuration([]);
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
    expect(result.totalDays).toBeNull();
  });

  it("calculates correct total days between start and end milestone", () => {
    const milestones = [
      { date: "2025-01-01", end_date: "2025-01-01", completion: 0 },
      { date: "2025-01-11", end_date: "2025-01-11", completion: 0 },
    ] as TestMilestone[];
    const result = calculateProjectDuration(milestones as any);
    expect(result.totalDays).toBe(10);
  });

  it("uses end_date for span calculation when available", () => {
    const milestones = [
      { date: "2025-01-01", end_date: "2025-02-01", completion: 0 },
    ] as TestMilestone[];
    const result = calculateProjectDuration(milestones as any);
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
  });
});
