import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, ImageRun, ExternalHyperlink, BorderStyle,
} from "docx";
import type { ReportModel, RichTextBlock } from "@/types/report";
import { BRAND, STATUS_COLOR_HEX, MILESTONE_STATUS_TEXT, milestoneStatusColor, isMilestoneComplete } from "@/lib/report/branding";
import { listOrdinals } from "@/lib/report/richText";
import { formatCurrency, formatPercent, statusLabel } from "@/lib/report/format";

const BLUE = BRAND.colors.primary.replace("#", "");
const HEADER_BAND = BRAND.colors.headerBand.replace("#", "");
const GREEN = BRAND.colors.statusGreen.replace("#", "");

async function fetchLogo(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(BRAND.logoUrl);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

function richToParagraphs(blocks: RichTextBlock[], indentLeft = 0, leadRuns: TextRun[] = []): Paragraph[] {
  if (!blocks.length) return [new Paragraph({ children: [new TextRun({ text: "None recorded", italics: true, color: "9CA3AF" })], indent: indentLeft ? { left: indentLeft } : undefined })];
  const ordinals = listOrdinals(blocks);
  return blocks.map((b, i) => {
    const marker = b.type === "number" ? [new TextRun({ text: `${ordinals[i]}. ` })] : [];
    const lead = i === 0 ? leadRuns : [];
    const runs = [...lead, ...marker, ...b.spans.map((sp) =>
      sp.href
        ? new ExternalHyperlink({ link: sp.href, children: [new TextRun({ text: sp.text, style: "Hyperlink" })] })
        : new TextRun({ text: sp.text, bold: sp.bold, italics: sp.italic, underline: sp.underline ? {} : undefined }),
    )];
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

function cell(text: string, opts: { bold?: boolean; color?: string; width?: number; fill?: string; indent?: number } = {}): TableCell {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.fill ? { fill: opts.fill } : undefined,
    children: [new Paragraph({ indent: opts.indent ? { left: opts.indent } : undefined, children: [new TextRun({ text, bold: opts.bold, color: opts.color, size: 18 })] })],
  });
}

// Column widths (percent) shared by the milestone header + body rows.
const MS_COLS = { item: 42, owner: 20, due: 16, pct: 8, status: 14 };

// "Today" divider for the Word export — a small muted label over a slightly
// thicker bottom border. Word borders can't be alpha-faded, so this hex is the
// on-screen blend of the warm today-line orange (#F97316) at ~55% over white,
// giving the same light-orange, translucent-looking line as the preview.
// size:8 = 1pt.
function todayDivider(label: string): Paragraph {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "FCB27F", space: 1 } },
    children: [new TextRun({ text: label, size: 14, color: "9CA3AF", allCaps: true })],
  });
}

export async function generateDocx(model: ReportModel): Promise<Blob> {
  const { header, sections, enabledOrder, todayLine } = model;
  const children: (Paragraph | Table)[] = [];

  // Header
  const logo = await fetchLogo();
  if (logo) {
    children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new ImageRun({ data: logo, type: "png", transformation: { width: 120, height: 40 } })] }));
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
    if (key === "description") {
      children.push(heading("Project Description"));
      children.push(...richToParagraphs(sections.description || []));
    } else if (key === "milestones") {
      children.push(heading("Milestones & Sub-Tasks"));
      if (!sections.milestones?.length) {
        children.push(new Paragraph({ children: [new TextRun({ text: "None recorded", italics: true, color: "9CA3AF" })] }));
      }
      sections.milestones?.forEach((m, i) => {
        if (todayLine && todayLine.beforeIndex === i) children.push(todayDivider(todayLine.label));
        const c = milestoneStatusColor(m.status);
        // Completed milestones collapse to one line with a green checkmark.
        if (isMilestoneComplete(m.completion)) {
          children.push(new Paragraph({ spacing: { before: 120 }, children: [
            new TextRun({ text: m.milestone, bold: true }),
            new TextRun({ text: "   ✓ Complete", bold: true, color: GREEN }),
          ] }));
          return;
        }
        const headerRow = new TableRow({
          tableHeader: true,
          children: [
            cell("Milestone / Task", { bold: true, color: "FFFFFF", fill: HEADER_BAND, width: MS_COLS.item }),
            cell("Owner", { bold: true, color: "FFFFFF", fill: HEADER_BAND, width: MS_COLS.owner }),
            cell("Due", { bold: true, color: "FFFFFF", fill: HEADER_BAND, width: MS_COLS.due }),
            cell("%", { bold: true, color: "FFFFFF", fill: HEADER_BAND, width: MS_COLS.pct }),
            cell("Status", { bold: true, color: "FFFFFF", fill: HEADER_BAND, width: MS_COLS.status }),
          ],
        });
        const milestoneRow = new TableRow({
          children: [
            cell(m.milestone, { bold: true }),
            cell(m.owner),
            cell(m.endDate || m.date),
            cell(`${m.completion}%`),
            cell(MILESTONE_STATUS_TEXT[c], { bold: true, color: STATUS_COLOR_HEX[c].replace("#", "") }),
          ],
        });
        const taskRows = m.tasks.map((t) => {
          const done = t.completion >= 100;
          const status = done ? "Done" : t.completion > 0 ? "In progress" : "Not started";
          return new TableRow({
            children: [
              cell(t.description, { indent: 360 }),
              cell(t.assignee),
              cell(t.date),
              cell(`${t.completion}%`),
              cell(status, { color: done ? GREEN : "6B7280" }),
            ],
          });
        });
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, milestoneRow, ...taskRows],
        }));
        children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      });
      // All milestones are past → draw the line below the last one.
      if (todayLine && sections.milestones && sections.milestones.length > 0 && todayLine.beforeIndex >= sections.milestones.length) {
        children.push(todayDivider(todayLine.label));
      }
    } else if (key === "accomplishments") {
      children.push(heading("Accomplishments"));
      if (!sections.accomplishments?.length) children.push(new Paragraph({ children: [new TextRun({ text: "None recorded", italics: true, color: "9CA3AF" })] }));
      sections.accomplishments?.forEach((b) => children.push(...richToParagraphs(b, 0, [new TextRun({ text: "✓ ", bold: true, color: GREEN })])));
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
          new TableRow({ children: [cell("Total", { bold: true, color: "FFFFFF", fill: HEADER_BAND }), cell("Actuals", { bold: true, color: "FFFFFF", fill: HEADER_BAND }), cell("Forecast", { bold: true, color: "FFFFFF", fill: HEADER_BAND })], tableHeader: true }),
          new TableRow({ children: [cell(formatCurrency(sections.budget?.total ?? null)), cell(formatCurrency(sections.budget?.actuals ?? null)), cell(formatCurrency(sections.budget?.forecast ?? null))] }),
        ],
      }));
    } else if (key === "timeline") {
      children.push(heading("Timeline"));
      const g = sections.gantt;
      if (!g || !g.bars.length) {
        children.push(new Paragraph({ children: [new TextRun({ text: "No dated milestones to chart.", italics: true, color: "9CA3AF" })] }));
      } else {
        // A static bar chart can't live in a .docx, so the Word timeline is a
        // month grid: each milestone's span is shaded in its status color, and
        // the column containing today gets an orange left border (the "today line").
        const ORANGE = BRAND.colors.todayLine.replace("#", "");
        const labelW = 26;
        const colW = (100 - labelW) / g.months.length;
        const todayBorders = (j: number) =>
          g.todayMonthIdx === j ? { left: { style: BorderStyle.SINGLE, size: 12, color: ORANGE } } : undefined;
        const headerRow = new TableRow({
          tableHeader: true,
          children: [
            new TableCell({ width: { size: labelW, type: WidthType.PERCENTAGE }, shading: { fill: HEADER_BAND }, children: [new Paragraph({ children: [new TextRun({ text: "Milestone", bold: true, color: "FFFFFF", size: 16 })] })] }),
            ...g.months.map((mo, j) => new TableCell({
              width: { size: colW, type: WidthType.PERCENTAGE },
              shading: { fill: HEADER_BAND },
              borders: todayBorders(j),
              children: [new Paragraph({ children: [new TextRun({ text: mo.show ? mo.label.replace(/ '\d+$/, "") : "", bold: true, color: "FFFFFF", size: 12 })] })],
            })),
          ],
        });
        const bodyRows = g.bars.map((b) => new TableRow({
          children: [
            new TableCell({ width: { size: labelW, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: b.label, size: 16 })] })] }),
            ...g.months.map((_, j) => new TableCell({
              width: { size: colW, type: WidthType.PERCENTAGE },
              shading: j >= b.startMonthIdx && j <= b.endMonthIdx ? { fill: STATUS_COLOR_HEX[b.color].replace("#", "") } : undefined,
              borders: todayBorders(j),
              children: [new Paragraph({ children: [] })],
            })),
          ],
        }));
        children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] }));
        children.push(new Paragraph({ spacing: { before: 80 }, children: [
          new TextRun({ text: "■ ", color: STATUS_COLOR_HEX.green.replace("#", "") }), new TextRun({ text: `${MILESTONE_STATUS_TEXT.green}    `, size: 16, color: "6B7280" }),
          new TextRun({ text: "■ ", color: STATUS_COLOR_HEX.yellow.replace("#", "") }), new TextRun({ text: `${MILESTONE_STATUS_TEXT.yellow}    `, size: 16, color: "6B7280" }),
          new TextRun({ text: "■ ", color: STATUS_COLOR_HEX.red.replace("#", "") }), new TextRun({ text: `${MILESTONE_STATUS_TEXT.red}`, size: 16, color: "6B7280" }),
        ] }));
      }
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
