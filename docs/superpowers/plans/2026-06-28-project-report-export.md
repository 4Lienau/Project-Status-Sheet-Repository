# Project Report Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ReWa-branded, full-layout project report with a live on-screen preview, toggleable sections, and native Word (`.docx`) + PDF export — generated from saved project data.

**Architecture:** A single `buildReportModel(project, options)` normalizes a `ProjectWithRelations` into a `ReportModel`. Three thin renderers consume that model: an HTML preview (React/Tailwind), a `docx` generator (Word), and a `@react-pdf/renderer` generator (PDF). Branding lives once in `src/lib/report/branding.ts`. A full-screen dialog opened from `ProjectForm` re-fetches saved data, shows the preview with section toggles, and triggers exports.

**Tech Stack:** React 18 + TypeScript + Vite, Supabase (data via existing `projectService.getProject`), `@react-pdf/renderer` (PDF), `docx` (Word), shadcn/Radix UI (Dialog, Checkbox, ScrollArea, Separator), Tailwind.

## Global Constraints

- **No image/screenshot rendering.** Do NOT use `html2canvas`, jsPDF `.html()`, or html2pdf.js anywhere in this feature. Exports must be native text/layout primitives so they paginate and stay selectable.
- **Saved data only.** The report renders from `projectService.getProject(projectId)` (persisted `ProjectWithRelations`), never from live `ProjectForm` form state.
- **Sub-tasks are visually indented** beneath their parent milestone in all three outputs (preview, PDF, Word).
- **Path alias:** import app modules via `@/` (maps to `src/`).
- **No test runner exists.** Automated gate for every task = `npm run build` (runs `tsc` type-check + Vite build). UI/export behavior is verified manually with `netlify dev` (served at `http://localhost:8888`). Do NOT add a test framework.
- **TypeScript `strict: false`** is the project setting — match existing typing style; `any` is acceptable where the codebase already uses it (e.g. `ProjectForm` props).
- **Brand colors (verbatim):** primary blue `#1D4ED8`, lighter blue `#3B82F6`; status green `#16A34A`, yellow `#CA8A04`, red `#DC2626`. Logo served at `/images/rewa-logo-color.png` (file: `public/images/rewa-logo-color.png`).
- **Commit after each task** on branch `feature/project-report-export`.

---

### Task 1: Dependencies, branding constants, and report types

**Files:**
- Modify: `package.json` (add deps)
- Create: `src/lib/report/branding.ts`
- Create: `src/types/report.ts`

**Interfaces:**
- Produces: `BRAND` (color/logo/label constants); types `ReportSectionKey`, `ReportOptions`, `StatusColor`, `RichTextSpan`, `RichTextBlock`, `ReportTask`, `ReportMilestone`, `ReportSubActivity`, `ReportActivity`, `ReportRisk`, `ReportChange`, `ReportHeader`, `ReportModel`, `SECTION_LABELS`, `DEFAULT_SECTION_ORDER`.

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install @react-pdf/renderer@^4.0.0 docx@^9.0.0
```
Expected: both added to `package.json` dependencies, `package-lock.json` updated, no peer-dep errors that fail install.

- [ ] **Step 2: Create branding constants**

Create `src/lib/report/branding.ts`:
```ts
// Single source of brand styling for all three report renderers.
import type { StatusColor } from "@/types/report";

export const BRAND = {
  logoUrl: "/images/rewa-logo-color.png",
  name: "ReWa",
  reportTitle: "Project Report",
  colors: {
    primary: "#1D4ED8",
    primaryLight: "#3B82F6",
    text: "#1F2937",
    muted: "#6B7280",
    border: "#E5E7EB",
    headerBandText: "#FFFFFF",
    tableHeaderBg: "#1D4ED8",
    tableStripe: "#F3F4F6",
    statusGreen: "#16A34A",
    statusYellow: "#CA8A04",
    statusRed: "#DC2626",
    statusGreenBg: "#DCFCE7",
    statusYellowBg: "#FEF9C3",
    statusRedBg: "#FEE2E2",
  },
} as const;

export const STATUS_COLOR_HEX: Record<StatusColor, string> = {
  green: BRAND.colors.statusGreen,
  yellow: BRAND.colors.statusYellow,
  red: BRAND.colors.statusRed,
};

export const STATUS_COLOR_BG: Record<StatusColor, string> = {
  green: BRAND.colors.statusGreenBg,
  yellow: BRAND.colors.statusYellowBg,
  red: BRAND.colors.statusRedBg,
};

export const STATUS_COLOR_LABEL: Record<StatusColor, string> = {
  green: "Healthy",
  yellow: "At Risk",
  red: "Critical",
};

// Maps a milestone.status string to a status color for chips.
export function milestoneStatusColor(status: string): StatusColor {
  switch ((status || "").toLowerCase()) {
    case "completed":
    case "on-schedule":
      return "green";
    case "at-risk":
      return "yellow";
    case "high-risk":
      return "red";
    default:
      return "yellow";
  }
}
```

- [ ] **Step 3: Create report types**

Create `src/types/report.ts`:
```ts
export type StatusColor = "red" | "yellow" | "green";

export type ReportSectionKey =
  | "executiveSummary"
  | "milestones"
  | "accomplishments"
  | "nextPeriodActivities"
  | "risks"
  | "considerations"
  | "changes"
  | "budget";

export const DEFAULT_SECTION_ORDER: ReportSectionKey[] = [
  "executiveSummary",
  "milestones",
  "accomplishments",
  "nextPeriodActivities",
  "risks",
  "considerations",
  "changes",
  "budget",
];

export const SECTION_LABELS: Record<ReportSectionKey, string> = {
  executiveSummary: "Executive Summary",
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
    executiveSummary?: { valueStatement: RichTextBlock[]; description: RichTextBlock[] };
    milestones?: ReportMilestone[];
    accomplishments?: RichTextBlock[][];
    nextPeriodActivities?: ReportActivity[];
    risks?: ReportRisk[];
    considerations?: string[];
    changes?: ReportChange[];
    budget?: { total: number | null; actuals: number | null; forecast: number | null };
  };
}
```

- [ ] **Step 4: Type-check gate**

Run: `npm run build`
Expected: PASS (no TypeScript errors). The new files compile; nothing imports them yet.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/report/branding.ts src/types/report.ts
git commit -m "feat(report): add deps, branding constants, and report model types"
```

---

### Task 2: Rich-text parser (TipTap HTML → blocks)

**Files:**
- Create: `src/lib/report/richText.ts`

**Interfaces:**
- Consumes: `RichTextBlock`, `RichTextSpan` from `@/types/report`.
- Produces: `parseRichText(html: string | null | undefined): RichTextBlock[]`, `richTextToPlainText(html: string | null | undefined): string`.

- [ ] **Step 1: Implement the parser**

Create `src/lib/report/richText.ts`. Uses the browser `DOMParser` (all renderers run client-side). Supports paragraphs, bold/italic/underline, links, bullet and numbered lists. Unknown nodes degrade to their text content.

```ts
import type { RichTextBlock, RichTextSpan } from "@/types/report";

interface ActiveMarks {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  href?: string;
}

function collectSpans(node: Node, marks: ActiveMarks, out: RichTextSpan[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    if (text) out.push({ text, ...marks });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const next: ActiveMarks = { ...marks };
  if (tag === "strong" || tag === "b") next.bold = true;
  if (tag === "em" || tag === "i") next.italic = true;
  if (tag === "u") next.underline = true;
  if (tag === "a") next.href = el.getAttribute("href") || undefined;
  el.childNodes.forEach((child) => collectSpans(child, next, out));
}

function spansFor(el: HTMLElement): RichTextSpan[] {
  const spans: RichTextSpan[] = [];
  el.childNodes.forEach((child) => collectSpans(child, {}, spans));
  return spans.filter((s) => s.text.trim().length > 0 || s.text === " ");
}

export function parseRichText(html: string | null | undefined): RichTextBlock[] {
  if (!html || !html.trim()) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks: RichTextBlock[] = [];

  const walk = (parent: ParentNode) => {
    Array.from(parent.children).forEach((child) => {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === "ul" || tag === "ol") {
        const type = tag === "ul" ? "bullet" : "number";
        Array.from(el.children).forEach((li) => {
          if ((li as HTMLElement).tagName.toLowerCase() === "li") {
            blocks.push({ type, spans: spansFor(li as HTMLElement) });
          }
        });
      } else if (tag === "p" || /^h[1-6]$/.test(tag) || tag === "div") {
        const spans = spansFor(el);
        if (spans.length) blocks.push({ type: "paragraph", spans });
      } else {
        const spans = spansFor(el);
        if (spans.length) blocks.push({ type: "paragraph", spans });
      }
    });
  };

  walk(doc.body);

  // Fallback: plain string with no block elements.
  if (blocks.length === 0) {
    const text = doc.body.textContent || "";
    if (text.trim()) blocks.push({ type: "paragraph", spans: [{ text }] });
  }
  return blocks;
}

export function richTextToPlainText(html: string | null | undefined): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").trim();
}
```

- [ ] **Step 2: Type-check gate**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Manual sanity check (optional, fast)**

In `netlify dev` (later tasks render this), confirm a milestone description with `<strong>` and a `<ul>` produces bold text and bullet rows. For now, build passing is the gate.

- [ ] **Step 4: Commit**

```bash
git add src/lib/report/richText.ts
git commit -m "feat(report): add TipTap HTML rich-text parser"
```

---

### Task 3: Report model builder

**Files:**
- Create: `src/lib/services/reportModel.ts`

**Interfaces:**
- Consumes: `ProjectWithRelations`, `Milestone`, `Task`, `calculateWeightedCompletion`, `calculateProjectHealthStatusColor` from `@/lib/services/project`; `parseRichText`, `richTextToPlainText` from `@/lib/report/richText`; report types + `DEFAULT_SECTION_ORDER` from `@/types/report`.
- Produces: `buildReportModel(project: ProjectWithRelations, options: ReportOptions): ReportModel`, `defaultReportOptions(): ReportOptions`.

- [ ] **Step 1: Implement the builder**

Create `src/lib/services/reportModel.ts`:
```ts
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

  if (options.sections.executiveSummary) {
    sections.executiveSummary = {
      valueStatement: parseRichText(project.value_statement),
      description: parseRichText(project.description),
    };
  }
  if (options.sections.milestones) {
    sections.milestones = milestones.map((m) => ({
      milestone: richTextToPlainText(m.milestone) || "Untitled milestone",
      owner: m.owner || "—",
      date: fmtDate(m.date) || "—",
      endDate: fmtDate(m.end_date),
      weight: m.weight ?? 3,
      completion: m.completion ?? 0,
      status: m.status || "on-schedule",
      tasks: (m.tasks || []).map((t) => ({
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
```

- [ ] **Step 2: Type-check gate**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/reportModel.ts
git commit -m "feat(report): add buildReportModel normalizer"
```

---

### Task 4: Blob download helper + shared formatters

**Files:**
- Create: `src/lib/report/format.ts`
- Create: `src/lib/report/download.ts`

**Interfaces:**
- Produces: `formatCurrency(n: number | null): string`, `formatPercent(n: number): string`, `statusLabel(status: string): string` (from `format.ts`); `downloadBlob(blob: Blob, filename: string): void`, `reportFileName(title: string, ext: "pdf" | "docx"): string` (from `download.ts`).

- [ ] **Step 1: Implement formatters**

Create `src/lib/report/format.ts`:
```ts
export function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

export function statusLabel(status: string): string {
  switch ((status || "").toLowerCase()) {
    case "completed": return "Completed";
    case "on_hold": return "On Hold";
    case "cancelled": return "Cancelled";
    case "draft": return "Draft";
    default: return "Active";
  }
}
```

- [ ] **Step 2: Implement download helper**

Create `src/lib/report/download.ts`:
```ts
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function reportFileName(title: string, ext: "pdf" | "docx"): string {
  const safe = (title || "project-report")
    .replace(/<[^>]*>/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60) || "project-report";
  return `${safe}-report.${ext}`;
}
```

- [ ] **Step 3: Type-check gate**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/report/format.ts src/lib/report/download.ts
git commit -m "feat(report): add formatters and blob download helper"
```

---

### Task 5: HTML preview components

**Files:**
- Create: `src/components/report/RichTextView.tsx`
- Create: `src/components/report/ProjectReportPreview.tsx`

**Interfaces:**
- Consumes: `ReportModel`, `RichTextBlock` from `@/types/report`; `BRAND`, `STATUS_COLOR_HEX`, `STATUS_COLOR_BG`, `STATUS_COLOR_LABEL`, `milestoneStatusColor` from `@/lib/report/branding`; `formatCurrency`, `formatPercent`, `statusLabel` from `@/lib/report/format`.
- Produces: `RichTextView({ blocks }: { blocks: RichTextBlock[] })`, `ProjectReportPreview({ model }: { model: ReportModel })`.

- [ ] **Step 1: Implement RichTextView**

Create `src/components/report/RichTextView.tsx`:
```tsx
import React from "react";
import type { RichTextBlock, RichTextSpan } from "@/types/report";

const Span: React.FC<{ s: RichTextSpan }> = ({ s }) => {
  let node: React.ReactNode = s.text;
  if (s.bold) node = <strong>{node}</strong>;
  if (s.italic) node = <em>{node}</em>;
  if (s.underline) node = <u>{node}</u>;
  if (s.href) node = <a href={s.href} className="text-blue-700 underline">{node}</a>;
  return <>{node}</>;
};

const RichTextView: React.FC<{ blocks: RichTextBlock[] }> = ({ blocks }) => {
  if (!blocks.length) return <p className="text-sm text-gray-400 italic">None recorded</p>;
  return (
    <div className="space-y-1 text-sm text-gray-800">
      {blocks.map((b, i) => {
        const content = b.spans.map((s, j) => <Span key={j} s={s} />);
        if (b.type === "bullet")
          return <div key={i} className="flex gap-2 pl-2"><span>•</span><span>{content}</span></div>;
        if (b.type === "number")
          return <div key={i} className="flex gap-2 pl-2"><span>{i + 1}.</span><span>{content}</span></div>;
        return <p key={i}>{content}</p>;
      })}
    </div>
  );
};

export default RichTextView;
```

- [ ] **Step 2: Implement ProjectReportPreview**

Create `src/components/report/ProjectReportPreview.tsx`. Renders the header band + each enabled section in `model.enabledOrder`. Milestones render as cards with **indented** sub-task rows (the core requirement). Empty sections show "None recorded".

```tsx
import React from "react";
import type { ReportModel, ReportSectionKey } from "@/types/report";
import { BRAND, STATUS_COLOR_HEX, STATUS_COLOR_BG, STATUS_COLOR_LABEL, milestoneStatusColor } from "@/lib/report/branding";
import { formatCurrency, formatPercent, statusLabel } from "@/lib/report/format";
import RichTextView from "./RichTextView";

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg font-bold mt-6 mb-2 pb-1 border-b-2" style={{ color: BRAND.colors.primary, borderColor: BRAND.colors.primary }}>
    {children}
  </h2>
);

const Bar: React.FC<{ value: number }> = ({ value }) => (
  <div className="w-full h-2 rounded bg-gray-200 overflow-hidden">
    <div className="h-full rounded" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: BRAND.colors.primaryLight }} />
  </div>
);

const ProjectReportPreview: React.FC<{ model: ReportModel }> = ({ model }) => {
  const { header, sections, enabledOrder } = model;
  return (
    <div className="bg-white text-gray-900 mx-auto" style={{ width: "8.27in", padding: "0.6in", boxShadow: "0 1px 8px rgba(0,0,0,0.12)" }}>
      {/* Header band */}
      <div className="flex items-center justify-between rounded-md px-5 py-4 mb-4" style={{ background: BRAND.colors.primary, color: BRAND.colors.headerBandText }}>
        <div>
          <div className="text-xs uppercase tracking-wide opacity-80">{BRAND.name} {BRAND.reportTitle}</div>
          <div className="text-2xl font-bold">{header.title}</div>
          <div className="text-sm opacity-90">{header.department} · {statusLabel(header.status)}</div>
        </div>
        <img src={BRAND.logoUrl} alt="ReWa" style={{ height: 44 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      </div>

      {/* Health + meta */}
      <div className="flex gap-4 mb-2">
        <div className="flex flex-col items-center justify-center rounded-md border px-4 py-3" style={{ borderColor: STATUS_COLOR_HEX[header.statusColor], background: STATUS_COLOR_BG[header.statusColor], minWidth: 120 }}>
          <div className="text-3xl font-bold" style={{ color: STATUS_COLOR_HEX[header.statusColor] }}>{formatPercent(header.healthPercentage)}</div>
          <div className="text-xs font-medium" style={{ color: STATUS_COLOR_HEX[header.statusColor] }}>{STATUS_COLOR_LABEL[header.statusColor]}</div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm flex-1">
          <div><span className="text-gray-500">PM:</span> {header.projectManager}</div>
          <div><span className="text-gray-500">Sponsors:</span> {header.sponsors}</div>
          <div><span className="text-gray-500">Business Leads:</span> {header.businessLeads}</div>
          <div><span className="text-gray-500">Dates:</span> {header.startDate || "—"} → {header.endDate || "—"}</div>
          <div><span className="text-gray-500">Budget:</span> {formatCurrency(header.budgetTotal)}</div>
          <div><span className="text-gray-500">Generated:</span> {header.generatedOn}</div>
        </div>
      </div>

      {enabledOrder.map((key) => (
        <SectionBlock key={key} sectionKey={key} model={model} Bar={Bar} SectionTitle={SectionTitle} />
      ))}
    </div>
  );
};

const SectionBlock: React.FC<{
  sectionKey: ReportSectionKey;
  model: ReportModel;
  Bar: React.FC<{ value: number }>;
  SectionTitle: React.FC<{ children: React.ReactNode }>;
}> = ({ sectionKey, model, Bar, SectionTitle }) => {
  const s = model.sections;
  switch (sectionKey) {
    case "executiveSummary":
      return (
        <div>
          <SectionTitle>Executive Summary</SectionTitle>
          <div className="text-xs font-semibold text-gray-500 mt-2">Value Statement</div>
          <RichTextView blocks={s.executiveSummary?.valueStatement || []} />
          <div className="text-xs font-semibold text-gray-500 mt-3">Description</div>
          <RichTextView blocks={s.executiveSummary?.description || []} />
        </div>
      );
    case "milestones":
      return (
        <div>
          <SectionTitle>Milestones &amp; Sub-Tasks</SectionTitle>
          {!s.milestones?.length && <p className="text-sm text-gray-400 italic">None recorded</p>}
          {s.milestones?.map((m, i) => {
            const color = milestoneStatusColor(m.status);
            return (
              <div key={i} className="mb-3 rounded-md border p-3" style={{ borderColor: BRAND.colors.border }}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{m.milestone}</div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: STATUS_COLOR_BG[color], color: STATUS_COLOR_HEX[color] }}>{m.status}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                  <span>Owner: {m.owner}</span><span>Due: {m.endDate || m.date}</span><span>Weight: {m.weight}</span><span>{m.completion}%</span>
                </div>
                <div className="mt-1"><Bar value={m.completion} /></div>
                {/* Indented sub-tasks */}
                {m.tasks.length > 0 && (
                  <div className="mt-2 ml-6 border-l-2 pl-3" style={{ borderColor: BRAND.colors.primaryLight }}>
                    {m.tasks.map((t, j) => (
                      <div key={j} className="flex items-center justify-between text-xs py-0.5">
                        <span className="text-gray-700">{t.description}</span>
                        <span className="text-gray-500">{t.assignee} · {t.date} · {t.completion}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    case "accomplishments":
      return (
        <div>
          <SectionTitle>Accomplishments</SectionTitle>
          {!s.accomplishments?.length && <p className="text-sm text-gray-400 italic">None recorded</p>}
          {s.accomplishments?.map((blocks, i) => <div key={i} className="mb-1"><RichTextView blocks={blocks} /></div>)}
        </div>
      );
    case "nextPeriodActivities":
      return (
        <div>
          <SectionTitle>Next Period Activities</SectionTitle>
          {!s.nextPeriodActivities?.length && <p className="text-sm text-gray-400 italic">None recorded</p>}
          {s.nextPeriodActivities?.map((a, i) => (
            <div key={i} className="mb-2">
              <div className="flex items-center justify-between text-sm">
                <span>{a.description}</span>
                <span className="text-gray-500 text-xs">{a.assignee} · {a.date} · {a.completion}%</span>
              </div>
              {a.subActivities.length > 0 && (
                <div className="ml-6 border-l-2 pl-3 mt-1" style={{ borderColor: BRAND.colors.primaryLight }}>
                  {a.subActivities.map((sa, j) => (
                    <div key={j} className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-gray-700">{sa.description}</span>
                      <span className="text-gray-500">{sa.assignee} · {sa.date} · {sa.completion}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    case "risks":
      return (
        <div>
          <SectionTitle>Risks</SectionTitle>
          {!s.risks?.length && <p className="text-sm text-gray-400 italic">None recorded</p>}
          {s.risks?.map((r, i) => (
            <div key={i} className="text-sm mb-1"><span className="font-medium">{r.description}</span> — <span className="text-gray-600">{r.impact}</span></div>
          ))}
        </div>
      );
    case "considerations":
      return (
        <div>
          <SectionTitle>Considerations</SectionTitle>
          {!s.considerations?.length && <p className="text-sm text-gray-400 italic">None recorded</p>}
          <ul className="list-disc pl-6 text-sm">{s.considerations?.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </div>
      );
    case "changes":
      return (
        <div>
          <SectionTitle>Changes</SectionTitle>
          {!s.changes?.length && <p className="text-sm text-gray-400 italic">None recorded</p>}
          {s.changes?.map((c, i) => (
            <div key={i} className="text-sm mb-1">{c.change} — <span className="text-gray-600">{c.impact}</span> <span className="text-gray-400">({c.disposition})</span></div>
          ))}
        </div>
      );
    case "budget":
      return (
        <div>
          <SectionTitle>Budget</SectionTitle>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><div className="text-gray-500 text-xs">Total</div>{formatCurrency(s.budget?.total ?? null)}</div>
            <div><div className="text-gray-500 text-xs">Actuals</div>{formatCurrency(s.budget?.actuals ?? null)}</div>
            <div><div className="text-gray-500 text-xs">Forecast</div>{formatCurrency(s.budget?.forecast ?? null)}</div>
          </div>
        </div>
      );
    default:
      return null;
  }
};

export default ProjectReportPreview;
```

- [ ] **Step 3: Type-check gate**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/report/RichTextView.tsx src/components/report/ProjectReportPreview.tsx
git commit -m "feat(report): add branded HTML preview with indented sub-tasks"
```

---

### Task 6: Report dialog + ProjectForm trigger

**Files:**
- Create: `src/components/report/ProjectReportDialog.tsx`
- Modify: `src/components/ProjectForm.tsx` (add Generate Report button + dialog state)

**Interfaces:**
- Consumes: `projectService.getProject` from `@/lib/services/project`; `buildReportModel`, `defaultReportOptions` from `@/lib/services/reportModel`; `ProjectReportPreview` from `@/components/report/ProjectReportPreview`; `SECTION_LABELS`, `DEFAULT_SECTION_ORDER`, `ReportOptions`, `ReportSectionKey` from `@/types/report`; UI: `Dialog`, `Checkbox`, `ScrollArea`, `Button` from `@/components/ui/*`; `useToast`. **PDF/Word generators are wired in Tasks 7–8** — in this task the export buttons call placeholder handlers that `toast` "coming soon" so the dialog is independently testable.
- Produces: `ProjectReportDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (o: boolean) => void; projectId: string })`.

- [ ] **Step 1: Implement the dialog**

Create `src/components/report/ProjectReportDialog.tsx`:
```tsx
import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { projectService, type ProjectWithRelations } from "@/lib/services/project";
import { buildReportModel, defaultReportOptions } from "@/lib/services/reportModel";
import ProjectReportPreview from "./ProjectReportPreview";
import { DEFAULT_SECTION_ORDER, SECTION_LABELS, type ReportOptions, type ReportSectionKey } from "@/types/report";
import { Loader2, FileText, FileType } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
}

const ProjectReportDialog: React.FC<Props> = ({ open, onOpenChange, projectId }) => {
  const { toast } = useToast();
  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ReportOptions>(defaultReportOptions());
  const [exporting, setExporting] = useState<null | "pdf" | "docx">(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    projectService
      .getProject(projectId)
      .then((p) => { if (active) setProject(p); })
      .catch(() => toast({ title: "Could not load project", variant: "destructive" }))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, projectId, toast]);

  const model = useMemo(
    () => (project ? buildReportModel(project, options) : null),
    [project, options],
  );

  const toggle = (key: ReportSectionKey) =>
    setOptions((o) => ({ ...o, sections: { ...o.sections, [key]: !o.sections[key] } }));

  // Placeholder export handlers — replaced in Tasks 7 (PDF) and 8 (Word).
  const onExport = (fmt: "pdf" | "docx") => {
    toast({ title: `${fmt.toUpperCase()} export coming soon` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] p-0 gap-0 flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Project Report</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={!model || exporting !== null} onClick={() => onExport("docx")}>
              {exporting === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              <span className="ml-2">Export Word</span>
            </Button>
            <Button disabled={!model || exporting !== null} onClick={() => onExport("pdf")}>
              {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileType className="h-4 w-4" />}
              <span className="ml-2">Export PDF</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-1 min-h-0">
          {/* Section toggle rail */}
          <div className="w-64 border-r p-4 overflow-y-auto">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Sections</div>
            {DEFAULT_SECTION_ORDER.map((key) => (
              <label key={key} className="flex items-center gap-2 py-1.5 text-sm cursor-pointer">
                <Checkbox checked={options.sections[key]} onCheckedChange={() => toggle(key)} />
                {SECTION_LABELS[key]}
              </label>
            ))}
            <p className="text-xs text-muted-foreground mt-4">
              Showing <strong>saved</strong> data. Save your changes first to include recent edits.
            </p>
          </div>
          {/* Preview */}
          <ScrollArea className="flex-1 bg-gray-100">
            <div className="p-6">
              {loading && <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…</div>}
              {!loading && model && <ProjectReportPreview model={model} />}
              {!loading && !model && <div className="text-center text-muted-foreground h-64 flex items-center justify-center">No project data found.</div>}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectReportDialog;
```

Note: keep `exporting`/`setExporting` in place even though the placeholder doesn't use them yet — Tasks 7–8 wire them. If the build flags them as unused, leave a `void exporting;` is unnecessary because `exporting` IS read in the buttons; only `setExporting` is currently unused — call it in the placeholder: replace `onExport` body with `setExporting(fmt); setTimeout(() => setExporting(null), 300); toast({ title: \`${fmt.toUpperCase()} export coming soon\` });` to avoid an unused-setter warning.

- [ ] **Step 2: Wire the trigger into ProjectForm**

Modify `src/components/ProjectForm.tsx`:

Add imports near the other imports (after line 16):
```tsx
import ProjectReportDialog from "@/components/report/ProjectReportDialog";
import { FileBarChart } from "lucide-react";
```

Add dialog state inside the component (after `const navigate = useNavigate();`, line 62):
```tsx
const [showReportDialog, setShowReportDialog] = useState(false);
```
(`useState` is already imported on line 10.)

Add a "Generate Report" button in the floating action bar. Replace the Cancel button block (lines 321–334) so the left side holds both Cancel and Generate Report:
```tsx
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (hasChanges) {
                      setPendingNavigationAction(() => onBack);
                      setShowUnsavedChangesDialog(true);
                    } else {
                      onBack();
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReportDialog(true)}
                >
                  <FileBarChart className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
```

Add the dialog render just before the closing `</form>` (before line 416):
```tsx
          <ProjectReportDialog
            open={showReportDialog}
            onOpenChange={setShowReportDialog}
            projectId={projectId}
          />
```

- [ ] **Step 3: Type-check gate**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Manual verification**

Run: `netlify dev`, open a project for editing, click **Generate Report**.
Expected: full-screen dialog opens, preview shows the branded header + sections with **indented sub-tasks**; toggling section checkboxes adds/removes sections live; export buttons show the "coming soon" toast.

- [ ] **Step 5: Commit**

```bash
git add src/components/report/ProjectReportDialog.tsx src/components/ProjectForm.tsx
git commit -m "feat(report): add report dialog with section toggles, wire into ProjectForm"
```

---

### Task 7: PDF generator (react-pdf) + wire export

**Files:**
- Create: `src/lib/services/reportPdf.tsx`
- Modify: `src/components/report/ProjectReportDialog.tsx` (replace PDF placeholder)

**Interfaces:**
- Consumes: `ReportModel` from `@/types/report`; `BRAND`, `STATUS_COLOR_HEX`, `STATUS_COLOR_BG`, `milestoneStatusColor` from `@/lib/report/branding`; `formatCurrency`, `formatPercent`, `statusLabel` from `@/lib/report/format`; `pdf`, `Document`, `Page`, `View`, `Text`, `Image`, `StyleSheet` from `@react-pdf/renderer`.
- Produces: `generatePdf(model: ReportModel): Promise<Blob>`.

- [ ] **Step 1: Implement the PDF generator**

Create `src/lib/services/reportPdf.tsx`. react-pdf auto-paginates with `<View wrap>`; `fixed` header/footer repeat per page; sub-tasks indented via `marginLeft` + left border. This implementation covers the header, all sections, and indented sub-tasks. Rich text is flattened to text runs per block (bold/italic preserved via nested `<Text>`).

```tsx
import React from "react";
import { pdf, Document, Page, View, Text, Image, StyleSheet, Link } from "@react-pdf/renderer";
import type { ReportModel, RichTextBlock } from "@/types/report";
import { BRAND, STATUS_COLOR_HEX, STATUS_COLOR_BG, milestoneStatusColor } from "@/lib/report/branding";
import { formatCurrency, formatPercent, statusLabel } from "@/lib/report/format";

const s = StyleSheet.create({
  page: { paddingTop: 90, paddingBottom: 50, paddingHorizontal: 40, fontSize: 9, color: BRAND.colors.text, fontFamily: "Helvetica" },
  band: { position: "absolute", top: 0, left: 0, right: 0, height: 70, backgroundColor: BRAND.colors.primary, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 40 },
  bandTitle: { color: "#fff", fontSize: 16, fontFamily: "Helvetica-Bold" },
  bandSub: { color: "#fff", fontSize: 9, opacity: 0.9 },
  logo: { height: 34 },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", color: BRAND.colors.muted, fontSize: 8 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: BRAND.colors.primary, marginTop: 14, marginBottom: 4, borderBottomWidth: 1.5, borderBottomColor: BRAND.colors.primary, paddingBottom: 2 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  metaItem: { width: "50%", marginBottom: 2, fontSize: 9 },
  healthBox: { borderWidth: 1, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 10, alignItems: "center", marginRight: 10, marginBottom: 6, width: 110 },
  card: { borderWidth: 1, borderColor: BRAND.colors.border, borderRadius: 4, padding: 6, marginBottom: 6 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  chip: { fontSize: 7, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  subTask: { marginLeft: 18, borderLeftWidth: 1.5, borderLeftColor: BRAND.colors.primaryLight, paddingLeft: 6, marginTop: 2 },
  muted: { color: BRAND.colors.muted, fontSize: 8 },
  bar: { height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, marginTop: 2 },
  barFill: { height: 4, borderRadius: 2, backgroundColor: BRAND.colors.primaryLight },
  none: { color: BRAND.colors.muted, fontSize: 9, fontStyle: "italic" },
});

const Rich: React.FC<{ blocks: RichTextBlock[] }> = ({ blocks }) => {
  if (!blocks.length) return <Text style={s.none}>None recorded</Text>;
  return (
    <View>
      {blocks.map((b, i) => (
        <Text key={i} style={{ marginBottom: 1 }}>
          {b.type === "bullet" ? "• " : b.type === "number" ? `${i + 1}. ` : ""}
          {b.spans.map((sp, j) => {
            const style: any = {};
            if (sp.bold) style.fontFamily = "Helvetica-Bold";
            if (sp.italic) style.fontStyle = "italic";
            if (sp.underline) style.textDecoration = "underline";
            return sp.href
              ? <Link key={j} src={sp.href} style={{ color: BRAND.colors.primary }}>{sp.text}</Link>
              : <Text key={j} style={style}>{sp.text}</Text>;
          })}
        </Text>
      ))}
    </View>
  );
};

const ReportDoc: React.FC<{ model: ReportModel }> = ({ model }) => {
  const { header, sections, enabledOrder } = model;
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.band} fixed>
          <View>
            <Text style={s.bandSub}>{BRAND.name} {BRAND.reportTitle}</Text>
            <Text style={s.bandTitle}>{header.title}</Text>
            <Text style={s.bandSub}>{header.department} · {statusLabel(header.status)}</Text>
          </View>
          <Image style={s.logo} src={BRAND.logoUrl} />
        </View>

        <View style={{ flexDirection: "row", marginBottom: 4 }}>
          <View style={[s.healthBox, { borderColor: STATUS_COLOR_HEX[header.statusColor], backgroundColor: STATUS_COLOR_BG[header.statusColor] }]}>
            <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: STATUS_COLOR_HEX[header.statusColor] }}>{formatPercent(header.healthPercentage)}</Text>
          </View>
          <View style={[s.metaRow, { flex: 1 }]}>
            <Text style={s.metaItem}>PM: {header.projectManager}</Text>
            <Text style={s.metaItem}>Sponsors: {header.sponsors}</Text>
            <Text style={s.metaItem}>Business Leads: {header.businessLeads}</Text>
            <Text style={s.metaItem}>Dates: {header.startDate || "—"} → {header.endDate || "—"}</Text>
            <Text style={s.metaItem}>Budget: {formatCurrency(header.budgetTotal)}</Text>
            <Text style={s.metaItem}>Generated: {header.generatedOn}</Text>
          </View>
        </View>

        {enabledOrder.map((key) => {
          switch (key) {
            case "executiveSummary":
              return (
                <View key={key} wrap={false}>
                  <Text style={s.sectionTitle}>Executive Summary</Text>
                  <Text style={s.muted}>Value Statement</Text>
                  <Rich blocks={sections.executiveSummary?.valueStatement || []} />
                  <Text style={[s.muted, { marginTop: 4 }]}>Description</Text>
                  <Rich blocks={sections.executiveSummary?.description || []} />
                </View>
              );
            case "milestones":
              return (
                <View key={key}>
                  <Text style={s.sectionTitle}>Milestones &amp; Sub-Tasks</Text>
                  {!sections.milestones?.length && <Text style={s.none}>None recorded</Text>}
                  {sections.milestones?.map((m, i) => {
                    const c = milestoneStatusColor(m.status);
                    return (
                      <View key={i} style={s.card} wrap={false}>
                        <View style={s.rowBetween}>
                          <Text style={{ fontFamily: "Helvetica-Bold" }}>{m.milestone}</Text>
                          <Text style={[s.chip, { backgroundColor: STATUS_COLOR_BG[c], color: STATUS_COLOR_HEX[c] }]}>{m.status}</Text>
                        </View>
                        <Text style={s.muted}>Owner: {m.owner}  ·  Due: {m.endDate || m.date}  ·  Weight: {m.weight}  ·  {m.completion}%</Text>
                        <View style={s.bar}><View style={[s.barFill, { width: `${Math.max(0, Math.min(100, m.completion))}%` }]} /></View>
                        {m.tasks.length > 0 && (
                          <View style={s.subTask}>
                            {m.tasks.map((t, j) => (
                              <View key={j} style={s.rowBetween}>
                                <Text>{t.description}</Text>
                                <Text style={s.muted}>{t.assignee} · {t.date} · {t.completion}%</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            case "accomplishments":
              return (
                <View key={key}>
                  <Text style={s.sectionTitle}>Accomplishments</Text>
                  {!sections.accomplishments?.length && <Text style={s.none}>None recorded</Text>}
                  {sections.accomplishments?.map((b, i) => <Rich key={i} blocks={b} />)}
                </View>
              );
            case "nextPeriodActivities":
              return (
                <View key={key}>
                  <Text style={s.sectionTitle}>Next Period Activities</Text>
                  {!sections.nextPeriodActivities?.length && <Text style={s.none}>None recorded</Text>}
                  {sections.nextPeriodActivities?.map((a, i) => (
                    <View key={i} style={{ marginBottom: 3 }} wrap={false}>
                      <View style={s.rowBetween}><Text>{a.description}</Text><Text style={s.muted}>{a.assignee} · {a.date} · {a.completion}%</Text></View>
                      {a.subActivities.length > 0 && (
                        <View style={s.subTask}>
                          {a.subActivities.map((sa, j) => (
                            <View key={j} style={s.rowBetween}><Text>{sa.description}</Text><Text style={s.muted}>{sa.assignee} · {sa.date} · {sa.completion}%</Text></View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              );
            case "risks":
              return (
                <View key={key}>
                  <Text style={s.sectionTitle}>Risks</Text>
                  {!sections.risks?.length && <Text style={s.none}>None recorded</Text>}
                  {sections.risks?.map((r, i) => <Text key={i} style={{ marginBottom: 1 }}><Text style={{ fontFamily: "Helvetica-Bold" }}>{r.description}</Text> — {r.impact}</Text>)}
                </View>
              );
            case "considerations":
              return (
                <View key={key}>
                  <Text style={s.sectionTitle}>Considerations</Text>
                  {!sections.considerations?.length && <Text style={s.none}>None recorded</Text>}
                  {sections.considerations?.map((c, i) => <Text key={i}>• {c}</Text>)}
                </View>
              );
            case "changes":
              return (
                <View key={key}>
                  <Text style={s.sectionTitle}>Changes</Text>
                  {!sections.changes?.length && <Text style={s.none}>None recorded</Text>}
                  {sections.changes?.map((c, i) => <Text key={i} style={{ marginBottom: 1 }}>{c.change} — {c.impact} ({c.disposition})</Text>)}
                </View>
              );
            case "budget":
              return (
                <View key={key} wrap={false}>
                  <Text style={s.sectionTitle}>Budget</Text>
                  <View style={s.rowBetween}>
                    <Text>Total: {formatCurrency(sections.budget?.total ?? null)}</Text>
                    <Text>Actuals: {formatCurrency(sections.budget?.actuals ?? null)}</Text>
                    <Text>Forecast: {formatCurrency(sections.budget?.forecast ?? null)}</Text>
                  </View>
                </View>
              );
            default:
              return null;
          }
        })}

        <View style={s.footer} fixed>
          <Text>{header.title}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

export async function generatePdf(model: ReportModel): Promise<Blob> {
  return await pdf(<ReportDoc model={model} />).toBlob();
}
```

- [ ] **Step 2: Wire PDF export into the dialog**

Modify `src/components/report/ProjectReportDialog.tsx`:

Add imports:
```tsx
import { generatePdf } from "@/lib/services/reportPdf";
import { downloadBlob, reportFileName } from "@/lib/report/download";
```

Replace the placeholder `onExport` with a real PDF path (Word still placeholder until Task 8):
```tsx
  const onExport = async (fmt: "pdf" | "docx") => {
    if (!model) return;
    setExporting(fmt);
    try {
      if (fmt === "pdf") {
        const blob = await generatePdf(model);
        downloadBlob(blob, reportFileName(model.header.title, "pdf"));
      } else {
        toast({ title: "Word export coming soon" });
      }
    } catch (e) {
      toast({ title: `Failed to export ${fmt.toUpperCase()}`, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };
```

- [ ] **Step 3: Type-check gate**

Run: `npm run build`
Expected: PASS. If Vite/react-pdf emits a Node polyfill warning at build, it does not fail the build; only fix if `npm run build` exits non-zero.

- [ ] **Step 4: Manual verification**

Run: `netlify dev`, open a **large** project, Generate Report → **Export PDF**.
Expected: a `.pdf` downloads; opens to a branded multi-page document; the header band and page numbers repeat; milestone sub-tasks are indented; selecting text with the cursor selects real text (not an image).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/reportPdf.tsx src/components/report/ProjectReportDialog.tsx
git commit -m "feat(report): add react-pdf PDF generator and wire export"
```

---

### Task 8: Word generator (docx) + wire export

**Files:**
- Create: `src/lib/services/reportDocx.ts`
- Modify: `src/components/report/ProjectReportDialog.tsx` (replace Word placeholder)

**Interfaces:**
- Consumes: `ReportModel`, `RichTextBlock` from `@/types/report`; `BRAND`, `STATUS_COLOR_HEX`, `milestoneStatusColor` from `@/lib/report/branding`; `formatCurrency`, `formatPercent`, `statusLabel` from `@/lib/report/format`; `Document`, `Packer`, `Paragraph`, `TextRun`, `HeadingLevel`, `Table`, `TableRow`, `TableCell`, `WidthType`, `BorderStyle`, `AlignmentType`, `ImageRun`, `ExternalHyperlink` from `docx`.
- Produces: `generateDocx(model: ReportModel): Promise<Blob>`.

- [ ] **Step 1: Implement the Word generator**

Create `src/lib/services/reportDocx.ts`. Uses native Word headings (so the navigation pane works), brand-colored heading text, tables for milestones, and **indented** sub-task paragraphs (`indent: { left: 720 }` twips = 0.5"). The logo is fetched as an ArrayBuffer; on failure it falls back to a text wordmark.

```ts
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ImageRun, ExternalHyperlink,
} from "docx";
import type { ReportModel, RichTextBlock } from "@/types/report";
import { BRAND, STATUS_COLOR_HEX, milestoneStatusColor } from "@/lib/report/branding";
import { formatCurrency, formatPercent, statusLabel } from "@/lib/report/format";

const BLUE = BRAND.colors.primary.replace("#", "");

async function fetchLogo(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(BRAND.logoUrl);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function richToParagraphs(blocks: RichTextBlock[], indentLeft = 0): Paragraph[] {
  if (!blocks.length) return [new Paragraph({ children: [new TextRun({ text: "None recorded", italics: true, color: "9CA3AF" })], indent: indentLeft ? { left: indentLeft } : undefined })];
  return blocks.map((b) => {
    const runs = b.spans.map((sp) =>
      sp.href
        ? new ExternalHyperlink({ link: sp.href, children: [new TextRun({ text: sp.text, style: "Hyperlink" })] })
        : new TextRun({ text: sp.text, bold: sp.bold, italics: sp.italic, underline: sp.underline ? {} : undefined }),
    );
    return new Paragraph({
      children: runs,
      bullet: b.type === "bullet" ? { level: 0 } : undefined,
      numbering: undefined,
      indent: indentLeft ? { left: indentLeft } : undefined,
    });
  });
}

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, color: BLUE, size: 26 })],
  });
}

function cell(text: string, opts: { bold?: boolean; color?: string; width?: number } = {}): TableCell {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold, color: opts.color })] })],
  });
}

export async function generateDocx(model: ReportModel): Promise<Blob> {
  const { header, sections, enabledOrder } = model;
  const children: (Paragraph | Table)[] = [];

  // Header
  const logo = await fetchLogo();
  if (logo) {
    children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new ImageRun({ data: logo, transformation: { width: 120, height: 40 } })] }));
  } else {
    children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: BRAND.name, bold: true, color: BLUE, size: 28 })] }));
  }
  children.push(new Paragraph({ children: [new TextRun({ text: `${BRAND.name} ${BRAND.reportTitle}`, color: BLUE, size: 18 })] }));
  children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: header.title, bold: true })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: `${header.department} · ${statusLabel(header.status)}`, color: "6B7280" })] }));
  children.push(new Paragraph({ children: [
    new TextRun({ text: `Health: ${formatPercent(header.healthPercentage)}  `, bold: true, color: STATUS_COLOR_HEX[header.statusColor].replace("#", "") }),
    new TextRun({ text: `PM: ${header.projectManager}  ·  Sponsors: ${header.sponsors}  ·  Leads: ${header.businessLeads}` }),
  ] }));
  children.push(new Paragraph({ children: [new TextRun({ text: `Dates: ${header.startDate || "—"} → ${header.endDate || "—"}  ·  Budget: ${formatCurrency(header.budgetTotal)}  ·  Generated: ${header.generatedOn}`, color: "6B7280" })] }));

  for (const key of enabledOrder) {
    if (key === "executiveSummary") {
      children.push(heading("Executive Summary"));
      children.push(new Paragraph({ children: [new TextRun({ text: "Value Statement", bold: true, color: "6B7280" })] }));
      children.push(...richToParagraphs(sections.executiveSummary?.valueStatement || []));
      children.push(new Paragraph({ children: [new TextRun({ text: "Description", bold: true, color: "6B7280" })] }));
      children.push(...richToParagraphs(sections.executiveSummary?.description || []));
    } else if (key === "milestones") {
      children.push(heading("Milestones & Sub-Tasks"));
      if (!sections.milestones?.length) {
        children.push(new Paragraph({ children: [new TextRun({ text: "None recorded", italics: true, color: "9CA3AF" })] }));
      }
      sections.milestones?.forEach((m) => {
        const c = milestoneStatusColor(m.status);
        children.push(new Paragraph({ spacing: { before: 120 }, children: [
          new TextRun({ text: m.milestone, bold: true }),
          new TextRun({ text: `   [${m.status}]`, color: STATUS_COLOR_HEX[c].replace("#", "") }),
        ] }));
        children.push(new Paragraph({ children: [new TextRun({ text: `Owner: ${m.owner}  ·  Due: ${m.endDate || m.date}  ·  Weight: ${m.weight}  ·  ${m.completion}%`, color: "6B7280", size: 18 })] }));
        // Indented sub-tasks
        m.tasks.forEach((t) => {
          children.push(new Paragraph({
            indent: { left: 720 },
            bullet: { level: 0 },
            children: [new TextRun({ text: `${t.description}  —  ${t.assignee} · ${t.date} · ${t.completion}%`, size: 18 })],
          }));
        });
      });
    } else if (key === "accomplishments") {
      children.push(heading("Accomplishments"));
      if (!sections.accomplishments?.length) children.push(new Paragraph({ children: [new TextRun({ text: "None recorded", italics: true, color: "9CA3AF" })] }));
      sections.accomplishments?.forEach((b) => children.push(...richToParagraphs(b)));
    } else if (key === "nextPeriodActivities") {
      children.push(heading("Next Period Activities"));
      if (!sections.nextPeriodActivities?.length) children.push(new Paragraph({ children: [new TextRun({ text: "None recorded", italics: true, color: "9CA3AF" })] }));
      sections.nextPeriodActivities?.forEach((a) => {
        children.push(new Paragraph({ children: [new TextRun({ text: `${a.description}  —  ${a.assignee} · ${a.date} · ${a.completion}%` })] }));
        a.subActivities.forEach((sa) => children.push(new Paragraph({ indent: { left: 720 }, bullet: { level: 0 }, children: [new TextRun({ text: `${sa.description} — ${sa.assignee} · ${sa.date} · ${sa.completion}%`, size: 18 })] })));
      });
    } else if (key === "risks") {
      children.push(heading("Risks"));
      if (!sections.risks?.length) children.push(new Paragraph({ children: [new TextRun({ text: "None recorded", italics: true, color: "9CA3AF" })] }));
      sections.risks?.forEach((r) => children.push(new Paragraph({ children: [new TextRun({ text: r.description, bold: true }), new TextRun({ text: ` — ${r.impact}` })] })));
    } else if (key === "considerations") {
      children.push(heading("Considerations"));
      if (!sections.considerations?.length) children.push(new Paragraph({ children: [new TextRun({ text: "None recorded", italics: true, color: "9CA3AF" })] }));
      sections.considerations?.forEach((c) => children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: c })] })));
    } else if (key === "changes") {
      children.push(heading("Changes"));
      if (!sections.changes?.length) children.push(new Paragraph({ children: [new TextRun({ text: "None recorded", italics: true, color: "9CA3AF" })] }));
      sections.changes?.forEach((c) => children.push(new Paragraph({ children: [new TextRun({ text: `${c.change} — ${c.impact} (${c.disposition})` })] })));
    } else if (key === "budget") {
      children.push(heading("Budget"));
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [cell("Total", { bold: true, color: "FFFFFF" }), cell("Actuals", { bold: true, color: "FFFFFF" }), cell("Forecast", { bold: true, color: "FFFFFF" })], tableHeader: true }),
          new TableRow({ children: [cell(formatCurrency(sections.budget?.total ?? null)), cell(formatCurrency(sections.budget?.actuals ?? null)), cell(formatCurrency(sections.budget?.forecast ?? null))] }),
        ],
      }));
    }
  }

  const doc = new Document({
    sections: [{ children }],
    styles: {
      default: { document: { run: { font: "Calibri", size: 20 } } },
    },
  });
  return await Packer.toBlob(doc);
}
```

Note on the budget table header shading: if brand-shaded header cells are desired, set `shading: { fill: BLUE }` on those header `TableCell`s via the `cell()` helper's options — optional polish, not required for a valid doc.

- [ ] **Step 2: Wire Word export into the dialog**

Modify `src/components/report/ProjectReportDialog.tsx`:

Add import:
```tsx
import { generateDocx } from "@/lib/services/reportDocx";
```
Replace the Word branch of `onExport`:
```tsx
      } else {
        const blob = await generateDocx(model);
        downloadBlob(blob, reportFileName(model.header.title, "docx"));
      }
```

- [ ] **Step 3: Type-check gate**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Manual verification**

Run: `netlify dev`, open a project, Generate Report → **Export Word**.
Expected: a `.docx` downloads and opens in Word; headings appear in Word's navigation pane; milestone sub-tasks are visibly indented bullets; text is editable (not an image); the budget table renders.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/reportDocx.ts src/components/report/ProjectReportDialog.tsx
git commit -m "feat(report): add docx Word generator and wire export"
```

---

### Task 9: End-to-end verification, graph update, learnings

**Files:**
- Modify: `graphify-out/*` (regenerated)
- Modify: `LEARNINGS.md` (if a non-obvious finding emerged)

- [ ] **Step 1: Full feature verification (spec checklist)**

Run: `netlify dev`. Against a **large** project with many milestones, sub-tasks, and populated rich-text sections:
1. Generate Report opens the branded preview.
2. Sub-tasks render indented under their milestones in the preview.
3. Toggle each section off → it disappears from preview; on → reappears.
4. Export PDF: multi-page, repeating header + page numbers, indented sub-tasks, **selectable text**.
5. Export Word: opens in Word, nav-pane headings, indented sub-tasks, editable text, budget table.
6. Edge cases: a project with no milestones / empty sections exports cleanly with "None recorded"; logo missing → text wordmark fallback (temporarily rename the logo to confirm, then restore).

- [ ] **Step 2: Update the knowledge graph**

Run: `graphify update .`
Expected: graph regenerated to include the new report modules.

- [ ] **Step 3: Log a learning if warranted**

If a non-obvious issue was hit (e.g. a Vite/react-pdf polyfill workaround, a docx API quirk), add an entry to the top of `LEARNINGS.md` following its existing format. If nothing non-obvious arose, skip.

- [ ] **Step 4: Commit**

```bash
git add graphify-out LEARNINGS.md
git commit -m "chore(report): update knowledge graph and learnings for report export"
```

---

## Self-Review

**Spec coverage:**
- Full layout, toggleable sections → Tasks 3 (model honors toggles), 5 (preview rail), 6 (dialog checkboxes). ✓
- Both Word + PDF, native one-click → Tasks 7 (PDF), 8 (Word). ✓
- Live on-screen preview → Tasks 5–6. ✓
- Saved data only → Task 6 (`projectService.getProject`), banner copy. ✓
- Sub-tasks indented → Tasks 5 (preview `ml-6 border-l-2`), 7 (`subTask` style), 8 (`indent.left: 720`). ✓
- ReWa branding (logo, blue, status colors) → Task 1 `branding.ts`, used by all renderers. ✓
- Trigger in project edit component → Task 6 (`ProjectForm` button). ✓
- Rich text v1 (p/bold/italic/underline/lists/links) → Task 2 `parseRichText`, rendered in 5/7/8. ✓
- Error handling ("None recorded", logo fallback, toast on failure) → Tasks 5/7/8/6. ✓
- No screenshot/html2canvas → Global Constraints + native renderers. ✓
- Health calc via `calculateWeightedCompletion`, status via `calculateProjectHealthStatusColor` → Task 3. ✓

**Type consistency:** `ReportModel`/`ReportSectionKey`/`ReportOptions` defined in Task 1 and consumed unchanged in Tasks 3, 5–8. `buildReportModel(project, options)`, `generatePdf(model)`, `generateDocx(model)`, `downloadBlob(blob, filename)`, `reportFileName(title, ext)` signatures match across producer and consumer tasks. `milestoneStatusColor`, `STATUS_COLOR_HEX`, `STATUS_COLOR_BG` names consistent across branding/preview/pdf/docx.

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Task 6 intentionally ships placeholder export handlers, explicitly replaced in Tasks 7–8 (documented, not vague).

**Scope:** Single cohesive feature, one plan. No decomposition needed.
