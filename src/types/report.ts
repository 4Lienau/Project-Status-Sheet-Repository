export type StatusColor = "red" | "yellow" | "green";

export type ReportSectionKey =
  | "description"
  | "milestones"
  | "accomplishments"
  | "nextPeriodActivities"
  | "risks"
  | "considerations"
  | "changes"
  | "budget"
  | "timeline";

export const DEFAULT_SECTION_ORDER: ReportSectionKey[] = [
  "description",
  "budget",
  "timeline",
  "milestones",
  "accomplishments",
  "nextPeriodActivities",
  "risks",
  "considerations",
  "changes",
];

export const SECTION_LABELS: Record<ReportSectionKey, string> = {
  description: "Project Description",
  milestones: "Milestones & Sub-Tasks",
  accomplishments: "Accomplishments",
  nextPeriodActivities: "Next Period Activities",
  risks: "Risks",
  considerations: "Considerations",
  changes: "Changes",
  budget: "Budget",
  timeline: "Timeline (Gantt)",
};

export interface ReportOptions {
  sections: Record<ReportSectionKey, boolean>;
  // When on, a thin "today" divider is drawn in the milestone list to flag
  // which milestones are due on/after the current date. Off by default.
  showTodayLine?: boolean;
}

// ---- rich text ----
export interface RichTextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  href?: string;
}
export interface RichTextBlock {
  type: "paragraph" | "bullet" | "number";
  spans: RichTextSpan[];
}

// ---- entities ----
export interface ReportTask {
  description: string;
  assignee: string;
  date: string;
  completion: number;
}
export interface ReportMilestone {
  milestone: string;
  owner: string;
  date: string;
  endDate: string | null;
  weight: number;
  completion: number;
  status: string;
  tasks: ReportTask[];
}
export interface ReportSubActivity {
  description: string;
  date: string;
  assignee: string;
  completion: number;
}
export interface ReportActivity {
  description: string;
  date: string;
  assignee: string;
  completion: number;
  subActivities: ReportSubActivity[];
}
export interface ReportRisk {
  description: string;
  impact: string;
}
export interface ReportChange {
  change: string;
  impact: string;
  disposition: string;
}

// ---- gantt / timeline ----
// Pre-computed geometry for the static mini-Gantt. Percentages are relative to
// the full timeline span (earliest milestone start → latest end, snapped to
// month boundaries) so renderers just position bars; no date math downstream.
export interface ReportGanttBar {
  label: string;
  leftPct: number; // bar start, 0–100 across the timeline
  widthPct: number; // bar length, 0–100
  color: StatusColor;
  startMonthIdx: number; // first month column the bar covers (for the Word grid)
  endMonthIdx: number; // last month column the bar covers
  startLabel: string;
  endLabel: string;
}
export interface ReportGantt {
  months: { label: string; leftPct: number; show: boolean }[];
  bars: ReportGanttBar[];
  todayPct: number | null; // null when today falls outside the timeline span
  todayMonthIdx: number | null; // which month column today lands in (Word grid)
}

export interface ReportHeader {
  title: string;
  department: string;
  status: string;
  healthPercentage: number;
  statusColor: StatusColor;
  projectManager: string;
  sponsors: string;
  businessLeads: string;
  startDate: string | null;
  endDate: string | null;
  budgetTotal: number | null;
  budgetActuals: number | null;
  budgetForecast: number | null;
  generatedOn: string;
}

export interface ReportModel {
  header: ReportHeader;
  enabledOrder: ReportSectionKey[];
  // Present only when ReportOptions.showTodayLine is on. The divider renders
  // just above the milestone at `beforeIndex` in the date-sorted list
  // (beforeIndex === milestones.length when every milestone is already past).
  todayLine?: { label: string; beforeIndex: number };
  sections: {
    description?: RichTextBlock[];
    milestones?: ReportMilestone[];
    accomplishments?: RichTextBlock[][];
    nextPeriodActivities?: ReportActivity[];
    risks?: ReportRisk[];
    considerations?: string[];
    changes?: ReportChange[];
    budget?: { total: number | null; actuals: number | null; forecast: number | null };
    gantt?: ReportGantt;
  };
}
