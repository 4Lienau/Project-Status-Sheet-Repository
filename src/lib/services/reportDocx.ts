import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, ImageRun, ExternalHyperlink,
} from "docx";
import type { ReportModel, RichTextBlock } from "@/types/report";
import { BRAND, STATUS_COLOR_HEX, milestoneStatusColor } from "@/lib/report/branding";
import { listOrdinals } from "@/lib/report/richText";
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

function cell(text: string, opts: { bold?: boolean; color?: string; width?: number; fill?: string } = {}): TableCell {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.fill ? { fill: opts.fill } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold, color: opts.color })] })],
  });
}

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
          new TableRow({ children: [cell("Total", { bold: true, color: "FFFFFF", fill: BLUE }), cell("Actuals", { bold: true, color: "FFFFFF", fill: BLUE }), cell("Forecast", { bold: true, color: "FFFFFF", fill: BLUE })], tableHeader: true }),
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
