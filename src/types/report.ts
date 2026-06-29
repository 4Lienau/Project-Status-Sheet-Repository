export type StatusColor = "red" | "yellow" | "green";

export type ReportSectionKey =
  | "description"
  | "milestones"
  | "accomplishments"
  | "nextPeriodActivities"
  | "risks"
  | "considerations"
  | "changes"
  | "budget";

export const DEFAULT_SECTION_ORDER: ReportSectionKey[] = [
  "description",
  "milestones",
  "accomplishments",
  "nextPeriodActivities",
  "risks",
  "considerations",
  "changes",
  "budget",
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
};

export interface ReportOptions {
  sections: Record<ReportSectionKey, boolean>;
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
  sections: {
    description?: RichTextBlock[];
    milestones?: ReportMilestone[];
    accomplishments?: RichTextBlock[][];
    nextPeriodActivities?: ReportActivity[];
    risks?: ReportRisk[];
    considerations?: string[];
    changes?: ReportChange[];
    budget?: { total: number | null; actuals: number | null; forecast: number | null };
  };
}
