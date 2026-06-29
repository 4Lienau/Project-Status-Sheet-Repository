import {
  calculateWeightedCompletion,
  calculateProjectHealthStatusColor,
  type ProjectWithRelations,
} from "@/lib/services/project";
import { parseRichText, richTextToPlainText } from "@/lib/report/richText";
import {
  DEFAULT_SECTION_ORDER,
  type ReportModel,
  type ReportOptions,
  type ReportSectionKey,
} from "@/types/report";

export function defaultReportOptions(): ReportOptions {
  const sections = {} as ReportOptions["sections"];
  DEFAULT_SECTION_ORDER.forEach((k) => (sections[k] = true));
  return { sections };
}

function fmtDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const parsed = new Date(d);
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

  if (options.sections.description) {
    sections.description = parseRichText(project.description);
  }
  if (options.sections.milestones) {
    sections.milestones = [...milestones].sort(byMilestoneDate).map((m) => ({
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
  }
  if (options.sections.accomplishments) {
    sections.accomplishments = (project.accomplishments || [])
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

  return { header, enabledOrder, sections };
}
