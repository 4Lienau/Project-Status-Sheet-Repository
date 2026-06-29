import {
  calculateWeightedCompletion,
  calculateProjectHealthStatusColor,
  type ProjectWithRelations,
} from "@/lib/services/project";
import { parseRichText, richTextToPlainText } from "@/lib/report/richText";
import { milestoneStatusColor } from "@/lib/report/branding";
import {
  DEFAULT_SECTION_ORDER,
  type ReportGantt,
  type ReportModel,
  type ReportOptions,
  type ReportSectionKey,
} from "@/types/report";

export function defaultReportOptions(): ReportOptions {
  const sections = {} as ReportOptions["sections"];
  DEFAULT_SECTION_ORDER.forEach((k) => (sections[k] = true));
  // The Gantt/timeline section is opt-in — it's a richer visual, off by default.
  sections.timeline = false;
  return { sections, showTodayLine: false };
}

// Today's date as a local YYYY-MM-DD string. Milestone dates are stored as
// YYYY-MM-DD, so a lexicographic string compare gives a correct chronological
// comparison without any timezone shift (see fmtDate's note on UTC parsing).
function todayYmd(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Parse a plain YYYY-MM-DD string into a LOCAL Date (UTC parsing shifts the day
// in negative-offset zones — see fmtDate). Returns null if unparseable.
function parseLocalYmd(d: string | null | undefined): Date | null {
  if (!d) return null;
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  const parsed = ymd
    ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    : new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Builds the static mini-Gantt geometry from raw milestones. Mirrors the
// dashboard GanttChart's range logic (earliest start → latest end) but emits
// plain percentages so the report draws print-safe CSS bars instead of the
// interactive GSTC widget.
function buildGantt(milestones: any[], today: Date): ReportGantt | undefined {
  const parsed = milestones
    .map((m) => {
      const start = parseLocalYmd(m.date);
      if (!start) return null;
      const endRaw = parseLocalYmd(m.end_date);
      const end = endRaw && endRaw.getTime() >= start.getTime() ? endRaw : start;
      return { m, start, end };
    })
    .filter((b): b is { m: any; start: Date; end: Date } => b !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (!parsed.length) return undefined;

  const minD = new Date(Math.min(...parsed.map((b) => b.start.getTime())));
  const maxD = new Date(Math.max(...parsed.map((b) => b.end.getTime())));
  // Snap the span to whole months: first of the earliest month → first of the
  // month after the latest end, so the axis lands on clean month boundaries.
  const rangeStart = new Date(minD.getFullYear(), minD.getMonth(), 1);
  const rangeEnd = new Date(maxD.getFullYear(), maxD.getMonth() + 1, 1);
  const span = rangeEnd.getTime() - rangeStart.getTime() || 1;
  const pct = (t: number) => ((t - rangeStart.getTime()) / span) * 100;

  // Month columns. Label the first month and each January with a 2-digit year.
  const months: ReportGantt["months"] = [];
  let cur = new Date(rangeStart);
  while (cur.getTime() < rangeEnd.getTime()) {
    const mon = cur.toLocaleDateString("en-US", { month: "short" });
    months.push({
      label:
        months.length === 0 || cur.getMonth() === 0
          ? `${mon} '${String(cur.getFullYear()).slice(2)}`
          : mon,
      leftPct: pct(cur.getTime()),
      show: true,
    });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  // Thin labels when months are dense so they don't collide.
  const step = Math.ceil(months.length / 12);
  if (step > 1) months.forEach((mo, i) => (mo.show = i % step === 0));

  const monthIdx = (d: Date) => {
    const idx =
      (d.getFullYear() - rangeStart.getFullYear()) * 12 +
      (d.getMonth() - rangeStart.getMonth());
    return Math.max(0, Math.min(months.length - 1, idx));
  };

  const bars = parsed.map((b) => {
    const leftPct = pct(b.start.getTime());
    // Guarantee a sliver of width for zero-length (single-day) milestones.
    const widthPct = Math.max(pct(b.end.getTime()) - leftPct, 1.5);
    return {
      label: richTextToPlainText(b.m.milestone) || "Untitled milestone",
      leftPct,
      widthPct,
      color: milestoneStatusColor(b.m.status || "green"),
      startMonthIdx: monthIdx(b.start),
      endMonthIdx: monthIdx(b.end),
      startLabel: fmtDate(b.m.date) || "—",
      endLabel: fmtDate(b.m.end_date) || fmtDate(b.m.date) || "—",
    };
  });

  const inRange =
    today.getTime() >= rangeStart.getTime() &&
    today.getTime() <= rangeEnd.getTime();

  return {
    months,
    bars,
    todayPct: inRange ? pct(today.getTime()) : null,
    todayMonthIdx: inRange ? monthIdx(today) : null,
  };
}

function fmtDate(d: string | null | undefined): string | null {
  if (!d) return null;
  // Plain YYYY-MM-DD strings must be parsed as LOCAL dates, not UTC — otherwise
  // `new Date("2026-07-10")` is UTC midnight and toLocaleDateString shifts it a
  // day earlier in negative-offset timezones. Mirrors the edit component's
  // local-date parsing (MilestoneItem/TaskList).
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  const parsed = ymd
    ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    : new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Ordering helpers that reproduce the project edit component's display order so
// the report lists milestones and sub-tasks exactly as the PM arranged them.
// Both sort on the RAW (YYYY-MM-DD) date, so they must run before fmtDate().
function byMilestoneDate(a: { date: string }, b: { date: string }): number {
  // Mirrors MilestoneList.tsx — start date ascending (earliest first).
  return new Date(a.date).getTime() - new Date(b.date).getTime();
}

function byTaskDate(
  a: { date?: string | null },
  b: { date?: string | null },
): number {
  // Mirrors TaskList.tsx — start date ascending, empty/missing dates last.
  const ad = a.date;
  const bd = b.date;
  if (!ad && !bd) return 0;
  if (!ad) return 1;
  if (!bd) return -1;
  return ad.localeCompare(bd);
}

export function buildReportModel(
  project: ProjectWithRelations,
  options: ReportOptions,
): ReportModel {
  const milestones = project.milestones || [];
  const healthPercentage = calculateWeightedCompletion(milestones);
  const statusColor = calculateProjectHealthStatusColor(project, milestones);

  const header: ReportModel["header"] = {
    title: richTextToPlainText(project.title) || "Untitled Project",
    department: project.department || "—",
    status: project.status || "active",
    healthPercentage,
    statusColor,
    projectManager: project.project_manager || "—",
    sponsors: project.sponsors || "—",
    businessLeads: project.business_leads || "—",
    startDate: fmtDate(project.calculated_start_date),
    endDate: fmtDate(project.calculated_end_date),
    budgetTotal: project.budget_total ?? null,
    budgetActuals: project.budget_actuals ?? null,
    budgetForecast: project.budget_forecast ?? null,
    generatedOn: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };

  const enabledOrder = DEFAULT_SECTION_ORDER.filter(
    (k) => options.sections[k],
  ) as ReportSectionKey[];

  const sections: ReportModel["sections"] = {};
  let todayLine: ReportModel["todayLine"];

  if (options.sections.description) {
    sections.description = parseRichText(project.description);
  }
  if (options.sections.milestones) {
    const sortedMs = [...milestones].sort(byMilestoneDate);
    sections.milestones = sortedMs.map((m) => ({
      milestone: richTextToPlainText(m.milestone) || "Untitled milestone",
      owner: m.owner || "—",
      date: fmtDate(m.date) || "—",
      endDate: fmtDate(m.end_date),
      weight: m.weight ?? 3,
      completion: m.completion ?? 0,
      status: m.status || "green",
      tasks: [...(m.tasks || [])].sort(byTaskDate).map((t) => ({
        description: richTextToPlainText(t.description) || "—",
        assignee: t.assignee || "—",
        date: fmtDate(t.date) || "—",
        completion: t.completion ?? 0,
      })),
    }));

    if (options.showTodayLine) {
      // Place the divider just above the first milestone whose DUE date
      // (end date, falling back to start) is today or later, scanning the
      // already date-sorted list top-down. No match ⇒ every milestone is past,
      // so beforeIndex lands at the end (line drawn below the last one).
      const today = todayYmd();
      let beforeIndex = sortedMs.length;
      for (let i = 0; i < sortedMs.length; i++) {
        const due = (sortedMs[i].end_date || sortedMs[i].date || "").slice(0, 10);
        if (due && due >= today) {
          beforeIndex = i;
          break;
        }
      }
      todayLine = { label: `Today · ${fmtDate(today)}`, beforeIndex };
    }
  }
  if (options.sections.accomplishments) {
    sections.accomplishments = (project.accomplishments || [])
      // Match the edit component (AccomplishmentsSection): only accomplishments
      // visible there — excluding hidden and deleted — belong in the report.
      .filter((a: any) => typeof a === "string" || (!a?.is_hidden && !a?.is_deleted))
      .map((a: any) => parseRichText(a?.description ?? (typeof a === "string" ? a : "")))
      .filter((blocks) => blocks.length > 0);
  }
  if (options.sections.nextPeriodActivities) {
    sections.nextPeriodActivities = (project.next_period_activities || []).map((a) => ({
      description: richTextToPlainText(a.description) || "—",
      date: fmtDate(a.date) || "—",
      assignee: a.assignee || "—",
      completion: a.completion ?? 0,
      subActivities: (a.sub_activities || []).map((s) => ({
        description: richTextToPlainText(s.description) || "—",
        date: fmtDate(s.date) || "—",
        assignee: s.assignee || "—",
        completion: s.completion ?? 0,
      })),
    }));
  }
  if (options.sections.risks) {
    sections.risks = (project.risks || []).map((r: any) => ({
      description: richTextToPlainText(r.description) || "—",
      impact: richTextToPlainText(r.impact) || "—",
    }));
  }
  if (options.sections.considerations) {
    sections.considerations = (project.considerations || [])
      .map((c) => richTextToPlainText(typeof c === "string" ? c : (c as any)?.description))
      .filter((c) => c.length > 0);
  }
  if (options.sections.changes) {
    sections.changes = (project.changes || []).map((c) => ({
      change: richTextToPlainText(c.change) || "—",
      impact: richTextToPlainText(c.impact) || "—",
      disposition: richTextToPlainText(c.disposition) || "—",
    }));
  }
  if (options.sections.budget) {
    sections.budget = {
      total: project.budget_total ?? null,
      actuals: project.budget_actuals ?? null,
      forecast: project.budget_forecast ?? null,
    };
  }
  if (options.sections.timeline) {
    sections.gantt = buildGantt(milestones, new Date());
  }

  return { header, enabledOrder, todayLine, sections };
}
