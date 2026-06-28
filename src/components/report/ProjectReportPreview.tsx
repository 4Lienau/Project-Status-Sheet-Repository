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
