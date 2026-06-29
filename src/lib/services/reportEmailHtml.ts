// Email renderer: emits the report as table-based, inline-styled HTML that
// survives Outlook/Gmail (which strip flexbox, grid, and position:absolute).
// Built from the SAME ReportModel as the preview and Word renderers, so it
// never drifts. The timeline is a shaded month grid (tables paste reliably;
// the preview's absolutely-positioned bars do not). Paired with
// copyEmailToClipboard + openMailDraft, this is the "Generate email" flow.
import type { ReportModel, RichTextBlock, ReportGantt, RichTextSpan } from "@/types/report";
import {
  BRAND,
  STATUS_COLOR_HEX,
  STATUS_COLOR_BG,
  STATUS_COLOR_LABEL,
  MILESTONE_STATUS_TEXT,
  milestoneStatusColor,
  isMilestoneComplete,
} from "@/lib/report/branding";
import { listOrdinals } from "@/lib/report/richText";
import { formatCurrency, formatPercent, statusLabel } from "@/lib/report/format";

export interface EmailParts {
  subject: string;
  html: string;
  plain: string;
}

// Escapes for both element text AND attribute contexts, so quotes can't break
// out of an attribute value (over-escaping in text content is harmless).
const esc = (s: string | null | undefined): string =>
  (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Only http(s)/mailto links are emitted as anchors; anything else (javascript:,
// data:, vbscript:, …) is neutralised to "#" to block scripted-URI XSS.
const safeHref = (href: string): string =>
  /^(https?:|mailto:)/i.test(href.trim()) ? href.trim() : "#";

const C = BRAND.colors;
const none = () => `<div style="color:#9CA3AF;font-style:italic;">None recorded</div>`;

// Explicit-height vertical spacer — Outlook honors element heights but not
// margins reliably, so blank lines between sections are forced this way.
const vspace = (h: number) => `<div style="line-height:${h}px;font-size:1px;height:${h}px;">&nbsp;</div>`;

function heading(text: string): string {
  // A blank line BEFORE the header (separates it from the previous section's
  // content) and AFTER it (header from its own content), so every section reads
  // as a distinct block.
  return `${vspace(16)}<div style="font-size:15px;font-weight:bold;color:${C.primary};border-bottom:2px solid ${C.primary};padding-bottom:3px;">${esc(text)}</div>${vspace(10)}`;
}

function spansToHtml(spans: RichTextSpan[]): string {
  return spans
    .map((sp) => {
      let t = esc(sp.text);
      if (sp.bold) t = `<strong>${t}</strong>`;
      if (sp.italic) t = `<em>${t}</em>`;
      if (sp.underline) t = `<u>${t}</u>`;
      if (sp.href) t = `<a href="${esc(safeHref(sp.href))}" style="color:${C.primary};">${t}</a>`;
      return t;
    })
    .join("");
}

function richToHtml(blocks: RichTextBlock[]): string {
  if (!blocks || !blocks.length) return none();
  const ordinals = listOrdinals(blocks);
  return blocks
    .map((b, i) => {
      const inner = spansToHtml(b.spans);
      if (b.type === "bullet") return `<div style="margin:2px 0 2px 16px;">&bull;&nbsp; ${inner}</div>`;
      if (b.type === "number") return `<div style="margin:2px 0 2px 16px;">${ordinals[i]}.&nbsp; ${inner}</div>`;
      return `<div style="margin:4px 0;">${inner}</div>`;
    })
    .join("");
}

function milestonesHtml(model: ReportModel): string {
  const ms = model.sections.milestones;
  if (!ms || !ms.length) return none();
  const tl = model.todayLine;
  const th = `padding:5px 8px;text-align:left;color:#fff;font-size:12px;`;
  const td = `padding:5px 8px;font-size:12px;border-top:1px solid ${C.border};vertical-align:top;`;
  // One table so every milestone shares the SAME column widths (separate tables
  // auto-size independently and won't line up). The today line is a full-width
  // row spanning all five columns.
  const divider = (label: string) =>
    `<tr><td colspan="5" style="padding:6px 8px;border-top:2px solid ${C.todayLine};font-size:10px;color:${C.muted};text-transform:uppercase;letter-spacing:1px;">${esc(label)}</td></tr>`;

  const rows: string[] = [];
  ms.forEach((m, i) => {
    if (tl && tl.beforeIndex === i) rows.push(divider(tl.label));
    const c = milestoneStatusColor(m.status);
    if (isMilestoneComplete(m.completion)) {
      rows.push(
        `<tr><td style="${td}font-weight:bold;">${esc(m.milestone)}</td><td style="${td}">${esc(m.owner)}</td><td style="${td}white-space:nowrap;">${esc(m.endDate || m.date)}</td><td style="${td}text-align:right;">${m.completion}%</td><td style="${td}color:${C.statusGreen};font-weight:bold;white-space:nowrap;">&#10003; Complete</td></tr>`,
      );
      return;
    }
    rows.push(
      `<tr><td style="${td}font-weight:bold;">${esc(m.milestone)}</td><td style="${td}">${esc(m.owner)}</td><td style="${td}white-space:nowrap;">${esc(m.endDate || m.date)}</td><td style="${td}text-align:right;">${m.completion}%</td><td style="${td}"><span style="background:${STATUS_COLOR_BG[c]};color:${STATUS_COLOR_HEX[c]};padding:1px 8px;border-radius:10px;white-space:nowrap;">${MILESTONE_STATUS_TEXT[c]}</span></td></tr>`,
    );
    m.tasks.forEach((t) => {
      const done = t.completion >= 100;
      const status = done ? "Done" : t.completion > 0 ? "In progress" : "Not started";
      const sc = done ? C.statusGreen : C.muted;
      rows.push(
        `<tr><td style="${td}padding-left:20px;border-left:3px solid ${C.primaryLight};color:#374151;">${esc(t.description)}</td><td style="${td}">${esc(t.assignee)}</td><td style="${td}white-space:nowrap;">${esc(t.date)}</td><td style="${td}text-align:right;">${t.completion}%</td><td style="${td}color:${sc};">${status}</td></tr>`,
      );
    });
  });
  if (tl && tl.beforeIndex >= ms.length) rows.push(divider(tl.label));

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${C.border};margin:8px 0;"><tr style="background:${C.headerBand};"><th style="${th}">Milestone / Task</th><th style="${th}">Owner</th><th style="${th}">Due</th><th style="${th}text-align:right;">%</th><th style="${th}">Status</th></tr>${rows.join("")}</table>`;
}

function ganttHtml(g: ReportGantt | undefined): string {
  if (!g || !g.bars.length) return `<div style="color:#9CA3AF;font-style:italic;">No dated milestones to chart.</div>`;
  const th = `padding:3px 4px;color:#fff;font-size:10px;text-align:center;background:${C.headerBand};`;
  const monthHeaders = g.months
    .map((mo, j) => {
      const border = g.todayMonthIdx === j ? `border-left:2px solid ${C.todayLine};` : "";
      return `<th style="${th}${border}">${mo.show ? esc(mo.label.replace(/ '\d+$/, "")) : ""}</th>`;
    })
    .join("");
  const rows = g.bars
    .map((b) => {
      const cells = g.months
        .map((_, j) => {
          const filled = j >= b.startMonthIdx && j <= b.endMonthIdx;
          const border = g.todayMonthIdx === j ? `border-left:2px solid ${C.todayLine};` : "";
          const bg = filled ? `background:${STATUS_COLOR_HEX[b.color]};` : "";
          return `<td style="padding:0;height:14px;border-top:1px solid ${C.border};${bg}${border}">&nbsp;</td>`;
        })
        .join("");
      return `<tr><td style="padding:3px 6px;font-size:11px;border-top:1px solid ${C.border};">${esc(b.label)}</td>${cells}</tr>`;
    })
    .join("");
  const legend = `<div style="margin-top:6px;font-size:10px;color:${C.muted};"><span style="color:${STATUS_COLOR_HEX.green};">&#9632;</span> ${MILESTONE_STATUS_TEXT.green} &nbsp; <span style="color:${STATUS_COLOR_HEX.yellow};">&#9632;</span> ${MILESTONE_STATUS_TEXT.yellow} &nbsp; <span style="color:${STATUS_COLOR_HEX.red};">&#9632;</span> ${MILESTONE_STATUS_TEXT.red} &nbsp; <span style="color:${C.todayLine};font-weight:bold;">|</span> Today</div>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${C.border};table-layout:fixed;margin:6px 0;"><tr><th style="${th}text-align:left;width:26%;">Milestone</th>${monthHeaders}</tr>${rows}</table>${legend}`;
}

function sectionHtml(key: string, model: ReportModel): string {
  const s = model.sections;
  switch (key) {
    case "description":
      return heading("Project Description") + richToHtml(s.description || []);
    case "budget":
      return (
        heading("Budget") +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td style="font-size:11px;color:${C.muted};padding:0 12px 0 0;">Total</td><td style="font-size:11px;color:${C.muted};padding:0 12px;">Actuals</td><td style="font-size:11px;color:${C.muted};">Forecast</td></tr><tr><td style="font-size:13px;padding-right:12px;">${esc(formatCurrency(s.budget?.total ?? null))}</td><td style="font-size:13px;padding:0 12px;">${esc(formatCurrency(s.budget?.actuals ?? null))}</td><td style="font-size:13px;">${esc(formatCurrency(s.budget?.forecast ?? null))}</td></tr></table>`
      );
    case "timeline":
      return heading("Timeline") + ganttHtml(s.gantt);
    case "milestones":
      return heading("Milestones & Sub-Tasks") + milestonesHtml(model);
    case "accomplishments": {
      const acc = s.accomplishments || [];
      if (!acc.length) return heading("Accomplishments") + none();
      return (
        heading("Accomplishments") +
        acc
          .map(
            (b) =>
              `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:2px 0;"><tr><td valign="top" style="color:${C.statusGreen};padding-right:6px;font-weight:bold;">&#10003;</td><td style="font-size:13px;">${richToHtml(b)}</td></tr></table>`,
          )
          .join("")
      );
    }
    case "nextPeriodActivities": {
      const acts = s.nextPeriodActivities || [];
      if (!acts.length) return heading("Next Period Activities") + none();
      return (
        heading("Next Period Activities") +
        acts
          .map((a) => {
            const subs = a.subActivities
              .map(
                (sa) =>
                  `<div style="margin:1px 0 1px 18px;border-left:2px solid ${C.primaryLight};padding-left:8px;font-size:12px;color:#374151;">${esc(sa.description)} <span style="color:${C.muted};">&mdash; ${esc(sa.assignee)} &middot; ${esc(sa.date)} &middot; ${sa.completion}%</span></div>`,
              )
              .join("");
            return `<div style="margin:4px 0;font-size:13px;">${esc(a.description)} <span style="color:${C.muted};font-size:12px;">${esc(a.assignee)} &middot; ${esc(a.date)} &middot; ${a.completion}%</span>${subs}</div>`;
          })
          .join("")
      );
    }
    case "risks": {
      const risks = s.risks || [];
      if (!risks.length) return heading("Risks") + none();
      return (
        heading("Risks") +
        risks
          .map((r) => `<div style="font-size:13px;margin:2px 0;"><strong>${esc(r.description)}</strong> &mdash; <span style="color:#4B5563;">${esc(r.impact)}</span></div>`)
          .join("")
      );
    }
    case "considerations": {
      const cons = s.considerations || [];
      if (!cons.length) return heading("Considerations") + none();
      return heading("Considerations") + cons.map((c) => `<div style="font-size:13px;margin:2px 0 2px 16px;">&bull;&nbsp; ${esc(c)}</div>`).join("");
    }
    case "changes": {
      const changes = s.changes || [];
      if (!changes.length) return heading("Changes") + none();
      return (
        heading("Changes") +
        changes
          .map((c) => `<div style="font-size:13px;margin:2px 0;">${esc(c.change)} &mdash; <span style="color:#4B5563;">${esc(c.impact)}</span> <span style="color:#9CA3AF;">(${esc(c.disposition)})</span></div>`)
          .join("")
      );
    }
    default:
      return "";
  }
}

export function buildReportEmail(model: ReportModel): EmailParts {
  const { header, enabledOrder } = model;
  const statusHex = STATUS_COLOR_HEX[header.statusColor];
  const statusBg = STATUS_COLOR_BG[header.statusColor];

  // Health box uses a filled tinted background only — no 1px border, since
  // Outlook clips the left outline of the leftmost bordered element.
  const meta = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:10px;"><tr><td valign="top" style="width:130px;padding-right:14px;"><table role="presentation" cellpadding="0" cellspacing="0" style="background:${statusBg};border-radius:6px;"><tr><td style="padding:10px 18px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:${statusHex};">${formatPercent(header.healthPercentage)}</div><div style="font-size:11px;color:${statusHex};">${STATUS_COLOR_LABEL[header.statusColor]}</div></td></tr></table></td><td valign="top"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:13px;color:#1F2937;"><tr><td style="padding:1px 12px 1px 0;"><span style="color:${C.muted};">PM:</span> ${esc(header.projectManager)}</td><td style="padding:1px 0;"><span style="color:${C.muted};">Sponsors:</span> ${esc(header.sponsors)}</td></tr><tr><td style="padding:1px 12px 1px 0;"><span style="color:${C.muted};">Business Leads:</span> ${esc(header.businessLeads)}</td><td style="padding:1px 0;"><span style="color:${C.muted};">Dates:</span> ${esc(header.startDate || "—")} &rarr; ${esc(header.endDate || "—")}</td></tr><tr><td style="padding:1px 12px 1px 0;"><span style="color:${C.muted};">Budget:</span> ${esc(formatCurrency(header.budgetTotal))}</td><td style="padding:1px 0;"><span style="color:${C.muted};">Generated:</span> ${esc(header.generatedOn)}</td></tr></table></td></tr></table>`;

  const body = enabledOrder.map((key) => sectionHtml(key, model)).join("");

  // One left-aligned, full-width wrapper (NOT centered, NOT a fixed pixel
  // width). Percentage width lets Outlook auto-fit and keep the pasted block
  // resizable/left-alignable; the 16px cell padding gives side margins so the
  // first column isn't clipped flush against the page edge.
  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" align="left" style="width:100%;border-collapse:collapse;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1F2937;text-align:left;"><tr><td style="padding:8px 16px;"><div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.muted};font-weight:bold;">${esc(BRAND.name)} ${esc(BRAND.reportTitle)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;"><tr><td style="background:${C.headerBand};color:#ffffff;padding:14px 18px;border-radius:6px;"><div style="font-size:20px;font-weight:bold;">${esc(header.title)}</div><div style="font-size:13px;color:#dbeafe;">${esc(header.department)} &middot; ${esc(statusLabel(header.status))}</div></td></tr></table>${meta}${body}<div style="margin-top:20px;font-size:11px;color:#9CA3AF;border-top:1px solid ${C.border};padding-top:6px;">Generated from ${esc(BRAND.name)} Project Status — reflects saved project data as of ${esc(header.generatedOn)}.</div></td></tr></table>`;

  const plain = [
    header.title,
    `${header.department} · ${statusLabel(header.status)}`,
    `Health: ${formatPercent(header.healthPercentage)} (${STATUS_COLOR_LABEL[header.statusColor]})`,
    `PM: ${header.projectManager} | Sponsors: ${header.sponsors} | Business Leads: ${header.businessLeads}`,
    `Dates: ${header.startDate || "—"} → ${header.endDate || "—"} | Budget: ${formatCurrency(header.budgetTotal)}`,
    `Generated: ${header.generatedOn}`,
    "",
    "(This report is formatted. Paste it into an HTML email with Ctrl+V to see the full styled version.)",
  ].join("\n");

  return { subject: `Project Report: ${header.title}`, html, plain };
}

// Copies the report to the clipboard the way Ctrl+C from a web page / Word
// does, so it pastes into Outlook with full fidelity. We render the HTML into a
// real (visible-but-offscreen) node, select it, and intercept the copy event to
// set both text/html and text/plain — the browser then writes a proper CF_HTML
// payload (with StartFragment/EndFragment markers) that Outlook ingests like a
// Word doc. A raw ClipboardItem blob is the fallback for browsers where
// execCommand("copy") is unavailable.
export async function copyEmailToClipboard(parts: EmailParts): Promise<boolean> {
  // Primary: rendered-selection + copy-event override (Word-like paste).
  try {
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.position = "fixed";
    host.style.left = "-99999px";
    host.style.top = "0";
    host.style.width = "680px";
    host.style.background = "#ffffff";
    host.innerHTML = parts.html;
    document.body.appendChild(host);

    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(host);
    sel?.removeAllRanges();
    sel?.addRange(range);

    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.clipboardData?.setData("text/html", parts.html);
      e.clipboardData?.setData("text/plain", parts.plain);
    };
    document.addEventListener("copy", onCopy);
    const ok = document.execCommand("copy");
    document.removeEventListener("copy", onCopy);
    sel?.removeAllRanges();
    document.body.removeChild(host);
    if (ok) return true;
  } catch {
    // fall through to the Clipboard API fallback
  }

  // Fallback: async Clipboard API with explicit HTML + plain flavors.
  try {
    if (navigator.clipboard && typeof (window as any).ClipboardItem !== "undefined") {
      const item = new (window as any).ClipboardItem({
        "text/html": new Blob([parts.html], { type: "text/html" }),
        "text/plain": new Blob([parts.plain], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {
    // ignore — reported as failure below
  }
  return false;
}
