import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { ReportModel, ReportSectionKey, ReportMilestone, ReportGantt } from "@/types/report";
import {
  BRAND,
  STATUS_COLOR_HEX,
  STATUS_COLOR_BG,
  STATUS_COLOR_LABEL,
  MILESTONE_STATUS_TEXT,
  milestoneStatusColor,
  isMilestoneComplete,
} from "@/lib/report/branding";
import { formatCurrency, formatPercent, statusLabel } from "@/lib/report/format";
import RichTextView from "./RichTextView";

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg font-bold mt-6 mb-2 pb-1 border-b-2" style={{ color: BRAND.colors.primary, borderColor: BRAND.colors.primary }}>
    {children}
  </h2>
);

// Sub-task status is derived from completion — tasks carry no status field.
function taskStatusText(completion: number): { text: string; color: string } {
  if (completion >= 100) return { text: "Done", color: BRAND.colors.statusGreen };
  if (completion > 0) return { text: "In progress", color: BRAND.colors.muted };
  return { text: "Not started", color: BRAND.colors.muted };
}

const th = "text-left font-semibold px-2 py-1";
const td = "px-2 py-1 align-top";

const MilestoneBlock: React.FC<{ m: ReportMilestone }> = ({ m }) => {
  const color = milestoneStatusColor(m.status);

  // Completed milestones collapse to a single line with a green checkmark and
  // hide their sub-tasks — the detail no longer matters once they're done.
  if (isMilestoneComplete(m.completion)) {
    return (
      <div className="flex items-center justify-between mb-2 rounded-md border px-3 py-2" style={{ borderColor: BRAND.colors.border }}>
        <div className="font-semibold flex-1 min-w-0 break-words pr-3">{m.milestone}</div>
        <div className="flex items-center gap-1 text-sm font-semibold shrink-0 whitespace-nowrap" style={{ color: BRAND.colors.statusGreen }}>
          <CheckCircle2 className="h-4 w-4" /> Complete
        </div>
      </div>
    );
  }

  return (
    <table className="w-full table-fixed text-xs border-collapse mb-3" style={{ border: `1px solid ${BRAND.colors.border}` }}>
      <colgroup>
        <col style={{ width: "40%" }} />
        <col style={{ width: "18%" }} />
        <col style={{ width: "17%" }} />
        <col style={{ width: "9%" }} />
        <col style={{ width: "16%" }} />
      </colgroup>
      <thead>
        <tr style={{ background: BRAND.colors.headerBand, color: "#fff" }}>
          <th className={th}>Milestone / Task</th>
          <th className={th}>Owner</th>
          <th className={`${th} whitespace-nowrap`}>Due</th>
          <th className="text-right font-semibold px-2 py-1">%</th>
          <th className={th}>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr style={{ borderTop: `1px solid ${BRAND.colors.border}` }}>
          <td className={`${td} font-semibold break-words`}>{m.milestone}</td>
          <td className={`${td} break-words`}>{m.owner}</td>
          <td className={`${td} whitespace-nowrap`}>{m.endDate || m.date}</td>
          <td className="px-2 py-1 align-top text-right">{m.completion}%</td>
          <td className={td}>
            <span className="inline-block px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: STATUS_COLOR_BG[color], color: STATUS_COLOR_HEX[color] }}>
              {MILESTONE_STATUS_TEXT[color]}
            </span>
          </td>
        </tr>
        {m.tasks.map((t, j) => {
          const ts = taskStatusText(t.completion);
          return (
            <tr key={j} style={{ borderTop: `1px solid ${BRAND.colors.border}` }}>
              <td className="px-2 py-1 align-top text-gray-700 break-words" style={{ borderLeft: `3px solid ${BRAND.colors.primaryLight}`, paddingLeft: "1rem" }}>{t.description}</td>
              <td className={`${td} break-words`}>{t.assignee}</td>
              <td className={`${td} whitespace-nowrap`}>{t.date}</td>
              <td className="px-2 py-1 align-top text-right">{t.completion}%</td>
              <td className={`${td} break-words`}><span style={{ color: ts.color }}>{ts.text}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// A thin, faded "today" reference line. Intentionally understated — a small
// muted label plus a low-opacity brand hairline — so it guides the eye to
// upcoming milestones without competing with the report's own content.
const TodayLine: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-2 my-2 select-none">
    <span className="text-[10px] uppercase tracking-wider whitespace-nowrap" style={{ color: BRAND.colors.muted, opacity: 0.7 }}>
      {label}
    </span>
    <div className="flex-1" style={{ borderTop: `2px solid ${BRAND.colors.todayLine}`, opacity: 0.55 }} />
  </div>
);

// Static "minimal bars" mini-Gantt. Two columns — milestone labels on the left,
// a relative chart area on the right where bars are positioned by percentage and
// a single continuous orange today line runs through all rows. All CSS, so it
// prints to PDF identically (no canvas/SVG, unlike the dashboard's GSTC widget).
const GanttBlock: React.FC<{ gantt: ReportGantt }> = ({ gantt }) => {
  const { months, bars, todayPct } = gantt;
  return (
    <div>
      <div className="flex text-xs">
        {/* Milestone labels */}
        <div className="w-40 shrink-0 pr-2">
          <div className="h-4 mb-1" /> {/* spacer aligned with the month axis */}
          {bars.map((b, i) => (
            <div key={i} className="h-5 mb-1 flex items-center truncate text-gray-700" title={b.label}>
              {b.label}
            </div>
          ))}
        </div>
        {/* Chart area */}
        <div className="relative flex-1">
          {/* Month axis */}
          <div className="relative h-4 mb-1 border-b" style={{ borderColor: BRAND.colors.border }}>
            {months.map((mo, i) =>
              mo.show ? (
                <span key={i} className="absolute top-0 text-[9px] whitespace-nowrap" style={{ left: `${mo.leftPct}%`, color: BRAND.colors.muted }}>
                  {mo.label}
                </span>
              ) : null,
            )}
          </div>
          {/* Continuous today line through the rows */}
          {todayPct != null && (
            <div className="absolute" style={{ left: `${todayPct}%`, top: "1.25rem", bottom: 0, width: 2, background: BRAND.colors.todayLine, opacity: 0.55 }} />
          )}
          {/* Bars */}
          {bars.map((b, i) => (
            <div key={i} className="relative h-5 mb-1">
              <div
                className="absolute rounded"
                style={{ left: `${b.leftPct}%`, width: `${b.widthPct}%`, top: 3, bottom: 3, background: STATUS_COLOR_HEX[b.color] }}
                title={`${b.startLabel} → ${b.endLabel}`}
              />
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-[10px]" style={{ color: BRAND.colors.muted }}>
        {(["green", "yellow", "red"] as const).map((c) => (
          <span key={c} className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm" style={{ background: STATUS_COLOR_HEX[c] }} />
            {MILESTONE_STATUS_TEXT[c]}
          </span>
        ))}
        {todayPct != null && (
          <span className="flex items-center gap-1">
            <span className="inline-block" style={{ width: 2, height: 12, background: BRAND.colors.todayLine, opacity: 0.7 }} />
            Today
          </span>
        )}
      </div>
    </div>
  );
};

const ProjectReportPreview: React.FC<{ model: ReportModel }> = ({ model }) => {
  const { header, enabledOrder } = model;
  return (
    <div className="bg-white text-gray-900 mx-auto" style={{ width: "8.5in", minHeight: "11in", padding: "0.6in", boxShadow: "0 1px 8px rgba(0,0,0,0.12)" }}>
      {/* Brand kicker + logo on white (logo sits OUTSIDE the colored band) */}
      <div className="flex items-end justify-between mb-3">
        <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: BRAND.colors.muted }}>
          {BRAND.name} {BRAND.reportTitle}
        </div>
        <img src={BRAND.logoUrl} alt="ReWa" style={{ height: 40 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      </div>

      {/* Header band (darker blue) — title + department + status only */}
      <div className="rounded-md px-5 py-4 mb-4" style={{ background: BRAND.colors.headerBand, color: "#fff" }}>
        <div className="text-2xl font-bold">{header.title}</div>
        <div className="text-sm opacity-90">{header.department} · {statusLabel(header.status)}</div>
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
        <SectionBlock key={key} sectionKey={key} model={model} SectionTitle={SectionTitle} />
      ))}
    </div>
  );
};

const SectionBlock: React.FC<{
  sectionKey: ReportSectionKey;
  model: ReportModel;
  SectionTitle: React.FC<{ children: React.ReactNode }>;
}> = ({ sectionKey, model, SectionTitle }) => {
  const s = model.sections;
  switch (sectionKey) {
    case "description":
      return (
        <div>
          <SectionTitle>Project Description</SectionTitle>
          {!s.description?.length && <p className="text-sm text-gray-400 italic">None recorded</p>}
          <RichTextView blocks={s.description || []} />
        </div>
      );
    case "milestones": {
      const tl = model.todayLine;
      const ms = s.milestones || [];
      return (
        <div>
          <SectionTitle>Milestones &amp; Sub-Tasks</SectionTitle>
          {!ms.length && <p className="text-sm text-gray-400 italic">None recorded</p>}
          {ms.map((m, i) => (
            <React.Fragment key={i}>
              {tl && tl.beforeIndex === i && <TodayLine label={tl.label} />}
              <MilestoneBlock m={m} />
            </React.Fragment>
          ))}
          {/* All milestones are past → draw the line below the last one. */}
          {tl && ms.length > 0 && tl.beforeIndex >= ms.length && <TodayLine label={tl.label} />}
        </div>
      );
    }
    case "accomplishments":
      return (
        <div>
          <SectionTitle>Accomplishments</SectionTitle>
          {!s.accomplishments?.length && <p className="text-sm text-gray-400 italic">None recorded</p>}
          {s.accomplishments?.map((blocks, i) => (
            <div key={i} className="flex gap-2 items-start mb-1">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: BRAND.colors.statusGreen }} />
              <div className="flex-1 min-w-0"><RichTextView blocks={blocks} /></div>
            </div>
          ))}
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
    case "timeline":
      return (
        <div>
          <SectionTitle>Timeline</SectionTitle>
          {!s.gantt?.bars?.length && <p className="text-sm text-gray-400 italic">No dated milestones to chart.</p>}
          {s.gantt?.bars?.length ? <GanttBlock gantt={s.gantt} /> : null}
        </div>
      );
    default:
      return null;
  }
};

export default ProjectReportPreview;
