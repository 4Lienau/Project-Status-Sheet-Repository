# Project Report Export — Design Spec

**Date:** 2026-06-28
**Status:** Approved design, pending spec review
**Author:** PM feature request → brainstormed design

## Problem

The Status Sheet is excellent for status reporting, but when a PM wants to present
the **full project layout** — every milestone and every sub-task — to external users
or stakeholders, the only option today is screenshotting the project edit component.
Large projects require multiple screenshots, which are blurry, get cut off, can't be
paginated, and aren't selectable text.

We need a **pretty, ReWa-branded report** generated from the project's data, with a
live on-screen preview, exportable to both **Word (.docx)** and **PDF** as native,
paginated, selectable/editable documents (not images).

## Requirements (confirmed)

- **Content:** Full project layout. All sections present by default, each individually
  **toggleable** before export.
- **Formats:** Both **Word** and **PDF**, native and one-click.
- **Workflow:** A **live on-screen branded preview**. PM toggles sections and sees the
  result live, then exports.
- **Data source:** The **saved** project (re-fetched `ProjectWithRelations`), NOT
  in-progress unsaved form edits. The dialog tells the PM to save first to include edits.
- **Sub-tasks:** Visually **indented/nested** under their parent milestone in all
  outputs (preview, PDF, Word).
- **Branding:** ReWa logo + brand blue, status colors (red/yellow/green), progress bars.
- **Trigger:** A "Generate Report" button in the project edit component (`ProjectForm.tsx`).

## Non-goals (YAGNI)

- No batch/multi-project reports (single project at a time).
- No reporting from live unsaved form edits (saved data only).
- No image/screenshot-based rendering (`html2canvas`, jsPDF `.html()`, html2pdf.js are
  explicitly excluded — they cause the exact cut-off/blur problem we are fixing).
- No serverless headless-browser PDF rendering (rejected as overkill infra).
- Rich-text rendering beyond v1 scope (see Rich Text section).

## Architecture

A **single shared report model** is built once from the project data and consumed by
three thin renderers. This is what prevents the three outputs from drifting apart.

```
ProjectWithRelations ──► buildReportModel(project, options) ──► ReportModel
                                                                   │
                        ┌──────────────────────┬───────────────────┤
                        ▼                       ▼                   ▼
               HTML preview (React)      docx generator     react-pdf generator
               (on-screen, branded)      (Word .docx)       (PDF)
```

Each renderer's only job is translating the `ReportModel` into its own primitives:
- HTML preview → `<div>` / Tailwind
- docx → `Paragraph` / `Table` / `TableRow`
- react-pdf → `<View>` / `<Text>` / `<Image>`

Branding (colors, logo, fonts, section order) lives in one place: `src/lib/report/branding.ts`.

## Files

| File | Purpose |
|------|---------|
| `src/types/report.ts` | `ReportModel`, `ReportSection`, `ReportSectionKey`, `ReportOptions`, rich-text token types |
| `src/lib/report/branding.ts` | ReWa colors (hex), logo path, font config, default section order — shared by all 3 renderers |
| `src/lib/report/richText.ts` | `parseRichText(html)` → neutral token list (shared by docx + pdf) |
| `src/lib/services/reportModel.ts` | `buildReportModel(project, options)` — normalize project data + apply section toggles |
| `src/lib/services/reportDocx.ts` | `generateDocx(model): Promise<Blob>` using `docx` |
| `src/lib/services/reportPdf.tsx` | `generatePdf(model): Promise<Blob>` using `@react-pdf/renderer` |
| `src/lib/report/download.ts` | small Blob → file download helper (anchor + objectURL) |
| `src/components/report/ProjectReportDialog.tsx` | Full-screen modal: section-toggle rail + live preview + Word/PDF export buttons |
| `src/components/report/ProjectReportPreview.tsx` | Renders `ReportModel` as branded HTML |
| `src/components/report/sections/*.tsx` | One small preview component per section |

Modified:
- `src/components/ProjectForm.tsx` — add "Generate Report" button that opens `ProjectReportDialog`.
- `package.json` — add `@react-pdf/renderer`, `docx`.

## Data flow

1. PM clicks **Generate Report** in `ProjectForm`.
2. Dialog opens and **re-fetches the saved `ProjectWithRelations`** by project id
   (via the existing project service), so the report reflects persisted data.
   Banner: "Showing saved data — save your changes first to include them."
3. `buildReportModel(project, options)` produces the `ReportModel` from the saved data
   and current section toggles. Overall health uses the existing
   `calculateWeightedCompletion(milestones)`.
4. `ProjectReportPreview` renders the model live. Toggling a section re-runs the model
   build and re-renders.
5. **Export to PDF** → `generatePdf(model)` → Blob → download `.pdf`.
   **Export to Word** → `generateDocx(model)` → Blob → download `.docx`.

## Report model & sections

`ReportModel` = a **header block** (always rendered) + an ordered list of **toggleable
sections**. Section toggle state is held in the dialog and passed into `buildReportModel`.

**Header (always on):**
- ReWa logo
- Project title
- Department
- Status badge (active / on-hold / completed / cancelled)
- Overall **health %** (`calculateWeightedCompletion`) + status-color chip
  (red / yellow / green, from `manual_status_color` || `computed_status_color`)
- Project manager, sponsors, business leads
- Start / end dates (calculated_start_date / calculated_end_date)
- Budget summary (total / actuals / forecast)
- Generated-on date

**Toggleable sections (default order):**
1. **Executive summary** — `value_statement` + `description` (rich text)
2. **Milestones & sub-tasks** *(core)* — per milestone: name, owner, start/end date,
   weight, completion bar, status chip (completed / on-schedule / at-risk / high-risk).
   **Sub-tasks indented beneath their parent milestone**: description, assignee, due
   date, completion.
3. **Accomplishments** (rich text)
4. **Next-period activities** — including sub-activities
5. **Risks** (rich text)
6. **Considerations**
7. **Changes**
8. **Budget detail** — total / actuals / forecast breakdown

Each section is a checkbox in the dialog's left rail. Unchecking removes it from the
preview **and** both exports.

## Sub-task indentation (explicit)

- **Preview (HTML):** sub-task rows rendered with left padding / nested under the
  milestone card.
- **PDF (react-pdf):** sub-task `<View>` rows given left padding so they sit visually
  inside the milestone block.
- **Word (docx):** sub-task table rows indented (cell indentation / leading spacer
  column) so the hierarchy is visible in Word.

## Branding & layout

- Brand blue header band (`#1D4ED8` / `#3B82F6`), ReWa logo (`public/images/rewa-logo-color.png`).
- Section headings with accent rule; status chips green/yellow/red; completion as
  progress bars (preview/PDF) and shaded cells (Word).
- **PDF:** portrait, react-pdf auto-paginates; milestone tables flow across pages with
  repeating headers and page numbers in the footer. This is the concrete fix for the
  "screenshot gets cut off" problem.
- **Word:** native Word tables with brand-shaded header rows, real heading styles
  (so Word's navigation pane / TOC works), fully editable text.

## Rich text handling

Several fields are **TipTap HTML** (`description`, `value_statement`, accomplishments,
risks), not plain text. Unlike the Excel export (which strips HTML), the report
**preserves basic formatting** to stay "pretty."

A shared `parseRichText(html)` walker (`src/lib/report/richText.ts`) converts TipTap
output into a neutral token list that both docx and react-pdf map to their own runs.

**v1 supported:** paragraphs, bold, italic, underline, bullet lists, numbered lists,
links. Anything more exotic degrades gracefully to clean text. The HTML preview can
render the sanitized HTML directly.

## Error handling

- Empty/missing sections render "None recorded" rather than blank space.
- A project with zero milestones still produces a valid report.
- Export buttons show a loading state; failures surface via the existing toast pattern.
- Logo/asset fetch failure falls back to a text wordmark so export never hard-fails.

## Dependencies

- `@react-pdf/renderer` — native PDF generation (browser/Vite compatible).
- `docx` — native Word .docx generation (browser/Vite compatible).
- Logo for exports: fetched from `/images/rewa-logo-color.png` (react-pdf `<Image src>`;
  docx `ImageRun` from fetched ArrayBuffer).

## Testing / verification

No automated test suite exists. Verify via `netlify dev`:
1. Open a **large** project, click Generate Report.
2. Confirm the live preview is branded and shows milestones with **indented sub-tasks**.
3. Toggle sections off/on — preview updates, and excluded sections are absent from exports.
4. Export PDF: confirm multi-page pagination, repeating headers, selectable (not image) text.
5. Export Word: confirm it opens in Word, tables render, headings appear in the nav pane,
   text is editable, sub-tasks visibly indented.
6. Edge case: a project with no milestones / empty sections exports cleanly with
   "None recorded".

## Build sequence (for the implementation plan)

1. Add deps; create `branding.ts` + `report.ts` types.
2. `reportModel.ts` (`buildReportModel`) + `richText.ts`.
3. `ProjectReportPreview` + section components (HTML preview).
4. `ProjectReportDialog` (toggles + saved-data fetch + export buttons) wired into `ProjectForm`.
5. `reportPdf.tsx` (react-pdf) + `download.ts`.
6. `reportDocx.ts` (docx).
7. Verify all formats against a large project per the checklist above.
