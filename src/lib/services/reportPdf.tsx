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
