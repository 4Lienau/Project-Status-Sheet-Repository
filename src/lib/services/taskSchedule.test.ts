import { describe, it, expect } from "vitest";
import { getTaskEndDate, getTaskDurationDays, getTaskRisk } from "./taskSchedule";

describe("task end date <-> days (inclusive calendar days)", () => {
  it("derives the end date from start + days", () => {
    expect(getTaskEndDate("2026-10-05", 1)).toBe("2026-10-05");
    expect(getTaskEndDate("2026-10-05", 5)).toBe("2026-10-09");
    expect(getTaskEndDate("2026-10-30", 5)).toBe("2026-11-03"); // across month + DST change
    expect(getTaskEndDate("", 5)).toBe("");
  });

  it("derives days from start + end, never below 1", () => {
    expect(getTaskDurationDays("2026-10-05", "2026-10-09")).toBe(5);
    expect(getTaskDurationDays("2026-10-05", "2026-10-12")).toBe(8);
    expect(getTaskDurationDays("2026-10-05", "2026-10-01")).toBe(1);
  });

  it("round-trips", () => {
    expect(getTaskDurationDays("2026-10-05", getTaskEndDate("2026-10-05", 12))).toBe(12);
  });
});

describe("getTaskRisk", () => {
  const task = (completion: number) => ({ date: "2026-10-05", duration_days: 10, completion });

  it("has no dot without a start date", () => {
    expect(getTaskRisk({ date: "", completion: 0 }, "2026-10-15")).toBeNull();
  });

  it("is green when complete or not started", () => {
    expect(getTaskRisk(task(100), "2026-12-01")?.color).toBe("green");
    expect(getTaskRisk(task(0), "2026-10-01")?.color).toBe("green");
  });

  it("is red when past the end date and incomplete", () => {
    expect(getTaskRisk(task(95), "2026-10-15")?.color).toBe("red");
  });

  it("compares actual % to expected % from days elapsed", () => {
    // 2026-10-10 is day 6 of 10 -> 5 days elapsed -> expected 50%
    expect(getTaskRisk(task(45), "2026-10-10")?.color).toBe("green"); // gap 5
    expect(getTaskRisk(task(35), "2026-10-10")?.color).toBe("yellow"); // gap 15
    expect(getTaskRisk(task(20), "2026-10-10")?.color).toBe("red"); // gap 30
    expect(getTaskRisk(task(0), "2026-10-05")?.color).toBe("green"); // day 1 expects 0%
  });
});
