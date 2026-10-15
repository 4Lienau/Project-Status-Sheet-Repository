// Task scheduling math. A task is stored as start date + duration_days; the end date
// is derived (inclusive calendar days: a 1-day task ends on its start date).
// Dates are "YYYY-MM-DD" strings, computed in UTC so DST/timezones never shift a day.

const DAY_MS = 86_400_000;
const toUtc = (date: string) => Date.parse(`${date}T00:00:00Z`);

export const getTaskEndDate = (start: string, durationDays?: number): string =>
  start
    ? new Date(toUtc(start) + (Math.max(1, durationDays || 1) - 1) * DAY_MS)
        .toISOString()
        .slice(0, 10)
    : "";

export const getTaskDurationDays = (start: string, end: string): number =>
  Math.max(1, Math.round((toUtc(end) - toUtc(start)) / DAY_MS) + 1);

export type TaskRisk = { color: "green" | "yellow" | "red"; reason: string };

// ponytail: fixed thresholds on "expected % (days elapsed / duration) minus actual %";
// move to settings if managers want to tune them.
const YELLOW_GAP = 10;
const RED_GAP = 25;

export const getTaskRisk = (
  task: { date: string; duration_days?: number; completion: number },
  today: string,
): TaskRisk | null => {
  if (!task.date) return null;
  const completion = task.completion || 0;
  const duration = Math.max(1, task.duration_days || 1);
  const end = getTaskEndDate(task.date, duration);

  if (completion >= 100) return { color: "green", reason: "Complete" };
  if (today < task.date) return { color: "green", reason: "Not started yet" };
  if (today > end) {
    return { color: "red", reason: `Overdue: ended ${end}, ${completion}% complete` };
  }

  // Days fully elapsed before today, so day 1 expects 0%
  const elapsed = getTaskDurationDays(task.date, today) - 1;
  const expected = Math.round((elapsed / duration) * 100);
  const gap = expected - completion;
  const color = gap > RED_GAP ? "red" : gap > YELLOW_GAP ? "yellow" : "green";
  return {
    color,
    reason: `Day ${elapsed + 1} of ${duration}: expected ~${expected}%, actual ${completion}%`,
  };
};
