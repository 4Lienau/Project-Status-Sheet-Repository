import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, ImageRun, ExternalHyperlink,
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

function richToParagraphs(blocks: RichTextBlock[], indentLeft = 0): Paragraph[] {
  if (!blocks.length) return [new Paragraph({ children: [new TextRun({ text: "None recorded", italics: true, color: "9CA3AF" })], indent: indentLeft ? { left: indentLeft } : undefined })];
  const ordinals = listOrdinals(blocks);
  return blocks.map((b, i) => {
    const marker = b.type === "number" ? [new TextRun({ text: `${ordinals[i]}. ` })] : [];
    const runs = [...marker, ...b.spans.map((sp) =>
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

export async function generateDocx(model: ReportModel): Promise<Blob> {
  const { header, sections, enabledOrder } = model;
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
      sections.milestones?.forEach((m) => {
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
          new TableRow({ children: [cell("Total", { bold: true, color: "FFFFFF", fill: HEADER_BAND }), cell("Actuals", { bold: true, color: "FFFFFF", fill: HEADER_BAND }), cell("Forecast", { bold: true, color: "FFFFFF", fill: HEADER_BAND })], tableHeader: true }),
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
